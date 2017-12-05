"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const mod_1 = require("../configuration/mod");
class MissingToolsStatusBarItem {
    constructor(context, statusBarItemCommand) {
        this.statusBarItem = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Right);
        this.statusBarItem.color = 'yellow';
        this.statusBarItem.command = statusBarItemCommand;
        this.statusBarItem.text = 'Rust Tools Missing';
        this.statusBarItem.tooltip = 'Missing Rust tools';
        this.canBeShown = false;
        context.subscriptions.push(vscode_1.window.onDidChangeActiveTextEditor(() => {
            this.updateStatusBarItemVisibility();
        }));
    }
    show() {
        this.statusBarItem.show();
        this.canBeShown = true;
    }
    hide() {
        this.statusBarItem.hide();
        this.canBeShown = false;
    }
    updateStatusBarItemVisibility() {
        if (!this.canBeShown) {
            return;
        }
        if (!vscode_1.window.activeTextEditor) {
            this.statusBarItem.hide();
            return;
        }
        if (vscode_1.languages.match(mod_1.getDocumentFilter(), vscode_1.window.activeTextEditor.document)) {
            this.statusBarItem.show();
        }
        else {
            this.statusBarItem.hide();
        }
    }
}
exports.MissingToolsStatusBarItem = MissingToolsStatusBarItem;
//# sourceMappingURL=missing_tools_status_bar_item.js.map