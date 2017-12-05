'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const configuration_1 = require("./configuration");
const constants_1 = require("./constants");
const telemetry_1 = require("./telemetry");
const ConsolePrefix = `[${constants_1.ExtensionOutputChannelName}]`;
var OutputLevel;
(function (OutputLevel) {
    OutputLevel["Silent"] = "silent";
    OutputLevel["Errors"] = "errors";
    OutputLevel["Verbose"] = "verbose";
})(OutputLevel = exports.OutputLevel || (exports.OutputLevel = {}));
class Logger {
    static configure(context) {
        context.subscriptions.push(configuration_1.configuration.onDidChange(this.onConfigurationChanged, this));
        this.onConfigurationChanged(configuration_1.configuration.initializingChangeEvent);
    }
    static onConfigurationChanged(e) {
        const initializing = configuration_1.configuration.initializing(e);
        let section = configuration_1.configuration.name('debug').value;
        if (initializing || configuration_1.configuration.changed(e, section)) {
            this.debug = configuration_1.configuration.get(section);
        }
        section = configuration_1.configuration.name('outputLevel').value;
        if (initializing || configuration_1.configuration.changed(e, section)) {
            this.level = configuration_1.configuration.get(section);
            if (this.level === OutputLevel.Silent) {
                if (this.output !== undefined) {
                    this.output.dispose();
                    this.output = undefined;
                }
            }
            else {
                this.output = this.output || vscode_1.window.createOutputChannel(constants_1.ExtensionOutputChannelName);
            }
        }
    }
    static log(message, ...params) {
        if (this.debug) {
            console.log(this.timestamp, ConsolePrefix, message, ...params);
        }
        if (this.output !== undefined && this.level === OutputLevel.Verbose) {
            this.output.appendLine((this.debug ? [this.timestamp, message, ...params] : [message, ...params]).join(' '));
        }
    }
    static error(ex, classOrMethod, ...params) {
        if (this.debug) {
            console.error(this.timestamp, ConsolePrefix, classOrMethod, ex, ...params);
        }
        if (this.output !== undefined && this.level !== OutputLevel.Silent) {
            this.output.appendLine((this.debug ? [this.timestamp, classOrMethod, ex, ...params] : [classOrMethod, ex, ...params]).join(' '));
        }
        telemetry_1.Telemetry.trackException(ex);
    }
    static warn(message, ...params) {
        if (this.debug) {
            console.warn(this.timestamp, ConsolePrefix, message, ...params);
        }
        if (this.output !== undefined && this.level !== OutputLevel.Silent) {
            this.output.appendLine((this.debug ? [this.timestamp, message, ...params] : [message, ...params]).join(' '));
        }
    }
    static get timestamp() {
        const now = new Date();
        return `[${now.toISOString().replace(/T/, ' ').replace(/\..+/, '')}:${('00' + now.getUTCMilliseconds()).slice(-3)}]`;
    }
}
Logger.debug = false;
Logger.level = OutputLevel.Silent;
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map