"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageclient_1 = require("vscode-languageclient");
class ErrorHandler {
    constructor(onClosed) {
        this.onClosed = onClosed;
    }
    error() {
        return vscode_languageclient_1.ErrorAction.Continue;
    }
    closed() {
        this.onClosed();
        return vscode_languageclient_1.CloseAction.DoNotRestart;
    }
}
class Creator {
    constructor(executable, args, env, revealOutputChannelOn, onClosed) {
        this.clientOptions = {
            documentSelector: ['rust'],
            revealOutputChannelOn,
            errorHandler: new ErrorHandler(onClosed)
        };
        this.serverOptions = {
            command: executable,
            args,
            options: {
                env: Object.assign({}, process.env, env ? env : {})
            }
        };
    }
    create() {
        return new vscode_languageclient_1.LanguageClient('Rust Language Server', this.serverOptions, this.clientOptions);
    }
}
exports.Creator = Creator;
//# sourceMappingURL=creator.js.map