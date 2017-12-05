'use strict';
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const vscode = require('vscode');
const legacy = require('./legacy');
const client = require('./client');
const util = require('./util');
const config_1 = require('./config');
const logging_1 = require('./logging');
function wrappedAPI(target, propertyKey, method) {
    const orig = method.value;
    method.value = function (...args) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this._backend;
                return orig.apply(this, args);
            }
            catch (e) {
                this.showError();
            }
        });
    };
    return method;
}
/**
 * The purpose of CMaketoolsWrapper is to hide which backend is being used at
 * any particular time behind a single API, such that we can invoke commands
 * on the wrapper, and the underlying implementation will be chosen based on
 * user configuration and platform
 */
class CMakeToolsWrapper {
    constructor(_ctx) {
        this._ctx = _ctx;
        this._backend = Promise.reject(new Error('Invalid backend promise'));
        this._cmakeServerWasEnabled = config_1.config.useCMakeServer;
        this._oldPreferredGenerators = config_1.config.preferredGenerators;
        this._oldGenerator = config_1.config.generator;
        this._cmakePath = config_1.config.cmakePath;
        this._configureEnvironment = config_1.config.configureEnvironment;
        this._disposables = [];
        this._reconfiguredEmitter = new vscode.EventEmitter();
        this.reconfigured = this._reconfiguredEmitter.event;
        this._targetChangedEventEmitter = new vscode.EventEmitter();
        this.targetChangedEvent = this._targetChangedEventEmitter.event;
        this._disposables.push(vscode.workspace.onDidChangeConfiguration(() => __awaiter(this, void 0, void 0, function* () {
            try {
                yield this._backend;
            }
            catch (e) {
                console.error('Error from previous CMake Server instance was ignored:', e);
            }
            const do_reload = (config_1.config.useCMakeServer !== this._cmakeServerWasEnabled) ||
                (config_1.config.preferredGenerators !== this._oldPreferredGenerators) ||
                (config_1.config.generator !== this._oldGenerator) ||
                (config_1.config.cmakePath !== this._cmakePath) ||
                (config_1.config.configureEnvironment !== this._configureEnvironment);
            this._cmakeServerWasEnabled = config_1.config.useCMakeServer;
            this._oldPreferredGenerators = config_1.config.preferredGenerators;
            this._oldGenerator = config_1.config.generator;
            this._cmakePath = config_1.config.cmakePath;
            this._configureEnvironment = config_1.config.configureEnvironment;
            if (do_reload) {
                yield this.restart();
            }
        })));
    }
    /**
     * Disposable for this object.
     *
     * Shutdown the backend and dispose of the emitters
     */
    dispose() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.shutdown();
            this._reconfiguredEmitter.dispose();
            this._targetChangedEventEmitter.dispose();
            this._disposables.map(t => t.dispose());
        });
    }
    /**
     * sourceDir: Promise<string>
     */
    _sourceDir() {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).sourceDir; });
    }
    get sourceDir() { return this._sourceDir(); }
    /**
     * mainListFile: Promise<string>
     */
    _mainListFile() {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).mainListFile; });
    }
    get mainListFile() { return this._mainListFile(); }
    /**
     * binaryDir: Promise<string>
     */
    _binaryDir() {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).binaryDir; });
    }
    get binaryDir() { return this._binaryDir(); }
    /**
     * cachePath: Promise<string>
     */
    _cachePath() {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).cachePath; });
    }
    get cachePath() { return this._cachePath(); }
    /**
     * executableTargets: Promise<ExecutableTarget[]>
     */
    _executableTargets() {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).executableTargets; });
    }
    get executableTargets() { return this._executableTargets(); }
    /**
     * diagnostics: Promise<DiagnosticCollection[]>
     */
    _diagnostics() {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).diagnostics; });
    }
    get diagnostics() { return this._diagnostics(); }
    /**
     * targets: Promise<Target[]>
     */
    _targets() {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).targets; });
    }
    get targets() { return this._targets(); }
    executeCMakeCommand(args, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._backend).executeCMakeCommand(args, options);
        });
    }
    execute(program, args, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._backend).execute(program, args, options);
        });
    }
    compilationInfoForFile(filepath) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._backend).compilationInfoForFile(filepath);
        });
    }
    configure(extraArgs, runPrebuild) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._backend).configure(extraArgs, runPrebuild);
        });
    }
    build(target) {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).build(target); });
    }
    install() {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).install(); });
    }
    jumpToCacheFile() {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).jumpToCacheFile(); });
    }
    clean() {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).clean(); });
    }
    cleanConfigure() {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).cleanConfigure(); });
    }
    cleanRebuild() {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).cleanRebuild(); });
    }
    buildWithTarget() {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).buildWithTarget(); });
    }
    setDefaultTarget() {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).setDefaultTarget(); });
    }
    setBuildType() {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).setBuildType(); });
    }
    ctest() {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).ctest(); });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).stop(); });
    }
    quickStart() {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).quickStart(); });
    }
    debugTarget() {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).debugTarget(); });
    }
    launchTarget() {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).launchTarget(); });
    }
    launchTargetProgramPath() {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).launchTargetProgramPath(); });
    }
    selectLaunchTarget() {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).selectLaunchTarget(); });
    }
    selectEnvironments() {
        return __awaiter(this, void 0, void 0, function* () { return (yield this._backend).selectEnvironments(); });
    }
    setActiveVariantCombination(settings) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._backend).setActiveVariantCombination(settings);
        });
    }
    toggleCoverageDecorations() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._backend).toggleCoverageDecorations();
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logging_1.log.verbose('Starting CMake Tools backend');
                const version_ex = yield util.execute(this._cmakePath, ['--version']).onComplete;
                if (version_ex.retc !== 0 || !version_ex.stdout) {
                    throw new Error(`Bad CMake executable "${this._cmakePath}". Is it installed and a valid executable?`);
                }
                let did_start = false;
                if (config_1.config.useCMakeServer) {
                    console.assert(version_ex.stdout);
                    const version_re = /cmake version (.*?)\r?\n/;
                    const version = util.parseVersion(version_re.exec(version_ex.stdout)[1]);
                    // We purposefully exclude versions <3.7.1, which have some major CMake
                    // server bugs
                    if (util.versionGreater(version, '3.7.1')) {
                        this._backend = client.ServerClientCMakeTools.startup(this._ctx);
                        did_start = true;
                    }
                    else {
                        logging_1.log.info('CMake Server is not available with the current CMake executable. Please upgrade to CMake 3.7.2 or newer first.');
                    }
                }
                if (!did_start) {
                    const leg = new legacy.CMakeTools(this._ctx);
                    this._backend = leg.initFinished;
                    did_start = true;
                }
                this._backend.then((be) => {
                    be.targetChanged(() => this._targetChangedEventEmitter.fire());
                    be.reconfigured(() => this._reconfiguredEmitter.fire());
                });
            }
            catch (error) {
                logging_1.log.error(error);
                this._backend = Promise.reject(error);
                this.showError();
            }
            yield this._backend;
        });
    }
    shutdown() {
        return __awaiter(this, void 0, void 0, function* () {
            logging_1.log.verbose('Shutting down CMake Tools backend');
            const old_be = this._backend;
            this._backend = Promise.reject(new Error('Invalid backend promise'));
            const be = yield old_be;
            if (be instanceof client.ServerClientCMakeTools) {
                yield be.dangerousShutdownClient();
            }
            be.dispose();
            this._backend = Promise.reject(new Error('Invalid backend promise'));
            logging_1.log.verbose('CMake Tools has been stopped');
        });
    }
    restart() {
        return __awaiter(this, void 0, void 0, function* () {
            logging_1.log.verbose('Restarting CMake Tools backend');
            yield this.shutdown();
            yield this.start();
            logging_1.log.verbose('Restart is complete');
        });
    }
    showError() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this._backend;
            }
            catch (e) {
                vscode.window.showErrorMessage(`CMakeTools extension was unable to initialize: ${e} [See output window for more details]`);
            }
        });
    }
}
__decorate([
    wrappedAPI
], CMakeToolsWrapper.prototype, "executeCMakeCommand", null);
__decorate([
    wrappedAPI
], CMakeToolsWrapper.prototype, "execute", null);
__decorate([
    wrappedAPI
], CMakeToolsWrapper.prototype, "compilationInfoForFile", null);
__decorate([
    wrappedAPI
], CMakeToolsWrapper.prototype, "configure", null);
__decorate([
    wrappedAPI
], CMakeToolsWrapper.prototype, "build", null);
__decorate([
    wrappedAPI
], CMakeToolsWrapper.prototype, "install", null);
__decorate([
    wrappedAPI
], CMakeToolsWrapper.prototype, "jumpToCacheFile", null);
__decorate([
    wrappedAPI
], CMakeToolsWrapper.prototype, "clean", null);
__decorate([
    wrappedAPI
], CMakeToolsWrapper.prototype, "cleanConfigure", null);
__decorate([
    wrappedAPI
], CMakeToolsWrapper.prototype, "cleanRebuild", null);
__decorate([
    wrappedAPI
], CMakeToolsWrapper.prototype, "buildWithTarget", null);
__decorate([
    wrappedAPI
], CMakeToolsWrapper.prototype, "setDefaultTarget", null);
__decorate([
    wrappedAPI
], CMakeToolsWrapper.prototype, "setBuildType", null);
__decorate([
    wrappedAPI
], CMakeToolsWrapper.prototype, "ctest", null);
__decorate([
    wrappedAPI
], CMakeToolsWrapper.prototype, "stop", null);
__decorate([
    wrappedAPI
], CMakeToolsWrapper.prototype, "quickStart", null);
__decorate([
    wrappedAPI
], CMakeToolsWrapper.prototype, "debugTarget", null);
__decorate([
    wrappedAPI
], CMakeToolsWrapper.prototype, "launchTarget", null);
__decorate([
    wrappedAPI
], CMakeToolsWrapper.prototype, "launchTargetProgramPath", null);
__decorate([
    wrappedAPI
], CMakeToolsWrapper.prototype, "selectLaunchTarget", null);
__decorate([
    wrappedAPI
], CMakeToolsWrapper.prototype, "selectEnvironments", null);
__decorate([
    wrappedAPI
], CMakeToolsWrapper.prototype, "setActiveVariantCombination", null);
__decorate([
    wrappedAPI
], CMakeToolsWrapper.prototype, "toggleCoverageDecorations", null);
exports.CMakeToolsWrapper = CMakeToolsWrapper;
;
//# sourceMappingURL=wrapper.js.map