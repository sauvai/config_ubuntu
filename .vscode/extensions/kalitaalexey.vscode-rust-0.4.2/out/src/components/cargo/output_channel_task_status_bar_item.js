"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const elegantSpinner = require("elegant-spinner");
const vscode_1 = require("vscode");
class OutputChannelTaskStatusBarItem {
    constructor(stopCommandName) {
        this.stopStatusBarItem = vscode_1.window.createStatusBarItem();
        this.stopStatusBarItem.command = stopCommandName;
        this.stopStatusBarItem.text = 'Stop';
        this.stopStatusBarItem.tooltip = 'Click to stop running cargo task';
        this.spinnerStatusBarItem = vscode_1.window.createStatusBarItem();
        this.spinnerStatusBarItem.tooltip = 'Cargo task is running';
    }
    show() {
        this.stopStatusBarItem.show();
        this.spinnerStatusBarItem.show();
        const spinner = elegantSpinner();
        const update = () => {
            this.spinnerStatusBarItem.text = spinner();
        };
        this.interval = setInterval(update, 100);
    }
    hide() {
        if (this.interval !== undefined) {
            clearInterval(this.interval);
            this.interval = undefined;
        }
        this.stopStatusBarItem.hide();
        this.spinnerStatusBarItem.hide();
    }
}
exports.OutputChannelTaskStatusBarItem = OutputChannelTaskStatusBarItem;
//# sourceMappingURL=output_channel_task_status_bar_item.js.map