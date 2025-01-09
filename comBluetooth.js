import { UserProfile, logError } from "./shared.js";
import { UiInfo, parseUiInfo, updateUiElements, setUiSettingsVisible } from './uiModules.js';

function getUuid(uuidSuffix) {
    const UUIDPrefix = '12345678-1234-1234-1234-1234567890';
    return `${UUIDPrefix}${uuidSuffix}`;
}

const UUID = {
    PRIMARY      : getUuid('12'),
    FIRMWARE_VER : getUuid('20'),
    FIRMWARE_NAME: getUuid('21'),
    
    START_UPDATE : getUuid('30'),
    COMMIT_UPDATE: getUuid('31'),

    SETUP_PACKET : getUuid('40'),
    PROFILE_PT1  : getUuid('41'),
    PROFILE_PT2  : getUuid('42'),
    PROFILE_PT3  : getUuid('43'),
};

class BluetoothManager {
    constructor() {
        this.device  = null;
        this.server  = null;
        this.service = null;
        this.connected = false;
    }

    async connect(uuid, options) {
        if (!navigator.bluetooth) {
            logError("Web Bluetooth API is not available, try using a different browser.");
            return false;
        } else if (!await navigator.bluetooth.getAvailability()) {
            logError("A Bluetooth adapter was not found, please make sure it is enabled/connected.");
            return false;
        } else if (this.connected) {
            logError("Already connected to a device.");
            return false;
        }

        try {
            this.device  = await navigator.bluetooth.requestDevice(options);

            this.device.addEventListener('gattserverdisconnected', () => {
                console.warn('Device disconnected');
                this.disconnect();
            });

            this.server  = await this.device.gatt.connect();
            this.service = await this.server.getPrimaryService(uuid);

            console.log('Connected to GATT server');
            this.connected = true;

        } catch (error) {
            logError(error);
            this.disconnect();
        }
        return this.connected;
    }

    async writeData(uuid, data) {
        try {
            const characteristic = await this.service.getCharacteristic(uuid);
            await characteristic.writeValue(data);
            return true;

        } catch (error) {
            logError(error);
        }
        return false;
    }

    async readData(uuid) {
        try {
            const characteristic = await this.service.getCharacteristic(uuid);
            const value = await characteristic.readValue();
            return new Uint8Array(value.buffer);

        } catch (error) {
            logError(error);
        }
        return null;
    }

    disconnect() {
        if (this.device && this.device.gatt && this.device.gatt.connected) {
            this.device.gatt.disconnect();
            console.log('Device disconnected');
        }

        this.device = null;
        this.server = null;
        this.service = null;
        this.connected = false;

        window.location.reload();
    }
}

class SetupPacket {
    constructor() {
        this.maxGamepads = 0;
        this.playerIdx = 0;
        this.inputMode = 0;
        this.profileId = 0;
    }

    getBytes() {
        let array = new Uint8Array([
            this.maxGamepads,
            this.playerIdx,
            this.inputMode,
            this.profileId
        ]);

        if (array.length !== 4) {
            logError("Setup packet length mismatch.");
            return;
        }

        return array;
    }

    setBytes(data) {
        if (!(data instanceof Uint8Array)) {
            logError("Invalid data type.");
            return;
        } else if (data.length !== 4) {
            logError("Setup packet length mismatch.");
            return;
        }

        this.maxGamepads = data[0];
        this.playerIdx = data[1];
        this.inputMode = data[2];
        this.profileId = data[3];
    }
}

const PacketSizeMax = 18;

async function writeSettingsToBtDevice(btManager, uiInfo) {
    const setupPacket = new SetupPacket();
    setupPacket.maxGamepads = uiInfo.maxGamepads;
    setupPacket.playerIdx = uiInfo.playerIdx;
    setupPacket.inputMode = uiInfo.inputMode;
    setupPacket.profileId = uiInfo.userProfile.profile.id;

    await btManager.writeData(UUID.START_UPDATE,  new Uint8Array([0x01]));
    await btManager.writeData(UUID.SETUP_PACKET,  setupPacket.getBytes());
    await btManager.writeData(UUID.PROFILE_PT1,   uiInfo.userProfile.getProfileBytes().slice(0, PacketSizeMax));
    await btManager.writeData(UUID.PROFILE_PT2,   uiInfo.userProfile.getProfileBytes().slice(PacketSizeMax, PacketSizeMax * 2));
    await btManager.writeData(UUID.PROFILE_PT3,   uiInfo.userProfile.getProfileBytes().slice(PacketSizeMax * 2));
    await btManager.writeData(UUID.COMMIT_UPDATE, new Uint8Array([0x01]));
}

//Initial read will just get the current active profile on the device
async function readSettingsFromBtDevice(btManager, profileId = 1) {
    const setupPacket1 = new SetupPacket();
    setupPacket1.profileId = profileId;

    await btManager.writeData(UUID.SETUP_PACKET, setupPacket1.getBytes());

    const setupResponseArray = await btManager.readData(UUID.SETUP_PACKET);
    const setupResponse = new SetupPacket();
    setupResponse.setBytes(setupResponseArray);

    const profilePt1Array = await btManager.readData(UUID.PROFILE_PT1);
    const profilePt2Array = await btManager.readData(UUID.PROFILE_PT2);
    const profilePt3Array = await btManager.readData(UUID.PROFILE_PT3);

    const profileArray = new Uint8Array([
        ...profilePt1Array,
        ...profilePt2Array,
        ...profilePt3Array
    ]);

    let userProfile = new UserProfile();
    userProfile.setProfileFromBytes(profileArray);

    let uiInfo = new UiInfo(setupResponse.maxGamepads, setupResponse.playerIdx, setupResponse.inputMode, userProfile);

    setUiSettingsVisible(true);
    updateUiElements(uiInfo);
}

function addListeners(btManager) {
    document.getElementById('profile-id').addEventListener('change', async () => {
        let uiInfo = parseUiInfo();
        console.log("Loading profile: ", uiInfo.userProfile.profile.id, " at index: ", uiInfo.playerIdx);
        await readSettingsFromBtDevice(btManager, uiInfo.userProfile.profile.id);
    });

    document.getElementById('reload').addEventListener('click', async () => {
        let uiInfo = parseUiInfo();
        console.log("Loading profile: ", uiInfo.userProfile.profile.id, " at index: ", uiInfo.playerIdx);
        await readSettingsFromBtDevice(btManager, uiInfo.userProfile.profile.id);
    });

    document.getElementById('save').addEventListener('click', async () => {
        let uiInfo = parseUiInfo();
        console.log("Saving profile: ", uiInfo.userProfile.profile.id, " to index: ", uiInfo.playerIdx);
        await writeSettingsToBtDevice(btManager, uiInfo);
    });

    document.getElementById('disconnect').addEventListener('click', async () => {
        await btManager.disconnect();
    });
}

export async function connectToBtDevice() {
    if (!navigator.bluetooth) {
        logError("Web Bluetooth API is not available, try using a different browser.");
        return;
    } else if (!await navigator.bluetooth.getAvailability()) {
        logError("A Bluetooth adapter was not found, please make sure it is enabled/connected.");
        return;
    }

    const btManager = new BluetoothManager();

    try {
        const options = {
            filters: [
              // {services: ['12345678-1234-1234-1234-123456789012']}
              { name: "OGX-Wireless" },
              { name: "OGX-Wireless-Lite" },
              { name: "OGX-Mini" }
            ],
            acceptAllDevices: false,
            // acceptAllDevices: true,
            optionalServices: [UUID.PRIMARY]
        };
        
        if (!(await btManager.connect(UUID.PRIMARY, options))) {
            logError("Failed to connect to device.");
            return;
        }

        let firmwareVersionArray = await btManager.readData(UUID.FIRMWARE_VER);
        const firmwareVersion = new TextDecoder().decode(firmwareVersionArray);
        console.log("Firmware version:", firmwareVersion);
        
        readSettingsFromBtDevice(btManager);
        addListeners(btManager);

    } catch (error) {
        logError(error);
        if (btManager.connected) {
            btManager.disconnect();
        }
    }
}