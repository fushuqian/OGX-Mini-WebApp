import { UserProfile, logError, clearError } from './shared.js';

const KeyValueGamepad = {
    "Player 1": 0,
    "Player 2": 1,
    "Player 3": 2,
    "Player 4": 3,
};

const KeyValueDeviceMode = {
    "Xbox OG"                   : 1,
    "Xbox OG: Steel Battalion"  : 2,
    "Xbox OG: XRemote"          : 3,
    "XInput"                    : 4,
    "PS3"                       : 5,
    "DInput"                    : 6,
    "PS Classic"                : 7,
    "Switch"                    : 8,
    "WebApp"                    : 100,
};

const KeyValueDeviceModeMultiGP = {
    "DInput" : KeyValueDeviceMode["DInput"],
    "Switch" : KeyValueDeviceMode["Switch"],
    "WebApp" : KeyValueDeviceMode["WebApp"],    
};

const KeyValueDeviceMode4Ch = {
    "Xbox OG"                   : KeyValueDeviceMode["Xbox OG"],
    "Xbox OG: Steel Battalion"  : KeyValueDeviceMode["Xbox OG: Steel Battalion"],
    "Xbox OG: XRemote"          : KeyValueDeviceMode["Xbox OG: XRemote"],
    "XInput"                    : KeyValueDeviceMode["XInput"],
    "PS3"                       : KeyValueDeviceMode["PS3"],
    "PS Classic"                : KeyValueDeviceMode["PS Classic"],
    "WebApp"                    : KeyValueDeviceMode["WebApp"],
};

const KeyValueProfileID = {
    "Profile 1": 0x01,
    "Profile 2": 0x02,
    "Profile 3": 0x03,
    "Profile 4": 0x04,
    "Profile 5": 0x05,
    "Profile 6": 0x06,
    "Profile 7": 0x07,
    "Profile 8": 0x08,
};

const KeyValueDpad ={
    "Up"    : 0x01,
    "Down"  : 0x02,
    "Left"  : 0x04,
    "Right" : 0x08,
};

const KeyValueButtons = {
    "A"       : 0x0001,
    "B"       : 0x0002,
    "X"       : 0x0004,
    "Y"       : 0x0008,
    "L3"      : 0x0010,
    "R3"      : 0x0020,
    "Back"    : 0x0040,
    "Start"   : 0x0080,
    "LB"      : 0x0100,
    "RB"      : 0x0200,
    "Guide"   : 0x0400,
    "Misc"    : 0x0800
};

const KeyValueAnalog = {
    "Up"    : 0x00,
    "Down"  : 0x01,
    "Left"  : 0x02,
    "Right" : 0x03,
    "A"     : 0x04,
    "B"     : 0x05,
    "X"     : 0x06,
    "Y"     : 0x07,
    "LB"    : 0x08,
    "RB"    : 0x09
};

export class UiInfo {
    constructor(maxGamepads, playerIdx, inputMode, userProfile) {
        this.maxGamepads = maxGamepads;
        this.playerIdx   = playerIdx;
        this.inputMode   = inputMode;
        this.userProfile = userProfile;
    }
}

let uiElementsPopulated = false;

function percentToThreshold(percent, maxValue) {
    return Math.round((percent / 100) * maxValue);
}

function thresholdToPercent(threshold, maxValue) {
    return Math.round((threshold / maxValue) * 100);
}

function populateDropdownMenus(elementPrefix, keyValue) {
    for (const [key, value] of Object.entries(keyValue)) {
        const selectElementId = `${elementPrefix}${key.replace(/\s+/g, '-')}`;
        const selectElement = document.getElementById(selectElementId);
    
        for (const [key2, value2] of Object.entries(keyValue)) {
            const option = document.createElement("option");
            option.value = value2;
            option.text = key2;
            selectElement.add(option);
        }
    }
}

function populateDropdownMenu(elementID, keyValue, numOptions = 0xFF) {
    const selectElement = document.getElementById(elementID);

    if (selectElement) {
        selectElement.innerHTML = '';
        let count = 0;

        for (const [key, value] of Object.entries(keyValue)) {
            if (count++ >= numOptions) {
                break;
            }
            const option = document.createElement("option");
            option.value = value;
            option.text = key;
            selectElement.add(option);
        }
    } else {
        logError(`Element ${elementID} not found!`);
    }
}

function updateDeadzoneSlider(sliderId, displayId, value, maxValue) {
    const percentage = thresholdToPercent(value, maxValue);
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(displayId);
    
    if (slider && display) {
        slider.value = percentage;
        display.textContent = percentage;

    } else {
        logError(`Slider or display element not found for ${sliderId}`);
    }

    slider.addEventListener('input', () => 
    {
        const updatedValue = thresholdToPercent(slider.value, 100);
        display.textContent = updatedValue;
    });
}

const updateDropdown = (element_id, value) => {
    const element = document.getElementById(element_id);

    if (element) {
        element.value = value;
    } else {
        logError(`Element ${element_id} not found!`);
    }
};

function updateCheckbox(checkbox_id, displayId, value) 
{
    const checkbox = document.getElementById(checkbox_id);
    const display = document.getElementById(displayId);

    if (checkbox && display) {
        checkbox.checked = value === 1;
    } else {
        logError(`Checkbox or display element not found for ${checkbox_id}`);
    }
}

export function updateUiElements(uiInfo) {
    console.log("Updating UI elements with UiInfo: ", uiInfo);

    populateUiElements(uiInfo.maxGamepads);

    const profile = uiInfo.userProfile.profile;

    updateDropdown("device-mode", uiInfo.inputMode);
    updateDropdown("dropdown-playerIdx", uiInfo.playerIdx, uiInfo.maxGamepads);
    updateDropdown("profile-id", profile.id);

    updateDeadzoneSlider('deadzone-trigger-l', 'deadzone-trigger-l-value', profile.dzTriggerL, UserProfile.DeadzoneMax);
    updateDeadzoneSlider('deadzone-trigger-r', 'deadzone-trigger-r-value', profile.dzTriggerR, UserProfile.DeadzoneMax);
    updateDeadzoneSlider('deadzone-joy-l', 'deadzone-joy-l-value', profile.dzJoystickL, UserProfile.DeadzoneMax);
    updateDeadzoneSlider('deadzone-joy-r', 'deadzone-joy-r-value', profile.dzJoystickR, UserProfile.DeadzoneMax);

    updateCheckbox('invert-joy-l', 'invert-joy-l-value', profile.invertLy);
    updateCheckbox('invert-joy-r', 'invert-joy-r-value', profile.invertRy);

    updateDropdown("mapping-Up",    profile.dpadUp);
    updateDropdown("mapping-Down",  profile.dpadDown);
    updateDropdown("mapping-Left",  profile.dpadLeft);
    updateDropdown("mapping-Right", profile.dpadRight);

    updateDropdown("mapping-A",     profile.buttonA);
    updateDropdown("mapping-B",     profile.buttonB);
    updateDropdown("mapping-X",     profile.buttonX);
    updateDropdown("mapping-Y",     profile.buttonY);
    updateDropdown("mapping-L3",    profile.buttonL3);
    updateDropdown("mapping-R3",    profile.buttonR3);
    updateDropdown("mapping-Back",  profile.buttonBack);
    updateDropdown("mapping-Start", profile.buttonStart);
    updateDropdown("mapping-LB",    profile.buttonLb);
    updateDropdown("mapping-RB",    profile.buttonRb);
    updateDropdown("mapping-Guide", profile.buttonSys);
    updateDropdown("mapping-Misc",  profile.buttonMisc);

    updateCheckbox("analog-enabled", "analog-enabled-value", profile.analogEnabled);

    updateDropdown("mapping-analog-Up",     profile.analogOffUp);
    updateDropdown("mapping-analog-Down",   profile.analogOffDown);
    updateDropdown("mapping-analog-Left",   profile.analogOffLeft);
    updateDropdown("mapping-analog-Right",  profile.analogOffRight);
    updateDropdown("mapping-analog-A",  profile.analogOffA);
    updateDropdown("mapping-analog-B",  profile.analogOffB);
    updateDropdown("mapping-analog-X",  profile.analogOffX);
    updateDropdown("mapping-analog-Y",  profile.analogOffY);
    updateDropdown("mapping-analog-LB", profile.analogOffLb);
    updateDropdown("mapping-analog-RB", profile.analogOffRb);
}

export function parseUiInfo() {
    let maxGamepads = 1; //Placeholder, we can't change this from the UI
    let inputMode = parseInt(document.getElementById("device-mode").value);
    let playerIdx = parseInt(document.getElementById("dropdown-playerIdx").value);
    let userProfile = new UserProfile();

    userProfile.profile.id          = parseInt(document.getElementById("profile-id").value);
    userProfile.profile.dzTriggerL  = percentToThreshold(document.getElementById("deadzone-trigger-l").value, 0xFF);
    userProfile.profile.dzTriggerR  = percentToThreshold(document.getElementById("deadzone-trigger-r").value, 0xFF);
    userProfile.profile.dzJoystickL = percentToThreshold(document.getElementById("deadzone-joy-l").value, 0xFF);
    userProfile.profile.dzJoystickR = percentToThreshold(document.getElementById("deadzone-joy-r").value, 0xFF);
    userProfile.profile.invertLy    = document.getElementById("invert-joy-l").checked ? 1 : 0;
    userProfile.profile.invertRy    = document.getElementById("invert-joy-r").checked ? 1 : 0;
    userProfile.profile.dpadUp      = parseInt(document.getElementById("mapping-Up").value);
    userProfile.profile.dpadDown    = parseInt(document.getElementById("mapping-Down").value);
    userProfile.profile.dpadLeft    = parseInt(document.getElementById("mapping-Left").value);
    userProfile.profile.dpadRight   = parseInt(document.getElementById("mapping-Right").value);
    userProfile.profile.buttonA     = parseInt(document.getElementById("mapping-A").value);
    userProfile.profile.buttonB     = parseInt(document.getElementById("mapping-B").value);
    userProfile.profile.buttonX     = parseInt(document.getElementById("mapping-X").value);
    userProfile.profile.buttonY     = parseInt(document.getElementById("mapping-Y").value);
    userProfile.profile.buttonL3    = parseInt(document.getElementById("mapping-L3").value);
    userProfile.profile.buttonR3    = parseInt(document.getElementById("mapping-R3").value);
    userProfile.profile.buttonBack  = parseInt(document.getElementById("mapping-Back").value);
    userProfile.profile.buttonStart = parseInt(document.getElementById("mapping-Start").value);
    userProfile.profile.buttonLb    = parseInt(document.getElementById("mapping-LB").value);
    userProfile.profile.buttonRb    = parseInt(document.getElementById("mapping-RB").value);
    userProfile.profile.buttonSys   = parseInt(document.getElementById("mapping-Guide").value);
    userProfile.profile.buttonMisc  = parseInt(document.getElementById("mapping-Misc").value);
    userProfile.profile.analogEnabled   = document.getElementById("analog-enabled").checked ? 1 : 0;
    userProfile.profile.analogOffUp     = parseInt(document.getElementById("mapping-analog-Up").value);
    userProfile.profile.analogOffDown   = parseInt(document.getElementById("mapping-analog-Down").value);
    userProfile.profile.analogOffLeft   = parseInt(document.getElementById("mapping-analog-Left").value);
    userProfile.profile.analogOffRight  = parseInt(document.getElementById("mapping-analog-Right").value);
    userProfile.profile.analogOffA      = parseInt(document.getElementById("mapping-analog-A").value);
    userProfile.profile.analogOffB      = parseInt(document.getElementById("mapping-analog-B").value);
    userProfile.profile.analogOffX      = parseInt(document.getElementById("mapping-analog-X").value);
    userProfile.profile.analogOffY      = parseInt(document.getElementById("mapping-analog-Y").value);
    userProfile.profile.analogOffLb     = parseInt(document.getElementById("mapping-analog-LB").value);
    userProfile.profile.analogOffRb     = parseInt(document.getElementById("mapping-analog-RB").value);

    return new UiInfo(maxGamepads, playerIdx, inputMode, userProfile);
}

function populateUiElements(maxGamepads) {
    if (uiElementsPopulated) {
        return;
    }
    
    populateDropdownMenu('profile-id', KeyValueProfileID);

    if (maxGamepads === 1) {
        populateDropdownMenu('device-mode', KeyValueDeviceMode);
    } else {
        populateDropdownMenu('device-mode', KeyValueDeviceModeMultiGP);
    }

    populateDropdownMenu('dropdown-playerIdx', KeyValueGamepad, maxGamepads);

    updateDeadzoneSlider('deadzone-joy-l', 'deadzone-joy-l-value', 0, 100);
    updateDeadzoneSlider('deadzone-joy-r', 'deadzone-joy-r-value', 0, 100);
    updateDeadzoneSlider('deadzone-trigger-l', 'deadzone-trigger-l-value', 0, 100);
    updateDeadzoneSlider('deadzone-trigger-r', 'deadzone-trigger-r-value', 0, 100);

    populateDropdownMenus('mapping-', KeyValueDpad);
    populateDropdownMenus('mapping-', KeyValueButtons);
    populateDropdownMenus('mapping-analog-', KeyValueAnalog);

    uiElementsPopulated = true;
}

export function setUiSettingsVisible(visible) {
    clearError();

    if (visible === true) {
        document.getElementById('connect-ui').classList.add('hide');
        document.getElementById('settings-ui').classList.remove('hide');
    } else {
        document.getElementById('settings-ui').classList.add('hide');
        document.getElementById('connect-ui').classList.remove('hide');
    }
}