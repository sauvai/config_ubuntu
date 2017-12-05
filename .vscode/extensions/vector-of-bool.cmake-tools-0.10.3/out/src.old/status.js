"use strict";
const vscode = require('vscode');
function setVisible(i, v) {
    if (v) {
        i.show();
    }
    else {
        i.hide();
    }
}
class StatusBar {
    constructor() {
        this._cmakeToolsStatusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3.5);
        this._buildButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3.4);
        this._targetButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3.3);
        this._debugButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3.2);
        this._debugTargetButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3.1);
        this._testStatusButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3.05);
        this._warningMessage = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3);
        this._environmentSelectionButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 200);
        /**
         * Whether the status bar items are visible
         */
        this._visible = true;
        /**
         * The name of the open project
         */
        this._projectName = 'Unconfigured Project';
        /**
         * The build type label. Determined by the active build variant
         */
        this._buildTypeLabel = 'Unconfigured';
        /**
         * The message shown in the primary status button. Tells the user what the
         * extension is currently up to.
         */
        this._statusMessage = 'Loading...';
        /**
         * Whether or not to show a 'Build' or 'Stop' button. Changes the content
         * of the button and the command that is executed when the button is pressed
         */
        this._isBusy = false;
        /**
         * The progress of the currently executing task. Updates a primitive progress
         * bar.
         */
        this._progress = null;
        /**
         * The name of the target that will be debugged
         */
        this._launchTargetName = '';
        this._testResults = { passing: 0, total: 0 };
        this._ctestEnabled = false;
        this._haveTestResults = false;
        this._environmentsAvailable = false;
        this._activeEnvironments = [];
        this._cmakeToolsStatusItem.command = 'cmake.setBuildType';
        this._cmakeToolsStatusItem.tooltip =
            'Click to select the current build type';
        this._testStatusButton.command = 'cmake.ctest';
        this._testStatusButton.tooltip = 'Click to execute CTest tests';
        this._buildButton.command = 'cmake.build';
        this._targetButton.command = 'cmake.setDefaultTarget';
        this._targetButton.tooltip = 'Click to change the active build target';
        this._debugButton.command = 'cmake.debugTarget';
        this._debugButton.tooltip =
            'Click to launch the debugger for the selected target';
        this._debugTargetButton.command = 'cmake.selectLaunchTarget';
        this._debugTargetButton.tooltip = 'Click to select a target for debugging';
        this._environmentSelectionButton.command = 'cmake.selectEnvironments';
        this._environmentSelectionButton.tooltip =
            'Click to change the active build environments';
        this.reloadVisibility();
    }
    dispose() {
        for (const item of [
            this._cmakeToolsStatusItem,
            this._buildButton,
            this._targetButton,
            this._debugButton,
            this._debugTargetButton,
            this._testStatusButton,
            this._warningMessage,
            this._environmentSelectionButton,
        ]) {
            item.dispose();
        }
    }
    reloadVisibility() {
        const hide = (i) => i.hide();
        const show = (i) => i.show();
        for (const item of [this._cmakeToolsStatusItem, this._buildButton,
            this._targetButton, this._testStatusButton,
            this._debugTargetButton, this._environmentSelectionButton]) {
            setVisible(item, this.visible && !!item.text);
        }
        // Debug button is only visible if cpptools is also installed
        setVisible(this._debugButton, this.visible && vscode.extensions.getExtension('ms-vscode.cpptools') !== undefined
            && !!this._debugButton.text);
    }
    get visible() {
        return this._visible;
    }
    set visible(v) {
        this._visible = v;
        this.reloadVisibility();
    }
    _reloadStatusButton() {
        this._cmakeToolsStatusItem.text =
            `CMake: ${this.projectName}: ${this.buildTypeLabel}: ${this.statusMessage}`;
    }
    get projectName() {
        return this._projectName;
    }
    set projectName(v) {
        this._projectName = v;
        this._reloadStatusButton();
    }
    get buildTypeLabel() {
        return this._buildTypeLabel;
    }
    set buildTypeLabel(v) {
        this._buildTypeLabel = v;
        this._reloadStatusButton();
    }
    get statusMessage() {
        return this._statusMessage;
    }
    set statusMessage(v) {
        this._statusMessage = v;
        this._reloadStatusButton();
    }
    /** Reloads the content of the build button */
    _reloadBuildButton() {
        this._buildButton.text = ``;
        let progress_bar = '';
        const prog = this.progress;
        if (prog !== null) {
            const bars = prog * 0.4 | 0;
            progress_bar =
                ` [${Array(bars).join('█')}${Array(40 - bars).join('░')}] ${prog}%`;
        }
        this._buildButton.text =
            this.isBusy ? `$(x) Stop${progress_bar}` : `$(gear) Build:`;
        this._buildButton.command = this.isBusy ? 'cmake.stop' : 'cmake.build';
        if (this.isBusy) {
            this._buildButton.show();
        }
    }
    get isBusy() {
        return this._isBusy;
    }
    set isBusy(v) {
        this._isBusy = v;
        this._reloadBuildButton();
    }
    _reloadTargetButton() {
        this._targetButton.text = this.targetName;
    }
    get targetName() {
        return this._targetName;
    }
    set targetName(v) {
        this._targetName = v;
        this._reloadTargetButton();
    }
    get progress() {
        return this._progress;
    }
    set progress(v) {
        this._progress = v;
        this._reloadBuildButton();
    }
    _reloadDebugButton() {
        if (!this.launchTargetName) {
            this._debugButton.text = '$(bug)';
            this._debugTargetButton.hide();
        }
        else {
            this._debugButton.text = '$(bug) Debug';
            this._debugTargetButton.text = this.launchTargetName;
            if (this.visible) {
                this._debugTargetButton.show();
            }
        }
        this.reloadVisibility();
    }
    get launchTargetName() {
        return this._launchTargetName;
    }
    set launchTargetName(v) {
        this._launchTargetName = v;
        this._reloadDebugButton();
    }
    _reloadTestButton() {
        if (!this.ctestEnabled) {
            this._testStatusButton.hide();
            return;
        }
        if (this.visible) {
            this._testStatusButton.show();
        }
        if (!this.haveTestResults) {
            this._testStatusButton.text = 'Run CTest';
            this._testStatusButton.color = '';
            return;
        }
        const passing = this.testResults.passing;
        const total = this.testResults.total;
        const good = passing == total;
        const icon = good ? 'check' : 'x';
        this._testStatusButton.text = `$(${icon}) ${passing}/${total} ` +
            (total == 1 ? 'test' : 'tests') + ' passing';
        this._testStatusButton.color = good ? 'lightgreen' : 'yellow';
    }
    get testResults() {
        return this._testResults;
    }
    set testResults(v) {
        this._testResults = v;
        this._reloadTestButton();
    }
    get ctestEnabled() {
        return this._ctestEnabled;
    }
    set ctestEnabled(v) {
        this._ctestEnabled = v;
        this._reloadTestButton();
    }
    get haveTestResults() {
        return this._haveTestResults;
    }
    set haveTestResults(v) {
        this._haveTestResults = v;
        this._reloadTestButton();
    }
    _reloadEnvironmentsButton() {
        if (this.environmentsAvailable) {
            if (this.activeEnvironments.length) {
                this._environmentSelectionButton.text =
                    `Working in ${this.activeEnvironments.join(', ')}`;
            }
            else {
                this._environmentSelectionButton.text = 'Select a build environment...';
            }
            this.reloadVisibility();
        }
        else {
            this._environmentSelectionButton.hide();
        }
    }
    get environmentsAvailable() {
        return this._environmentsAvailable;
    }
    set environmentsAvailable(v) {
        this._environmentsAvailable = v;
        this._reloadEnvironmentsButton();
    }
    get activeEnvironments() {
        return this._activeEnvironments;
    }
    set activeEnvironments(v) {
        this._activeEnvironments = v;
        this._reloadEnvironmentsButton();
    }
    showWarningMessage(msg) {
        this._warningMessage.color = 'yellow';
        this._warningMessage.text = `$(alert) ${msg}`;
        this._warningMessage.show();
        setTimeout(() => this._warningMessage.hide(), 5000);
    }
}
exports.StatusBar = StatusBar;
//# sourceMappingURL=status.js.map