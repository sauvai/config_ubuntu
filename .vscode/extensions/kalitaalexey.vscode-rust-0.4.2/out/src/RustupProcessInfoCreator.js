"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ProcessInfo_1 = require("./ProcessInfo");
/**
 * The class provides creating the process info which can be used to execute rustup
 */
class RustupProcessInfoCreator {
    constructor(rustup) {
        this._rustup = rustup;
    }
    createProcessInfoForRun(toolchain) {
        return new ProcessInfo_1.ProcessInfo('rustup', ['run', this.toString(toolchain)], undefined);
    }
    toString(toolchain) {
        return toolchain.toString(true, false);
    }
}
exports.RustupProcessInfoCreator = RustupProcessInfoCreator;
//# sourceMappingURL=RustupProcessInfoCreator.js.map