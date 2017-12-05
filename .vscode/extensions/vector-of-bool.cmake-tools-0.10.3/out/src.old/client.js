'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const vscode = require('vscode');
const path = require('path');
const api = require('./api');
const diagnostics = require('./diagnostics');
const async = require('./async');
const cache = require('./cache');
const util = require('./util');
const common = require('./common');
const config_1 = require('./config');
const cms = require('./server-client');
const logging_1 = require("./logging");
class ServerClientCMakeTools extends common.CommonCMakeToolsBase {
    constructor(_ctx) {
        super(_ctx);
        this._ctx = _ctx;
        this._dirty = true;
        this._cacheEntries = new Map();
        this._accumulatedMessages = [];
        this._reconfiguredEmitter = new vscode.EventEmitter();
        this._reconfigured = this._reconfiguredEmitter.event;
    }
    get codeModel() {
        return this._codeModel;
    }
    set codeModel(cm) {
        this._codeModel = cm;
        this._workspaceCacheContent.codeModel = cm;
        if (cm && cm.configurations.length && cm.configurations[0].projects.length) {
            this._statusBar.projectName = cm.configurations[0].projects[0].name;
        }
        else {
            this._statusBar.projectName = 'No Project';
        }
        this._writeWorkspaceCacheContent();
    }
    get reconfigured() {
        return this._reconfigured;
    }
    get executableTargets() {
        return this.targets.filter(t => t.targetType === 'EXECUTABLE')
            .map(t => ({
            name: t.name,
            path: t.filepath,
        }));
    }
    markDirty() {
        this._dirty = true;
    }
    get compilerId() {
        for (const lang of ['CXX', 'C']) {
            const entry = this.cacheEntry(`CMAKE_${lang}_COMPILER`);
            if (!entry) {
                continue;
            }
            const compiler = entry.as();
            if (compiler.endsWith('cl.exe')) {
                return 'MSVC';
            }
            else if (/g(cc|\+\+)[^/]*/.test(compiler)) {
                return 'GNU';
            }
            else if (/clang(\+\+)?[^/]*/.test(compiler)) {
                return 'Clang';
            }
        }
        return null;
    }
    get needsReconfigure() {
        return this._dirty;
    }
    get activeGenerator() {
        return this._globalSettings ? this._globalSettings.generator : null;
    }
    allCacheEntries() {
        return Array.from(this._cacheEntries.values()).map(e => ({
            type: e.type,
            key: e.key,
            value: e.value,
            advanced: e.advanced,
            helpString: e.helpString,
        }));
    }
    cacheEntry(key) {
        return this._cacheEntries.get(key) || null;
    }
    dangerousShutdownClient() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._client) {
                yield this._client.shutdown();
                this._client = undefined;
            }
        });
    }
    dangerousRestartClient() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._restartClient();
        });
    }
    cleanConfigure() {
        return __awaiter(this, void 0, void 0, function* () {
            const build_dir = this.binaryDir;
            const cache = this.cachePath;
            const cmake_files = path.join(build_dir, 'CMakeFiles');
            yield this.dangerousShutdownClient();
            if (yield async.exists(cache)) {
                this._channel.appendLine('[vscode] Removing ' + cache);
                yield async.unlink(cache);
            }
            if (yield async.exists(cmake_files)) {
                this._channel.append('[vscode] Removing ' + cmake_files);
                yield util.rmdir(cmake_files);
            }
            yield this._restartClient();
            return this.configure();
        });
    }
    compilationInfoForFile(filepath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.codeModel) {
                return null;
            }
            const config = this.codeModel.configurations.length === 1 ?
                this.codeModel.configurations[0] :
                this.codeModel.configurations.find(c => c.name === this.selectedBuildType);
            if (!config) {
                return null;
            }
            for (const project of config.projects) {
                for (const target of project.targets) {
                    for (const group of target.fileGroups) {
                        const found = group.sources.find(source => {
                            const abs_source = path.isAbsolute(source) ?
                                source :
                                path.join(target.sourceDirectory, source);
                            const abs_filepath = path.isAbsolute(filepath) ?
                                filepath :
                                path.join(this.sourceDir, filepath);
                            return util.normalizePath(abs_source) ===
                                util.normalizePath(abs_filepath);
                        });
                        if (found) {
                            const defs = (group.defines || []).map(util.parseCompileDefinition);
                            const defs_o = defs.reduce((acc, el) => {
                                acc[el[0]] = el[1];
                                return acc;
                            }, {});
                            return {
                                file: found,
                                compileDefinitions: defs_o,
                                compileFlags: util.splitCommandLine(group.compileFlags),
                                includeDirectories: (group.includePath ||
                                    []).map(p => ({ path: p.path, isSystem: p.isSystem || false })),
                            };
                        }
                    }
                }
            }
            return null;
        });
    }
    configure(extraArgs = [], runPreBuild = true) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._client)
                return -1;
            if (!(yield this._preconfigure())) {
                return -1;
            }
            if (runPreBuild) {
                if (!(yield this._prebuild())) {
                    return -1;
                }
            }
            const args = yield this.prepareConfigure();
            this.statusMessage = 'Configuring...';
            const parser = new diagnostics.BuildParser(this.binaryDir, ['cmake'], this.activeGenerator);
            const parseMessages = () => {
                for (const msg of this._accumulatedMessages) {
                    const lines = msg.split('\n');
                    for (const line of lines) {
                        parser.parseLine(line);
                    }
                }
                parser.fillDiagnosticCollection(this._diagnostics);
            };
            try {
                this._accumulatedMessages = [];
                yield this._client.configure({ cacheArguments: args.concat(extraArgs) });
                yield this._client.compute();
                parseMessages();
            }
            catch (e) {
                if (e instanceof cms.ServerError) {
                    parseMessages();
                    this._channel.appendLine(`[vscode] Configure failed: ${e}`);
                    return 1;
                }
                else {
                    throw e;
                }
            }
            this._workspaceCacheContent.codeModel =
                yield this._client.sendRequest('codemodel');
            yield this._writeWorkspaceCacheContent();
            yield this._refreshAfterConfigure();
            this._setDefaultLaunchTarget();
            this._reconfiguredEmitter.fire();
            return 0;
        });
    }
    build(target) {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            const retc = yield _super("build").call(this, target);
            if (retc >= 0) {
                yield this._refreshAfterConfigure();
            }
            return retc;
        });
    }
    stop() {
        if (!this.currentChildProcess) {
            return Promise.resolve(false);
        }
        return util.termProc(this.currentChildProcess);
    }
    get targets() {
        if (!this._workspaceCacheContent.codeModel) {
            return [];
        }
        const config = this._workspaceCacheContent.codeModel.configurations.find(conf => conf.name === this.selectedBuildType);
        if (!config) {
            logging_1.log.error(`Found no matching codemodel config for active build type ${this
                .selectedBuildType}`);
            return [];
        }
        return config.projects.reduce((acc, project) => acc.concat(project.targets
            .filter(t => !!t.buildDirectory && !!t.artifacts)
            .map(t => ({
            type: 'rich',
            name: t.name,
            filepath: path.normalize(t.artifacts[0]),
            targetType: t.type,
        }))), [{
                type: 'rich',
                name: this.allTargetName,
                filepath: 'A special target to build all available targets',
                targetType: 'META'
            }]);
    }
    _restartClient() {
        return __awaiter(this, void 0, void 0, function* () {
            this._client = yield cms.CMakeServerClient
                .start({
                binaryDir: this.binaryDir,
                sourceDir: this.sourceDir,
                cmakePath: config_1.config.cmakePath,
                environment: util.mergeEnvironment(this.currentEnvironmentVariables, config_1.config.environment, config_1.config.configureEnvironment),
                onDirty: () => __awaiter(this, void 0, void 0, function* () {
                    this._dirty = true;
                }),
                onMessage: (msg) => __awaiter(this, void 0, void 0, function* () {
                    const line = `-- ${msg.message}`;
                    this._accumulatedMessages.push(line);
                    this._channel.appendLine(line);
                }),
                onProgress: (prog) => __awaiter(this, void 0, void 0, function* () {
                    this.buildProgress = (prog.progressCurrent - prog.progressMinimum) /
                        (prog.progressMaximum - prog.progressMinimum);
                    this.statusMessage = prog.progressMessage;
                }),
                pickGenerator: () => this.pickGenerator(),
            });
        });
    }
    _refreshAfterConfigure() {
        return __awaiter(this, void 0, void 0, function* () {
            return Promise.all([this._refreshCacheEntries(), this._refreshCodeModel()]);
        });
    }
    _refreshCodeModel() {
        return __awaiter(this, void 0, void 0, function* () {
            this.codeModel = yield this._client.codemodel();
        });
    }
    _refreshCacheEntries() {
        return __awaiter(this, void 0, void 0, function* () {
            const clcache = yield this._client.getCMakeCacheContent();
            return this._cacheEntries = clcache.cache.reduce((acc, el) => {
                const type = {
                    BOOL: api.EntryType.Bool,
                    STRING: api.EntryType.String,
                    PATH: api.EntryType.Path,
                    FILEPATH: api.EntryType.FilePath,
                    INTERNAL: api.EntryType.Internal,
                    UNINITIALIZED: api.EntryType.Uninitialized,
                    STATIC: api.EntryType.Static,
                }[el.type];
                console.assert(type !== undefined, `Unknown cache type ${el.type}`);
                acc.set(el.key, new cache.Entry(el.key, el.value, type, el.properties.HELPSTRING, el.properties.ADVANCED === '1'));
                return acc;
            }, new Map());
        });
    }
    _init() {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            yield _super("_init").call(this);
            yield this._restartClient();
            this._globalSettings = yield this._client.getGlobalSettings();
            this.codeModel = this._workspaceCacheContent.codeModel || null;
            this._statusBar.statusMessage = 'Ready';
            this._statusBar.isBusy = false;
            if (this.executableTargets.length > 0) {
                this.currentLaunchTarget = this.executableTargets[0].name;
            }
            try {
                yield this._refreshAfterConfigure();
            }
            catch (e) {
                if (e instanceof cms.ServerError) {
                }
                else {
                    throw e;
                }
            }
            return this;
        });
    }
    static startup(ct) {
        const cmt = new ServerClientCMakeTools(ct);
        cmt._statusBar.statusMessage = 'Ready';
        return cmt._init();
    }
}
exports.ServerClientCMakeTools = ServerClientCMakeTools;
//# sourceMappingURL=client.js.map