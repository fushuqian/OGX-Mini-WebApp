import { UserSettings } from "./modules/userSettings.js";
import { UI } from './modules/ui.js';
import { USB } from './modules/com/usbSerial.js';
import { BT } from './modules/com/bluetooth.js';

document.addEventListener("DOMContentLoaded", () => {
    const userSettings = new UserSettings();
    UI.init(userSettings);

    document.getElementById('connectUsb').addEventListener('click', async () => {
        await USB.connect(userSettings);
    });

    document.getElementById('connectBt').addEventListener('click', async () => {
        await BT.connect(userSettings);
    });
});