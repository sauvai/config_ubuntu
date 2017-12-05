'use strict';
var vscode = require('vscode');
var path = require('path');
function activate(context) {
    var disposable = vscode.commands.registerCommand('terminalHere.create', function () {
        var editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        var document = editor.document;
        if (!document) {
            return;
        }
        var uri = document.uri;
        if (!uri) {
            return;
        }
        var dir = path.dirname(uri.fsPath);
        var terminal = vscode.window.createTerminal();
        terminal.show(false);
        terminal.sendText("cd \"" + dir + "\"");
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map