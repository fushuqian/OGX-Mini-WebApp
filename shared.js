export class UserProfile {
    constructor() {
        this.profile = {
            id:             0,
            dzTriggerL:     0,
            dzTriggerR:     0,
            dzJoystickL:    0,
            dzJoystickR:    0,
            invertLy:       0,
            invertRy:       0,
            dpadUp:         0x01,
            dpadDown:       0x02,
            dpadLeft:       0x04,
            dpadRight:      0x08,
            buttonA:        0x0001,
            buttonB:        0x0002,
            buttonX:        0x0004,
            buttonY:        0x0008,
            buttonL3:       0x0010,
            buttonR3:       0x0020,
            buttonBack:     0x0040,
            buttonStart:    0x0080,
            buttonLb:       0x0100,
            buttonRb:       0x0200,
            buttonSys:      0x0400,
            buttonMisc:     0x0800,
            analogEnabled:  1,
            analogOffUp:    0,
            analogOffDown:  1,
            analogOffLeft:  2,
            analogOffRight: 3,
            analogOffA:     4,
            analogOffB:     5,
            analogOffX:     6,
            analogOffY:     7,
            analogOffLb:    8,
            analogOffRb:    9,
        };
    }

    setProfileFromBytes(data) {
        if (!(data instanceof Uint8Array)) {
            return logError("Invalid data type.");
        } else if (data.length !== 46) {
            return logError("Invalid data length: expected 46 bytes");
        }
        
        this.profile.id          = data[0];  // uint8_t
        this.profile.dzTriggerL  = data[1];  // uint8_t
        this.profile.dzTriggerR  = data[2];  // uint8_t
        this.profile.dzJoystickL = data[3];  // uint8_t
        this.profile.dzJoystickR = data[4];  // uint8_t
        this.profile.invertLy    = data[5],  // uint8_t
        this.profile.invertRy    = data[6],  // uint8_t
        this.profile.dpadUp      = data[7],  // uint8_t
        this.profile.dpadDown    = data[8],  // uint8_t
        this.profile.dpadLeft    = data[9],  // uint8_t
        this.profile.dpadRight   = data[10], // uint8_t
        this.profile.buttonA     = this.#uint16ToInt(data[11], data[12]); // uint16_t
        this.profile.buttonB     = this.#uint16ToInt(data[13], data[14]); // uint16_t
        this.profile.buttonX     = this.#uint16ToInt(data[15], data[16]); // uint16_t
        this.profile.buttonY     = this.#uint16ToInt(data[17], data[18]); // uint16_t
        this.profile.buttonL3    = this.#uint16ToInt(data[19], data[20]); // uint16_t
        this.profile.buttonR3    = this.#uint16ToInt(data[21], data[22]); // uint16_t
        this.profile.buttonBack  = this.#uint16ToInt(data[23], data[24]); // uint16_t
        this.profile.buttonStart = this.#uint16ToInt(data[25], data[26]); // uint16_t
        this.profile.buttonLb    = this.#uint16ToInt(data[27], data[28]); // uint16_t
        this.profile.buttonRb    = this.#uint16ToInt(data[29], data[30]); // uint16_t
        this.profile.buttonSys   = this.#uint16ToInt(data[31], data[32]); // uint16_t
        this.profile.buttonMisc  = this.#uint16ToInt(data[33], data[34]); // uint16_t
        this.profile.analogEnabled  = data[35]; // uint8_t
        this.profile.analogOffUp    = data[36]; // uint8_t
        this.profile.analogOffDown  = data[37]; // uint8_t
        this.profile.analogOffLeft  = data[38]; // uint8_t
        this.profile.analogOffRight = data[39]; // uint8_t
        this.profile.analogOffA     = data[40]; // uint8_t
        this.profile.analogOffB     = data[41]; // uint8_t
        this.profile.analogOffX     = data[42]; // uint8_t
        this.profile.analogOffY     = data[43]; // uint8_t
        this.profile.analogOffLb    = data[44]; // uint8_t
        this.profile.analogOffRb    = data[45]; // uint8_t
    }

    getProfileBytes() {
        return new Uint8Array([
            this.profile.id,
            this.profile.dzTriggerL,
            this.profile.dzTriggerR,
            this.profile.dzJoystickL,
            this.profile.dzJoystickR,
            this.profile.invertLy ? 1 : 0,
            this.profile.invertRy ? 1 : 0,
            this.profile.dpadUp,
            this.profile.dpadDown,
            this.profile.dpadLeft,
            this.profile.dpadRight,
            ...this.#intToUint16(this.profile.buttonA),
            ...this.#intToUint16(this.profile.buttonB),
            ...this.#intToUint16(this.profile.buttonX),
            ...this.#intToUint16(this.profile.buttonY),
            ...this.#intToUint16(this.profile.buttonL3),
            ...this.#intToUint16(this.profile.buttonR3),
            ...this.#intToUint16(this.profile.buttonBack),
            ...this.#intToUint16(this.profile.buttonStart),
            ...this.#intToUint16(this.profile.buttonLb),
            ...this.#intToUint16(this.profile.buttonRb),
            ...this.#intToUint16(this.profile.buttonSys),
            ...this.#intToUint16(this.profile.buttonMisc),
            this.profile.analogEnabled ? 1 : 0,
            this.profile.analogOffUp,
            this.profile.analogOffDown,
            this.profile.analogOffLeft,
            this.profile.analogOffRight,
            this.profile.analogOffA,
            this.profile.analogOffB,
            this.profile.analogOffX,
            this.profile.analogOffY,
            this.profile.analogOffLb,
            this.profile.analogOffRb,
        ]);
    }

    #uint16ToInt(byte0, byte1) {
        return byte0 | (byte1 << 8);
    }
    
    #intToUint16(value) {
        return [value & 0xff, value >> 8];
    }
}

Object.defineProperty(UserProfile, "DeadzoneMax", {
    value: 0xFF,
    writable: false,
    enumerable: true,
    configurable: false
})

export function logError(error) {
    console.error("An error occurred: ", error);
    const errorTxt = document.getElementById('errorTxt');

    if (errorTxt) {
        errorTxt.classList.remove("hide");
        errorTxt.classList.add("show");
        errorTxt.textContent = `⚠️ An error occurred: ${error.message || error}`;
    } else {
        console.error("Div not found in the DOM.");
    }
    return null;
}

export function clearError() {
    const errorTxt = document.getElementById('errorTxt');

    if (errorTxt) {
        errorTxt.classList.remove("show");
        errorTxt.classList.add("hide");
        errorTxt.textContent = "";
    } else {
        console.error("Div not found in the DOM.");
    }
}