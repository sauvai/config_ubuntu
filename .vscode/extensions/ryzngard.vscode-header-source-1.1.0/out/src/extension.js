'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fileOperations_1 = require("./fileOperations");
const codeOperations_1 = require("./codeOperations");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    let disposable = vscode.commands.registerCommand('extension.switch', () => __awaiter(this, void 0, void 0, function* () {
        let activeTextEditor = vscode.window.activeTextEditor;
        let document = activeTextEditor.document;
        fileOperations_1.findMatchedFileAsync(document.fileName).then((fileToOpen) => {
            if (fileToOpen) {
                codeOperations_1.openFile(fileToOpen);
            }
        });
    }));
    context.subscriptions.push(disposable);
    let switchNewPaneDisposable = vscode.commands.registerCommand('extension.switchRightPane', () => __awaiter(this, void 0, void 0, function* () {
        let activeTextEditor = vscode.window.activeTextEditor;
        let document = activeTextEditor.document;
        fileOperations_1.findMatchedFileAsync(document.fileName).then((fileToOpen) => {
            if (fileToOpen) {
                codeOperations_1.openFileInRightPane(fileToOpen);
            }
        });
    }));
    context.subscriptions.push(switchNewPaneDisposable);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map