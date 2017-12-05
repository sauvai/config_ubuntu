"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
const expandTilde = require("expand-tilde");
const OutputtingProcess_1 = require("../../OutputtingProcess");
var ActionOnStartingCommandIfThereIsRunningCommand;
(function (ActionOnStartingCommandIfThereIsRunningCommand) {
    ActionOnStartingCommandIfThereIsRunningCommand[ActionOnStartingCommandIfThereIsRunningCommand["StopRunningCommand"] = 0] = "StopRunningCommand";
    ActionOnStartingCommandIfThereIsRunningCommand[ActionOnStartingCommandIfThereIsRunningCommand["IgnoreNewCommand"] = 1] = "IgnoreNewCommand";
    ActionOnStartingCommandIfThereIsRunningCommand[ActionOnStartingCommandIfThereIsRunningCommand["ShowDialogToLetUserDecide"] = 2] = "ShowDialogToLetUserDecide";
})(ActionOnStartingCommandIfThereIsRunningCommand = exports.ActionOnStartingCommandIfThereIsRunningCommand || (exports.ActionOnStartingCommandIfThereIsRunningCommand = {}));
class ConfigurationManager {
    static create() {
        return __awaiter(this, void 0, void 0, function* () {
            const rustcSysRoot = yield this.loadRustcSysRoot();
            const rustSourcePath = yield this.loadRustSourcePath(rustcSysRoot);
            return new ConfigurationManager(rustcSysRoot, rustSourcePath);
        });
    }
    getRlsConfiguration() {
        const configuration = ConfigurationManager.getConfiguration();
        const rlsConfiguration = configuration['rls'];
        if (!rlsConfiguration) {
            return undefined;
        }
        const executable = rlsConfiguration.executable;
        const args = rlsConfiguration.args;
        const env = rlsConfiguration.env;
        const revealOutputChannelOn = rlsConfiguration.revealOutputChannelOn;
        let revealOutputChannelOnEnum;
        switch (revealOutputChannelOn) {
            case 'info':
                revealOutputChannelOnEnum = vscode_languageclient_1.RevealOutputChannelOn.Info;
                break;
            case 'warn':
                revealOutputChannelOnEnum = vscode_languageclient_1.RevealOutputChannelOn.Warn;
                break;
            case 'error':
                revealOutputChannelOnEnum = vscode_languageclient_1.RevealOutputChannelOn.Error;
                break;
            case 'never':
                revealOutputChannelOnEnum = vscode_languageclient_1.RevealOutputChannelOn.Never;
                break;
            default:
                revealOutputChannelOnEnum = vscode_languageclient_1.RevealOutputChannelOn.Error;
        }
        return {
            executable,
            args: args !== null ? args : undefined,
            env: env !== null ? env : undefined,
            revealOutputChannelOn: revealOutputChannelOnEnum
        };
    }
    shouldExecuteCargoCommandInTerminal() {
        // When RLS is used any cargo command is executed in an integrated terminal.
        if (this.getRlsConfiguration() !== undefined) {
            return true;
        }
        const configuration = ConfigurationManager.getConfiguration();
        const shouldExecuteCargoCommandInTerminal = configuration['executeCargoCommandInTerminal'];
        return shouldExecuteCargoCommandInTerminal;
    }
    getActionOnSave() {
        const actionOnSave = ConfigurationManager.getStringParameter('actionOnSave');
        return actionOnSave;
    }
    getRustcSysRoot() {
        return this.rustcSysRoot;
    }
    shouldShowRunningCargoTaskOutputChannel() {
        const configuration = ConfigurationManager.getConfiguration();
        const shouldShowRunningCargoTaskOutputChannel = configuration['showOutput'];
        return shouldShowRunningCargoTaskOutputChannel;
    }
    getCargoEnv() {
        const configuration = ConfigurationManager.getConfiguration();
        const cargoEnv = configuration['cargoEnv'];
        return cargoEnv || {};
    }
    getCargoCwd() {
        const cargoCwd = ConfigurationManager.getPathConfigParameter('cargoCwd');
        return cargoCwd;
    }
    getCargoPath() {
        const rustsymPath = ConfigurationManager.getPathConfigParameter('cargoPath');
        return rustsymPath || 'cargo';
    }
    getCargoHomePath() {
        const configPath = ConfigurationManager.getPathConfigParameter('cargoHomePath');
        const envPath = ConfigurationManager.getPathEnvParameter('CARGO_HOME');
        return configPath || envPath || undefined;
    }
    getRacerPath() {
        const racerPath = ConfigurationManager.getPathConfigParameter('racerPath');
        return racerPath || 'racer';
    }
    getRustfmtPath() {
        const rustfmtPath = ConfigurationManager.getPathConfigParameter('rustfmtPath');
        return rustfmtPath || 'rustfmt';
    }
    getRustsymPath() {
        const rustsymPath = ConfigurationManager.getPathConfigParameter('rustsymPath');
        return rustsymPath || 'rustsym';
    }
    getRustSourcePath() {
        return this.rustSourcePath;
    }
    getActionOnStartingCommandIfThereIsRunningCommand() {
        const configuration = ConfigurationManager.getConfiguration();
        const action = configuration['actionOnStartingCommandIfThereIsRunningCommand'];
        switch (action) {
            case 'Stop running command':
                return ActionOnStartingCommandIfThereIsRunningCommand.StopRunningCommand;
            case 'Show dialog to let me decide':
                return ActionOnStartingCommandIfThereIsRunningCommand.ShowDialogToLetUserDecide;
            default:
                return ActionOnStartingCommandIfThereIsRunningCommand.IgnoreNewCommand;
        }
    }
    static getConfiguration() {
        const configuration = vscode_1.workspace.getConfiguration('rust');
        return configuration;
    }
    static loadRustcSysRoot() {
        return __awaiter(this, void 0, void 0, function* () {
            const executable = 'rustc';
            const args = ['--print', 'sysroot'];
            const options = { cwd: process.cwd() };
            const output = yield OutputtingProcess_1.OutputtingProcess.spawn(executable, args, options);
            if (output.success && output.exitCode === 0) {
                return output.stdoutData.trim();
            }
            else {
                return undefined;
            }
        });
    }
    /**
     * Loads the path of the Rust's source code.
     * It tries to load from different places.
     * These places sorted by priority (the first item has the highest priority):
     * * User/Workspace configuration
     * * Environment
     * * Rustup
     */
    static loadRustSourcePath(rustcSysRoot) {
        return __awaiter(this, void 0, void 0, function* () {
            const configPath = this.getPathConfigParameter('rustLangSrcPath');
            const configPathExists = configPath !== undefined && (yield this.checkPathExists(configPath));
            if (configPathExists) {
                return configPath;
            }
            const envPath = this.getPathEnvParameter('RUST_SRC_PATH');
            const envPathExists = envPath !== undefined && (yield this.checkPathExists(envPath));
            if (envPathExists) {
                return envPath;
            }
            if (!rustcSysRoot) {
                return undefined;
            }
            if (!rustcSysRoot.includes('.rustup')) {
                return undefined;
            }
            const rustupPath = path_1.join(rustcSysRoot, 'lib', 'rustlib', 'src', 'rust', 'src');
            const rustupPathExists = yield this.checkPathExists(rustupPath);
            if (rustupPathExists) {
                return rustupPath;
            }
            else {
                return undefined;
            }
        });
    }
    static checkPathExists(path) {
        return new Promise(resolve => {
            fs_1.access(path, err => {
                const pathExists = !err;
                resolve(pathExists);
            });
        });
    }
    constructor(rustcSysRoot, rustSourcePath) {
        this.rustcSysRoot = rustcSysRoot;
        this.rustSourcePath = rustSourcePath;
    }
    static getStringParameter(parameterName) {
        const configuration = vscode_1.workspace.getConfiguration('rust');
        const parameter = configuration[parameterName];
        return parameter;
    }
    static getPathConfigParameter(parameterName) {
        const parameter = this.getStringParameter(parameterName);
        if (parameter) {
            return expandTilde(parameter);
        }
        else {
            return undefined;
        }
    }
    static getPathEnvParameter(parameterName) {
        const parameter = process.env[parameterName];
        if (parameter) {
            return expandTilde(parameter);
        }
        else {
            return undefined;
        }
    }
}
exports.ConfigurationManager = ConfigurationManager;
//# sourceMappingURL=configuration_manager.js.map