'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const util_1 = require("./util");
exports.LogLevel = {
    Verbose: 'verbose',
    Normal: 'normal',
    Minimal: 'minimal'
};
class Logger {
    constructor() {
        this.currentLevel = exports.LogLevel.Normal;
    }
    get logChannel() {
        if (!this._logChannel) {
            this._logChannel = util_1.outputChannels.get('CMake/Build');
        }
        return this._logChannel;
    }
    onConfigurationChanged() {
        const newLevel = vscode.workspace.getConfiguration('cmake').get('loggingLevel');
        if (newLevel)
            this.currentLevel = newLevel;
    }
    initialize(context) {
        vscode.workspace.onDidChangeConfiguration(this.onConfigurationChanged, this, context.subscriptions);
        this.onConfigurationChanged();
    }
    error(message) {
        console.error(message);
        this.logChannel.appendLine(message);
    }
    info(message) {
        console.info(message);
        if (this.currentLevel !== exports.LogLevel.Minimal) {
            this.logChannel.appendLine(message);
        }
    }
    verbose(message) {
        console.log(message);
        if (this.currentLevel === exports.LogLevel.Verbose) {
            this.logChannel.appendLine(message);
        }
    }
}
exports.Logger = Logger;
// TODO: Use global object for now (following current config pattern).
// change to some factory later for DI/testing.
exports.log = new Logger();
//# sourceMappingURL=logging.js.map