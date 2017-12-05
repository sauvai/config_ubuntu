'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const path = require('path');
const vscode = require('vscode');
const async = require('./async');
// import * as environment from './environment';
// import * as ctest from './ctest';
const diagnostics_1 = require('./diagnostics');
const util = require('./util');
const compdb_1 = require('./compdb');
const config_1 = require('./config');
const cache_1 = require('./cache');
const common_1 = require('./common');
const logging_1 = require('./logging');
const open = require('open');
class CMakeTargetListParser extends util.OutputParser {
    constructor() {
        super(...arguments);
        this._accumulatedLines = [];
    }
    parseLine(line) {
        this._accumulatedLines.push(line);
        return null;
    }
    getTargets(generator) {
        const important_lines = (generator.endsWith('Makefiles')
            ? this._accumulatedLines.filter(l => l.startsWith('... '))
            : this._accumulatedLines.filter(l => l.indexOf(': ') !== -1))
            .filter(l => !l.includes('All primary targets'));
        const targets = important_lines
            .map(l => generator.endsWith('Makefiles')
            ? l.substr(4)
            : l)
            .map(l => / /.test(l) ? l.substr(0, l.indexOf(' ')) : l)
            .map(l => l.replace(':', ''));
        // Sometimes the 'all' target isn't there. Not sure when or why, but we
        // can just patch around it
        if (targets.indexOf('all') < 0) {
            targets.push('all');
        }
        return targets;
    }
}
class CMakeTools extends common_1.CommonCMakeToolsBase {
    constructor(ctx) {
        super(ctx);
        this._lastConfigureSettings = {};
        this._compilationDatabase = Promise.resolve(null);
        this._reconfiguredEmitter = new vscode.EventEmitter();
        this._reconfigured = this._reconfiguredEmitter.event;
        this._compilerId = null;
        this._targets = [];
        this._executableTargets = [];
        this._initFinished = this._init();
        this.noExecutablesMessage = 'No targets are available for debugging. Be sure you have included the CMakeToolsProject in your CMake project.';
    }
    get reconfigured() {
        return this._reconfigured;
    }
    get compilerId() {
        return this._compilerId;
    }
    get targets() { return this._targets; }
    markDirty() {
        this._needsReconfigure = true;
    }
    get cmakeCache() {
        return this._cmakeCache;
    }
    set cmakeCache(cache) {
        this._cmakeCache = cache;
        this._statusBar.projectName = this.projectName;
    }
    allCacheEntries() {
        return this.cmakeCache.allEntries().map(e => ({
            type: e.type,
            key: e.key,
            value: e.value,
            advanced: e.advanced,
            helpString: e.helpString,
        }));
    }
    cacheEntry(name) {
        return this.cmakeCache.get(name);
    }
    get initFinished() {
        return this._initFinished;
    }
    get needsReconfigure() {
        return this._needsReconfigure;
    }
    set needsReconfigure(v) {
        this._needsReconfigure = v;
    }
    reloadCMakeCache() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.cmakeCache && this.cmakeCache.path === this.cachePath) {
                this.cmakeCache = yield this.cmakeCache.getReloaded();
            }
            else {
                this.cmakeCache = yield cache_1.CMakeCache.fromPath(this.cachePath);
            }
            return this.cmakeCache;
        });
    }
    get executableTargets() {
        return this._executableTargets;
    }
    set executableTargets(value) {
        this._executableTargets = value;
        this._setDefaultLaunchTarget();
    }
    _reloadMetaData() {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield async.exists(this.metaPath)) {
                const buffer = yield async.readFile(this.metaPath);
                const content = buffer.toString();
                const tuples = content
                    .split('\n')
                    .map(l => l.trim())
                    .filter(l => !!l.length)
                    .map(l => l.split(';'));
                this.executableTargets = tuples
                    .filter(tup => tup[0] === 'executable')
                    .map(tup => ({
                    name: tup[1],
                    path: tup[2],
                }));
                this._compilerId = null;
                if (tuples.length > 0) {
                    const [_, os, proc, cid] = tuples.find(tup => tup[0] === 'system');
                    this._compilerId = cid;
                }
            }
            else {
                this.executableTargets = [];
                this._compilerId = null;
            }
        });
    }
    _reloadConfiguration() {
        const new_settings = config_1.config.configureSettings;
        this._needsReconfigure = JSON.stringify(new_settings) !== JSON.stringify(this._lastConfigureSettings);
        this._lastConfigureSettings = new_settings;
        // A config change could require reloading the CMake Cache (ie. changing the build path)
        this._setupCMakeCacheWatcher();
        // Use may have disabled build diagnostics.
        if (!config_1.config.parseBuildDiagnostics) {
            this._diagnostics.clear();
        }
        if (!this._metaWatcher) {
            this._setupMetaWatcher();
        }
    }
    _setupCMakeCacheWatcher() {
        if (this._cmCacheWatcher) {
            this._cmCacheWatcher.dispose();
        }
        this._cmCacheWatcher = vscode.workspace.createFileSystemWatcher(this.cachePath);
        this._cmCacheWatcher.onDidChange(this.reloadCMakeCache.bind(this));
        this._cmCacheWatcher.onDidCreate(this.reloadCMakeCache.bind(this));
        this._cmCacheWatcher.onDidDelete(() => {
            this.reloadCMakeCache().then(() => {
                this._statusBar.projectName = this.projectName;
            });
        });
        return this.reloadCMakeCache();
    }
    _setupMetaWatcher() {
        if (this._metaWatcher) {
            this._metaWatcher.dispose();
        }
        this._metaWatcher = vscode.workspace.createFileSystemWatcher(this.metaPath);
        this._metaWatcher.onDidChange(this._reloadMetaData.bind(this));
        this._metaWatcher.onDidCreate(this._reloadMetaData.bind(this));
        this._metaWatcher.onDidDelete(this._reloadMetaData.bind(this));
        this._reloadMetaData();
    }
    _init() {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            yield this.reloadCMakeCache();
            // Initialize the base class for common tools
            yield _super("_init").call(this);
            // Load up the CMake cache
            yield this._setupCMakeCacheWatcher();
            this._setupMetaWatcher();
            this._reloadConfiguration();
            yield this._refreshTargetList();
            this.statusMessage = 'Ready';
            this._lastConfigureSettings = config_1.config.configureSettings;
            this._needsReconfigure = true;
            vscode.workspace.onDidChangeConfiguration(() => {
                logging_1.log.info('Reloading CMakeTools after configuration change');
                this._reloadConfiguration();
            });
            if (config_1.config.initialBuildType !== null) {
                vscode.window.showWarningMessage('The "cmake.initialBuildType" setting is now deprecated and will no longer be used.');
            }
            const last_nag_time = this._context.globalState.get('feedbackWanted.lastNagTime', 0);
            const now = new Date().getTime();
            const time_since_nag = now - last_nag_time;
            // Ask for feedback once every thirty days
            const do_nag = time_since_nag > 1000 * 60 * 60 * 24 * 30;
            if (do_nag && Math.random() < 0.1) {
                this._context.globalState.update('feedbackWanted.lastNagTime', now);
                vscode.window.showInformationMessage('Like CMake Tools? I need your feedback to help make this extension better! Submitting feedback should only take a few seconds.', {
                    title: 'I\'ve got a few seconds',
                    action: () => {
                        open('https://github.com/vector-of-bool/vscode-cmake-tools/issues?q=is%3Aopen+is%3Aissue+label%3A%22feedback+wanted%21%22');
                    },
                }, {
                    title: 'Not now',
                    isCloseAffordance: true,
                }).then(chosen => {
                    if (chosen && chosen.action) {
                        chosen.action();
                    }
                });
            }
            return this;
        });
    }
    compilationInfoForFile(filepath) {
        return __awaiter(this, void 0, void 0, function* () {
            const db = yield this._compilationDatabase;
            if (!db) {
                return null;
            }
            return db.getCompilationInfoForUri(vscode.Uri.file(filepath));
        });
    }
    _refreshAll() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.reloadCMakeCache();
            yield this._refreshTargetList();
            yield this._reloadMetaData();
            yield this._ctestController.reloadTests(this.sourceDir, this.binaryDir, this.selectedBuildType || 'Debug');
            this._compilationDatabase = compdb_1.CompilationDatabase.fromFilePath(path.join(this.binaryDir, 'compile_commands.json'));
        });
    }
    /**
     * @brief Reload the list of available targets
     */
    _refreshTargetList() {
        return __awaiter(this, void 0, void 0, function* () {
            this._targets = [];
            if (!this.cmakeCache.exists) {
                return this.targets;
            }
            this.statusMessage = 'Refreshing targets...';
            const generator = this.activeGenerator;
            if (generator && /(Unix|MinGW|NMake) Makefiles|Ninja/.test(generator)) {
                const parser = new CMakeTargetListParser();
                yield this.executeCMakeCommand(['--build', this.binaryDir, '--target', 'help'], {
                    silent: true,
                    environment: {}
                }, parser);
                this._targets = parser.getTargets(generator).map(t => ({ type: 'named', name: t }));
            }
            this.statusMessage = 'Ready';
            return this.targets;
        });
    }
    /**
     * @brief Get the path to the metadata file
     */
    get metaPath() {
        const bt = this.selectedBuildType;
        const meta = path.join(this.binaryDir, `CMakeToolsMeta-${bt}.txt`);
        return util.normalizePath(meta);
    }
    get activeGenerator() {
        const gen = this.cmakeCache.get('CMAKE_GENERATOR');
        return gen
            ? gen.as()
            : null;
    }
    configure(extra_args = [], run_prebuild = true) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield this._preconfigure())) {
                return -1;
            }
            if (run_prebuild) {
                if (!(yield this._prebuild())) {
                    return -1;
                }
            }
            if (!(yield async.exists(this.cachePath)) ||
                (this.cmakeCache.exists && this.cachePath !== this.cmakeCache.path)) {
                yield this.reloadCMakeCache();
            }
            const args = [];
            let is_multi_conf = this.isMultiConf;
            if (!this.cmakeCache.exists) {
                this._channel.appendLine('[vscode] Setting up new CMake configuration');
                const generator = yield this.pickGenerator();
                if (generator) {
                    this._channel.appendLine('[vscode] Configuring using the "' + generator.name +
                        '" CMake generator');
                    args.push('-G' + generator.name);
                    const platform = generator.platform || config_1.config.platform || undefined;
                    if (platform) {
                        this._channel.appendLine(`[vscode] Platform: ${platform}`);
                        args.push('-A' + platform);
                    }
                    const toolset = generator.toolset || config_1.config.toolset || undefined;
                    if (toolset) {
                        this._channel.appendLine(`[vscode] Toolset: ${toolset}`);
                        args.push('-T' + toolset);
                    }
                    is_multi_conf = util.isMultiConfGenerator(generator.name);
                }
                else {
                    logging_1.log.error('None of the preferred generators were selected');
                }
            }
            args.push(...yield this.prepareConfigure());
            args.push('-H' + util.normalizePath(this.sourceDir), '-B' + util.normalizePath(this.binaryDir));
            const binary_dir = this.binaryDir;
            this.statusMessage = 'Configuring...';
            const result = yield this.executeCMakeCommand(args.concat(extra_args), {
                silent: false,
                environment: config_1.config.configureEnvironment,
            }, new diagnostics_1.BuildParser(this.binaryDir, null, this.activeGenerator));
            this.statusMessage = 'Ready';
            if (!result.retc) {
                yield this._refreshAll();
                yield this._reloadConfiguration();
                yield this.reloadCMakeCache();
                this._needsReconfigure = false;
            }
            this._reconfiguredEmitter.fire();
            return result.retc;
        });
    }
    _refreshAfterConfigure() {
        return this._refreshAll();
    }
    build(target = null) {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield _super("build").call(this, target);
            if (res === 0) {
                yield this._refreshAll();
            }
            return res;
        });
    }
    cleanConfigure() {
        return __awaiter(this, void 0, void 0, function* () {
            const build_dir = this.binaryDir;
            const cache = this.cachePath;
            const cmake_files = path.join(build_dir, 'CMakeFiles');
            if (yield async.exists(cache)) {
                this._channel.appendLine('[vscode] Removing ' + cache);
                yield async.unlink(cache);
            }
            if (yield async.exists(cmake_files)) {
                this._channel.appendLine('[vscode] Removing ' + cmake_files);
                yield util.rmdir(cmake_files);
            }
            return this.configure();
        });
    }
    setBuildTypeWithoutConfigure() {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            const old_build_path = this.binaryDir;
            const ret = yield _super("setBuildTypeWithoutConfigure").call(this);
            if (old_build_path !== this.binaryDir) {
                yield this._setupCMakeCacheWatcher();
            }
            return ret;
        });
    }
    stop() {
        const child = this.currentChildProcess;
        if (!child)
            return Promise.resolve(false);
        return util.termProc(child);
    }
}
exports.CMakeTools = CMakeTools;
//# sourceMappingURL=legacy.js.map