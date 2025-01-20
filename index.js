import { UserSettings } from "./modules/userSettings.js";
import { UI } from './modules/uiSettings.js';
import { USB } from './modules/com/usbSerial.js';
import { BT } from './modules/com/bluetooth.js';
import { UsbEsp32 } from './modules/com/usbEsp32.js';

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('connectUsb').addEventListener('click', async () => {
        const userSettings = new UserSettings();
        UI.init(userSettings);
        await USB.connect(userSettings);
    });

    document.getElementById('connectBt').addEventListener('click', async () => {
        const userSettings = new UserSettings();
        UI.init(userSettings);
        await BT.connect(userSettings);
    });

    document.getElementById('connectOgxmW').addEventListener('click', async () => {
        await UsbEsp32.connect();
    });
});