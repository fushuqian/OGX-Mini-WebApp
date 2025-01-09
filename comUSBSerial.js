import { UiInfo, parseUiInfo, updateUiElements, setUiSettingsVisible } from './uiModules.js';
import { UserProfile } from './shared.js';

const USBPacketIDs = {
    INIT_READ      : 0x88,
    READ_PROFILE   : 0x01,
    WRITE_PROFILE  : 0x02,
    RESPONSE_OK    : 0x10,
    RESPONSE_ERROR : 0x11,
};

const PacketLength = 50;
const BaudRate = 9600;

class Packet {
    constructor() {
        this.packetId = 0;
        this.maxGamepads = 0;
        this.inputMode = 0;
        this.playerIdx = 0;
        this.userProfile = new UserProfile();
    }

    setPacket(packetId, uiInfo) {
        this.packetId = packetId;
        this.maxGamepads = uiInfo.maxGamepads;
        this.inputMode = uiInfo.inputMode;
        this.playerIdx = uiInfo.playerIdx;
        this.userProfile = uiInfo.userProfile;
    }

    getPacketBytes() {
        let array = new Uint8Array([
            this.packetId,
            this.maxGamepads,
            this.inputMode,
            this.playerIdx,
            ...this.userProfile.getProfileBytes()
        ]);

        if (array.length !== PacketLength) {
            logError("Packet length mismatch.");
            return;
        }

        return array;
    }
}

async function sendPacket(writer, packet) {
    console.log("Sending packet: ", packet);

    const packetBytes = packet.getPacketBytes();
    if (!packetBytes) {
        logError("Invalid packet.");
        return;
    }
    await writer.write(packetBytes);

    console.log("Packet sent, length:", packetBytes.length);
}

function parseInData(data) {
    if (data.length !== PacketLength) {
        logError("Received packet length does not match.");
        return;
    }

    console.log("Received packet: ", data);

    let packetId = data[0];

    if (packetId !== USBPacketIDs.RESPONSE_OK) {
        logError("Packet error.");
        return;
    }

    console.log("Packet OK.");

    let inputMode   = data[1];
    let maxGamepads = data[2];
    let playerIdx   = data[3];
    let userProfile = new UserProfile();

    userProfile.setProfileFromBytes(data.slice(4));

    console.log("Received profile: ", userProfile.profile);
    
    updateUiElements(new UiInfo(maxGamepads, playerIdx, inputMode, userProfile));
}

async function handleDisconnect(reader, writer, port) {
    if (reader) reader.cancel();
    if (writer) writer.releaseLock();
    if (port) await port.close();

    console.log("Port closed. Reloading page...");
    window.location.reload();
}

function addListeners(writer) {
    document.getElementById('profile-id').addEventListener('change', async () => {
        const packet = new Packet();
        packet.setPacket(USBPacketIDs.READ_PROFILE, parseUiInfo());

        console.log("Loading profile: ", packet.userProfile.profile.id, " at index: ", packet.playerIdx);

        await sendPacket(writer, packet);
    });

    document.getElementById('reload').addEventListener('click', async () => {
        const packet = new Packet();
        packet.setPacket(USBPacketIDs.READ_PROFILE, parseUiInfo());
        
        console.log("Loading profile: ", packet.userProfile.profile.id, " at index: ", packet.playerIdx);

        await sendPacket(writer, packet);
    });

    document.getElementById('save').addEventListener('click', async () => {
        const packet = new Packet();
        packet.setPacket(USBPacketIDs.WRITE_PROFILE, parseUiInfo());

        console.log("Saving profile: ", packet.userProfile.profile.id, " to index: ", packet.playerIdx);

        await sendPacket(writer, packet);
    });

    document.getElementById('disconnect').addEventListener('click', async () => 
    {
        await handleDisconnect(reader, writer, port);
    });
}

export async function connectToUsbDevice() {
    if (!("serial" in navigator)) {
        logError("Web Serial API not supported.");
        return;
    }

    console.log("Requesting port...");

    try {
        const filters = [{ usbVendorId: 0xCafe }];
        const port = await navigator.serial.requestPort({  });
        await port.open({ baudRate: BaudRate });

        const reader = port.readable.getReader();
        const writer = port.writable.getWriter();

        let initPacket = new Packet();
        initPacket.packetId = USBPacketIDs.INIT_READ;

        await sendPacket(writer, initPacket);

        setUiSettingsVisible(true);

        async function readSerialData() {
            let inData = new Uint8Array();

            try {
                while (true) {
                    const { value, done } = await reader.read();
        
                    if (done) {
                        console.log("Stream closed.");
                        break;
                    }
        
                    if (value) {
                        let tempData = new Uint8Array(inData.length + value.length);
                        tempData.set(inData);
                        tempData.set(value, inData.length);

                        inData = tempData;
        
                        while (inData.length >= PacketLength) {
                            let data = inData.slice(0, PacketLength);  
                            parseInData(data);
        
                            inData = inData.slice(PacketLength);
                        }
                    }
                }
            } catch (error) {
                logError("Read error:", error.message || error);
                logError("Stack trace:", error.stack);
                await handleDisconnect(reader, writer, port);
            }
        }

        readSerialData();
        addListeners(writer);

        reader.closed.then(async () => {
            console.log("Device disconnected.");
            await handleDisconnect(reader, writer, port);
        });

    } catch (error) {
        logError('Connection error:', error);
    }
}