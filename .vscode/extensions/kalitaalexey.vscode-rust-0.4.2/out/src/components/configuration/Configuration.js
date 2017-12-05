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
const vscode_1 = require("vscode");
const expandTilde = require("expand-tilde");
const FileSystem_1 = require("../file_system/FileSystem");
var ActionOnStartingCommandIfThereIsRunningCommand;
(function (ActionOnStartingCommandIfThereIsRunningCommand) {
    ActionOnStartingCommandIfThereIsRunningCommand[ActionOnStartingCommandIfThereIsRunningCommand["StopRunningCommand"] = 0] = "StopRunningCommand";
    ActionOnStartingCommandIfThereIsRunningCommand[ActionOnStartingCommandIfThereIsRunningCommand["IgnoreNewCommand"] = 1] = "IgnoreNewCommand";
    ActionOnStartingCommandIfThereIsRunningCommand[ActionOnStartingCommandIfThereIsRunningCommand["ShowDialogToLetUserDecide"] = 2] = "ShowDialogToLetUserDecide";
})(ActionOnStartingCommandIfThereIsRunningCommand = exports.ActionOnStartingCommandIfThereIsRunningCommand || (exports.ActionOnStartingCommandIfThereIsRunningCommand = {}));
var Mode;
(function (Mode) {
    Mode[Mode["Legacy"] = 0] = "Legacy";
    Mode[Mode["RLS"] = 1] = "RLS";
})(Mode = exports.Mode || (exports.Mode = {}));
/**
 * Returns the representation of the specified mode suitable for being a value for the
 * configuration parameter
 * @param mode The mode which representation will be returned for
 * @return The representation of the specified mode
 */
function asConfigurationParameterValue(mode) {
    switch (mode) {
        case Mode.Legacy:
            return 'legacy';
        case Mode.RLS:
            return 'rls';
        case undefined:
            return null;
    }
}
exports.asConfigurationParameterValue = asConfigurationParameterValue;
var Properties;
(function (Properties) {
    Properties.mode = 'mode';
})(Properties || (Properties = {}));
/**
 * The main class of the component `Configuration`.
 * This class contains code related to Configuration
 */
class Configuration {
    static getConfiguration() {
        const configuration = vscode_1.workspace.getConfiguration('rust');
        return configuration;
    }
    static getPathConfigParameter(parameterName) {
        const parameter = this.getStringConfigParameter(parameterName);
        if (parameter) {
            return expandTilde(parameter);
        }
        else {
            return undefined;
        }
    }
    static getPathConfigParameterOrDefault(parameterName, defaultValue) {
        const parameter = this.getPathConfigParameter(parameterName);
        if (typeof parameter === 'string') {
            return parameter;
        }
        else {
            return defaultValue;
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
    static getStringConfigParameter(parameterName) {
        const configuration = vscode_1.workspace.getConfiguration('rust');
        const parameter = configuration.get(parameterName);
        return parameter;
    }
    /**
     * Creates a new instance of the class.
     * @param logger A value for the field `logger`
     */
    constructor(logger) {
        function mode() {
            const configuration = Configuration.getConfiguration();
            const value = configuration[Properties.mode];
            if (typeof value === 'string') {
                switch (value) {
                    case asConfigurationParameterValue(Mode.Legacy):
                        return Mode.Legacy;
                    case asConfigurationParameterValue(Mode.RLS):
                        return Mode.RLS;
                    default:
                        return undefined;
                }
            }
            else {
                return undefined;
            }
        }
        this._mode = mode();
        this.logger = logger;
        this.racerPath = undefined;
    }
    /**
     * Updates the value of the field `pathToRacer`.
     * It checks if a user specified any path in the configuration.
     * If no path specified or a specified path can't be used, it finds in directories specified in the environment variable PATH.
     * This method is asynchronous because it checks if a path exists before setting it to the field
     */
    updatePathToRacer() {
        return __awaiter(this, void 0, void 0, function* () {
            function findRacerPathSpecifiedByUser(logger) {
                return __awaiter(this, void 0, void 0, function* () {
                    const methodLogger = logger.createChildLogger('findRacerPathSpecifiedByUser: ');
                    let path = Configuration.getPathConfigParameter('racerPath');
                    if (!path) {
                        methodLogger.debug(`path=${path}`);
                        return undefined;
                    }
                    path = expandTilde(path);
                    methodLogger.debug(`path=${path}`);
                    const foundPath = yield FileSystem_1.FileSystem.findExecutablePath(path);
                    methodLogger.debug(`foundPath=${foundPath}`);
                    return foundPath;
                });
            }
            function findDefaultRacerPath(logger) {
                return __awaiter(this, void 0, void 0, function* () {
                    const methodLogger = logger.createChildLogger('findDefaultRacerPath: ');
                    const foundPath = yield FileSystem_1.FileSystem.findExecutablePath('racer');
                    methodLogger.debug(`foundPath=${foundPath}`);
                    return foundPath;
                });
            }
            const logger = this.logger.createChildLogger('updatePathToRacer: ');
            this.racerPath = ((yield findRacerPathSpecifiedByUser(logger)) ||
                (yield findDefaultRacerPath(logger)));
        });
    }
    /**
     * Returns the mode which the extension runs in
     * @return The mode
     */
    mode() {
        return this._mode;
    }
    /**
     * Saves the specified mode in both the object and the configuration
     * @param mode The mode
     */
    setMode(mode) {
        this._mode = mode;
        const configuration = Configuration.getConfiguration();
        configuration.update(Properties.mode, asConfigurationParameterValue(mode), true);
    }
    /**
     * Returns a value of the field `pathToRacer`
     */
    getPathToRacer() {
        return this.racerPath;
    }
    shouldExecuteCargoCommandInTerminal() {
        // When RLS is used any cargo command is executed in an integrated terminal.
        if (this.mode() === Mode.RLS) {
            return true;
        }
        const configuration = Configuration.getConfiguration();
        const shouldExecuteCargoCommandInTerminal = configuration['executeCargoCommandInTerminal'];
        return shouldExecuteCargoCommandInTerminal;
    }
    getActionOnSave() {
        return Configuration.getStringConfigParameter('actionOnSave');
    }
    shouldShowRunningCargoTaskOutputChannel() {
        const configuration = Configuration.getConfiguration();
        const shouldShowRunningCargoTaskOutputChannel = configuration['showOutput'];
        return shouldShowRunningCargoTaskOutputChannel;
    }
    getCargoEnv() {
        return Configuration.getConfiguration().get('cargoEnv');
    }
    getCargoCwd() {
        return Configuration.getPathConfigParameter('cargoCwd');
    }
    getCargoHomePath() {
        const configPath = Configuration.getPathConfigParameter('cargoHomePath');
        const envPath = Configuration.getPathEnvParameter('CARGO_HOME');
        return configPath || envPath || undefined;
    }
    getRustfmtPath() {
        return Configuration.getPathConfigParameterOrDefault('rustfmtPath', 'rustfmt');
    }
    getRustsymPath() {
        return Configuration.getPathConfigParameterOrDefault('rustsymPath', 'rustfmt');
    }
    getActionOnStartingCommandIfThereIsRunningCommand() {
        const configuration = Configuration.getConfiguration();
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
}
exports.Configuration = Configuration;
//# sourceMappingURL=Configuration.js.map