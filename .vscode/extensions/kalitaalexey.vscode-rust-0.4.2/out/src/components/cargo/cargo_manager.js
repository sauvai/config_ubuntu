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
const vscode = require("vscode");
const tmp = require("tmp");
const custom_configuration_chooser_1 = require("./custom_configuration_chooser");
const helper_1 = require("./helper");
const output_channel_task_manager_1 = require("./output_channel_task_manager");
const terminal_task_manager_1 = require("./terminal_task_manager");
/**
 * Possible reasons of a cargo command invocation
 */
var CommandInvocationReason;
(function (CommandInvocationReason) {
    /**
     * The command is invoked because the action on save is to execute the command
     */
    CommandInvocationReason[CommandInvocationReason["ActionOnSave"] = 0] = "ActionOnSave";
    /**
     * The command is invoked because the corresponding registered command is executed
     */
    CommandInvocationReason[CommandInvocationReason["CommandExecution"] = 1] = "CommandExecution";
})(CommandInvocationReason = exports.CommandInvocationReason || (exports.CommandInvocationReason = {}));
var BuildType;
(function (BuildType) {
    BuildType[BuildType["Debug"] = 0] = "Debug";
    BuildType[BuildType["Release"] = 1] = "Release";
})(BuildType = exports.BuildType || (exports.BuildType = {}));
var CrateType;
(function (CrateType) {
    CrateType[CrateType["Application"] = 0] = "Application";
    CrateType[CrateType["Library"] = 1] = "Library";
})(CrateType || (CrateType = {}));
var CheckTarget;
(function (CheckTarget) {
    CheckTarget[CheckTarget["Library"] = 0] = "Library";
    CheckTarget[CheckTarget["Application"] = 1] = "Application";
})(CheckTarget = exports.CheckTarget || (exports.CheckTarget = {}));
class UserDefinedArgs {
    static getBuildArgs() {
        const args = UserDefinedArgs.getArgs('buildArgs');
        return args;
    }
    static getCheckArgs() {
        const args = UserDefinedArgs.getArgs('checkArgs');
        return args;
    }
    static getClippyArgs() {
        const args = UserDefinedArgs.getArgs('clippyArgs');
        return args;
    }
    static getDocArgs() {
        const args = UserDefinedArgs.getArgs('docArgs');
        return args;
    }
    static getRunArgs() {
        const args = UserDefinedArgs.getArgs('runArgs');
        return args;
    }
    static getTestArgs() {
        const args = UserDefinedArgs.getArgs('testArgs');
        return args;
    }
    static getArgs(property) {
        const configuration = getConfiguration();
        const args = configuration.get(property);
        if (!args) {
            throw new Error(`Failed to get args for property=${property}`);
        }
        return args;
    }
}
class CargoTaskManager {
    constructor(context, configuration, currentWorkingDirectoryManager, logger, stopCommandName) {
        this.configuration = configuration;
        this.currentWorkingDirectoryManager = currentWorkingDirectoryManager;
        this.logger = logger;
        this.outputChannelTaskManager = new output_channel_task_manager_1.OutputChannelTaskManager(configuration, logger.createChildLogger('OutputChannelTaskManager: '), stopCommandName);
        this.terminalTaskManager = new terminal_task_manager_1.TerminalTaskManager(context, configuration);
    }
    invokeCargoInit(crateType, name, cwd) {
        return __awaiter(this, void 0, void 0, function* () {
            const args = ['--name', name];
            switch (crateType) {
                case CrateType.Application:
                    args.push('--bin');
                    break;
                case CrateType.Library:
                    args.push('--lib');
                    break;
                default:
                    throw new Error(`Unhandled crate type=${crateType}`);
            }
            this.outputChannelTaskManager.startTask('init', args, cwd, false, true);
        });
    }
    invokeCargoBuildWithArgs(args, reason) {
        this.runCargo('build', args, true, reason);
    }
    invokeCargoBuildUsingBuildArgs(reason) {
        this.invokeCargoBuildWithArgs(UserDefinedArgs.getBuildArgs(), reason);
    }
    invokeCargoCheckWithArgs(args, reason) {
        this.runCargo('check', args, true, reason);
    }
    invokeCargoCheckUsingCheckArgs(reason) {
        this.invokeCargoCheckWithArgs(UserDefinedArgs.getCheckArgs(), reason);
    }
    invokeCargoClippyWithArgs(args, reason) {
        this.runCargo('clippy', args, true, reason);
    }
    invokeCargoClippyUsingClippyArgs(reason) {
        this.invokeCargoClippyWithArgs(UserDefinedArgs.getClippyArgs(), reason);
    }
    invokeCargoDocWithArgs(args, reason) {
        this.runCargo('doc', args, true, reason);
    }
    invokeCargoDocUsingDocArgs(reason) {
        this.invokeCargoDocWithArgs(UserDefinedArgs.getDocArgs(), reason);
    }
    invokeCargoNew(projectName, isBin, cwd) {
        return __awaiter(this, void 0, void 0, function* () {
            const args = [projectName, isBin ? '--bin' : '--lib'];
            yield this.outputChannelTaskManager.startTask('new', args, cwd, false, true);
        });
    }
    invokeCargoRunWithArgs(args, reason) {
        this.runCargo('run', args, true, reason);
    }
    invokeCargoRunUsingRunArgs(reason) {
        this.invokeCargoRunWithArgs(UserDefinedArgs.getRunArgs(), reason);
    }
    invokeCargoTestWithArgs(args, reason) {
        this.runCargo('test', args, true, reason);
    }
    invokeCargoTestUsingTestArgs(reason) {
        this.invokeCargoTestWithArgs(UserDefinedArgs.getTestArgs(), reason);
    }
    invokeCargo(command, args) {
        this.runCargo(command, args, true, CommandInvocationReason.CommandExecution);
    }
    stopTask() {
        if (this.outputChannelTaskManager.hasRunningTask()) {
            this.outputChannelTaskManager.stopRunningTask();
        }
    }
    runCargo(command, args, force, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            let cwd;
            try {
                cwd = yield this.currentWorkingDirectoryManager.cwd();
            }
            catch (error) {
                vscode.window.showErrorMessage(error.message);
                return;
            }
            if (this.configuration.shouldExecuteCargoCommandInTerminal()) {
                this.terminalTaskManager.execute(command, args, cwd);
            }
            else {
                if (this.outputChannelTaskManager.hasRunningTask()) {
                    if (!force) {
                        return;
                    }
                    const helper = new helper_1.Helper(this.configuration);
                    const result = yield helper.handleCommandStartWhenThereIsRunningCommand();
                    switch (result) {
                        case helper_1.CommandStartHandleResult.IgnoreNewCommand:
                            return;
                        case helper_1.CommandStartHandleResult.StopRunningCommand:
                            yield this.outputChannelTaskManager.stopRunningTask();
                    }
                }
                // The output channel should be shown only if the user wants that.
                // The only exception is checking invoked on saving the active document - in that case the output channel shouldn't be shown.
                const shouldShowOutputChannel = this.configuration.shouldShowRunningCargoTaskOutputChannel() &&
                    !(command === 'check' && reason === CommandInvocationReason.ActionOnSave);
                yield this.outputChannelTaskManager.startTask(command, args, cwd, true, shouldShowOutputChannel);
            }
        });
    }
}
class CargoManager {
    constructor(context, configuration, currentWorkingDirectoryManager, logger) {
        const stopCommandName = 'rust.cargo.terminate';
        this.cargoManager = new CargoTaskManager(context, configuration, currentWorkingDirectoryManager, logger.createChildLogger('CargoTaskManager: '), stopCommandName);
        this.customConfigurationChooser = new custom_configuration_chooser_1.CustomConfigurationChooser(configuration);
        this.logger = logger;
        this.registerCommands(context, stopCommandName);
    }
    executeBuildTask(reason) {
        this.cargoManager.invokeCargoBuildUsingBuildArgs(reason);
    }
    executeCheckTask(reason) {
        this.cargoManager.invokeCargoCheckUsingCheckArgs(reason);
    }
    executeClippyTask(reason) {
        this.cargoManager.invokeCargoClippyUsingClippyArgs(reason);
    }
    executeDocTask(reason) {
        this.cargoManager.invokeCargoDocUsingDocArgs(reason);
    }
    executeRunTask(reason) {
        this.cargoManager.invokeCargoRunUsingRunArgs(reason);
    }
    executeTestTask(reason) {
        this.cargoManager.invokeCargoTestUsingTestArgs(reason);
    }
    registerCommandHelpingCreatePlayground(commandName) {
        return vscode.commands.registerCommand(commandName, () => {
            this.helpCreatePlayground();
        });
    }
    registerCommandHelpingChooseArgsAndInvokingCargoCheck(commandName) {
        return vscode.commands.registerCommand(commandName, () => {
            this.customConfigurationChooser.choose('customCheckConfigurations').then(args => {
                this.cargoManager.invokeCargoCheckWithArgs(args, CommandInvocationReason.CommandExecution);
            }, () => undefined);
        });
    }
    registerCommandInvokingCargoCheckUsingCheckArgs(commandName) {
        return vscode.commands.registerCommand(commandName, () => {
            this.executeCheckTask(CommandInvocationReason.CommandExecution);
        });
    }
    registerCommandHelpingChooseArgsAndInvokingCargoClippy(commandName) {
        return vscode.commands.registerCommand(commandName, () => {
            this.customConfigurationChooser.choose('customClippyConfigurations').then(args => {
                this.cargoManager.invokeCargoClippyWithArgs(args, CommandInvocationReason.CommandExecution);
            }, () => undefined);
        });
    }
    registerCommandInvokingCargoClippyUsingClippyArgs(commandName) {
        return vscode.commands.registerCommand(commandName, () => {
            this.executeClippyTask(CommandInvocationReason.CommandExecution);
        });
    }
    registerCommandHelpingChooseArgsAndInvokingCargoDoc(commandName) {
        return vscode.commands.registerCommand(commandName, () => {
            this.customConfigurationChooser.choose('customDocConfigurations').then(args => {
                this.cargoManager.invokeCargoDocWithArgs(args, CommandInvocationReason.CommandExecution);
            }, () => undefined);
        });
    }
    registerCommandInvokingCargoDocUsingDocArgs(commandName) {
        return vscode.commands.registerCommand(commandName, () => {
            this.executeDocTask(CommandInvocationReason.CommandExecution);
        });
    }
    registerCommandHelpingCreateProject(commandName, isBin) {
        return vscode.commands.registerCommand(commandName, () => {
            const cwd = vscode.workspace.rootPath;
            if (!cwd) {
                vscode.window.showErrorMessage('Current document not in the workspace');
                return;
            }
            const projectType = isBin ? 'executable' : 'library';
            const placeHolder = `Enter ${projectType} project name`;
            vscode.window.showInputBox({ placeHolder: placeHolder }).then((name) => {
                if (!name || name.length === 0) {
                    return;
                }
                this.cargoManager.invokeCargoNew(name, isBin, cwd);
            });
        });
    }
    registerCommandHelpingChooseArgsAndInvokingCargoBuild(commandName) {
        return vscode.commands.registerCommand(commandName, () => {
            this.customConfigurationChooser.choose('customBuildConfigurations').then(args => {
                this.cargoManager.invokeCargoBuildWithArgs(args, CommandInvocationReason.CommandExecution);
            }, () => undefined);
        });
    }
    registerCommandInvokingCargoBuildUsingBuildArgs(commandName) {
        return vscode.commands.registerCommand(commandName, () => {
            this.executeBuildTask(CommandInvocationReason.CommandExecution);
        });
    }
    registerCommandHelpingChooseArgsAndInvokingCargoRun(commandName) {
        return vscode.commands.registerCommand(commandName, () => {
            this.customConfigurationChooser.choose('customRunConfigurations').then(args => {
                this.cargoManager.invokeCargoRunWithArgs(args, CommandInvocationReason.CommandExecution);
            }, () => undefined);
        });
    }
    registerCommandInvokingCargoRunUsingRunArgs(commandName) {
        return vscode.commands.registerCommand(commandName, () => {
            this.executeRunTask(CommandInvocationReason.CommandExecution);
        });
    }
    registerCommandHelpingChooseArgsAndInvokingCargoTest(commandName) {
        return vscode.commands.registerCommand(commandName, () => {
            this.customConfigurationChooser.choose('customTestConfigurations').then(args => {
                this.cargoManager.invokeCargoTestWithArgs(args, CommandInvocationReason.CommandExecution);
            }, () => undefined);
        });
    }
    registerCommandInvokingCargoTestUsingTestArgs(commandName) {
        return vscode.commands.registerCommand(commandName, () => {
            this.executeTestTask(CommandInvocationReason.CommandExecution);
        });
    }
    registerCommandInvokingCargoWithArgs(commandName, command, ...args) {
        return vscode.commands.registerCommand(commandName, () => {
            this.cargoManager.invokeCargo(command, args);
        });
    }
    registerCommandStoppingCargoTask(commandName) {
        return vscode.commands.registerCommand(commandName, () => {
            this.cargoManager.stopTask();
        });
    }
    registerCommands(context, stopCommandName) {
        // Cargo init
        context.subscriptions.push(this.registerCommandHelpingCreatePlayground('rust.cargo.new.playground'));
        // Cargo new
        context.subscriptions.push(this.registerCommandHelpingCreateProject('rust.cargo.new.bin', true));
        context.subscriptions.push(this.registerCommandHelpingCreateProject('rust.cargo.new.lib', false));
        // Cargo build
        context.subscriptions.push(this.registerCommandInvokingCargoBuildUsingBuildArgs('rust.cargo.build.default'));
        context.subscriptions.push(this.registerCommandHelpingChooseArgsAndInvokingCargoBuild('rust.cargo.build.custom'));
        // Cargo run
        context.subscriptions.push(this.registerCommandInvokingCargoRunUsingRunArgs('rust.cargo.run.default'));
        context.subscriptions.push(this.registerCommandHelpingChooseArgsAndInvokingCargoRun('rust.cargo.run.custom'));
        // Cargo test
        context.subscriptions.push(this.registerCommandInvokingCargoTestUsingTestArgs('rust.cargo.test.default'));
        context.subscriptions.push(this.registerCommandHelpingChooseArgsAndInvokingCargoTest('rust.cargo.test.custom'));
        // Cargo bench
        context.subscriptions.push(this.registerCommandInvokingCargoWithArgs('rust.cargo.bench', 'bench'));
        // Cargo doc
        context.subscriptions.push(this.registerCommandInvokingCargoDocUsingDocArgs('rust.cargo.doc.default'));
        context.subscriptions.push(this.registerCommandHelpingChooseArgsAndInvokingCargoDoc('rust.cargo.doc.custom'));
        // Cargo update
        context.subscriptions.push(this.registerCommandInvokingCargoWithArgs('rust.cargo.update', 'update'));
        // Cargo clean
        context.subscriptions.push(this.registerCommandInvokingCargoWithArgs('rust.cargo.clean', 'clean'));
        // Cargo check
        context.subscriptions.push(this.registerCommandInvokingCargoCheckUsingCheckArgs('rust.cargo.check.default'));
        context.subscriptions.push(this.registerCommandHelpingChooseArgsAndInvokingCargoCheck('rust.cargo.check.custom'));
        // Cargo clippy
        context.subscriptions.push(this.registerCommandInvokingCargoClippyUsingClippyArgs('rust.cargo.clippy.default'));
        context.subscriptions.push(this.registerCommandHelpingChooseArgsAndInvokingCargoClippy('rust.cargo.clippy.custom'));
        // Cargo terminate
        context.subscriptions.push(this.registerCommandStoppingCargoTask(stopCommandName));
    }
    helpCreatePlayground() {
        const logger = this.logger.createChildLogger('helpCreatePlayground: ');
        const playgroundProjectTypes = ['application', 'library'];
        vscode.window.showQuickPick(playgroundProjectTypes)
            .then((playgroundProjectType) => {
            if (!playgroundProjectType) {
                logger.debug('quick pick has been cancelled');
                return;
            }
            tmp.dir((err, path) => {
                if (err) {
                    this.logger.error(`Temporary directory creation failed: ${err}`);
                    vscode.window.showErrorMessage('Temporary directory creation failed');
                    return;
                }
                const crateType = playgroundProjectType === 'application' ? CrateType.Application : CrateType.Library;
                const name = `playground_${playgroundProjectType}`;
                this.cargoManager.invokeCargoInit(crateType, name, path)
                    .then(() => {
                    const uri = vscode.Uri.parse(path);
                    vscode.commands.executeCommand('vscode.openFolder', uri, true);
                });
            });
        });
    }
}
exports.CargoManager = CargoManager;
function getConfiguration() {
    return vscode.workspace.getConfiguration('rust');
}
//# sourceMappingURL=cargo_manager.js.map