"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Configuration_1 = require("./components/configuration/Configuration");
const Rustup_1 = require("./components/configuration/Rustup");
/**
 * The class defines functions which can be used to get data required to invoke Cargo
 */
class CargoInvocationManager {
    constructor(rustup) {
        this._rustup = rustup;
    }
    /**
     * Cargo can be accessible from multiple places, but the only one is correct.
     * This function determines the path to the executable which either Cargo itself or proxy to
     * Cargo. If the executable is a proxy to Cargo, then the proxy may require some arguments to
     * understand that Cargo is requested. An example is running Cargo using rustup.
     */
    getExecutableAndArgs() {
        const userCargoPath = Configuration_1.Configuration.getPathConfigParameter('cargoPath');
        if (userCargoPath) {
            return { executable: userCargoPath, args: [] };
        }
        const userToolchain = this._rustup ? this._rustup.getUserToolchain() : undefined;
        if (!userToolchain) {
            return { executable: 'cargo', args: [] };
        }
        const args = ['run', userToolchain.toString(true, false), 'cargo'];
        return { executable: Rustup_1.Rustup.getRustupExecutable(), args };
    }
}
exports.CargoInvocationManager = CargoInvocationManager;
//# sourceMappingURL=CargoInvocationManager.js.map