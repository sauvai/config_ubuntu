"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
class RacerStatusBarItem {
    constructor(showErrorCommandName) {
        this.showErrorCommandName = showErrorCommandName;
        this.statusBarItem = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left);
    }
    showTurnedOn() {
        this.setText('On');
        this.clearCommand();
        this.statusBarItem.show();
    }
    showTurnedOff() {
        this.setText('Off');
        this.clearCommand();
        this.statusBarItem.show();
    }
    showNotFound() {
        this.setText('Not found');
        this.clearCommand();
        this.statusBarItem.tooltip =
            'The "racer" command is not available. Make sure it is installed.';
        this.statusBarItem.show();
    }
    showCrashed() {
        this.setText('Crashed');
        this.statusBarItem.tooltip = 'The racer process has stopped. Click to view error';
        this.statusBarItem.command = this.showErrorCommandName;
        this.statusBarItem.show();
    }
    setText(text) {
        this.statusBarItem.text = `Racer: ${text}`;
    }
    clearCommand() {
        // It is workaround because currently the typoe of StatusBarItem.command is string.
        const statusBarItem = this.statusBarItem;
        statusBarItem.command = undefined;
    }
}
exports.RacerStatusBarItem = RacerStatusBarItem;
//# sourceMappingURL=racer_status_bar_item.js.map