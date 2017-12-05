"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Configuration_1 = require("../configuration/Configuration");
const ProcessInfo_1 = require("../../ProcessInfo");
const RustupProcessInfoCreator_1 = require("../../RustupProcessInfoCreator");
/**
 * The class provides creating the process info which can be used to execute cargo
 */
class ProcessInfoCreator {
    constructor(rustup, logger) {
        this._rustup = rustup;
        this._logger = logger;
    }
    createProcessInfoForCommand(command, additionalArgs) {
        const args = [command].concat(additionalArgs);
        return this.createCargoProcessInfo().appendArgs(args);
    }
    createCargoProcessInfo() {
        return (this.createUserCargoProcessInfo() ||
            this.createRustupCargoProcessInfo() ||
            this.createDefaultCargoProcessInfo());
    }
    createUserCargoProcessInfo() {
        const logger = this._logger.createChildLogger('createUserCargoProcessInfo: ');
        const userCargoPath = Configuration_1.Configuration.getPathConfigParameter('cargoPath');
        if (!userCargoPath) {
            logger.debug('no user cargo path');
            return undefined;
        }
        else {
            logger.debug(`user cargo path: ${userCargoPath}`);
            return new ProcessInfo_1.ProcessInfo(userCargoPath, [], undefined);
        }
    }
    createRustupCargoProcessInfo() {
        const logger = this._logger.createChildLogger('createRustupCargoProcessInfo: ');
        if (!this._rustup) {
            logger.debug('no rustup');
            return undefined;
        }
        const userToolchain = this._rustup.getUserToolchain();
        if (!userToolchain) {
            logger.debug('no user toolchain');
            return undefined;
        }
        const rustupProcessInfoCreator = new RustupProcessInfoCreator_1.RustupProcessInfoCreator(this._rustup);
        return rustupProcessInfoCreator.createProcessInfoForRun(userToolchain).appendArg('cargo');
    }
    createDefaultCargoProcessInfo() {
        return new ProcessInfo_1.ProcessInfo('cargo', [], undefined);
    }
}
exports.ProcessInfoCreator = ProcessInfoCreator;
//# sourceMappingURL=ProcessInfoCreator.js.map