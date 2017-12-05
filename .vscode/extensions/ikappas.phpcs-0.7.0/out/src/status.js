/* --------------------------------------------------------------------------------------------
 * Copyright (c) Ioannis Kappas. All rights reserved.
 * Licensed under the MIT License. See License.md in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
"use strict";
const vscode_1 = require("vscode");
class Timer {
    /**
     * Class constructor.
     *
     * @return self.
     */
    constructor(tick) {
        /**
         * Frequency of elapse event of the timer in millisecond
         */
        this.interval = 1000;
        /**
         * A boolean flag indicating whether the timer is enabled.
         *
         * @var boolean
         */
        this.enable = false;
        this.tick = tick;
    }
    /**
     * Start the timer.
     */
    start() {
        this.enable = true;
        if (this.enable) {
            this.handle = setInterval(() => {
                this.tick();
            }, this.interval);
        }
    }
    ;
    /**
     * Stop the timer.
     */
    stop() {
        this.enable = false;
        if (this.handle) {
            clearInterval(this.handle);
        }
    }
    ;
    /**
     * Dispose the timer.
     */
    dispose() {
        if (this.handle) {
            clearInterval(this.handle);
        }
    }
}
;
class PhpcsStatus {
    constructor() {
        this.documents = [];
        this.processing = 0;
        this.spinnerIndex = 0;
        this.spinnerSquense = ["|", "/", "-", "\\"];
    }
    startProcessing(uri) {
        this.documents.push(uri);
        this.processing += 1;
        this.getTimer().start();
        this.getOutputChannel().appendLine(`linting started on: ${uri}`);
        this.getStatusBarItem().show();
    }
    endProcessing(uri) {
        this.processing -= 1;
        let index = this.documents.indexOf(uri);
        if (index !== undefined) {
            this.documents.slice(index, 1);
            this.getOutputChannel().appendLine(`linting completed on: ${uri}`);
        }
        if (this.processing === 0) {
            this.getTimer().stop();
            this.getStatusBarItem().hide();
            this.updateStatusText();
        }
    }
    updateStatusText() {
        let sbar = this.getStatusBarItem();
        let count = this.processing;
        if (count > 0) {
            let spinner = this.getNextSpinnerChar();
            sbar.text = count === 1 ? `$(eye) phpcs is linting 1 document ... ${spinner}` : `$(eye) phpcs is linting ${count} documents ... ${spinner}`;
        }
        else {
            sbar.text = "";
        }
    }
    getNextSpinnerChar() {
        let spinnerChar = this.spinnerSquense[this.spinnerIndex];
        this.spinnerIndex += 1;
        if (this.spinnerIndex > this.spinnerSquense.length - 1) {
            this.spinnerIndex = 0;
        }
        return spinnerChar;
    }
    getTimer() {
        if (!this.timer) {
            this.timer = new Timer(() => {
                this.updateStatusText();
            });
            this.timer.interval = 100;
        }
        return this.timer;
    }
    getStatusBarItem() {
        // Create as needed
        if (!this.statusBarItem) {
            this.statusBarItem = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left);
        }
        return this.statusBarItem;
    }
    getOutputChannel() {
        if (!this.outputChannel) {
            this.outputChannel = vscode_1.window.createOutputChannel("phpcs");
        }
        return this.outputChannel;
    }
    dispose() {
        if (this.statusBarItem) {
            this.statusBarItem.dispose();
        }
        if (this.timer) {
            this.timer.dispose();
        }
    }
}
exports.PhpcsStatus = PhpcsStatus;
//# sourceMappingURL=status.js.map