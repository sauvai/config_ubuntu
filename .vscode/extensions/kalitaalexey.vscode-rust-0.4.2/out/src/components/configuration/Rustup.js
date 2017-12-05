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
const OutputtingProcess_1 = require("../../OutputtingProcess");
const Toolchain_1 = require("../../Toolchain");
const FileSystem_1 = require("../file_system/FileSystem");
const OutputChannelProcess = require("../../OutputChannelProcess");
const Configuration_1 = require("./Configuration");
/**
 * Configuration of Rust installed via Rustup
 */
class Rustup {
    /**
     * Returns the executable of Rustup
     */
    static getRustupExecutable() {
        return 'rustup';
    }
    /**
     * Creates a new instance of the class.
     * The method is asynchronous because it tries to find Rust's source code
     * @param pathToRustcSysRoot A path to Rust's installation root
     */
    static create(logger) {
        return __awaiter(this, void 0, void 0, function* () {
            const rustupExe = yield FileSystem_1.FileSystem.findExecutablePath(Rustup.getRustupExecutable());
            if (!rustupExe) {
                return undefined;
            }
            const rustup = new Rustup(logger);
            return rustup;
        });
    }
    /**
     * Returns either the default toolchain or undefined if there are no installed toolchains
     */
    getDefaultToolchain() {
        const logger = this.logger.createChildLogger('getDefaultToolchain: ');
        const toolchain = this.toolchains.find(t => t.isDefault);
        if (!toolchain && this.toolchains.length !== 0) {
            logger.error(`no default toolchain; this.toolchains=${this.toolchains}`);
        }
        return toolchain;
    }
    /**
     * Returns the toolchains received from the last rustup invocation
     */
    getToolchains() {
        return this.toolchains;
    }
    getNightlyToolchains() {
        return this.toolchains.filter(t => t.channel === 'nightly');
    }
    /**
     * Checks if the toolchain is installed
     * @param toolchain The toolchain to check
     */
    isToolchainInstalled(toolchain) {
        return this.toolchains.find(t => t.equals(toolchain)) !== undefined;
    }
    /**
     * Returns the path to Rust's source code
     */
    getPathToRustSourceCode() {
        return this.pathToRustSourceCode;
    }
    /**
     * Returns either the nightly toolchain chosen by the user or undefined
     */
    getUserNightlyToolchain() {
        return this._userNightlyToolchain;
    }
    /**
     * Sets the new value of the nightly toolchain in the object and in the configuration
     * @param toolchain The new value
     */
    setUserNightlyToolchain(toolchain) {
        if (this._userNightlyToolchain === toolchain) {
            return;
        }
        this._userNightlyToolchain = toolchain;
        updateUserConfigurationParameter(c => {
            c.nightlyToolchain = toolchain ? toolchain.toString(true, false) : null;
        });
    }
    /**
     * Returns either the toolchain chosen by the user or undefined
     */
    getUserToolchain() {
        return this._userToolchain;
    }
    setUserToolchain(toolchain) {
        if (this._userToolchain === toolchain) {
            return;
        }
        this._userToolchain = toolchain;
        updateUserConfigurationParameter(c => {
            c.toolchain = toolchain ? toolchain.toString(true, false) : null;
        });
    }
    /**
     * Requests rustup to install the specified toolchain
     * @param toolchain The toolchain to install
     * @return true if no error occurred and the toolchain has been installed otherwise false
     */
    installToolchain(toolchain) {
        return __awaiter(this, void 0, void 0, function* () {
            const logger = this.logger.createChildLogger(`installToolchain(toolchain=${toolchain}): `);
            const args = ['toolchain', 'install', toolchain];
            const outputChannelName = `Rustup: Installing ${toolchain} toolchain`;
            const output = yield Rustup.invokeWithOutputChannel(args, logger, outputChannelName);
            if (output === undefined) {
                logger.error(`output=${output}`);
                return false;
            }
            logger.debug(`output=${output}`);
            yield this.updateToolchains();
            if (this.toolchains.length === 0) {
                logger.error('this.toolchains.length === 0');
                return false;
            }
            return true;
        });
    }
    /**
     * Requests Rustup to install rust-src for the chosen toolchain
     * @return true if the installing succeeded, otherwise false
     */
    installRustSrc() {
        return __awaiter(this, void 0, void 0, function* () {
            const logger = this.logger.createChildLogger('installRustSrc: ');
            if (!this._userToolchain) {
                logger.error('no toolchain has been chosen');
                return false;
            }
            return yield this.installComponent(this._userToolchain, 'rust-src');
        });
    }
    /**
     * Requests Rustup install RLS
     * @return true if no error occurred and RLS has been installed otherwise false
     */
    installRls() {
        return __awaiter(this, void 0, void 0, function* () {
            const logger = this.logger.createChildLogger('installRls: ');
            const nightlyToolchain = this.getUserNightlyToolchain();
            if (!nightlyToolchain) {
                logger.error('no nightly toolchain');
                return false;
            }
            const isComponentInstalled = yield this.installComponent(nightlyToolchain, Rustup.getRlsComponentName());
            return isComponentInstalled;
        });
    }
    /**
     * Requests Rustup install rust-analysis
     * @return true if no error occurred and rust-analysis has been installed otherwise false
     */
    installRustAnalysis() {
        return __awaiter(this, void 0, void 0, function* () {
            const logger = this.logger.createChildLogger('installRustAnalysis: ');
            const nightlyToolchain = this.getUserNightlyToolchain();
            if (!nightlyToolchain) {
                logger.error('no nightly toolchain');
                return false;
            }
            return yield this.installComponent(nightlyToolchain, Rustup.getRustAnalysisComponentName());
        });
    }
    /**
     * Requests rustup to give components list and saves them in the field `components`
     */
    updateComponents(toolchain) {
        return __awaiter(this, void 0, void 0, function* () {
            const logger = this.logger.createChildLogger(`updateComponents(${toolchain.toString(true, false)}): `);
            const toolchainAsString = toolchain.toString(true, false);
            this.components[toolchainAsString] = [];
            const rustupArgs = ['component', 'list', '--toolchain', toolchainAsString];
            const stdoutData = yield Rustup.invoke(rustupArgs, logger);
            if (!stdoutData) {
                logger.error(`stdoutData=${stdoutData}`);
                return;
            }
            this.components[toolchainAsString] = stdoutData.split('\n');
            logger.debug(`components=${JSON.stringify(this.components[toolchainAsString])}`);
        });
    }
    /**
     * Requests rustup to give toolchains list and saves it in the field `toolchains`
     */
    updateToolchains() {
        return __awaiter(this, void 0, void 0, function* () {
            const logger = this.logger.createChildLogger('updateToolchains: ');
            this.toolchains = yield Rustup.invokeGettingToolchains(logger);
            logger.debug(`this.toolchains=${JSON.stringify(this.toolchains)}`);
        });
    }
    /**
     * Requests rustup to give the path to the sysroot of the specified toolchain
     * @param toolchain The toolchain to get the path to the sysroot for
     */
    updateSysrootPath(toolchain) {
        return __awaiter(this, void 0, void 0, function* () {
            this.pathToRustcSysRoot = undefined;
            const logger = this.logger.createChildLogger(`updateSysrootPath: toolchain=${toolchain}: `);
            if (!this.toolchains.find(t => t.equals(toolchain))) {
                logger.error('toolchain is not installed');
                return;
            }
            this.pathToRustcSysRoot = yield Rustup.invokeGettingSysrootPath(toolchain, logger);
            if (!this.pathToRustcSysRoot) {
                logger.error(`this.pathToRustcSysRoot=${this.pathToRustcSysRoot}`);
            }
        });
    }
    /**
     * Checks if Rust's source code is installed at the expected path.
     * This method assigns either the expected path or undefined to the field `pathToRustSourceCode`, depending on if the expected path exists.
     * The method is asynchronous because it checks if the expected path exists
     */
    updatePathToRustSourceCodePath() {
        return __awaiter(this, void 0, void 0, function* () {
            const logger = this.logger.createChildLogger('updatePathToRustSourceCodePath: ');
            this.pathToRustSourceCode = undefined;
            if (!this.pathToRustcSysRoot) {
                logger.error(`this.pathToRustcSysRoot=${this.pathToRustcSysRoot}`);
                return;
            }
            const pathToRustSourceCode = path_1.join(this.pathToRustcSysRoot, 'lib', 'rustlib', 'src', 'rust', 'src');
            const isRustSourceCodeInstalled = yield FileSystem_1.FileSystem.doesPathExist(pathToRustSourceCode);
            if (isRustSourceCodeInstalled) {
                this.pathToRustSourceCode = pathToRustSourceCode;
            }
            else {
                this.pathToRustSourceCode = undefined;
            }
        });
    }
    /**
     * Requests Rustup give a list of components, parses it, checks if RLS is present in the list and returns if it is
     * @returns true if RLS can be installed otherwise false
     */
    canInstallRls() {
        const logger = this.logger.createChildLogger('canInstallRls: ');
        const nightlyToolchain = this.getUserNightlyToolchain();
        if (!nightlyToolchain) {
            logger.error('no nightly toolchain');
            return false;
        }
        const components = this.components[nightlyToolchain.toString(true, false)];
        if (!components) {
            logger.error('no components');
            return false;
        }
        const rlsComponent = components.find(component => component.startsWith(Rustup.getRlsComponentName()));
        if (!rlsComponent) {
            return false;
        }
        const rlsInstalled = rlsComponent.endsWith(Rustup.getSuffixForInstalledComponent());
        if (rlsInstalled) {
            logger.error('RLS is already installed. The method should not have been called');
            return false;
        }
        return true;
    }
    /**
     * Returns if RLS is installed
     * @return true if RLS is installed otherwise false
     */
    isRlsInstalled() {
        const logger = this.logger.createChildLogger('isRlsInstalled: ');
        const nightlyToolchain = this.getUserNightlyToolchain();
        if (!nightlyToolchain) {
            logger.error('no nightly toolchain');
            return false;
        }
        return this.isComponentInstalled(nightlyToolchain, Rustup.getRlsComponentName());
    }
    /**
     * Returns whether "rust-analysis" is installed
     * @return The flag indicating whether "rust-analysis" is installed
     */
    isRustAnalysisInstalled() {
        const logger = this.logger.createChildLogger('isRustAnalysisInstalled: ');
        const nightlyToolchain = this.getUserNightlyToolchain();
        if (!nightlyToolchain) {
            logger.error('no nightly toolchain');
            return false;
        }
        return this.isComponentInstalled(nightlyToolchain, Rustup.getRustAnalysisComponentName());
    }
    /**
     * Returns true if the component `rust-analysis` can be installed otherwise false.
     * If the component is already installed, the method returns false
     */
    canInstallRustAnalysis() {
        const logger = this.logger.createChildLogger('canInstallRustAnalysis: ');
        const nightlyToolchain = this.getUserNightlyToolchain();
        if (!nightlyToolchain) {
            logger.error('no nightly toolchain');
            return false;
        }
        const components = this.components[nightlyToolchain.toString(true, false)];
        if (!components) {
            logger.error('no components');
            return false;
        }
        const component = components.find(c => c.startsWith(Rustup.getRustAnalysisComponentName()));
        if (!component) {
            return false;
        }
        const componentInstalled = component.endsWith(Rustup.getSuffixForInstalledComponent());
        return !componentInstalled;
    }
    /**
     * Returns the name of the component rust-analysis
     */
    static getRustAnalysisComponentName() {
        return 'rust-analysis';
    }
    /**
     * Returns the name of the component RLS
     */
    static getRlsComponentName() {
        return 'rls';
    }
    /**
     * Returns a suffix which any installed component ends with
     */
    static getSuffixForInstalledComponent() {
        return ' (installed)';
    }
    /**
     * Invokes rustup to get the path to the sysroot of the specified toolchain.
     * Checks if the invocation exited successfully and returns the output of the invocation
     * @param toolchain The toolchain to get the path to the sysroot for
     * @param logger The logger to log messages
     * @return The output of the invocation if the invocation exited successfully otherwise undefined
     */
    static invokeGettingSysrootPath(toolchain, logger) {
        return __awaiter(this, void 0, void 0, function* () {
            const args = ['run', toolchain.toString(true, false), 'rustc', '--print', 'sysroot'];
            const output = yield this.invoke(args, logger);
            if (!output) {
                return undefined;
            }
            return output.trim();
        });
    }
    static invokeGettingToolchains(logger) {
        return __awaiter(this, void 0, void 0, function* () {
            const functionLogger = logger.createChildLogger('invokeGettingToolchains: ');
            const output = yield this.invoke(['toolchain', 'list'], functionLogger);
            if (!output) {
                functionLogger.error(`output=${output}`);
                return [];
            }
            const toolchainsAsStrings = output.trim().split('\n');
            const toolchains = [];
            for (const toolchainAsString of toolchainsAsStrings) {
                const toolchain = Toolchain_1.Toolchain.parse(toolchainAsString);
                if (toolchain) {
                    toolchains.push(toolchain);
                }
            }
            return toolchains;
        });
    }
    /**
     * Invokes Rustup with specified arguments, checks if it exited successfully and returns its output
     * @param args Arguments to invoke Rustup with
     * @param logger The logger to log messages
     * @returns an output if invocation exited successfully otherwise undefined
     */
    static invoke(args, logger) {
        return __awaiter(this, void 0, void 0, function* () {
            const rustupExe = Rustup.getRustupExecutable();
            const functionLogger = logger.createChildLogger(`invoke: rustupExe=${rustupExe}, args=${JSON.stringify(args)}: `);
            const result = yield OutputtingProcess_1.OutputtingProcess.spawn(rustupExe, args, undefined);
            if (!result.success) {
                functionLogger.error('failed');
                return undefined;
            }
            if (result.exitCode !== 0) {
                functionLogger.error(`exited unexpectedly; exitCode=${result.exitCode}, stderrData=${result.stderrData}`);
                return undefined;
            }
            return result.stdoutData;
        });
    }
    /**
     * Invokes rustup with the specified arguments, creates an output channel with the specified
     * name, writes output of the invocation and returns the output
     * @param args The arguments which to invoke rustup with
     * @param logger The logger to log messages
     * @param outputChannelName The name which to create an output channel with
     */
    static invokeWithOutputChannel(args, logger, outputChannelName) {
        return __awaiter(this, void 0, void 0, function* () {
            const functionLogger = logger.createChildLogger(`invokeWithOutputChannel(args=${JSON.stringify(args)}, outputChannelName=${outputChannelName}): `);
            const result = yield OutputChannelProcess.create(this.getRustupExecutable(), args, undefined, outputChannelName);
            if (!result.success) {
                functionLogger.error('failed to start');
                return undefined;
            }
            if (result.code !== 0) {
                functionLogger.error(`exited with not zero; code=${result.code}`);
                functionLogger.error('Beginning of stdout');
                functionLogger.error(result.stdout);
                functionLogger.error('Ending of stdout');
                functionLogger.error('Beginning of stderr');
                functionLogger.error(result.stderr);
                functionLogger.error('Ending of stderr');
                return undefined;
            }
            return result.stdout;
        });
    }
    /**
     * Constructs a new instance of the class.
     * The constructor is private because creating a new instance should be done via the method `create`
     * @param logger A value for the field `logger`
     * @param pathToRustcSysRoot A value for the field `pathToRustcSysRoot`
     * @param pathToRustSourceCode A value for the field `pathToRustSourceCode`
     */
    constructor(logger) {
        this.logger = logger;
        this.pathToRustcSysRoot = undefined;
        this.pathToRustSourceCode = undefined;
        this.components = {};
        this.toolchains = [];
        this._userToolchain = getUserToolchain();
        this._userNightlyToolchain = getUserNightlyToolchain();
    }
    /**
     * Takes from the field `components` only installed components
     * @returns a list of installed components
     */
    getInstalledComponents(toolchain) {
        const toolchainAsString = toolchain.toString(true, false);
        const components = this.components[toolchainAsString];
        if (!components) {
            return [];
        }
        const installedComponents = components.filter(component => {
            return component.endsWith(Rustup.getSuffixForInstalledComponent());
        });
        return installedComponents;
    }
    /**
     * Returns true if the component is installed otherwise false
     * @param componentName The component's name
     */
    isComponentInstalled(toolchain, componentName) {
        const installedComponents = this.getInstalledComponents(toolchain);
        const component = installedComponents.find(c => c.startsWith(componentName));
        const isComponentInstalled = component !== undefined;
        return isComponentInstalled;
    }
    installComponent(toolchain, componentName) {
        return __awaiter(this, void 0, void 0, function* () {
            const logger = this.logger.createChildLogger(`installComponent(${toolchain}, ${componentName}: `);
            if (this.isComponentInstalled(toolchain, componentName)) {
                logger.error(`${componentName} is already installed. The method should not have been called`);
                // We return true because the component is installed, but anyway it is an exceptional situation
                return true;
            }
            const args = ['component', 'add', componentName, '--toolchain', toolchain.toString(true, false)];
            const stdoutData = yield Rustup.invokeWithOutputChannel(args, logger, `Rustup: Installing ${componentName}`);
            if (stdoutData === undefined) {
                // Some error occurred. It is already logged
                // So we just need to notify a caller that the installation failed
                return false;
            }
            yield this.updateComponents(toolchain);
            if (!this.isComponentInstalled(toolchain, componentName)) {
                logger.error(`${componentName} had been installed successfully, but then Rustup reported that the component was not installed. This should have not happened`);
                return false;
            }
            return true;
        });
    }
}
exports.Rustup = Rustup;
function getUserConfiguration() {
    const configuration = Configuration_1.Configuration.getConfiguration();
    if (!configuration) {
        return undefined;
    }
    const rustupConfiguration = configuration.get('rustup');
    if (!rustupConfiguration) {
        return undefined;
    }
    return rustupConfiguration;
}
function getToolchainFromConfigurationParameter(parameter) {
    const rustupConfiguration = getUserConfiguration();
    if (!rustupConfiguration) {
        return undefined;
    }
    const toolchainAsString = rustupConfiguration[parameter];
    if (!toolchainAsString) {
        return undefined;
    }
    const toolchain = Toolchain_1.Toolchain.parse(toolchainAsString);
    if (toolchain) {
        return toolchain;
    }
    else {
        return undefined;
    }
}
function getUserNightlyToolchain() {
    return getToolchainFromConfigurationParameter('nightlyToolchain');
}
function getUserToolchain() {
    return getToolchainFromConfigurationParameter('toolchain');
}
function updateUserConfigurationParameter(updateParameter) {
    let configuration = getUserConfiguration();
    if (!configuration) {
        configuration = {};
    }
    updateParameter(configuration);
    Configuration_1.Configuration.getConfiguration().update('rustup', configuration, true);
}
//# sourceMappingURL=Rustup.js.map