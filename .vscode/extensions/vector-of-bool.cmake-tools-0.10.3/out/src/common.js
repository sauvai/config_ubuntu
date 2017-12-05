"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const proc = require('child_process');
const http = require('http');
const path = require('path');
const vscode = require('vscode');
const ws = require('ws');
const async = require('./async');
const cache_edit_1 = require('./cache-edit');
const config_1 = require('./config');
const ctest = require('./ctest');
const diagnostics_1 = require('./diagnostics');
const environment = require('./environment');
const status = require('./status');
const util = require('./util');
const variants_1 = require('./variants');
const logging_1 = require('./logging');
const CMAKETOOLS_HELPER_SCRIPT = `
get_cmake_property(is_set_up _CMAKETOOLS_SET_UP)
if(NOT is_set_up)
    set_property(GLOBAL PROPERTY _CMAKETOOLS_SET_UP TRUE)
    macro(_cmt_invoke fn)
        file(WRITE "\${CMAKE_BINARY_DIR}/_cmt_tmp.cmake" "
            set(_args \\"\${ARGN}\\")
            \${fn}(\\\${_args})
        ")
        include("\${CMAKE_BINARY_DIR}/_cmt_tmp.cmake" NO_POLICY_SCOPE)
    endmacro()

    set(_cmt_add_executable add_executable)
    set(_previous_cmt_add_executable _add_executable)
    while(COMMAND "\${_previous_cmt_add_executable}")
        set(_cmt_add_executable "_\${_cmt_add_executable}")
        set(_previous_cmt_add_executable _\${_previous_cmt_add_executable})
    endwhile()
    macro(\${_cmt_add_executable} target)
        _cmt_invoke(\${_previous_cmt_add_executable} \${ARGV})
        get_target_property(is_imported \${target} IMPORTED)
        if(NOT is_imported)
            file(APPEND
                "\${CMAKE_BINARY_DIR}/CMakeToolsMeta.in.txt"
                "executable;\${target};$<TARGET_FILE:\${target}>\n"
                )
            _cmt_generate_system_info()
        endif()
    endmacro()

    set(_cmt_add_library add_library)
    set(_previous_cmt_add_library _add_library)
    while(COMMAND "\${_previous_cmt_add_library}")
        set(_cmt_add_library "_\${_cmt_add_library}")
        set(_previous_cmt_add_library "_\${_previous_cmt_add_library}")
    endwhile()
    macro(\${_cmt_add_library} target)
        _cmt_invoke(\${_previous_cmt_add_library} \${ARGV})
        get_target_property(type \${target} TYPE)
        if(NOT type MATCHES "^(INTERFACE_LIBRARY|OBJECT_LIBRARY)$")
            get_target_property(imported \${target} IMPORTED)
            get_target_property(alias \${target} ALIAS)
            if(NOT imported AND NOT alias)
                file(APPEND
                    "\${CMAKE_BINARY_DIR}/CMakeToolsMeta.in.txt"
                    "library;\${target};$<TARGET_FILE:\${target}>\n"
                    )
            endif()
        else()
            file(APPEND
                "\${CMAKE_BINARY_DIR}/CMakeToolsMeta.in.txt"
                "interface-library;\${target}\n"
                )
        endif()
        _cmt_generate_system_info()
    endmacro()

    if({{{IS_MULTICONF}}})
        set(condition CONDITION "$<CONFIG:Debug>")
    endif()

    file(WRITE "\${CMAKE_BINARY_DIR}/CMakeToolsMeta.in.txt" "")
    file(GENERATE
        OUTPUT "\${CMAKE_BINARY_DIR}/CMakeToolsMeta-$<CONFIG>.txt"
        INPUT "\${CMAKE_BINARY_DIR}/CMakeToolsMeta.in.txt"
        \${condition}
        )

    function(_cmt_generate_system_info)
        get_property(done GLOBAL PROPERTY CMT_GENERATED_SYSTEM_INFO)
        if(NOT done)
            set(_compiler_id "\${CMAKE_CXX_COMPILER_ID}")
            if(MSVC AND CMAKE_CXX_COMPILER MATCHES ".*clang-cl.*")
                set(_compiler_id "MSVC")
            endif()
            file(APPEND "\${CMAKE_BINARY_DIR}/CMakeToolsMeta.in.txt"
    "system;\${CMAKE_HOST_SYSTEM_NAME};\${CMAKE_SYSTEM_PROCESSOR};\${_compiler_id}\n")
        endif()
        set_property(GLOBAL PROPERTY CMT_GENERATED_SYSTEM_INFO TRUE)
    endfunction()
endif()
`;
function readWorkspaceCache(path, defaultContent) {
    return __awaiter(this, void 0, void 0, function* () {
        logging_1.log.info(`Loading CMake Tools from ${path}`);
        try {
            if (yield async.exists(path)) {
                const buf = yield async.readFile(path);
                return JSON
                    .parse(buf.toString(), (key, val) => {
                    if (key === 'keywordSettings') {
                        const acc = new Map();
                        for (const key in val) {
                            acc.set(key, val[key]);
                        }
                        return acc;
                    }
                    return val;
                });
            }
            else {
                return defaultContent;
            }
        }
        catch (err) {
            logging_1.log.error(`Error reading CMake Tools workspace cache: ${err}`);
            return defaultContent;
        }
    });
}
function writeWorkspaceCache(path, content) {
    return util.writeFile(path, JSON.stringify(content, (key, value) => {
        if (key === 'keywordSettings' && value instanceof Map) {
            return Array.from(value.entries())
                .reduce((acc, el) => {
                acc[el[0]] = el[1];
                return acc;
            }, {});
        }
        return value;
    }, 2));
}
class CommonCMakeToolsBase {
    constructor(_context) {
        this._context = _context;
        this._targetChangedEmitter = new vscode.EventEmitter();
        this.targetChanged = this._targetChangedEmitter.event;
        this.noExecutablesMessage = 'No targets are available for debugging.';
        /**
         * A list of all the disposables we keep track of
         */
        this._disposables = [];
        /**
         * The statusbar manager. Controls updating and refreshing the content of
         * the statusbar.
         */
        this._statusBar = new status.StatusBar();
        /**
         * The variant manager, controls and updates build variants
         */
        this.variants = new variants_1.VariantManager(this._context);
        /**
         * ctestController manages running ctest and reports ctest results via an
         * event emitter.
         */
        this._ctestController = new ctest.CTestController();
        /**
         * Manages build environments
         */
        this._environments = new environment.EnvironmentManager();
        /**
         * The main diagnostic collection for this extension. Contains both build
         * errors and cmake diagnostics.
         */
        this._diagnostics = vscode.languages.createDiagnosticCollection('cmake-build-diags');
        /**
         * The primary build output channel. We use the ThrottledOutputChannel because
         * large volumes of output can make VSCode choke
         */
        this._channel = new util.ThrottledOutputChannel('CMake/Build');
        /**
         * The workspace cache stores extension state that is convenient to remember
         * between executions. Things like the active variant or enabled environments
         * are stored here so that they may be recalled quickly upon extension
         * restart.
         */
        this._workspaceCachePath = path.join(vscode.workspace.rootPath || '~', '.vscode', '.cmaketools.json');
        this._workspaceCacheContent = {};
        /**
         * @brief The currently executing child process.
         */
        this._currentChildProcess = null;
        /**
         * @brief The default target to build when no target is specified
         */
        this._defaultBuildTarget = null;
        /**
         * The progress of the currently running task
         */
        this._buildProgress = null;
        /**
         * The selected target for debugging
         */
        this._currentLaunchTarget = null;
        const editor_server = this._http_server = http.createServer();
        const ready = new Promise((resolve, reject) => {
            editor_server.listen(0, 'localhost', undefined, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
        ready.then(() => {
            const websock_server = this._ws_server =
                ws.createServer({ server: editor_server });
            websock_server.on('connection', (client) => {
                const sub = this.reconfigured(() => {
                    client.send(JSON.stringify({ method: 'refreshContent' }));
                });
                client.onclose = () => {
                    sub.dispose();
                };
                client.onmessage = (msg) => {
                    const data = JSON.parse(msg.data);
                    console.log('Got message from editor client', msg);
                    const ret = this._handleCacheEditorMessage(data.method, data.params)
                        .then(ret => {
                        client.send(JSON.stringify({
                            id: data.id,
                            result: ret,
                        }));
                    })
                        .catch(e => {
                        client.send(JSON.stringify({
                            id: data.id,
                            error: e.message,
                        }));
                    });
                };
            });
            this._disposables.push(vscode.workspace.registerTextDocumentContentProvider('cmake-cache', new cache_edit_1.CacheEditorContentProvider(_context, editor_server.address().port)));
        });
        // We want to rewrite our workspace cache and updare our statusbar whenever
        // the active build variant changes
        this.variants.onActiveVariantCombinationChanged(v => {
            this._workspaceCacheContent.variant = v;
            this._writeWorkspaceCacheContent();
            this._statusBar.buildTypeLabel = v.label;
        });
        // These events are simply to update the statusbar
        this._ctestController.onTestingEnabledChanged(enabled => {
            this._statusBar.ctestEnabled = enabled;
        });
        this._ctestController.onResultsChanged((res) => {
            if (res) {
                this._statusBar.haveTestResults = true;
                this._statusBar.testResults = res;
            }
            else {
                this._statusBar.haveTestResults = false;
            }
        });
        this._environments.onActiveEnvironmentsChanges(envs => {
            this._statusBar.activeEnvironments = envs;
            this._workspaceCacheContent.activeEnvironments = envs;
            this._writeWorkspaceCacheContent();
        });
        this._disposables.push(this._statusBar);
    }
    get needsReconfigure() { }
    get activeGenerator() { }
    get executableTargets() { }
    get targets() { }
    get reconfigured() { }
    _refreshAfterConfigure() { }
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
    get linkerId() {
        const entry = this.cacheEntry(`CMAKE_LINKER`);
        if (entry) {
            const linker = entry.as();
            if (linker.endsWith('link.exe')) {
                return 'MSVC';
            }
            else if (linker.endsWith('ld')) {
                return 'GNU';
            }
        }
        return null;
    }
    setActiveVariantCombination(settings) {
        return this.variants.setActiveVariantCombination(settings);
    }
    ctest() {
        return __awaiter(this, void 0, void 0, function* () {
            this._channel.show();
            const build_retc = yield this.build();
            if (build_retc !== 0) {
                return build_retc;
            }
            return this._ctestController.executeCTest(this.sourceDir, this.binaryDir, this.selectedBuildType || 'Debug', this.executionEnvironmentVariables);
        });
    }
    selectEnvironments() {
        return this._environments.selectEnvironments();
    }
    get currentEnvironmentVariables() {
        return this._environments.currentEnvironmentVariables;
    }
    get currentEnvironmentSettings() {
        return this._environments.currentEnvironmentSettings;
    }
    getPreferredGenerators() {
        const configGenerators = config_1.config.preferredGenerators.map(g => ({ name: g }));
        return configGenerators.concat(this._environments.preferredEnvironmentGenerators);
    }
    testHaveCommand(program, args = ['--version']) {
        return __awaiter(this, void 0, void 0, function* () {
            const env = util.mergeEnvironment(process.env, this.currentEnvironmentVariables);
            return yield new Promise((resolve, _) => {
                const pipe = proc.spawn(program, args, {
                    env: env
                });
                pipe.on('error', () => resolve(false));
                pipe.on('exit', () => resolve(true));
            });
        });
    }
    // Returns the first one available on this system
    pickGenerator() {
        return __awaiter(this, void 0, void 0, function* () {
            // The user can override our automatic selection logic in their config
            const generator = config_1.config.generator;
            if (generator) {
                // User has explicitly requested a certain generator. Use that one.
                logging_1.log.verbose(`Using generator from configuration: ${generator}`);
                return {
                    name: generator,
                    platform: config_1.config.platform || undefined,
                    toolset: config_1.config.toolset || undefined,
                };
            }
            logging_1.log.verbose("Trying to detect generator supported by system");
            const platform = process.platform;
            const candidates = this.getPreferredGenerators();
            for (const gen of candidates) {
                const delegate = {
                    Ninja: () => __awaiter(this, void 0, void 0, function* () {
                        return (yield this.testHaveCommand('ninja-build')) ||
                            (yield this.testHaveCommand('ninja'));
                    }),
                    'MinGW Makefiles': () => __awaiter(this, void 0, void 0, function* () {
                        return platform === 'win32' && (yield this.testHaveCommand('make'))
                            || (yield this.testHaveCommand('mingw32-make'));
                    }),
                    'NMake Makefiles': () => __awaiter(this, void 0, void 0, function* () {
                        return platform === 'win32' &&
                            (yield this.testHaveCommand('nmake', ['/?']));
                    }),
                    'Unix Makefiles': () => __awaiter(this, void 0, void 0, function* () {
                        return platform !== 'win32' && (yield this.testHaveCommand('make'));
                    })
                }[gen.name];
                if (!delegate) {
                    const vsMatch = /^(Visual Studio \d{2} \d{4})($|\sWin64$|\sARM$)/.exec(gen.name);
                    if (platform === 'win32' && vsMatch) {
                        return {
                            name: vsMatch[1],
                            platform: gen.platform || vsMatch[2],
                            toolset: gen.toolset,
                        };
                    }
                    if (gen.name.toLowerCase().startsWith('xcode') && platform === 'darwin') {
                        return gen;
                    }
                    vscode.window.showErrorMessage('Unknown CMake generator "' + gen.name + '"');
                    continue;
                }
                if (yield delegate.bind(this)()) {
                    return gen;
                }
                else {
                    logging_1.log.info(`Build program for generator ${gen.name} is not found. Skipping...`);
                }
            }
            return null;
        });
    }
    get diagnostics() {
        return this._diagnostics;
    }
    /**
     * Toggle on/off highlighting of coverage data in the editor
     */
    toggleCoverageDecorations() {
        this.showCoverageData = !this.showCoverageData;
    }
    get showCoverageData() {
        return this._ctestController.showCoverageData;
    }
    set showCoverageData(v) {
        this._ctestController.showCoverageData = v;
    }
    _writeWorkspaceCacheContent() {
        return writeWorkspaceCache(this._workspaceCachePath, this._workspaceCacheContent);
    }
    selectLaunchTarget() {
        return __awaiter(this, void 0, void 0, function* () {
            const executableTargets = this.executableTargets;
            if (!executableTargets) {
                vscode.window.showWarningMessage(this.noExecutablesMessage);
                return null;
            }
            const choices = executableTargets.map(e => ({
                label: e.name,
                description: '',
                detail: e.path,
            }));
            const chosen = yield vscode.window.showQuickPick(choices);
            if (!chosen) {
                return null;
            }
            this.currentLaunchTarget = chosen.label;
            return chosen.detail;
        });
    }
    get projectName() {
        const entry = this.cacheEntry('CMAKE_PROJECT_NAME');
        if (!entry) {
            return 'Unconfigured';
        }
        return entry.as();
    }
    /**
     * @brief Performs asynchronous extension initialization
     */
    _init() {
        return __awaiter(this, void 0, void 0, function* () {
            // Setting this will set the string in the statusbar, so we set it here even
            // though it has the correct default value.
            this.defaultBuildTarget = null;
            async.exists(this.mainListFile).then(e => this._statusBar.visible = e);
            this._workspaceCacheContent = yield readWorkspaceCache(this._workspaceCachePath, { variant: null, activeEnvironments: [] });
            if (this._workspaceCacheContent.variant) {
                this.variants.activeVariantCombination =
                    this._workspaceCacheContent.variant;
            }
            yield this._environments.environmentsLoaded;
            this._statusBar.environmentsAvailable =
                this._environments.availableEnvironments.size !== 0;
            const envs = this._workspaceCacheContent.activeEnvironments || [];
            for (const e of envs) {
                if (this._environments.availableEnvironments.has(e)) {
                    this._environments.activateEnvironments(e);
                }
            }
            if (this.isMultiConf && config_1.config.buildDirectory.includes('${buildType}')) {
                vscode.window.showWarningMessage('It is not advised to use ${buildType} in the cmake.buildDirectory settings when the generator supports multiple build configurations.');
            }
            // Refresh any test results that may be left aroud from a previous run
            this._ctestController.reloadTests(this.sourceDir, this.binaryDir, this.selectedBuildType || 'Debug');
            return this;
        });
    }
    dispose() {
        this._disposables.map(d => d.dispose());
        this._ws_server.close();
        this._http_server.close();
    }
    get currentChildProcess() {
        return this._currentChildProcess;
    }
    set currentChildProcess(v) {
        this._currentChildProcess = v;
        this._statusBar.isBusy = v !== null;
    }
    /**
     * @brief A property that determines whether we are currently running a job
     * or not.
     */
    get isBusy() {
        return !!this.currentChildProcess;
    }
    /**
     * @brief The status message for the status bar.
     *
     * When this value is changed, we update our status bar item to show the
     * statusMessage. This could be something like 'Configuring...',
     * 'Building...' etc.
     */
    get statusMessage() {
        return this._statusBar.statusMessage;
    }
    set statusMessage(v) {
        this._statusBar.statusMessage = v;
    }
    /**
     * Determine if the project is using a multi-config generator
     */
    get isMultiConf() {
        const gen = this.activeGenerator;
        return !!gen && util.isMultiConfGenerator(gen);
    }
    /**
     * Shows a QuickPick containing the available build targets.
     */
    showTargetSelector() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.targets.length) {
                return (yield vscode.window.showInputBox({ prompt: 'Enter a target name' })) || null;
            }
            else {
                const choices = this.targets.map((t) => {
                    switch (t.type) {
                        case 'rich': {
                            return {
                                label: t.name,
                                description: t.targetType,
                                detail: t.filepath,
                            };
                        }
                        case 'named': {
                            return {
                                label: t.name,
                                description: '',
                            };
                        }
                    }
                });
                return vscode.window.showQuickPick(choices).then(sel => sel ? sel.label : null);
            }
        });
    }
    /**
     * @brief Get the name of the "all" target. This is used as the default build
     * target when none is already specified. We cannot simply use the name 'all'
     * because with Visual Studio the target is named ALL_BUILD.
     */
    get allTargetName() {
        const gen = this.activeGenerator;
        return (gen && (/Visual Studio/.test(gen) || gen.toLowerCase().includes('xcode'))) ? 'ALL_BUILD' : 'all';
    }
    /**
     * @brief The build type (configuration) which the user has most recently
     * selected.
     *
     * The build type is passed to CMake when configuring and building the
     * project. For multiconf generators, such as visual studio with msbuild,
     * the build type is not determined at configuration time. We need to store
     * the build type that the user wishes to use here so that when a user
     * invokes cmake.build, we will be able to build with the desired
     * configuration. This value is also reflected on the status bar item that
     * the user can click to change the build type.
     */
    get selectedBuildType() {
        const cached = this.variants.activeConfigurationOptions.buildType;
        return cached ? cached : null;
    }
    /**
     * @brief Replace all predefined variable by their actual values in the
     * input string.
     *
     * This method takes care of variables that depend on CMake configuration,
     * such as the built type, etc. All variables that do not need to know
     * of CMake should go to util.replaceVars instead.
     */
    replaceVars(str) {
        const replacements = [
            ['${buildType}', this.selectedBuildType || 'Unknown']
        ];
        return util.replaceVars(replacements.reduce((accdir, [needle, what]) => util.replaceAll(accdir, needle, what), str));
    }
    /**
     * @brief Read the source directory from the config
     */
    get sourceDir() {
        const dir = this.replaceVars(config_1.config.sourceDirectory);
        return util.normalizePath(dir);
    }
    /**
     * @brief Get the path to the root CMakeLists.txt
     */
    get mainListFile() {
        const listfile = path.join(this.sourceDir, 'CMakeLists.txt');
        return util.normalizePath(listfile);
    }
    /**
     * @brief Get the path to the binary dir
     */
    get binaryDir() {
        const dir = this.replaceVars(config_1.config.buildDirectory);
        return util.normalizePath(dir, false);
    }
    /**
     * @brief Get the path to the CMakeCache file in the build directory
     */
    get cachePath() {
        const file = path.join(this.binaryDir, 'CMakeCache.txt');
        return util.normalizePath(file);
    }
    get defaultBuildTarget() {
        return this._defaultBuildTarget;
    }
    set defaultBuildTarget(v) {
        this._defaultBuildTarget = v;
        this._statusBar.targetName = v || this.allTargetName;
        this._targetChangedEmitter.fire();
    }
    get buildProgress() {
        return this._buildProgress;
    }
    set buildProgress(v) {
        this._buildProgress = v;
        this._statusBar.progress = v;
    }
    get currentLaunchTarget() {
        return this._currentLaunchTarget;
    }
    set currentLaunchTarget(v) {
        this._currentLaunchTarget = v;
        this._statusBar.launchTargetName = v || '';
    }
    _setDefaultLaunchTarget() {
        // Check if the currently selected debug target is no longer a target
        const targets = this.executableTargets;
        if (targets.findIndex(e => e.name === this.currentLaunchTarget) < 0) {
            if (targets.length) {
                this.currentLaunchTarget = targets[0].name;
            }
            else {
                this.currentLaunchTarget = null;
            }
        }
        // If we didn't have a debug target, set the debug target to the first target
        if (this.currentLaunchTarget === null && targets.length) {
            this.currentLaunchTarget = targets[0].name;
        }
    }
    /**
     * @brief Execute tasks required before doing the build. Returns true if we
     * should continue with the build, false otherwise.
     */
    _prebuild() {
        return __awaiter(this, void 0, void 0, function* () {
            if (config_1.config.clearOutputBeforeBuild) {
                this._channel.clear();
            }
            if (config_1.config.saveBeforeBuild &&
                vscode.workspace.textDocuments.some(doc => doc.isDirty)) {
                this._channel.appendLine('[vscode] Saving unsaved text documents...');
                const is_good = yield vscode.workspace.saveAll();
                if (!is_good) {
                    const chosen = yield vscode.window.showErrorMessage('Not all open documents were saved. Would you like to build anyway?', {
                        title: 'Yes',
                        isCloseAffordance: false,
                    }, {
                        title: 'No',
                        isCloseAffordance: true,
                    });
                    return chosen !== undefined && (chosen.title === 'Yes');
                }
            }
            return true;
        });
    }
    executeCMakeCommand(args, options = { silent: false, environment: {} }, parser = new util.NullParser) {
        logging_1.log.info(`Execute cmake with arguments: ${args}`);
        return this.execute(config_1.config.cmakePath, args, options, parser);
    }
    get executionEnvironmentVariables() {
        return util.mergeEnvironment(config_1.config.environment, this.currentEnvironmentVariables);
    }
    /**
     * @brief Execute a CMake command. Resolves to the result of the execution.
     */
    execute(program, args, options = { silent: false, environment: {}, collectOutput: false }, parser = new util.NullParser()) {
        const silent = options && options.silent || false;
        const env = util.mergeEnvironment({
            // We set NINJA_STATUS to force Ninja to use the format
            // that we would like to parse
            NINJA_STATUS: '[%f/%t %p] '
        }, this.executionEnvironmentVariables, options.environment);
        const info = util.execute(program, args, env, options.workingDirectory, silent ? null : this._channel);
        const pipe = info.process;
        if (!silent) {
            this.currentChildProcess = pipe;
        }
        pipe.stdout.on('line', (line) => {
            const progress = parser.parseLine(line);
            if (!silent && progress) {
                this.buildProgress = progress;
            }
        });
        pipe.stderr.on('line', (line) => {
            const progress = parser.parseLine(line);
            if (!silent && progress) {
                this.buildProgress = progress;
            }
        });
        pipe.on('close', (retc) => {
            // Reset build progress to null to disable the progress bar
            this.buildProgress = null;
            if (parser instanceof diagnostics_1.BuildParser) {
                parser.fillDiagnosticCollection(this._diagnostics);
            }
            if (silent) {
                return;
            }
            const msg = `${program} exited with status ${retc}`;
            if (retc !== null) {
                vscode.window.setStatusBarMessage(msg, 4000);
                if (retc !== 0) {
                    this._statusBar.showWarningMessage(`${program} failed with status ${retc}. See CMake/Build output for details.`);
                }
            }
            this.currentChildProcess = null;
        });
        return info.onComplete;
    }
    ;
    jumpToCacheFile() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield async.exists(this.cachePath))) {
                const do_conf = !!(yield vscode.window.showErrorMessage('This project has not yet been configured.', 'Configure Now'));
                if (do_conf) {
                    if ((yield this.configure()) !== 0)
                        return null;
                }
            }
            vscode.commands.executeCommand('vscode.previewHtml', 'cmake-cache://' + this.cachePath, vscode.ViewColumn.Three, 'CMake Cache');
            return null;
        });
    }
    cleanRebuild() {
        return __awaiter(this, void 0, void 0, function* () {
            const clean_result = yield this.clean();
            if (clean_result)
                return clean_result;
            return yield this.build();
        });
    }
    install() {
        return this.build('install');
    }
    clean() {
        return this.build('clean');
    }
    buildWithTarget() {
        return __awaiter(this, void 0, void 0, function* () {
            const target = yield this.showTargetSelector();
            if (target === null || target === undefined)
                return -1;
            return yield this.build(target);
        });
    }
    setDefaultTarget() {
        return __awaiter(this, void 0, void 0, function* () {
            const new_default = yield this.showTargetSelector();
            if (!new_default)
                return;
            this.defaultBuildTarget = new_default;
        });
    }
    setBuildTypeWithoutConfigure() {
        return __awaiter(this, void 0, void 0, function* () {
            const changed = yield this.variants.showVariantSelector();
            if (changed) {
                // Changing the build type can affect the binary dir
                this._ctestController.reloadTests(this.sourceDir, this.binaryDir, this.selectedBuildType || 'Debug');
            }
            return changed;
        });
    }
    setBuildType() {
        return __awaiter(this, void 0, void 0, function* () {
            const do_configure = yield this.setBuildTypeWithoutConfigure();
            if (do_configure) {
                return yield this.configure();
            }
            else {
                return -1;
            }
        });
    }
    quickStart() {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield async.exists(this.mainListFile)) {
                vscode.window.showErrorMessage('This workspace already contains a CMakeLists.txt!');
                return -1;
            }
            const project_name = yield vscode.window.showInputBox({
                prompt: 'Enter a name for the new project',
                validateInput: (value) => {
                    if (!value.length)
                        return 'A project name is required';
                    return '';
                },
            });
            if (!project_name)
                return -1;
            const target_type = (yield vscode.window.showQuickPick([
                {
                    label: 'Library',
                    description: 'Create a library',
                },
                { label: 'Executable', description: 'Create an executable' }
            ]));
            if (!target_type)
                return -1;
            const type = target_type.label;
            const init = [
                'cmake_minimum_required(VERSION 3.0.0)',
                `project(${project_name} VERSION 0.0.0)`,
                '',
                'include(CTest)',
                'enable_testing()',
                '',
                {
                    Library: `add_library(${project_name} ${project_name}.cpp)`,
                    Executable: `add_executable(${project_name} main.cpp)`,
                }[type],
                '',
                'set(CPACK_PROJECT_NAME ${PROJECT_NAME})',
                'set(CPACK_PROJECT_VERSION ${PROJECT_VERSION})',
                'include(CPack)',
                '',
            ].join('\n');
            if (type === 'Library') {
                if (!(yield async.exists(path.join(this.sourceDir, project_name + '.cpp')))) {
                    yield util.writeFile(path.join(this.sourceDir, project_name + '.cpp'), [
                        '#include <iostream>',
                        '',
                        `void say_hello(){ std::cout << "Hello, from ${project_name}!\\n"; }`,
                        '',
                    ].join('\n'));
                }
            }
            else {
                if (!(yield async.exists(path.join(this.sourceDir, 'main.cpp')))) {
                    yield util.writeFile(path.join(this.sourceDir, 'main.cpp'), [
                        '#include <iostream>',
                        '',
                        'int main(int, char**)',
                        '{',
                        '   std::cout << "Hello, world!\\n";',
                        '}',
                        '',
                    ].join('\n'));
                }
            }
            yield util.writeFile(this.mainListFile, init);
            const doc = yield vscode.workspace.openTextDocument(this.mainListFile);
            yield vscode.window.showTextDocument(doc);
            return this.configure();
        });
    }
    getLaunchTargetInfo() {
        return this.executableTargets.find(e => e.name === this.currentLaunchTarget) || null;
    }
    launchTargetProgramPath() {
        return __awaiter(this, void 0, void 0, function* () {
            const t = this.getLaunchTargetInfo();
            return t ? t.path : t;
        });
    }
    _prelaunchTarget() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.executableTargets.length) {
                vscode.window.showWarningMessage('No executable targets are available. Be sure you have included CMakeToolsHelpers in your CMake project.');
                return null;
            }
            const target = this.getLaunchTargetInfo();
            if (!target) {
                vscode.window.showErrorMessage(`The current debug target "${this.currentLaunchTarget}" no longer exists. Select a new target to debug.`);
                return null;
            }
            const build_before = config_1.config.buildBeforeRun;
            if (!build_before)
                return target;
            const build_retc = yield this.build(target.name);
            if (build_retc !== 0)
                return null;
            return target;
        });
    }
    launchTarget() {
        return __awaiter(this, void 0, void 0, function* () {
            const target = yield this._prelaunchTarget();
            if (!target)
                return;
            const term = vscode.window.createTerminal(target.name, target.path);
            this._disposables.push(term);
            term.show();
        });
    }
    debugTarget() {
        return __awaiter(this, void 0, void 0, function* () {
            const target = yield this._prelaunchTarget();
            if (!target)
                return;
            const msvc = this.compilerId ? this.compilerId.includes('MSVC') :
                (this.linkerId ? this.linkerId.includes('MSVC') : false);
            const debug_config = {
                name: `Debugging Target ${target.name}`,
                type: msvc ? 'cppvsdbg' : 'cppdbg',
                request: 'launch',
                cwd: '${workspaceRoot}',
                args: [],
                MIMode: process.platform === 'darwin' ? 'lldb' : 'gdb',
            };
            const user_config = config_1.config.debugConfig;
            Object.assign(debug_config, user_config);
            debug_config['program'] = target.path;
            yield vscode.debug.startDebugging(vscode.workspace.workspaceFolders[0], debug_config);
        });
    }
    prepareConfigure() {
        return __awaiter(this, void 0, void 0, function* () {
            const cmake_cache_path = this.cachePath;
            const args = [];
            const settings = Object.assign({}, config_1.config.configureSettings);
            Object.assign(settings, this.currentEnvironmentSettings || {});
            if (!this.isMultiConf) {
                settings.CMAKE_BUILD_TYPE = this.selectedBuildType;
            }
            settings.CMAKE_EXPORT_COMPILE_COMMANDS = true;
            const variant_options = this.variants.activeConfigurationOptions;
            if (variant_options) {
                Object.assign(settings, variant_options.settings || {});
                if (variant_options.linkage) {
                    // Don't set BUILD_SHARED_LIBS if we don't have a specific setting
                    settings.BUILD_SHARED_LIBS = variant_options.linkage === 'shared';
                }
            }
            const cmt_dir = path.join(this.binaryDir, 'CMakeTools');
            yield util.ensureDirectory(cmt_dir);
            const helpers = path.join(cmt_dir, 'CMakeToolsHelpers.cmake');
            const helper_content = util.replaceAll(CMAKETOOLS_HELPER_SCRIPT, '{{{IS_MULTICONF}}}', this.isMultiConf ? '1' : '0');
            yield util.writeFile(helpers, helper_content);
            const old_path = settings['CMAKE_MODULE_PATH'] || [];
            settings['CMAKE_MODULE_PATH'] =
                Array.from(old_path).concat([cmt_dir.replace(/\\/g, path.posix.sep)]);
            const init_cache_path = path.join(this.binaryDir, 'CMakeTools', 'InitializeCache.cmake');
            const init_cache_content = this._buildCacheInitializer(settings);
            yield util.writeFile(init_cache_path, init_cache_content);
            let prefix = config_1.config.installPrefix;
            if (prefix && prefix !== '') {
                prefix = this.replaceVars(prefix);
                args.push('-DCMAKE_INSTALL_PREFIX=' + prefix);
            }
            args.push('-C' + init_cache_path);
            args.push(...config_1.config.configureArgs);
            return args;
        });
    }
    build(target_ = null) {
        return __awaiter(this, void 0, void 0, function* () {
            let target = target_;
            if (!target_) {
                target = this.defaultBuildTarget || this.allTargetName;
            }
            if (!this.sourceDir) {
                vscode.window.showErrorMessage('You do not have a source directory open');
                return -1;
            }
            if (this.isBusy) {
                vscode.window.showErrorMessage('A CMake task is already running. Stop it before trying to build.');
                return -1;
            }
            const cachepath = this.cachePath;
            if (!(yield async.exists(cachepath))) {
                const retc = yield this.configure();
                if (retc !== 0) {
                    return retc;
                }
                // We just configured which may change what the "all" target is.
                if (!target_) {
                    target = this.defaultBuildTarget || this.allTargetName;
                }
            }
            if (!target) {
                throw new Error('Unable to determine target to build. Something has gone horribly wrong!');
            }
            const ok = yield this._prebuild();
            if (!ok) {
                return -1;
            }
            if (this.needsReconfigure) {
                const retc = yield this.configure([], false);
                if (!!retc)
                    return retc;
            }
            // Pass arguments based on a particular generator
            const gen = this.activeGenerator;
            const generator_args = (() => {
                if (!gen)
                    return [];
                else if (/(Unix|MinGW) Makefiles|Ninja/.test(gen) && target !== 'clean')
                    return ['-j', config_1.config.numJobs.toString()];
                else if (/Visual Studio/.test(gen))
                    return ['/m', '/property:GenerateFullPaths=true'];
                else
                    return [];
            })();
            this._channel.show();
            this.statusMessage = `Building ${target}...`;
            const result = yield this.executeCMakeCommand([
                '--build',
                this.binaryDir,
                '--target',
                target,
                '--config',
                this.selectedBuildType || 'Debug',
            ].concat(config_1.config.buildArgs)
                .concat(['--'].concat(generator_args).concat(config_1.config.buildToolArgs)), {
                silent: false,
                environment: config_1.config.buildEnvironment,
            }, (config_1.config.parseBuildDiagnostics ?
                new diagnostics_1.BuildParser(this.binaryDir, this.sourceDir, config_1.config.enableOutputParsers, this.activeGenerator) :
                new util.NullParser()));
            this.statusMessage = 'Ready';
            this._statusBar.reloadVisibility();
            return result.retc;
        });
    }
    _preconfigure() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isBusy) {
                vscode.window.showErrorMessage('A CMake task is already running. Stop it before trying to configure.');
                return false;
            }
            if (!this.sourceDir) {
                vscode.window.showErrorMessage('You do not have a source directory open');
                return false;
            }
            const cmake_list = this.mainListFile;
            if (!(yield async.exists(cmake_list))) {
                const do_quickstart = !!(yield vscode.window.showErrorMessage('You do not have a CMakeLists.txt', 'Quickstart a new CMake project'));
                if (do_quickstart)
                    yield this.quickStart();
                return false;
            }
            // If no build variant has been chosen, ask the user now
            if (!this.variants.activeVariantCombination) {
                const ok = yield this.setBuildTypeWithoutConfigure();
                if (!ok) {
                    return false;
                }
            }
            this._channel.show();
            return true;
        });
    }
    _buildCacheInitializer(settings) {
        const initial_cache_content = [
            '# This file is generated by CMake Tools! DO NOT EDIT!',
            'cmake_policy(PUSH)',
            'if(POLICY CMP0053)',
            '   cmake_policy(SET CMP0053 NEW)',
            'endif()',
        ];
        for (const key in settings) {
            let value = settings[key];
            let typestr = 'UNKNOWN';
            if (value === true || value === false) {
                typestr = 'BOOL';
                value = value ? 'TRUE' : 'FALSE';
            }
            else if (typeof (value) === 'string') {
                typestr = 'STRING';
                value = this.replaceVars(value);
                value = util.replaceAll(value, ';', '\\;');
            }
            else if (value instanceof Number || typeof value === 'number') {
                typestr = 'STRING';
            }
            else if (value instanceof Array) {
                typestr = 'STRING';
                value = value.join(';');
            }
            initial_cache_content.push(`set(${key} "${value.toString().replace(/"/g, '\\"')}" CACHE ${typestr} "Variable supplied by CMakeTools. Value is forced." FORCE)`);
        }
        initial_cache_content.push('cmake_policy(POP)');
        return initial_cache_content.join('\n');
    }
    _handleCacheEditorMessage(method, params) {
        switch (method) {
            case 'getEntries': {
                return Promise.resolve(this.allCacheEntries());
            }
            case 'configure': {
                return this.configure(params['args']);
            }
            case 'build': {
                return this.build();
            }
        }
        throw new Error('Invalid method: ' + method);
    }
}
exports.CommonCMakeToolsBase = CommonCMakeToolsBase;
//# sourceMappingURL=common.js.map