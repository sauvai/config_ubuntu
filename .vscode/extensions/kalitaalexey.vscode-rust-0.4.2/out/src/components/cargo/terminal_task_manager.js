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
const CommandLine_1 = require("../../CommandLine");
class TerminalTaskManager {
    constructor(context, configuration) {
        this._configuration = configuration;
        context.subscriptions.push(vscode_1.window.onDidCloseTerminal(closedTerminal => {
            if (closedTerminal === this._runningTerminal) {
                this._runningTerminal = undefined;
            }
        }));
    }
    /**
     * Returns whether some task is running
     */
    hasRunningTask() {
        return this._runningTerminal !== undefined;
    }
    stopRunningTask() {
        if (this._runningTerminal) {
            this._runningTerminal.dispose();
            this._runningTerminal = undefined;
        }
    }
    startTask(executable, preCommandArgs, command, args, cwd) {
        return __awaiter(this, void 0, void 0, function* () {
            args = preCommandArgs.concat(command, ...args);
            const terminal = vscode_1.window.createTerminal('Cargo Task');
            this._runningTerminal = terminal;
            const shell = CommandLine_1.parseShell(vscode_1.workspace.getConfiguration('terminal')['integrated']['shell']['windows']);
            const setEnvironmentVariables = () => {
                const cargoEnv = this._configuration.getCargoEnv();
                // Set environment variables
                for (const name in cargoEnv) {
                    if (name in cargoEnv) {
                        const value = cargoEnv[name];
                        terminal.sendText(CommandLine_1.getCommandToSetEnvVar(shell, name, value));
                    }
                }
            };
            setEnvironmentVariables();
            // Change the current directory to a specified directory
            this._runningTerminal.sendText(CommandLine_1.getCommandForArgs(shell, ['cd', cwd]));
            // Start a requested command
            this._runningTerminal.sendText(CommandLine_1.getCommandForArgs(shell, [executable, ...args]));
            this._runningTerminal.show(true);
        });
    }
}
exports.TerminalTaskManager = TerminalTaskManager;
//# sourceMappingURL=terminal_task_manager.js.map