import { connectToUsbDevice } from './comUSBSerial.js';
import { connectToBtDevice } from './comBluetooth.js';
import { setUiSettingsVisible, updateUiElements, parseUiInfo, UiInfo } from './uiModules.js';
import { UserProfile } from './shared.js';

document.getElementById('load-default').addEventListener('click', async () => {
    const currentUiInfo = parseUiInfo();
    let newUiInfo = new UiInfo(currentUiInfo.maxGamepads, currentUiInfo.playerIdx, currentUiInfo.inputMode, new UserProfile());
    newUiInfo.userProfile.profile.id = currentUiInfo.userProfile.profile.id;
    updateUiElements(newUiInfo);
});

document.getElementById('connectUsb').addEventListener('click', async () => {
    console.log("Connecting to USB device...");
    await connectToUsbDevice();
});

document.getElementById('connectBt').addEventListener('click', async () => {
    console.log("Connecting to Bluetooth device...");
    await connectToBtDevice();
});

setUiSettingsVisible(false);