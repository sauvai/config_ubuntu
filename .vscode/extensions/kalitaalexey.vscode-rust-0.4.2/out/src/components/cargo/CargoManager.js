"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tmp = require("tmp");
const vscode_1 = require("vscode");
const CargoTaskManager_1 = require("./CargoTaskManager");
const CommandInvocationReason_1 = require("./CommandInvocationReason");
const CrateType_1 = require("./CrateType");
const custom_configuration_chooser_1 = require("./custom_configuration_chooser");
class CargoManager {
    constructor(context, configuration, cargoInvocationManager, currentWorkingDirectoryManager, logger) {
        const stopCommandName = 'rust.cargo.terminate';
        this._cargoTaskManager = new CargoTaskManager_1.CargoTaskManager(context, configuration, cargoInvocationManager, currentWorkingDirectoryManager, logger.createChildLogger('CargoTaskManager: '), stopCommandName);
        this._customConfigurationChooser = new custom_configuration_chooser_1.CustomConfigurationChooser(configuration);
        this._logger = logger;
        this.registerCommands(context, stopCommandName);
    }
    executeBuildTask(reason) {
        this._cargoTaskManager.invokeCargoBuildUsingBuildArgs(reason);
    }
    executeCheckTask(reason) {
        this._cargoTaskManager.invokeCargoCheckUsingCheckArgs(reason);
    }
    executeClippyTask(reason) {
        this._cargoTaskManager.invokeCargoClippyUsingClippyArgs(reason);
    }
    executeDocTask(reason) {
        this._cargoTaskManager.invokeCargoDocUsingDocArgs(reason);
    }
    executeRunTask(reason) {
        this._cargoTaskManager.invokeCargoRunUsingRunArgs(reason);
    }
    executeTestTask(reason) {
        this._cargoTaskManager.invokeCargoTestUsingTestArgs(reason);
    }
    registerCommandHelpingCreatePlayground(commandName) {
        return vscode_1.commands.registerCommand(commandName, () => {
            this.helpCreatePlayground();
        });
    }
    registerCommandHelpingChooseArgsAndInvokingCargoCheck(commandName) {
        return vscode_1.commands.registerCommand(commandName, () => {
            this._customConfigurationChooser.choose('customCheckConfigurations').then(args => {
                this._cargoTaskManager.invokeCargoCheckWithArgs(args, CommandInvocationReason_1.CommandInvocationReason.CommandExecution);
            }, () => undefined);
        });
    }
    registerCommandInvokingCargoCheckUsingCheckArgs(commandName) {
        return vscode_1.commands.registerCommand(commandName, () => {
            this.executeCheckTask(CommandInvocationReason_1.CommandInvocationReason.CommandExecution);
        });
    }
    registerCommandHelpingChooseArgsAndInvokingCargoClippy(commandName) {
        return vscode_1.commands.registerCommand(commandName, () => {
            this._customConfigurationChooser.choose('customClippyConfigurations').then(args => {
                this._cargoTaskManager.invokeCargoClippyWithArgs(args, CommandInvocationReason_1.CommandInvocationReason.CommandExecution);
            }, () => undefined);
        });
    }
    registerCommandInvokingCargoClippyUsingClippyArgs(commandName) {
        return vscode_1.commands.registerCommand(commandName, () => {
            this.executeClippyTask(CommandInvocationReason_1.CommandInvocationReason.CommandExecution);
        });
    }
    registerCommandHelpingChooseArgsAndInvokingCargoDoc(commandName) {
        return vscode_1.commands.registerCommand(commandName, () => {
            this._customConfigurationChooser.choose('customDocConfigurations').then(args => {
                this._cargoTaskManager.invokeCargoDocWithArgs(args, CommandInvocationReason_1.CommandInvocationReason.CommandExecution);
            }, () => undefined);
        });
    }
    registerCommandInvokingCargoDocUsingDocArgs(commandName) {
        return vscode_1.commands.registerCommand(commandName, () => {
            this.executeDocTask(CommandInvocationReason_1.CommandInvocationReason.CommandExecution);
        });
    }
    registerCommandHelpingCreateProject(commandName, isBin) {
        return vscode_1.commands.registerCommand(commandName, () => {
            const cwd = vscode_1.workspace.rootPath;
            if (!cwd) {
                vscode_1.window.showErrorMessage('Current document not in the workspace');
                return;
            }
            const projectType = isBin ? 'executable' : 'library';
            const placeHolder = `Enter ${projectType} project name`;
            vscode_1.window.showInputBox({ placeHolder: placeHolder }).then((name) => {
                if (!name || name.length === 0) {
                    return;
                }
                this._cargoTaskManager.invokeCargoNew(name, isBin, cwd);
            });
        });
    }
    registerCommandHelpingChooseArgsAndInvokingCargoBuild(commandName) {
        return vscode_1.commands.registerCommand(commandName, () => {
            this._customConfigurationChooser.choose('customBuildConfigurations').then(args => {
                this._cargoTaskManager.invokeCargoBuildWithArgs(args, CommandInvocationReason_1.CommandInvocationReason.CommandExecution);
            }, () => undefined);
        });
    }
    registerCommandInvokingCargoBuildUsingBuildArgs(commandName) {
        return vscode_1.commands.registerCommand(commandName, () => {
            this.executeBuildTask(CommandInvocationReason_1.CommandInvocationReason.CommandExecution);
        });
    }
    registerCommandHelpingChooseArgsAndInvokingCargoRun(commandName) {
        return vscode_1.commands.registerCommand(commandName, () => {
            this._customConfigurationChooser.choose('customRunConfigurations').then(args => {
                this._cargoTaskManager.invokeCargoRunWithArgs(args, CommandInvocationReason_1.CommandInvocationReason.CommandExecution);
            }, () => undefined);
        });
    }
    registerCommandInvokingCargoRunUsingRunArgs(commandName) {
        return vscode_1.commands.registerCommand(commandName, () => {
            this.executeRunTask(CommandInvocationReason_1.CommandInvocationReason.CommandExecution);
        });
    }
    registerCommandHelpingChooseArgsAndInvokingCargoTest(commandName) {
        return vscode_1.commands.registerCommand(commandName, () => {
            this._customConfigurationChooser.choose('customTestConfigurations').then(args => {
                this._cargoTaskManager.invokeCargoTestWithArgs(args, CommandInvocationReason_1.CommandInvocationReason.CommandExecution);
            }, () => undefined);
        });
    }
    registerCommandInvokingCargoTestUsingTestArgs(commandName) {
        return vscode_1.commands.registerCommand(commandName, () => {
            this.executeTestTask(CommandInvocationReason_1.CommandInvocationReason.CommandExecution);
        });
    }
    registerCommandInvokingCargoWithArgs(commandName, command, ...args) {
        return vscode_1.commands.registerCommand(commandName, () => {
            this._cargoTaskManager.invokeCargo(command, args);
        });
    }
    registerCommandStoppingCargoTask(commandName) {
        return vscode_1.commands.registerCommand(commandName, () => {
            this._cargoTaskManager.stopTask();
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
        const logger = this._logger.createChildLogger('helpCreatePlayground: ');
        const playgroundProjectTypes = ['application', 'library'];
        vscode_1.window.showQuickPick(playgroundProjectTypes)
            .then((playgroundProjectType) => {
            if (!playgroundProjectType) {
                logger.debug('quick pick has been cancelled');
                return;
            }
            tmp.dir((err, path) => {
                if (err) {
                    this._logger.error(`Temporary directory creation failed: ${err}`);
                    vscode_1.window.showErrorMessage('Temporary directory creation failed');
                    return;
                }
                const crateType = playgroundProjectType === 'application' ? CrateType_1.CrateType.Application : CrateType_1.CrateType.Library;
                const name = `playground_${playgroundProjectType}`;
                this._cargoTaskManager.invokeCargoInit(crateType, name, path)
                    .then(() => {
                    const uri = vscode_1.Uri.parse(path);
                    vscode_1.commands.executeCommand('vscode.openFolder', uri, true);
                });
            });
        });
    }
}
exports.CargoManager = CargoManager;
//# sourceMappingURL=CargoManager.js.map