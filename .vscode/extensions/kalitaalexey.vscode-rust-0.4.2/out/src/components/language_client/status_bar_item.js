"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const command = 'rust.LanguageClient.StatusBarItem.Clicked';
class StatusBarItem {
    constructor(context) {
        this.statusBarItem = vscode_1.window.createStatusBarItem();
        context.subscriptions.push(vscode_1.commands.registerCommand(command, () => {
            if (this.onClicked !== undefined) {
                this.onClicked();
            }
        }));
    }
    /**
     * Disallows the user to click on the indicator
     */
    disable() {
        // There is an error in the definition of StatusBarItem.command.
        // The expected type is `string | undefined`, but actual is `string`.
        // This is workaround.
        const statusBarItem = this.statusBarItem;
        // Disable clicking.
        statusBarItem.command = undefined;
        // Remove tooltip because we don't want to say the user that we may click on the indicator which is disabled
        statusBarItem.tooltip = undefined;
    }
    /**
     * Allows the user to click on the indicator
     */
    enable() {
        this.statusBarItem.command = command;
        this.statusBarItem.tooltip = 'Click to restart';
    }
    /**
     * Saves the specified closure as a closure which is invoked when the user clicks on the indicator
     * @param onClicked closure to be invoked
     */
    setOnClicked(onClicked) {
        this.onClicked = onClicked;
    }
    /**
     * Makes the indicator show the specified text in the format "RLS: ${text}"
     * @param text the text to be shown
     */
    setText(text) {
        this.statusBarItem.text = `RLS: ${text}`;
    }
    /**
     * Shows the indicator in the status bar
     */
    show() {
        this.statusBarItem.show();
    }
}
exports.StatusBarItem = StatusBarItem;
//# sourceMappingURL=status_bar_item.js.map