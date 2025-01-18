import { USBInterface } from "./usbInterface.js";
import { Gamepad } from "../gamepad.js";
import { UI } from "../ui.js";

class USBManager {
    static #PACKET_LENGTH = Object.freeze(64);
    static #HEADER_LENGTH = Object.freeze(9);
    static #BAUDRATE = Object.freeze(9600); 

    static #PACKET_ID = Object.freeze({
        NONE: 0,
        GET_PROFILE_BY_ID: 0x50,
        GET_PROFILE_BY_IDX: 0x51,
        GET_PROFILE_RESP_OK: 0x52,
        SET_PROFILE_START: 0x60,
        SET_PROFILE: 0x61,
        SET_PROFILE_RESP_OK: 0x62,
        SET_GP_IN: 0x80,
        SET_GP_OUT: 0x81,
        RESP_ERROR: 0xFF
    });

    static #PACKET_HEADER = Object.freeze([
        { key: "packetLen",   size: 1 },
        { key: "packetId",    size: 1 },
        { key: "deviceMode",  size: 1 },
        { key: "maxGamepads", size: 1 },
        { key: "playerIdx",   size: 1 },
        { key: "profileId",   size: 1 },
        { key: "chunksTotal", size: 1 },
        { key: "chunkIdx",    size: 1 },
        { key: "chunkLen",    size: 1 },
    ]);

    #interface = null;
    #currentBufferInOffset = 0;
    #bufferIn = null;
    // #bufferOut = null;
    #userSettings = null;

    constructor() {
        this.#interface = new USBInterface();
        this.#bufferIn = new Uint8Array(1024);
        // this.#bufferOut = new Uint8Array(1024);
    }

    async init(userSettings) {
        this.#userSettings = userSettings;
        if (await this.#interface.connect(USBManager.#BAUDRATE)) {
            this.#interface.readTask(USBManager.#PACKET_LENGTH, this.#processPacketIn.bind(this));
            return true;
        }
        this.#interface.disconnect();
        return false;
    }

    #getPacketInHeader(packetData) {
        const header = {};
        let offset = 0;
        USBManager.#PACKET_HEADER.forEach(field => {
            header[field.key] = packetData[offset];
            offset += field.size;
        });
        return header;
    }

    #newPacketHeader(packetId, deviceMode, maxGamepads, playerIdx, profileId, chunksTotal, chunkIdx, chunkLen) {
        return { 
            packetLen: USBManager.#PACKET_LENGTH,
            packetId: packetId,
            deviceMode: deviceMode,
            maxGamepads: maxGamepads,
            playerIdx: playerIdx,
            profileId: profileId,
            chunksTotal: chunksTotal,
            chunkIdx: chunkIdx,
            chunkLen: chunkLen
        };
    }

    #processPacketInData(header, dataLen) {
        switch (header.packetId) {
            case USBManager.#PACKET_ID.GET_PROFILE_RESP_OK:
                this.#userSettings.setProfileFromBytes(this.#bufferIn.subarray(0, dataLen));
                this.#userSettings.maxGamepads = header.maxGamepads;
                this.#userSettings.playerIdx = header.playerIdx;
                this.#userSettings.deviceMode = header.deviceMode;
                UI.updateAll(this.#userSettings);
                break;

            case USBManager.#PACKET_ID.SET_GP_IN:
                const gamepad = new Gamepad();
                gamepad.setReportFromBytes(this.#bufferIn.subarray(0, dataLen));
                UI.drawGamepadInput(gamepad);
                break;

            default:
                console.warn(`Unknown packet ID: ${header.packetId}`);
        }
    }

    #processPacketIn(data) {
        const header = this.#getPacketInHeader(data);
        this.#bufferIn.set(
            data.subarray(
                USBManager.#HEADER_LENGTH, 
                USBManager.#HEADER_LENGTH + header.chunkLen
            ), this.#currentBufferInOffset
        );

        this.#currentBufferInOffset += header.chunkLen;

        if (header.chunkIdx + 1 === header.chunksTotal) {
            this.#processPacketInData(header, this.#currentBufferInOffset);
            this.#currentBufferInOffset = 0;
        }
    }

    async #writeToDevice(packetId, data) {
        const dataLen = data.length;
        const lenLimit = USBManager.#PACKET_LENGTH - USBManager.#HEADER_LENGTH;
        const chunksTotal = Math.ceil(dataLen / lenLimit);
        let currentOffset = 0;

        for (let chunkIdx = 0; chunkIdx < chunksTotal; chunkIdx++) {
            const isLastChunk = (chunkIdx === chunksTotal - 1);
            const chunkLen = isLastChunk ? dataLen - currentOffset : lenLimit;

            const header = {
                packetLen: USBManager.#PACKET_LENGTH,
                packetId: packetId,
                deviceMode: this.#userSettings.deviceMode,
                maxGamepads: this.#userSettings.maxGamepads,
                playerIdx: this.#userSettings.playerIdx,
                profileId: this.#userSettings.profile.profileId,
                chunksTotal: chunksTotal,
                chunkIdx: chunkIdx,
                chunkLen: chunkLen
            }

            const buffer = new Uint8Array(USBManager.#PACKET_LENGTH);
            let offset = 0;
            USBManager.#PACKET_HEADER.forEach(field => {
                buffer[offset] = header[field.key];
                offset += field.size;
            });

            buffer.set(
                data.subarray(currentOffset, currentOffset + chunkLen), 
                USBManager.#HEADER_LENGTH
            );

            await this.#interface.write(buffer);
            currentOffset += chunkLen;
        }
    }

    async saveProfile() {
        const data = this.#userSettings.getProfileAsBytes();
        await this.#writeToDevice(USBManager.#PACKET_ID.SET_PROFILE, data);
    }

    async getProfileById() {
        await this.#writeToDevice(
            USBManager.#PACKET_ID.GET_PROFILE_BY_ID, 
            new Uint8Array([0xFF])
        );
    }

    async getProfileByIdx() {
        await this.#writeToDevice(
            USBManager.#PACKET_ID.GET_PROFILE_BY_IDX, 
            new Uint8Array([0xFF])
        );
    }

    async disconnect() {
        await this.#interface.disconnect();
        window.location.reload();
    }
}

export const USB = {

    async connect(userSettings) {
        if (!("serial" in navigator)) {
            console.error("Web Serial API not supported.");
            return;
        }

        const usbManager = new USBManager();

        try {
            UI.connectButtonsEnabled(false);

            if (!(await usbManager.init(userSettings))) {
                throw new Error("Connection failed.");
            }

            await usbManager.getProfileByIdx();

            UI.updateAll(userSettings);
            UI.toggleConnected(true);

            UI.addCallbackLoadProfile(async () => {
                await usbManager.getProfileById();
                UI.updateAll(userSettings);
            }, userSettings);

            UI.addCallbackSaveProfile(async () => {
                await usbManager.saveProfile();
            }, userSettings);

            UI.addCallbackDisconnect(async () => {
                await usbManager.disconnect();
                UI.toggleConnected(false);
                window.location.reload();
            });

        } catch (error) {
            console.warn('Connection error:', error);
            usbManager.disconnect();
            window.location.reload();
        }
    }
};