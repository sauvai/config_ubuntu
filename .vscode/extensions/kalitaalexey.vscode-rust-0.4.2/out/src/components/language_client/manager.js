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
const vscode_languageclient_1 = require("vscode-languageclient");
const creator_1 = require("./creator");
const status_bar_item_1 = require("./status_bar_item");
class Manager {
    constructor(context, logger, executable, args, env, revealOutputChannelOn) {
        this.languageClientCreator = new creator_1.Creator(executable, args, env, revealOutputChannelOn, () => {
            this.statusBarItem.setText('Crashed');
        });
        this.languageClient = this.languageClientCreator.create();
        this.statusBarItem = new status_bar_item_1.StatusBarItem(context);
        this.statusBarItem.setOnClicked(() => {
            this.restart();
        });
        this.logger = logger;
        this.subscribeOnStateChanging();
        context.subscriptions.push(new vscode_1.Disposable(() => {
            this.stop();
        }));
    }
    /**
     * Starts the language client at first time
     */
    initialStart() {
        this.start();
        this.statusBarItem.show();
    }
    start() {
        this.logger.debug('start');
        this.languageClient.start();
        // As we started the language client, we need to enable the indicator in order to allow the user restart the language client.
        this.statusBarItem.setText('Starting');
        this.statusBarItem.enable();
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('stop');
            this.statusBarItem.disable();
            this.statusBarItem.setText('Stopping');
            if (this.languageClient.needsStop()) {
                yield this.languageClient.stop();
            }
            this.languageClient.outputChannel.dispose();
            this.statusBarItem.setText('Stopped');
        });
    }
    /** Stops the running language client if any and starts a new one. */
    restart() {
        return __awaiter(this, void 0, void 0, function* () {
            const isAnyDocumentDirty = !vscode_1.workspace.textDocuments.every(t => !t.isDirty);
            if (isAnyDocumentDirty) {
                vscode_1.window.showErrorMessage('You have unsaved changes. Save or discard them and try to restart again');
                return;
            }
            yield this.stop();
            this.languageClient = this.languageClientCreator.create();
            this.subscribeOnStateChanging();
            this.start();
        });
    }
    subscribeOnStateChanging() {
        this.languageClient.onDidChangeState(event => {
            if (event.newState === vscode_languageclient_1.State.Running) {
                this.languageClient.onNotification('rustDocument/diagnosticsBegin', () => {
                    this.statusBarItem.setText('Analysis started');
                });
                this.languageClient.onNotification('rustDocument/diagnosticsEnd', () => {
                    this.statusBarItem.setText('Analysis finished');
                });
            }
        });
    }
}
exports.Manager = Manager;
//# sourceMappingURL=manager.js.map