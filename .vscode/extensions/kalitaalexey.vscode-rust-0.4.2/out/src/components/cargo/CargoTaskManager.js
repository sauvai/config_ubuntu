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
const path_1 = require("path");
const vscode_1 = require("vscode");
const CommandInvocationReason_1 = require("./CommandInvocationReason");
const CrateType_1 = require("./CrateType");
const helper_1 = require("./helper");
const output_channel_task_manager_1 = require("./output_channel_task_manager");
const terminal_task_manager_1 = require("./terminal_task_manager");
const UserDefinedArgs_1 = require("./UserDefinedArgs");
class CargoTaskManager {
    constructor(context, configuration, cargoInvocationManager, currentWorkingDirectoryManager, logger, stopCommandName) {
        this._configuration = configuration;
        this._cargoInvocationManager = cargoInvocationManager;
        this._currentWorkingDirectoryManager = currentWorkingDirectoryManager;
        this._logger = logger;
        this._outputChannelTaskManager = new output_channel_task_manager_1.OutputChannelTaskManager(configuration, logger.createChildLogger('OutputChannelTaskManager: '), stopCommandName);
        this._terminalTaskManager = new terminal_task_manager_1.TerminalTaskManager(context, configuration);
    }
    invokeCargoInit(crateType, name, workingDirectory) {
        return __awaiter(this, void 0, void 0, function* () {
            const args = ['--name', name];
            switch (crateType) {
                case CrateType_1.CrateType.Application:
                    args.push('--bin');
                    break;
                case CrateType_1.CrateType.Library:
                    args.push('--lib');
                    break;
                default:
                    throw new Error(`Unhandled crate type=${crateType}`);
            }
            yield this.processRequestToStartTask('init', args, workingDirectory, true, CommandInvocationReason_1.CommandInvocationReason.CommandExecution, false, false, false);
        });
    }
    invokeCargoBuildWithArgs(args, reason) {
        this.runCargo('build', args, true, reason);
    }
    invokeCargoBuildUsingBuildArgs(reason) {
        this.invokeCargoBuildWithArgs(UserDefinedArgs_1.UserDefinedArgs.getBuildArgs(), reason);
    }
    invokeCargoCheckWithArgs(args, reason) {
        this.runCargo('check', args, true, reason);
    }
    invokeCargoCheckUsingCheckArgs(reason) {
        this.invokeCargoCheckWithArgs(UserDefinedArgs_1.UserDefinedArgs.getCheckArgs(), reason);
    }
    invokeCargoClippyWithArgs(args, reason) {
        this.runCargo('clippy', args, true, reason);
    }
    invokeCargoClippyUsingClippyArgs(reason) {
        this.invokeCargoClippyWithArgs(UserDefinedArgs_1.UserDefinedArgs.getClippyArgs(), reason);
    }
    invokeCargoDocWithArgs(args, reason) {
        this.runCargo('doc', args, true, reason);
    }
    invokeCargoDocUsingDocArgs(reason) {
        this.invokeCargoDocWithArgs(UserDefinedArgs_1.UserDefinedArgs.getDocArgs(), reason);
    }
    invokeCargoNew(projectName, isBin, workingDirectory) {
        return __awaiter(this, void 0, void 0, function* () {
            const args = [projectName, isBin ? '--bin' : '--lib'];
            yield this.processRequestToStartTask('new', args, workingDirectory, true, CommandInvocationReason_1.CommandInvocationReason.CommandExecution, false, false, false);
        });
    }
    invokeCargoRunWithArgs(args, reason) {
        this.runCargo('run', args, true, reason);
    }
    invokeCargoRunUsingRunArgs(reason) {
        this.invokeCargoRunWithArgs(UserDefinedArgs_1.UserDefinedArgs.getRunArgs(), reason);
    }
    invokeCargoTestWithArgs(args, reason) {
        this.runCargo('test', args, true, reason);
    }
    invokeCargoTestUsingTestArgs(reason) {
        this.invokeCargoTestWithArgs(UserDefinedArgs_1.UserDefinedArgs.getTestArgs(), reason);
    }
    invokeCargo(command, args) {
        this.runCargo(command, args, true, CommandInvocationReason_1.CommandInvocationReason.CommandExecution);
    }
    stopTask() {
        if (this._outputChannelTaskManager.hasRunningTask()) {
            this._outputChannelTaskManager.stopRunningTask();
        }
    }
    processRequestToStartTask(command, args, workingDirectory, isStoppingRunningTaskAllowed, reason, shouldStartTaskInTerminal, shouldUseUserWorkingDirectory, shouldParseOutput) {
        return __awaiter(this, void 0, void 0, function* () {
            const canStartTask = this.processPossiblyRunningTask(isStoppingRunningTaskAllowed, shouldStartTaskInTerminal);
            if (!canStartTask) {
                return;
            }
            if (shouldUseUserWorkingDirectory) {
                ({ args, workingDirectory } = this.processPossibleUserRequestToChangeWorkingDirectory(args, workingDirectory));
            }
            const { executable, args: preCommandArgs } = this._cargoInvocationManager.getExecutableAndArgs();
            this.startTask(executable, preCommandArgs, command, args, workingDirectory, reason, shouldStartTaskInTerminal, shouldParseOutput);
        });
    }
    runCargo(command, args, force, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            let workingDirectory;
            try {
                workingDirectory = yield this._currentWorkingDirectoryManager.cwd();
            }
            catch (error) {
                vscode_1.window.showErrorMessage(error.message);
                return;
            }
            const shouldExecuteCargoCommandInTerminal = this._configuration.shouldExecuteCargoCommandInTerminal();
            this.processRequestToStartTask(command, args, workingDirectory, force, reason, shouldExecuteCargoCommandInTerminal, true, true);
        });
    }
    /**
     * Checks whether some task is running and it is, then checks whether it can be stopped
     * @param isStoppingRunningTaskAllowed The flag indicating whether the currently running task
     * can be stopped
     * @param isPossiblyRunningTaskRunInTerminal The flag indicating whether the currently
     * running task is run in the terminal
     * @return The flag inidicating whether there is no running task (there was no running task or
     * the running task has been stopped)
     */
    processPossiblyRunningTask(isStoppingRunningTaskAllowed, isPossiblyRunningTaskRunInTerminal) {
        return __awaiter(this, void 0, void 0, function* () {
            let hasRunningTask = false;
            if (isPossiblyRunningTaskRunInTerminal) {
                hasRunningTask = this._terminalTaskManager.hasRunningTask();
            }
            else {
                hasRunningTask = this._outputChannelTaskManager.hasRunningTask();
            }
            if (!hasRunningTask) {
                return true;
            }
            if (isStoppingRunningTaskAllowed) {
                return false;
            }
            let shouldStopRunningTask = false;
            const helper = new helper_1.Helper(this._configuration);
            const result = yield helper.handleCommandStartWhenThereIsRunningCommand();
            switch (result) {
                case helper_1.CommandStartHandleResult.IgnoreNewCommand:
                    break;
                case helper_1.CommandStartHandleResult.StopRunningCommand:
                    shouldStopRunningTask = true;
            }
            if (shouldStopRunningTask) {
                if (isPossiblyRunningTaskRunInTerminal) {
                    this._terminalTaskManager.stopRunningTask();
                }
                else {
                    this._outputChannelTaskManager.stopRunningTask();
                }
                return true;
            }
            else {
                return false;
            }
        });
    }
    startTask(executable, preCommandArgs, command, args, cwd, reason, shouldExecuteCargoCommandInTerminal, shouldParseOutput) {
        return __awaiter(this, void 0, void 0, function* () {
            if (shouldExecuteCargoCommandInTerminal) {
                yield this._terminalTaskManager.startTask(executable, preCommandArgs, command, args, cwd);
            }
            else {
                // The output channel should be shown only if the user wants that.
                // The only exception is checking invoked on saving the active document - in that case the output channel shouldn't be shown.
                const shouldShowOutputChannel = this._configuration.shouldShowRunningCargoTaskOutputChannel() &&
                    !(command === 'check' && reason === CommandInvocationReason_1.CommandInvocationReason.ActionOnSave);
                yield this._outputChannelTaskManager.startTask(executable, preCommandArgs, command, args, cwd, shouldParseOutput, shouldShowOutputChannel);
            }
        });
    }
    /**
     * The user can specify some directory which Cargo commands should be run in. In this case,
     * Cargo should be known whether the correct manifest is located. The function checks whether
     * the user specify some directory and if it is, then adds the manifest path to the arguments
     * and replaces the working directory
     * @param args The arguments to change
     * @param workingDirectory The current working directory
     * @return The new arguments and new working directory
     */
    processPossibleUserRequestToChangeWorkingDirectory(args, workingDirectory) {
        const userWorkingDirectory = this._configuration.getCargoCwd();
        if (userWorkingDirectory !== undefined && userWorkingDirectory !== workingDirectory) {
            const manifestPath = path_1.join(workingDirectory, 'Cargo.toml');
            args = ['--manifest-path', manifestPath].concat(args);
            workingDirectory = userWorkingDirectory;
        }
        return { args, workingDirectory };
    }
}
exports.CargoTaskManager = CargoTaskManager;
//# sourceMappingURL=CargoTaskManager.js.map