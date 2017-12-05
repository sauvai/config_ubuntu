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
// https://github.com/pwnall/node-open
const open = require("open");
const vscode_1 = require("vscode");
const CargoManager_1 = require("./components/cargo/CargoManager");
const CommandInvocationReason_1 = require("./components/cargo/CommandInvocationReason");
const Configuration_1 = require("./components/configuration/Configuration");
const current_working_directory_manager_1 = require("./components/configuration/current_working_directory_manager");
const RustSource_1 = require("./components/configuration/RustSource");
const Rustup_1 = require("./components/configuration/Rustup");
const RlsConfiguration_1 = require("./components/configuration/RlsConfiguration");
const formatting_manager_1 = require("./components/formatting/formatting_manager");
const manager_1 = require("./components/language_client/manager");
const logging_manager_1 = require("./components/logging/logging_manager");
const CargoInvocationManager_1 = require("./CargoInvocationManager");
const legacy_mode_manager_1 = require("./legacy_mode_manager");
const OutputChannelProcess = require("./OutputChannelProcess");
/**
 * Asks the user to choose a mode which the extension will run in.
 * It is possible that the user will decline choosing and in that case the extension will run in
 * Legacy Mode
 * @return The promise which is resolved with either the chosen mode by the user or undefined
 */
function askUserToChooseMode() {
    return __awaiter(this, void 0, void 0, function* () {
        const message = 'Choose a mode in which the extension will function';
        const rlsChoice = 'RLS';
        const legacyChoice = 'Legacy';
        const readAboutChoice = 'Read about modes';
        while (true) {
            const choice = yield vscode_1.window.showInformationMessage(message, rlsChoice, legacyChoice, readAboutChoice);
            switch (choice) {
                case rlsChoice:
                    return Configuration_1.Mode.RLS;
                case legacyChoice:
                    return Configuration_1.Mode.Legacy;
                case readAboutChoice:
                    open('https://github.com/editor-rs/vscode-rust/blob/master/doc/main.md');
                    break;
                default:
                    return undefined;
            }
        }
    });
}
/**
 * Asks the user's permission to install something
 * @param what What to install
 * @return The flag indicating whether the user gave the permission
 */
function askPermissionToInstall(what) {
    return __awaiter(this, void 0, void 0, function* () {
        const installChoice = 'Install';
        const message = `It seems ${what} is not installed. Do you want to install it?`;
        const choice = yield vscode_1.window.showInformationMessage(message, installChoice);
        return choice === installChoice;
    });
}
class RlsMode {
    constructor(configuration, rlsConfiguration, rustup, cargoInvocationManager, logger, extensionContext) {
        this._configuration = configuration;
        this._rlsConfiguration = rlsConfiguration;
        this._rustup = rustup;
        this._cargoInvocationManager = cargoInvocationManager;
        this._logger = logger;
        this._extensionContext = extensionContext;
    }
    /**
     * Starts the extension in RLS mode
     * @return The flag indicating whether the extension has been started in RLS mode
     */
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            const logger = this._logger.createChildLogger('start: ');
            logger.debug('enter');
            {
                const mode = this._configuration.mode();
                if (mode !== Configuration_1.Mode.RLS) {
                    logger.error(`mode=${mode}; this method should not have been called`);
                    return false;
                }
            }
            if (!this._rlsConfiguration.isExecutableUserPathSet()) {
                logger.debug('no RLS executable');
                if (!this._rustup) {
                    logger.debug('no rustup');
                    yield this.informUserThatModeCannotBeUsedAndAskToSwitchToAnotherMode('neither RLS executable path is specified nor rustup is installed');
                    return false;
                }
                // If the user wants to use the RLS mode and doesn't specify any executable path and rustup is installed, then the user wants the extension to take care of RLS and stuff
                if (this._rustup.getNightlyToolchains().length === 0) {
                    // Since RLS can be installed only for some nightly toolchain and the user does
                    // not have any, then the extension should install it.
                    yield this.handleMissingNightlyToolchain();
                }
                // Despite the fact that some nightly toolchains may be installed, the user might have
                // chosen some toolchain which isn't installed now
                processPossibleSetButMissingUserToolchain(logger, this._rustup, 'nightly toolchain', (r) => r.getUserNightlyToolchain(), (r) => r.setUserNightlyToolchain);
                if (!this._rustup.getUserNightlyToolchain()) {
                    // Either the extension havecleared the user nightly toolchain or the user haven't
                    // chosen it yet. Either way we need to ask the user to choose some nightly toolchain
                    yield handleMissingRustupUserToolchain(logger, 'nightly toolchain', this._rustup.getNightlyToolchains.bind(this._rustup), this._rustup.setUserNightlyToolchain.bind(this._rustup));
                }
                const userNightlyToolchain = this._rustup.getUserNightlyToolchain();
                if (!userNightlyToolchain) {
                    yield yield this.informUserThatModeCannotBeUsedAndAskToSwitchToAnotherMode('neither RLS executable path is specified nor any nightly toolchain is chosen');
                    return false;
                }
                const userToolchain = this._rustup.getUserToolchain();
                if (userNightlyToolchain && (!userToolchain || !userToolchain.equals(userNightlyToolchain))) {
                    yield this._rustup.updateComponents(userNightlyToolchain);
                }
                yield this.processPossiblyMissingRlsComponents();
            }
            if (!this._rlsConfiguration.getExecutablePath()) {
                yield this.informUserThatModeCannotBeUsedAndAskToSwitchToAnotherMode('RLS is not found');
                return false;
            }
            if (this._rlsConfiguration.getUseRustfmt() === undefined) {
                logger.debug('User has not decided whether rustfmt should be used yet');
                yield this.handleMissingValueForUseRustfmt();
            }
            switch (this._rlsConfiguration.getUseRustfmt()) {
                case true:
                    logger.debug('User decided to use rustfmt');
                    const formattingManager = yield formatting_manager_1.FormattingManager.create(this._extensionContext, this._configuration);
                    if (formattingManager === undefined) {
                        yield this.handleMissingRustfmt();
                        // The user may have decided not to use rustfmt
                        if (this._rlsConfiguration.getUseRustfmt()) {
                            const anotherFormattingManager = yield formatting_manager_1.FormattingManager.create(this._extensionContext, this._configuration);
                            if (anotherFormattingManager === undefined) {
                                vscode_1.window.showErrorMessage('Formatting: some error happened');
                            }
                        }
                    }
                    break;
                case false:
                    logger.debug('User decided not to use rustfmt');
                    break;
                case undefined:
                    logger.debug('User dismissed the dialog');
                    break;
            }
            const rlsPath = this._rlsConfiguration.getExecutablePath();
            logger.debug(`rlsPath=${rlsPath} `);
            const env = this._rlsConfiguration.getEnv();
            logger.debug(`env=${JSON.stringify(env)} `);
            const args = this._rlsConfiguration.getArgs();
            logger.debug(`args=${JSON.stringify(args)} `);
            const revealOutputChannelOn = this._rlsConfiguration.getRevealOutputChannelOn();
            logger.debug(`revealOutputChannelOn=${revealOutputChannelOn} `);
            const languageClientManager = new manager_1.Manager(this._extensionContext, logger.createChildLogger('Language Client Manager: '), rlsPath, args, env, revealOutputChannelOn);
            languageClientManager.initialStart();
            return true;
        });
    }
    processPossiblyMissingRlsComponents() {
        return __awaiter(this, void 0, void 0, function* () {
            function installComponent(componentName, installComponent) {
                return __awaiter(this, void 0, void 0, function* () {
                    vscode_1.window.showInformationMessage(`${componentName} is being installed. It can take a while`);
                    const componentInstalled = yield installComponent();
                    logger.debug(`${componentName} has been installed=${componentInstalled} `);
                    if (componentInstalled) {
                        vscode_1.window.showInformationMessage(`${componentName} has been installed successfully`);
                    }
                    else {
                        vscode_1.window.showErrorMessage(`${componentName} has not been installed. Check the output channel "Rust Logging"`);
                    }
                    return componentInstalled;
                });
            }
            const logger = this._logger.createChildLogger('processPossiblyMissingRlsComponents: ');
            if (!this._rustup) {
                logger.error('no rustup; this method should not have been called');
                return;
            }
            const userToolchain = this._rustup.getUserNightlyToolchain();
            if (!userToolchain) {
                logger.error('no user toolchain; this method should have not have been called');
                return;
            }
            if (this._rustup.isRlsInstalled()) {
                logger.debug('RLS is installed');
            }
            else {
                logger.debug('RLS is not installed');
                if (this._rustup.canInstallRls()) {
                    logger.debug('RLS can be installed');
                }
                else {
                    logger.error('RLS cannot be installed');
                    return;
                }
                const userAgreed = yield askPermissionToInstall('RLS');
                if (!userAgreed) {
                    return;
                }
                const rlsInstalled = yield installComponent('RLS', () => __awaiter(this, void 0, void 0, function* () { return this._rustup && (yield this._rustup.installRls()); }));
                if (rlsInstalled) {
                    logger.debug('RLS has been installed');
                }
                else {
                    logger.error('RLS has not been installed');
                    return;
                }
            }
            if (this._rustup.isRustAnalysisInstalled()) {
                logger.debug('rust-analysis is installed');
            }
            else {
                logger.debug('rust-analysis is not installed');
                if (this._rustup.canInstallRustAnalysis()) {
                    logger.debug('rust-analysis can be installed');
                }
                else {
                    logger.error('rust-analysis cannot be installed');
                    return;
                }
                const userAgreed = yield askPermissionToInstall('rust-analysis');
                if (!userAgreed) {
                    return;
                }
                const rustAnalysisInstalled = yield installComponent('rust-analysis', () => __awaiter(this, void 0, void 0, function* () { return this._rustup && (yield this._rustup.installRustAnalysis()); }));
                if (rustAnalysisInstalled) {
                    logger.debug('rust-analysis has been installed');
                }
                else {
                    logger.debug('rust-analysis has not been installed');
                }
            }
        });
    }
    informUserThatModeCannotBeUsedAndAskToSwitchToAnotherMode(reason) {
        return __awaiter(this, void 0, void 0, function* () {
            const logger = this._logger.createChildLogger('informUserThatModeCannotBeUsedAndAskToSwitchToAnotherMode: ');
            logger.debug(`reason=${reason}`);
            const message = `You have chosen RLS mode, but ${reason}`;
            const switchToLegacyModeChoice = 'Switch to Legacy mode';
            const askMeLaterChoice = 'Ask me later';
            const choice = yield vscode_1.window.showErrorMessage(message, switchToLegacyModeChoice, askMeLaterChoice);
            switch (choice) {
                case switchToLegacyModeChoice:
                    logger.debug('User decided to switch to Legacy Mode');
                    this._configuration.setMode(Configuration_1.Mode.Legacy);
                    break;
                case askMeLaterChoice:
                    logger.debug('User asked to be asked later');
                    this._configuration.setMode(undefined);
                    break;
                default:
                    logger.debug('User dismissed the dialog');
                    this._configuration.setMode(undefined);
                    break;
            }
        });
    }
    /**
     * Handles the case when rustup reported that the nightly toolchain wasn't installed
     * @param logger The logger to log messages
     * @param rustup The rustup
     */
    handleMissingNightlyToolchain() {
        return __awaiter(this, void 0, void 0, function* () {
            const logger = this._logger.createChildLogger('handleMissingNightlyToolchain: ');
            if (!this._rustup) {
                logger.error('no rustup; the method should not have been called');
                return false;
            }
            if (this._rustup.getNightlyToolchains().length !== 0) {
                logger.error('there are nightly toolchains; the method should not have been called');
                return false;
            }
            const permissionGranted = yield askPermissionToInstall('the nightly toolchain');
            logger.debug(`permissionGranted=${permissionGranted}`);
            if (!permissionGranted) {
                return false;
            }
            vscode_1.window.showInformationMessage('The nightly toolchain is being installed. It can take a while. Please be patient');
            const toolchainInstalled = yield this._rustup.installToolchain('nightly');
            logger.debug(`toolchainInstalled=${toolchainInstalled}`);
            if (!toolchainInstalled) {
                return false;
            }
            const toolchains = this._rustup.getNightlyToolchains();
            switch (toolchains.length) {
                case 0:
                    logger.error('the nightly toolchain has not been installed');
                    return false;
                case 1:
                    logger.debug('the nightly toolchain has been installed');
                    return true;
                default:
                    logger.error(`more than one toolchain detected; toolchains=${toolchains}`);
                    return false;
            }
        });
    }
    handleMissingValueForUseRustfmt() {
        return __awaiter(this, void 0, void 0, function* () {
            const logger = this._logger.createChildLogger('handleMissingValueForUseRustfmt: ');
            logger.debug('enter');
            const yesChoice = 'Yes';
            const noChoice = 'No';
            const message = 'Do you want to use rustfmt for formatting?';
            const choice = yield vscode_1.window.showInformationMessage(message, yesChoice, noChoice);
            switch (choice) {
                case yesChoice:
                    logger.debug('User decided to use rustfmt');
                    this._rlsConfiguration.setUseRustfmt(true);
                    break;
                case noChoice:
                    logger.debug('User decided not to use rustfmt');
                    this._rlsConfiguration.setUseRustfmt(false);
                    break;
                default:
                    logger.debug('User dismissed the dialog');
                    break;
            }
        });
    }
    handleMissingRustfmt() {
        return __awaiter(this, void 0, void 0, function* () {
            const logger = this._logger.createChildLogger('handleMissingRustfmt: ');
            logger.debug('enter');
            const message = 'rustfmt is not installed';
            const installRustfmtChoice = 'Install rustfmt';
            const dontUseRustfmtChoice = 'Don\'t use rustfmt';
            const choice = yield vscode_1.window.showInformationMessage(message, installRustfmtChoice, dontUseRustfmtChoice);
            switch (choice) {
                case installRustfmtChoice:
                    logger.debug('User decided to install rustfmt');
                    const { executable, args } = this._cargoInvocationManager.getExecutableAndArgs();
                    const result = yield OutputChannelProcess.create(executable, [...args, 'install', 'rustfmt'], undefined, 'Installing rustfmt');
                    const success = result.success && result.code === 0;
                    if (success) {
                        logger.debug('rustfmt has been installed');
                        vscode_1.window.showInformationMessage('rustfmt has been installed');
                    }
                    else {
                        logger.error('rustfmt has not been installed');
                        vscode_1.window.showErrorMessage('rustfmt has not been installed');
                        this._rlsConfiguration.setUseRustfmt(false);
                    }
                    break;
                case dontUseRustfmtChoice:
                    logger.debug('User decided not to use rustfmt');
                    this._rlsConfiguration.setUseRustfmt(false);
                    break;
                default:
                    logger.debug('User dismissed the dialog');
                    this._rlsConfiguration.setUseRustfmt(undefined);
                    break;
            }
        });
    }
}
function handleMissingRustupUserToolchain(logger, toolchainKind, getToolchains, setToolchain) {
    return __awaiter(this, void 0, void 0, function* () {
        class Item {
            constructor(toolchain, shouldLabelContainHost) {
                this.toolchain = toolchain;
                this.label = toolchain.toString(shouldLabelContainHost, true);
                this.description = '';
            }
        }
        const functionLogger = logger.createChildLogger('handleMissingRustupUserToolchain: ');
        functionLogger.debug(`toolchainKind=${toolchainKind}`);
        yield vscode_1.window.showInformationMessage(`To properly function, the extension needs to know what ${toolchainKind} you want to use`);
        const toolchains = getToolchains();
        if (toolchains.length === 0) {
            functionLogger.error('no toolchains');
            return;
        }
        const toolchainsHaveOneHost = toolchains.every(t => t.host === toolchains[0].host);
        const items = toolchains.map(t => new Item(t, !toolchainsHaveOneHost));
        const item = yield vscode_1.window.showQuickPick(items);
        if (!item) {
            return;
        }
        setToolchain(item.toolchain);
    });
}
function processPossibleSetButMissingUserToolchain(logger, rustup, toolchainKind, getToolchain, setToolchain) {
    const functionLogger = logger.createChildLogger('processPossibleSetButMissingUserToolchain: ');
    functionLogger.debug(`toolchainKind=${toolchainKind}`);
    const userToolchain = getToolchain(rustup);
    if (userToolchain === undefined) {
        functionLogger.debug(`no user ${toolchainKind}`);
        return;
    }
    if (rustup.isToolchainInstalled(userToolchain)) {
        functionLogger.debug(`user ${toolchainKind} is installed`);
        return;
    }
    logger.error(`user ${toolchainKind} is not installed`);
    vscode_1.window.showErrorMessage(`The specified ${toolchainKind} is not installed`);
    setToolchain(rustup)(undefined);
}
function activate(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        const loggingManager = new logging_manager_1.LoggingManager();
        const logger = loggingManager.getLogger();
        const functionLogger = logger.createChildLogger('activate: ');
        const rustup = yield Rustup_1.Rustup.create(logger.createChildLogger('Rustup: '));
        if (rustup) {
            yield rustup.updateToolchains();
            processPossibleSetButMissingUserToolchain(functionLogger, rustup, 'toolchain', (r) => r.getUserToolchain(), (r) => r.setUserToolchain);
            if (!rustup.getUserToolchain()) {
                yield handleMissingRustupUserToolchain(functionLogger, 'toolchain', rustup.getToolchains.bind(rustup), rustup.setUserToolchain.bind(rustup));
            }
            const userToolchain = rustup.getUserToolchain();
            if (userToolchain) {
                yield rustup.updateSysrootPath(userToolchain);
                yield rustup.updateComponents(userToolchain);
                yield rustup.updatePathToRustSourceCodePath();
            }
        }
        const rustSource = yield RustSource_1.RustSource.create(rustup);
        const configuration = new Configuration_1.Configuration(logger.createChildLogger('Configuration: '));
        const cargoInvocationManager = new CargoInvocationManager_1.CargoInvocationManager(rustup);
        const rlsConfiguration = yield RlsConfiguration_1.RlsConfiguration.create(rustup, rustSource);
        if (configuration.mode() === undefined) {
            // The current configuration does not contain any specified mode and hence we should try to
            // choose one.
            const mode = yield askUserToChooseMode();
            switch (mode) {
                case Configuration_1.Mode.Legacy:
                    configuration.setMode(Configuration_1.Mode.Legacy);
                    break;
                case Configuration_1.Mode.RLS:
                    configuration.setMode(Configuration_1.Mode.RLS);
                    break;
                case undefined:
                    break;
            }
        }
        const currentWorkingDirectoryManager = new current_working_directory_manager_1.CurrentWorkingDirectoryManager();
        const cargoManager = new CargoManager_1.CargoManager(ctx, configuration, cargoInvocationManager, currentWorkingDirectoryManager, logger.createChildLogger('Cargo Manager: '));
        addExecutingActionOnSave(ctx, configuration, cargoManager);
        if (configuration.mode() === Configuration_1.Mode.RLS) {
            const rlsMode = new RlsMode(configuration, rlsConfiguration, rustup, cargoInvocationManager, logger.createChildLogger('RlsMode: '), ctx);
            const started = yield rlsMode.start();
            if (started) {
                return;
            }
        }
        // If we got here, then the chosen mode is not RLS
        switch (configuration.mode()) {
            case Configuration_1.Mode.Legacy:
            case undefined:
                yield runInLegacyMode(ctx, configuration, cargoInvocationManager, rustSource, rustup, currentWorkingDirectoryManager, logger);
                break;
            case Configuration_1.Mode.RLS:
                break;
        }
    });
}
exports.activate = activate;
function runInLegacyMode(context, configuration, cargoInvocationManager, rustSource, rustup, currentWorkingDirectoryManager, logger) {
    return __awaiter(this, void 0, void 0, function* () {
        const legacyModeManager = yield legacy_mode_manager_1.LegacyModeManager.create(context, configuration, cargoInvocationManager, rustSource, rustup, currentWorkingDirectoryManager, logger.createChildLogger('Legacy Mode Manager: '));
        yield legacyModeManager.start();
    });
}
function addExecutingActionOnSave(context, configuration, cargoManager) {
    context.subscriptions.push(vscode_1.workspace.onDidSaveTextDocument(document => {
        if (!vscode_1.window.activeTextEditor) {
            return;
        }
        const activeDocument = vscode_1.window.activeTextEditor.document;
        if (document !== activeDocument) {
            return;
        }
        if (document.languageId !== 'rust' || !document.fileName.endsWith('.rs')) {
            return;
        }
        const actionOnSave = configuration.getActionOnSave();
        if (!actionOnSave) {
            return;
        }
        switch (actionOnSave) {
            case 'build':
                cargoManager.executeBuildTask(CommandInvocationReason_1.CommandInvocationReason.ActionOnSave);
                break;
            case 'check':
                cargoManager.executeCheckTask(CommandInvocationReason_1.CommandInvocationReason.ActionOnSave);
                break;
            case 'clippy':
                cargoManager.executeClippyTask(CommandInvocationReason_1.CommandInvocationReason.ActionOnSave);
                break;
            case 'doc':
                cargoManager.executeDocTask(CommandInvocationReason_1.CommandInvocationReason.ActionOnSave);
                break;
            case 'run':
                cargoManager.executeRunTask(CommandInvocationReason_1.CommandInvocationReason.ActionOnSave);
                break;
            case 'test':
                cargoManager.executeTestTask(CommandInvocationReason_1.CommandInvocationReason.ActionOnSave);
                break;
        }
    }));
}
//# sourceMappingURL=extension.js.map