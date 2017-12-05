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
const proc = require('child_process');
const os = require('os');
const yaml = require('js-yaml');
const ajv = require('ajv');
const vscode = require('vscode');
const async = require('./async');
const environment = require('./environment');
const ctest_1 = require('./ctest');
const diagnostics_1 = require('./diagnostics');
const util_1 = require('./util');
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
        OUTPUT "\${CMAKE_BINARY_DIR}/CMakeToolsMeta.txt"
        INPUT "\${CMAKE_BINARY_DIR}/CMakeToolsMeta.in.txt"
        \${condition}
        )

    function(_cmt_generate_system_info)
        get_property(done GLOBAL PROPERTY CMT_GENERATED_SYSTEM_INFO)
        if(NOT done)
            file(APPEND "\${CMAKE_BINARY_DIR}/CMakeToolsMeta.in.txt"
    "system;\${CMAKE_HOST_SYSTEM_NAME};\${CMAKE_SYSTEM_PROCESSOR};\${CMAKE_CXX_COMPILER_ID}\n")
        endif()
        set_property(GLOBAL PROPERTY CMT_GENERATED_SYSTEM_INFO TRUE)
    endfunction()
endif()
`;
const open = require('open');
function isTruthy(value) {
    if (typeof value === 'string') {
        return !(value === '' ||
            value === 'FALSE' ||
            value === 'OFF' ||
            value === '0' ||
            value === 'NOTFOUND' ||
            value === 'NO' ||
            value === 'N' ||
            value === 'IGNORE' ||
            value.endsWith('-NOTFOUND'));
    }
    return !!value;
}
exports.isTruthy = isTruthy;
;
(function (EntryType) {
    EntryType[EntryType["Bool"] = 0] = "Bool";
    EntryType[EntryType["String"] = 1] = "String";
    EntryType[EntryType["Path"] = 2] = "Path";
    EntryType[EntryType["Filepath"] = 3] = "Filepath";
    EntryType[EntryType["Internal"] = 4] = "Internal";
    EntryType[EntryType["Uninitialized"] = 5] = "Uninitialized";
    EntryType[EntryType["Static"] = 6] = "Static";
})(exports.EntryType || (exports.EntryType = {}));
var EntryType = exports.EntryType;
;
class CacheEntry {
    constructor(key, value, type, docs) {
        this._type = EntryType.Uninitialized;
        this._docs = '';
        this._key = '';
        this._value = null;
        this._key = key;
        this._value = value;
        this._type = type;
        this._docs = docs;
    }
    get type() {
        return this._type;
    }
    get docs() {
        return this._docs;
    }
    get key() {
        return this._key;
    }
    get value() {
        return this._value;
    }
    as() { return this.value; }
}
exports.CacheEntry = CacheEntry;
;
class CMakeCache {
    constructor(path, exists, entries) {
        this._exists = false;
        this._path = '';
        this._entries = entries;
        this._path = path;
        this._exists = exists;
    }
    static fromPath(path) {
        return __awaiter(this, void 0, void 0, function* () {
            const exists = yield async.exists(path);
            if (exists) {
                const content = yield async.readFile(path);
                const entries = yield CMakeCache.parseCache(content.toString());
                return new CMakeCache(path, exists, entries);
            }
            else {
                return new CMakeCache(path, exists, new Map());
            }
        });
    }
    get exists() {
        return this._exists;
    }
    get path() {
        return this._path;
    }
    getReloaded() {
        return CMakeCache.fromPath(this.path);
    }
    static parseCache(content) {
        const lines = content.split(/\r\n|\n|\r/)
            .filter(line => !!line.length)
            .filter(line => !/^\s*#/.test(line));
        const entries = new Map();
        let docs_acc = '';
        for (const line of lines) {
            if (line.startsWith('//')) {
                docs_acc += /^\/\/(.*)/.exec(line)[1] + ' ';
            }
            else {
                const match = /^(.*?):(.*?)=(.*)/.exec(line);
                console.assert(!!match, "Couldn't handle reading cache entry: " + line);
                const [_, name, typename, valuestr] = match;
                if (!name || !typename)
                    continue;
                if (name.endsWith('-ADVANCED') && valuestr === '1') {
                }
                else {
                    const key = name;
                    const type = {
                        BOOL: EntryType.Bool,
                        STRING: EntryType.String,
                        PATH: EntryType.Path,
                        FILEPATH: EntryType.Filepath,
                        INTERNAL: EntryType.Internal,
                        UNINITIALIZED: EntryType.Uninitialized,
                        STATIC: EntryType.Static,
                    }[typename];
                    const docs = docs_acc.trim();
                    docs_acc = '';
                    let value = valuestr;
                    if (type === EntryType.Bool)
                        value = isTruthy(value);
                    console.assert(type !== undefined, `Unknown cache entry type: ${type}`);
                    entries.set(name, new CacheEntry(key, value, type, docs));
                }
            }
        }
        return entries;
    }
    get(key, defaultValue) {
        return this._entries.get(key) || null;
    }
}
exports.CMakeCache = CMakeCache;
var WorkspaceCacheFile;
(function (WorkspaceCacheFile) {
    function readCache(path, defaultVal) {
        return __awaiter(this, void 0, void 0, function* () {
            console.info('Reloading cmake-tools extension cache data from', path);
            try {
                const buf = yield async.readFile(path);
                if (!buf)
                    return defaultVal;
                return JSON.parse(buf.toString(), (key, val) => {
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
            catch (err) {
                return defaultVal;
            }
        });
    }
    WorkspaceCacheFile.readCache = readCache;
    function writeCache(path, cache) {
        return util_1.util.writeFile(path, JSON.stringify(cache, (key, value) => {
            if (key === 'keywordSettings' && value instanceof Map) {
                return Array.from(value.entries()).reduce((acc, el) => {
                    acc[el[0]] = el[1];
                    return acc;
                }, {});
            }
            return value;
        }, 2));
    }
    WorkspaceCacheFile.writeCache = writeCache;
})(WorkspaceCacheFile = exports.WorkspaceCacheFile || (exports.WorkspaceCacheFile = {}));
class ConfigurationReader {
    readConfig(key, default_ = null) {
        const config = vscode.workspace.getConfiguration('cmake');
        const value = config.get(key);
        return (value !== undefined) ? value : default_;
    }
    _readPrefixed(key) {
        const platform = {
            win32: 'windows',
            darwin: 'osx',
            linux: 'linux'
        }[os.platform()];
        return this.readConfig(`${platform}.${key}`, this.readConfig(`${key}`));
    }
    get buildDirectory() {
        return this._readPrefixed('buildDirectory');
    }
    get installPrefix() {
        return this._readPrefixed('installPrefix');
    }
    get sourceDirectory() {
        return this._readPrefixed('sourceDirectory');
    }
    get saveBeforeBuild() {
        return !!this._readPrefixed('saveBeforeBuild');
    }
    get clearOutputBeforeBuild() {
        return !!this._readPrefixed('clearOutputBeforeBuild');
    }
    get configureSettings() {
        return this._readPrefixed('configureSettings');
    }
    get initialBuildType() {
        return this._readPrefixed('initialBuildType');
    }
    get preferredGenerators() {
        return this._readPrefixed('preferredGenerators') || [];
    }
    get generator() {
        return this._readPrefixed('generator');
    }
    get toolset() {
        return this._readPrefixed('toolset');
    }
    get configureArgs() {
        return this._readPrefixed('configureArgs');
    }
    get buildArgs() {
        return this._readPrefixed('buildArgs');
    }
    get buildToolArgs() {
        return this._readPrefixed('buildToolArgs');
    }
    get parallelJobs() {
        return this._readPrefixed('parallelJobs');
    }
    get ctest_parallelJobs() {
        return this._readPrefixed('ctest.parallelJobs');
    }
    get parseBuildDiagnostics() {
        return !!this._readPrefixed('parseBuildDiagnostics');
    }
    get enableOutputParsers() {
        return this._readPrefixed('enableOutputParsers');
    }
    get cmakePath() {
        return this._readPrefixed('cmakePath');
    }
    get debugConfig() {
        return this._readPrefixed('debugConfig');
    }
    get environment() {
        return this._readPrefixed('environment') || {};
    }
    get configureEnvironment() {
        return this._readPrefixed('configureEnvironment') || {};
    }
    get buildEnvironment() {
        return this._readPrefixed('buildEnvironment') || {};
    }
    get testEnvironment() {
        return this._readPrefixed('testEnvironment') || {};
    }
    get defaultVariants() {
        return this._readPrefixed('defaultVariants') || {};
    }
    get ctestArgs() {
        return this._readPrefixed('ctestArgs') || [];
    }
}
exports.ConfigurationReader = ConfigurationReader;
/**
 * An OutputParser that doesn't do anything when it parses
 */
class NullParser extends util_1.util.OutputParser {
    parseLine(line) { return null; }
}
class CMakeTargetListParser extends util_1.util.OutputParser {
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
class BuildParser extends util_1.util.OutputParser {
    constructor(binaryDir, parsers, generator) {
        super();
        this._accumulatedDiags = new Map();
        this._lastFile = null;
        this._activeParser = null;
        this._parserCollection = new Set();
        if (parsers) {
            for (let parser of parsers) {
                if (parser in diagnostics_1.diagnosticParsers) {
                    this._parserCollection.add(new diagnostics_1.diagnosticParsers[parser](binaryDir));
                }
            }
        }
        else {
            /* No parser specified. Use all implemented. */
            for (let parser in diagnostics_1.diagnosticParsers) {
                this._parserCollection.add(new diagnostics_1.diagnosticParsers[parser](binaryDir));
            }
        }
    }
    _progressParser(line) { return null; }
    ;
    parseBuildProgress(line) {
        // Parses out a percentage enclosed in square brackets Ignores other
        // contents of the brackets
        const percent_re = /\[.*?(\d+)\%.*?\]/;
        const res = percent_re.exec(line);
        if (res) {
            const [total] = res.splice(1);
            return Math.floor(parseInt(total));
        }
        return null;
    }
    parseDiagnosticLine(line) {
        if (this._activeParser) {
            var { lineMatch, diagnostic } = this._activeParser.parseLine(line);
            if (lineMatch) {
                return diagnostic;
            }
        }
        for (let parser of this._parserCollection.values()) {
            if (parser !== this._activeParser) {
                var { lineMatch, diagnostic } = parser.parseLine(line);
                if (lineMatch) {
                    this._activeParser = parser;
                    return diagnostic;
                }
            }
        }
        /* Most likely new generator progress message or new compiler command. */
        return null;
    }
    fillDiagnosticCollection(diagset) {
        diagset.clear();
        for (const [filepath, diags] of this._accumulatedDiags) {
            diagset.set(vscode.Uri.file(filepath), [...diags.values()]);
        }
    }
    parseLine(line) {
        const progress = this.parseBuildProgress(line);
        if (null === progress) {
            const diag = this.parseDiagnosticLine(line);
            if (diag) {
                if (!this._accumulatedDiags.has(diag.filepath)) {
                    // First diagnostic of this file. Add a new map to hold our diags
                    this._accumulatedDiags.set(diag.filepath, new Map());
                }
                const diags = this._accumulatedDiags.get(diag.filepath);
                diags.set(diag.key, diag.diag);
            }
        }
        return progress;
    }
}
class ThrottledOutputChannel {
    constructor(name) {
        this._channel = vscode.window.createOutputChannel(name);
        this._accumulatedData = '';
        this._throttler = new async.Throttler();
    }
    get name() {
        return this._channel.name;
    }
    dispose() {
        this._accumulatedData = '';
        this._channel.dispose();
    }
    append(value) {
        this._accumulatedData += value;
        this._throttler.queue(() => {
            if (this._accumulatedData) {
                const data = this._accumulatedData;
                this._accumulatedData = '';
                this._channel.append(data);
            }
            return Promise.resolve();
        });
    }
    appendLine(value) {
        this.append(value + '\n');
    }
    clear() {
        this._accumulatedData = '';
        this._channel.clear();
    }
    show(columnOrPreserveFocus, preserveFocus) {
        this._channel.show(columnOrPreserveFocus, preserveFocus);
    }
    hide() {
        this._channel.hide();
    }
}
class CMakeTools {
    constructor(ctx) {
        this._cmakeToolsStatusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3.5);
        this._buildButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3.4);
        this._targetButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3.3);
        this._debugButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3.2);
        this._debugTargetButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3.1);
        this._testStatusButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3.05);
        this._warningMessage = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3);
        this._environmentSelectionButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 200);
        this._failingTestDecorationType = vscode.window.createTextEditorDecorationType({
            borderColor: 'rgba(255, 0, 0, 0.2)',
            borderWidth: '1px',
            borderRadius: '3px',
            borderStyle: 'solid',
            cursor: 'pointer',
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            overviewRulerColor: 'red',
            overviewRulerLane: vscode.OverviewRulerLane.Center,
            after: {
                contentText: 'Failed',
                backgroundColor: 'darkred',
                margin: '10px',
            },
        });
        this._lastConfigureSettings = {};
        this._needsReconfigure = false;
        this._workspaceCacheContent = {};
        this._workspaceCachePath = path.join(vscode.workspace.rootPath || '~', '.vscode', '.cmaketools.json');
        this._targets = [];
        this.os = null;
        this.systemProcessor = null;
        this.compilerId = null;
        this.config = new ConfigurationReader();
        /**
         * @brief The status message for the status bar.
         *
         * When this value is changed, we update our status bar item to show the
         * statusMessage. This could be something like 'Configuring...',
         * 'Building...' etc.
         */
        this._statusMessage = '';
        this._executableTargets = [];
        this._tests = [];
        this._failingTestDecorations = [];
        this.activeEnvironments = [];
        this._availableEnvironments = new Map();
        this._context = ctx;
        this._initFinished = this._init(ctx);
    }
    get cmakeCache() {
        return this._cmakeCache;
    }
    set cmakeCache(cache) {
        this._cmakeCache = cache;
        this._refreshStatusBarItems();
    }
    get currentChildProcess() {
        return this._currentChildProcess;
    }
    set currentChildProcess(v) {
        this._currentChildProcess = v;
        this._refreshStatusBarItems();
    }
    get diagnostics() {
        return this._diagnostics;
    }
    get initFinished() {
        return this._initFinished;
    }
    /**
     * A property that determines whether we are currently running a job
     * or not.
     */
    get isBusy() {
        return !!this.currentChildProcess;
    }
    get statusMessage() {
        return this._statusMessage;
    }
    set statusMessage(v) {
        this._statusMessage = v;
        this._refreshStatusBarItems();
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
        const cached = this.activeVariant.buildType;
        return cached ? cached : null;
    }
    get defaultBuildTarget() {
        return this._defaultBuildTarget;
    }
    set defaultBuildTarget(v) {
        this._defaultBuildTarget = v;
        this._refreshStatusBarItems();
    }
    reloadCMakeCache() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.cmakeCache && this.cmakeCache.path === this.cachePath) {
                this.cmakeCache = yield this.cmakeCache.getReloaded();
            }
            else {
                this.cmakeCache = yield CMakeCache.fromPath(this.cachePath);
            }
            return this.cmakeCache;
        });
    }
    get executableTargets() {
        return this._executableTargets;
    }
    set executableTargets(value) {
        this._executableTargets = value;
        if (!value) {
            this.currentDebugTarget = null;
            return;
        }
        // Check if the currently selected debug target is no longer a target
        if (value.findIndex(e => e.name === this.currentDebugTarget) < 0) {
            if (value.length) {
                this.currentDebugTarget = value[0].name;
            }
            else {
                this.currentDebugTarget = null;
            }
        }
        // If we didn't have a debug target, set the debug target to the first target
        if (this.currentDebugTarget === null && value.length) {
            this.currentDebugTarget = value[0].name;
        }
    }
    get tests() {
        return this._tests;
    }
    set tests(v) {
        this._tests = v;
        this._refreshStatusBarItems();
    }
    /**
     * @brief Reload the list of CTest tests
     */
    _refreshTests() {
        return __awaiter(this, void 0, void 0, function* () {
            const ctest_file = path.join(this.binaryDir, 'CTestTestfile.cmake');
            if (!(yield async.exists(ctest_file))) {
                return this.tests = [];
            }
            const bt = this.selectedBuildType || 'Debug';
            const result = yield async.execute('ctest', ['-N', '-C', bt], { cwd: this.binaryDir });
            if (result.retc !== 0) {
                // There was an error running CTest. Odd...
                this._channel.appendLine('[vscode] There was an error running ctest to determine available test executables');
                return this.tests = [];
            }
            const tests = result.stdout.split('\n')
                .map(l => l.trim())
                .filter(l => /^Test\s*#(\d+):\s(.*)/.test(l))
                .map(l => /^Test\s*#(\d+):\s(.*)/.exec(l))
                .map(([_, id, tname]) => ({
                id: parseInt(id),
                name: tname
            }));
            const tagfile = path.join(this.binaryDir, 'Testing', 'TAG');
            const tag = (yield async.exists(tagfile)) ? (yield async.readFile(tagfile)).toString().split('\n')[0].trim() : null;
            const tagdir = tag ? path.join(this.binaryDir, 'Testing', tag) : null;
            const results_file = tagdir ? path.join(tagdir, 'Test.xml') : null;
            if (results_file && (yield async.exists(results_file))) {
                yield this._refreshTestResults(results_file);
            }
            else {
                this.testResults = null;
            }
            return this.tests = tests;
        });
    }
    get testResults() {
        return this._testResults;
    }
    set testResults(v) {
        this._testResults = v;
        this._refreshStatusBarItems();
    }
    get buildProgress() {
        return this._buildProgress;
    }
    set buildProgress(v) {
        this._buildProgress = v;
        this._refreshStatusBarItems();
    }
    clearFailingTestDecorations() {
        this.failingTestDecorations = [];
    }
    addFailingTestDecoration(dec) {
        this._failingTestDecorations.push(dec);
        this._refreshActiveEditorDecorations();
    }
    get failingTestDecorations() {
        return this._failingTestDecorations;
    }
    set failingTestDecorations(v) {
        this._failingTestDecorations = v;
        for (const editor of vscode.window.visibleTextEditors) {
            this._refreshEditorDecorations(editor);
        }
    }
    _refreshActiveEditorDecorations() {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            // Seems that sometimes the activeTextEditor is undefined. A VSCode bug?
            this._refreshEditorDecorations(vscode.window.activeTextEditor);
        }
    }
    _refreshEditorDecorations(editor) {
        const to_apply = [];
        for (const decor of this.failingTestDecorations) {
            const editor_file = util_1.util.normalizePath(editor.document.fileName);
            const decor_file = util_1.util.normalizePath(path.isAbsolute(decor.fileName)
                ? decor.fileName
                : path.join(this.binaryDir, decor.fileName));
            if (editor_file !== decor_file) {
                continue;
            }
            const file_line = editor.document.lineAt(decor.lineNumber);
            const range = new vscode.Range(decor.lineNumber, file_line.firstNonWhitespaceCharacterIndex, decor.lineNumber, file_line.range.end.character);
            to_apply.push({
                hoverMessage: decor.hoverMessage,
                range: range,
            });
        }
        editor.setDecorations(this._failingTestDecorationType, to_apply);
    }
    _refreshTestResults(test_xml) {
        return __awaiter(this, void 0, void 0, function* () {
            this.testResults = yield ctest_1.ctest.readTestResultsFile(test_xml);
            const failing = this.testResults.Site.Testing.Test.filter(t => t.Status === 'failed');
            this.clearFailingTestDecorations();
            let new_decors = [];
            for (const t of failing) {
                new_decors.push(...yield ctest_1.ctest.parseTestOutput(t.Output));
            }
            this.failingTestDecorations = new_decors;
        });
    }
    get currentDebugTarget() {
        return this._currentDebugTarget;
    }
    set currentDebugTarget(v) {
        this._currentDebugTarget = v;
        this._refreshStatusBarItems();
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
                const [_, os, proc, cid] = tuples.find(tup => tup[0] === 'system');
                this.os = os || null;
                this.systemProcessor = proc || null;
                this.compilerId = cid || null;
            }
            else {
                this.executableTargets = [];
                this.os = null;
                this.systemProcessor = null;
                this.compilerId = null;
            }
        });
    }
    _reloadConfiguration() {
        const new_settings = this.config.configureSettings;
        this._needsReconfigure = JSON.stringify(new_settings) !== JSON.stringify(this._lastConfigureSettings);
        this._lastConfigureSettings = new_settings;
        // A config change could require reloading the CMake Cache (ie. changing the build path)
        this._setupCMakeCacheWatcher();
        // Use may have disabled build diagnostics.
        if (!this.config.parseBuildDiagnostics) {
            this._diagnostics.clear();
        }
        if (!this._metaWatcher) {
            this._setupMetaWatcher();
        }
        this._reloadVariants();
        this._refreshStatusBarItems();
        this.testHaveCommand(this.config.cmakePath).then(exists => {
            if (!exists) {
                vscode.window.showErrorMessage(`Bad CMake executable "${this.config.cmakePath}". Is it installed and a valid executable?`);
            }
        });
    }
    _setupWorkspaceCacheWatcher() {
        if (this._wsCacheWatcher) {
            this._wsCacheWatcher.dispose();
        }
        const watch = this._wsCacheWatcher = vscode.workspace.createFileSystemWatcher(this._workspaceCachePath);
        watch.onDidChange(this._refreshWorkspaceCacheContent.bind(this));
        watch.onDidCreate(this._refreshWorkspaceCacheContent.bind(this));
    }
    _writeWorkspaceCacheContent() {
        return WorkspaceCacheFile.writeCache(this._workspaceCachePath, this._workspaceCacheContent);
    }
    _refreshWorkspaceCacheContent() {
        return __awaiter(this, void 0, void 0, function* () {
            this._workspaceCacheContent = yield WorkspaceCacheFile.readCache(this._workspaceCachePath, { variant: null });
            this._writeWorkspaceCacheContent();
            this._setupCMakeCacheWatcher();
            if (this._workspaceCacheContent.variant) {
                this.activeVariantCombination = this._workspaceCacheContent.variant;
            }
            this._refreshStatusBarItems();
        });
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
                this._refreshStatusBarItems();
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
    _reloadVariants() {
        return __awaiter(this, void 0, void 0, function* () {
            const schema_path = this._context.asAbsolutePath('schemas/variants-schema.json');
            const schema = JSON.parse((yield async.readFile(schema_path)).toString());
            const validate = new ajv({
                allErrors: true,
                format: 'full',
            }).compile(schema);
            const workdir = vscode.workspace.rootPath;
            const yaml_file = path.join(workdir, 'cmake-variants.yaml');
            const json_file = path.join(workdir, 'cmake-variants.json');
            let variants;
            if (yield async.exists(yaml_file)) {
                const content = (yield async.readFile(yaml_file)).toString();
                try {
                    variants = yaml.load(content);
                }
                catch (e) {
                    vscode.window.showErrorMessage(`${yaml_file} is syntactically invalid.`);
                    variants = this.config.defaultVariants;
                }
            }
            else if (yield async.exists(json_file)) {
                const content = (yield async.readFile(json_file)).toString();
                try {
                    variants = JSON.parse(content);
                }
                catch (e) {
                    vscode.window.showErrorMessage(`${json_file} is syntactically invalid.`);
                    variants = this.config.defaultVariants;
                }
            }
            else {
                variants = this.config.defaultVariants;
            }
            const validated = validate(variants);
            if (!validated) {
                const errors = validate.errors;
                const error_strings = errors.map(err => `${err.dataPath}: ${err.message}`);
                vscode.window.showErrorMessage(`Invalid cmake-variants: ${error_strings.join('; ')}`);
                variants = this.config.defaultVariants;
            }
            const sets = new Map();
            for (const key in variants) {
                const sub = variants[key];
                const def = sub['default$'];
                const desc = sub['description$'];
                const choices = new Map();
                for (const name in sub) {
                    if (!name || ['default$', 'description$'].indexOf(name) !== -1) {
                        continue;
                    }
                    const settings = sub[name];
                    choices.set(name, settings);
                }
                sets.set(key, {
                    description: desc,
                    default: def,
                    choices: choices
                });
            }
            this.buildVariants = sets;
        });
    }
    get buildVariants() {
        return this._buildVariants;
    }
    set buildVariants(v) {
        this._buildVariants = v;
        this._needsReconfigure = true;
        this._refreshStatusBarItems();
    }
    get activeVariant() {
        const vari = this._workspaceCacheContent.variant;
        if (!vari) {
            return {};
        }
        const kws = vari.keywordSettings;
        if (!kws) {
            return {};
        }
        const vars = this.buildVariants;
        if (!vars) {
            return {};
        }
        const data = Array.from(kws.entries()).map(([param, setting]) => {
            if (!vars.has(param)) {
                debugger;
                throw 12;
            }
            const choices = vars.get(param).choices;
            if (!choices.has(setting)) {
                debugger;
                throw 12;
            }
            return choices.get(setting);
        });
        const result = data.reduce((el, acc) => ({
            buildType: el.buildType || acc.buildType,
            generator: el.generator || acc.generator,
            linkage: el.linkage || acc.linkage,
            toolset: el.toolset || acc.toolset,
            settings: Object.assign(acc.settings || {}, el.settings || {})
        }), {});
        return result;
    }
    get activeVariantCombination() {
        return this._activeVariantCombination;
    }
    set activeVariantCombination(v) {
        this._activeVariantCombination = v;
        this._needsReconfigure = true;
        this._workspaceCacheContent.variant = v;
        this._writeWorkspaceCacheContent();
        this._refreshStatusBarItems();
    }
    activateEnvironment(name) {
        const env = this.availableEnvironments.get(name);
        if (!env) {
            throw new Error(`Invalid environment named ${name}`);
        }
        if (!this.activeEnvironments) {
            throw new Error(`Invalid state: Environments not yet loaded!`);
        }
        this.activeEnvironments.push(name);
        this._refreshStatusBarItems();
        this._workspaceCacheContent.activeEnvironments = this.activeEnvironments;
        this._writeWorkspaceCacheContent();
    }
    deactivateEnvironment(name) {
        if (!this.activeEnvironments) {
            throw new Error('Invalid state: Environments not yet loaded!');
        }
        const idx = this.activeEnvironments.indexOf(name);
        if (idx >= 0) {
            this.activeEnvironments.splice(idx, 1);
            this._refreshStatusBarItems();
        }
        this._workspaceCacheContent.activeEnvironments = this.activeEnvironments;
        this._writeWorkspaceCacheContent();
    }
    get availableEnvironments() {
        return this._availableEnvironments;
    }
    selectEnvironments() {
        return __awaiter(this, void 0, void 0, function* () {
            const entries = Array.from(this.availableEnvironments.keys())
                .map(name => ({
                name: name,
                label: this.activeEnvironments.indexOf(name) >= 0
                    ? `$(check) ${name}`
                    : name,
                description: '',
            }));
            const chosen = yield vscode.window.showQuickPick(entries);
            if (!chosen) {
                return;
            }
            this.activeEnvironments.indexOf(chosen.name) >= 0
                ? this.deactivateEnvironment(chosen.name)
                : this.activateEnvironment(chosen.name);
        });
    }
    _init(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            this._channel = new ThrottledOutputChannel('CMake/Build');
            //this._channel = vscode.window.createOutputChannel('CMake/Build');
            this._ctestChannel = vscode.window.createOutputChannel('CTest Results');
            this._diagnostics = vscode.languages.createDiagnosticCollection('cmake-build-diags');
            // Start loading up available environments early, this may take a few seconds
            const env_promises = environment.availableEnvironments();
            for (const pr of env_promises) {
                pr.then(env => {
                    if (env.variables) {
                        console.log(`Detected available environemt "${env.name}"`);
                        this._availableEnvironments.set(env.name, env.variables);
                    }
                }).catch(e => {
                    debugger;
                    console.log('Error detecting environment', e);
                });
            }
            yield Promise.all(env_promises);
            // All environments have been detected, now we can update the UI
            this.activeEnvironments = [];
            const envs = this._workspaceCacheContent.activeEnvironments || [];
            envs.map(e => {
                if (this.availableEnvironments.has(e)) {
                    this.activateEnvironment(e);
                }
            });
            const watcher = this._variantWatcher = vscode.workspace.createFileSystemWatcher(path.join(vscode.workspace.rootPath, 'cmake-variants.*'));
            watcher.onDidChange(this._reloadVariants.bind(this));
            watcher.onDidCreate(this._reloadVariants.bind(this));
            watcher.onDidDelete(this._reloadVariants.bind(this));
            yield this._reloadVariants();
            this._workspaceCacheContent = yield WorkspaceCacheFile.readCache(this._workspaceCachePath, { variant: null });
            if (this._workspaceCacheContent.variant) {
                this._activeVariantCombination = this._workspaceCacheContent.variant;
            }
            vscode.window.onDidChangeActiveTextEditor(_ => {
                this._refreshActiveEditorDecorations();
            });
            // Load up the CMake cache
            yield this._setupCMakeCacheWatcher();
            this._currentChildProcess = null;
            this._setupMetaWatcher();
            this._reloadConfiguration();
            yield this._refreshTests();
            yield this._refreshTargetList();
            this.statusMessage = 'Ready';
            this._lastConfigureSettings = this.config.configureSettings;
            this._needsReconfigure = true;
            vscode.workspace.onDidChangeConfiguration(() => {
                console.log('Reloading CMakeTools after configuration change');
                this._reloadConfiguration();
            });
            if (this.config.initialBuildType !== null) {
                vscode.window.showWarningMessage('The "cmake.initialBuildType" setting is now deprecated and will no longer be used.');
            }
            const last_nag_time = ctx.globalState.get('feedbackWanted.lastNagTime', 0);
            const now = new Date().getTime();
            const time_since_nag = now - last_nag_time;
            // Ask for feedback once every thirty days
            const do_nag = time_since_nag > 1000 * 60 * 60 * 24 * 30;
            if (do_nag && Math.random() < 0.1) {
                ctx.globalState.update('feedbackWanted.lastNagTime', now);
                vscode.window.showInformationMessage('Like CMake Tools? I need your feedback to help make this extension better! Submitting feedback should only take a few seconds.', {
                    title: 'I\'ve got a few seconds',
                    action: () => {
                        open('https://github.com/vector-of-bool/vscode-cmake-tools/issues?q=is%3Aopen+is%3Aissue+label%3A%22feedback+wanted%21%22');
                    },
                }, {
                    title: 'Not now',
                    isCloseAffordance: true,
                }).then(chosen => {
                    if (chosen.action) {
                        chosen.action();
                    }
                });
            }
        });
    }
    /**
     * @brief Refreshes the content of the status bar items.
     *
     * This only changes the visible content, and doesn't manipulate the state
     * of the extension.
     */
    _refreshStatusBarItems() {
        this._cmakeToolsStatusItem.command = 'cmake.setBuildType';
        const varset = this.activeVariantCombination || { label: 'Unconfigured' };
        this._cmakeToolsStatusItem.text = `CMake: ${this.projectName}: ${varset.label}: ${this.statusMessage}`;
        if (this.cmakeCache &&
            this.cmakeCache.exists &&
            this.isMultiConf &&
            this.config.buildDirectory.includes('${buildType}')) {
            vscode.window.showWarningMessage('It is not advised to use ${buildType} in the cmake.buildDirectory settings when the generator supports multiple build configurations.');
        }
        async.exists(path.join(this.sourceDir, 'CMakeLists.txt')).then(exists => {
            const have_exe_targets = this.executableTargets.length !== 0;
            if (exists) {
                this._cmakeToolsStatusItem.show();
                this._buildButton.show();
                this._targetButton.show();
                this._testStatusButton.show();
                this._debugButton.show();
                if (have_exe_targets) {
                    this._debugTargetButton.show();
                }
                else {
                    this._debugButton.text = '$(bug)';
                    this._debugTargetButton.hide();
                }
                this._environmentSelectionButton.show();
            }
            else {
                this._cmakeToolsStatusItem.hide();
                this._buildButton.hide();
                this._targetButton.hide();
                this._testStatusButton.hide();
                this._debugButton.hide();
                this._debugTargetButton.hide();
                this._environmentSelectionButton.hide();
            }
            if (this._testStatusButton.text == '') {
                this._testStatusButton.hide();
            }
        });
        const test_count = this.tests.length;
        if (this.testResults) {
            const good_count = this.testResults.Site.Testing.Test.reduce((acc, test) => acc + (test.Status !== 'failed' ? 1 : 0), 0);
            const passing = test_count === good_count;
            this._testStatusButton.text = `$(${passing ? 'check' : 'x'}) ${good_count}/${test_count} ${good_count === 1 ? 'test' : 'tests'} passing`;
            this._testStatusButton.color = good_count === test_count ? 'lightgreen' : 'yellow';
        }
        else if (test_count) {
            this._testStatusButton.color = '';
            this._testStatusButton.text = 'Run CTest';
        }
        else {
            this._testStatusButton.hide();
        }
        this._testStatusButton.command = 'cmake.ctest';
        let progress_bar = '';
        if (this.buildProgress) {
            const bars = this.buildProgress * 0.4 | 0;
            progress_bar = ` [${Array(bars).join('█')}${Array(40 - bars).join('░')}] ${this.buildProgress}%`;
        }
        this._buildButton.text = this.isBusy ? `$(x) Stop${progress_bar}` : `$(gear) Build:`;
        this._buildButton.command = this.isBusy ? 'cmake.stop' : 'cmake.build';
        this._targetButton.text = this.defaultBuildTarget || this.allTargetName;
        this._targetButton.command = 'cmake.setDefaultTarget';
        this._targetButton.tooltip = 'Click to change the default target';
        this._debugButton.text = '$(bug) Debug';
        this._debugButton.command = 'cmake.debugTarget';
        this._debugButton.tooltip = 'Run the debugger on the selected target executable';
        this._debugTargetButton.text = this.currentDebugTarget || '[No target selected for debugging]';
        this._debugTargetButton.command = 'cmake.selectDebugTarget';
        this._environmentSelectionButton.command = 'cmake.selectEnvironments';
        if (this.activeEnvironments !== null) {
            if (this.activeEnvironments.length) {
                this._environmentSelectionButton.text = `Working in ${this.activeEnvironments.join(', ')}`;
            }
            else {
                if (this.availableEnvironments.size !== 0) {
                    this._environmentSelectionButton.text = 'Select a build environment...';
                }
                else {
                    // No environments available. No need to show this button
                    this._environmentSelectionButton.hide();
                }
            }
        }
        else {
            this._environmentSelectionButton.text = 'Detecting available build environments...';
        }
    }
    get projectName() {
        if (!this.cmakeCache || !this.cmakeCache.exists) {
            return 'Unconfigured';
        }
        const cached = this.cmakeCache.get('CMAKE_PROJECT_NAME');
        return cached ? cached.as() : 'Unnamed Project';
    }
    _refreshAll() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.reloadCMakeCache();
            yield this._refreshTargetList();
            yield this._reloadMetaData();
            yield this._refreshTests();
        });
    }
    /**
     * @brief Reload the list of available targets
     */
    _refreshTargetList() {
        return __awaiter(this, void 0, void 0, function* () {
            this._targets = [];
            if (!this.cmakeCache.exists) {
                return this._targets;
            }
            this.statusMessage = 'Refreshing targets...';
            const generator = this.activeGenerator;
            if (generator && /(Unix|MinGW|NMake) Makefiles|Ninja/.test(generator)) {
                const parser = new CMakeTargetListParser();
                yield this.execute(['--build', this.binaryDir, '--target', 'help'], {
                    silent: true,
                    environment: {}
                }, parser);
                this._targets = parser.getTargets(generator);
            }
            this.statusMessage = 'Ready';
            return this._targets;
        });
    }
    /**
     * @brief Read the source directory from the config
     */
    get sourceDir() {
        const dir = this.config.sourceDirectory.replace('${workspaceRoot}', vscode.workspace.rootPath);
        return util_1.util.normalizePath(dir);
    }
    /**
     * @brief Get the path to the root CMakeLists.txt
     */
    get mainListFile() {
        const listfile = path.join(this.sourceDir, 'CMakeLists.txt');
        return util_1.util.normalizePath(listfile);
    }
    /**
     * @brief Get the path to the binary dir
     */
    get binaryDir() {
        const dir = this.config.buildDirectory
            .replace('${workspaceRoot}', vscode.workspace.rootPath)
            .replace('${buildType}', this.selectedBuildType || 'Unknown');
        return util_1.util.normalizePath(dir, false);
    }
    /**
     * @brief Get the path to the CMakeCache file in the build directory
     */
    get cachePath() {
        const file = path.join(this.binaryDir, 'CMakeCache.txt');
        return util_1.util.normalizePath(file);
    }
    /**
     * @brief Get the path to the metadata file
     */
    get metaPath() {
        const meta = path.join(this.binaryDir, 'CMakeToolsMeta.txt');
        return util_1.util.normalizePath(meta);
    }
    /**
     * @brief Determine if the project is using a multi-config generator
     */
    get isMultiConf() {
        const gen = this.activeGenerator;
        return !!gen && util_1.util.isMultiConfGenerator(gen);
    }
    get activeGenerator() {
        const gen = this.cmakeCache.get('CMAKE_GENERATOR');
        return gen
            ? gen.as()
            : null;
    }
    /**
     * @brief Get the name of the "all" target
     */
    get allTargetName() {
        if (!this.cmakeCache || !this.cmakeCache.exists)
            return 'all';
        const gen = this.activeGenerator;
        return (gen && /Visual Studio/.test(gen)) ? 'ALL_BUILD' : 'all';
    }
    /**
     * @brief Execute a CMake command. Resolves to the result of the execution.
     */
    execute(args, options = { silent: false, environment: {} }, parser = new NullParser()) {
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            const silent = options && options.silent || false;
            console.info('Execute cmake with arguments:', args);
            const pipe = proc.spawn(this.config.cmakePath, args, {
                env: Object.assign({
                    // We set NINJA_STATUS to force Ninja to use the format
                    // that we would like to parse
                    NINJA_STATUS: '[%f/%t %p] '
                }, options.environment, this.config.environment, this.activeEnvironments.reduce((acc, name) => {
                    const env_ = this.availableEnvironments.get(name);
                    console.assert(env_);
                    const env = env_;
                    for (const entry of env.entries()) {
                        acc[entry[0]] = entry[1];
                    }
                    return acc;
                }, {}), process.env)
            });
            const status = msg => vscode.window.setStatusBarMessage(msg, 4000);
            if (!silent) {
                this.currentChildProcess = pipe;
                status('Executing CMake...');
                this._channel.appendLine('[vscode] Executing cmake command: cmake '
                    + args
                        .map(a => a.replace('"', '\"'))
                        .map(a => /[ \n\r\f;\t]/.test(a) ? `"${a}"` : a)
                        .join(' '));
            }
            const emitLines = (stream) => {
                var backlog = '';
                stream.on('data', (data) => {
                    backlog += data.toString();
                    var n = backlog.indexOf('\n');
                    // got a \n? emit one or more 'line' events
                    while (n >= 0) {
                        stream.emit('line', backlog.substring(0, n).replace(/\r+$/, ''));
                        backlog = backlog.substring(n + 1);
                        n = backlog.indexOf('\n');
                    }
                });
                stream.on('end', () => {
                    if (backlog) {
                        stream.emit('line', backlog.replace(/\r+$/, ''));
                    }
                });
            };
            emitLines(pipe.stdout);
            emitLines(pipe.stderr);
            pipe.stdout.on('line', (line) => {
                console.log('cmake [stdout]: ' + line);
                const progress = parser.parseLine(line);
                if (!silent) {
                    this._channel.appendLine(line);
                    if (progress)
                        this.buildProgress = progress;
                }
            });
            pipe.stderr.on('line', (line) => {
                console.log('cmake [stderr]: ' + line);
                const progress = parser.parseLine(line);
                if (!silent) {
                    if (progress)
                        this.buildProgress = progress;
                    this._channel.appendLine(line);
                }
            });
            pipe.on('close', (retc) => {
                // Reset build progress to null to disable the progress bar
                this.buildProgress = null;
                if (parser instanceof BuildParser) {
                    parser.fillDiagnosticCollection(this._diagnostics);
                }
                console.log('cmake exited with return code ' + retc);
                if (silent) {
                    resolve({
                        retc: retc,
                    });
                    return;
                }
                this._channel.appendLine('[vscode] CMake exited with status ' + retc);
                if (retc !== null) {
                    status('CMake exited with status ' + retc);
                    if (retc !== 0) {
                        this._warningMessage.color = 'yellow';
                        this._warningMessage.text = `$(alert) CMake failed with status ${retc}. See CMake/Build output for details`;
                        this._warningMessage.show();
                        setTimeout(() => this._warningMessage.hide(), 5000);
                    }
                }
                this.currentChildProcess = null;
                resolve({
                    retc: retc,
                });
            });
        }));
    }
    ;
    // Test that a command exists
    testHaveCommand(command, args = ['--version']) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield new Promise((resolve, _) => {
                const pipe = proc.spawn(command, args);
                pipe.on('error', () => resolve(false));
                pipe.on('exit', () => resolve(true));
            });
        });
    }
    // Given a list of CMake generators, returns the first one available on this system
    pickGenerator(candidates) {
        return __awaiter(this, void 0, void 0, function* () {
            // The user can override our automatic selection logic in their config
            const generator = this.config.generator;
            if (generator) {
                // User has explicitly requested a certain generator. Use that one.
                return generator;
            }
            for (const gen of candidates) {
                const delegate = {
                    Ninja: function () {
                        return __awaiter(this, void 0, void 0, function* () {
                            return (yield this.testHaveCommand('ninja-build')) || (yield this.testHaveCommand('ninja'));
                        });
                    },
                    "MinGW Makefiles": function () {
                        return __awaiter(this, void 0, void 0, function* () {
                            return process.platform === 'win32' && (yield this.testHaveCommand('make'));
                        });
                    },
                    "NMake Makefiles": function () {
                        return __awaiter(this, void 0, void 0, function* () {
                            return process.platform === 'win32' && (yield this.testHaveCommand('nmake', ['/?']));
                        });
                    },
                    'Unix Makefiles': function () {
                        return __awaiter(this, void 0, void 0, function* () {
                            return process.platform !== 'win32' && (yield this.testHaveCommand('make'));
                        });
                    }
                }[gen];
                if (delegate === undefined) {
                    const vsMatcher = /^Visual Studio (\d{2}) (\d{4})($|\sWin64$|\sARM$)/;
                    if (vsMatcher.test(gen) && process.platform === 'win32')
                        return gen;
                    vscode.window.showErrorMessage('Unknown CMake generator "' + gen + '"');
                    continue;
                }
                if (yield delegate.bind(this)())
                    return gen;
                else
                    console.log('Generator "' + gen + '" is not supported');
            }
            return null;
        });
    }
    _prebuild() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.config.clearOutputBeforeBuild) {
                this._channel.clear();
            }
            if (this.config.saveBeforeBuild && vscode.workspace.textDocuments.some(doc => doc.isDirty)) {
                this._channel.appendLine("[vscode] Saving unsaved text documents...");
                yield vscode.workspace.saveAll();
            }
        });
    }
    get numJobs() {
        const jobs = this.config.parallelJobs;
        if (!!jobs) {
            return jobs;
        }
        return os.cpus().length + 2;
    }
    get numCTestJobs() {
        const ctest_jobs = this.config.ctest_parallelJobs;
        if (!ctest_jobs) {
            return this.numJobs;
        }
        return ctest_jobs;
    }
    configure(extra_args = [], run_prebuild = true) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isBusy) {
                vscode.window.showErrorMessage('A CMake task is already running. Stop it before trying to configure.');
                return -1;
            }
            if (!this.sourceDir) {
                vscode.window.showErrorMessage('You do not have a source directory open');
                return -1;
            }
            const cmake_list = this.mainListFile;
            if (!(yield async.exists(cmake_list))) {
                const do_quickstart = !!(yield vscode.window.showErrorMessage('You do not have a CMakeLists.txt', "Quickstart a new CMake project"));
                if (do_quickstart)
                    yield this.quickStart();
                return -1;
            }
            if (!this.activeVariantCombination) {
                const ok = yield this.setBuildTypeWithoutConfigure();
                if (!ok) {
                    return -1;
                }
            }
            if (run_prebuild)
                yield this._prebuild();
            const cmake_cache = this.cachePath;
            this._channel.show();
            if (!(yield async.exists(cmake_cache))
                || (this.cmakeCache.exists && this.cachePath !== this.cmakeCache.path)) {
                yield this.reloadCMakeCache();
            }
            const settings_args = [];
            let is_multi_conf = this.isMultiConf;
            if (!this.cmakeCache.exists) {
                this._channel.appendLine("[vscode] Setting up new CMake configuration");
                const generator = yield this.pickGenerator(this.config.preferredGenerators);
                if (generator) {
                    this._channel.appendLine('[vscode] Configuring using the "' + generator + '" CMake generator');
                    settings_args.push("-G" + generator);
                    is_multi_conf = util_1.util.isMultiConfGenerator(generator);
                }
                else {
                    console.error("None of the preferred generators was selected");
                }
            }
            const toolset = this.config.toolset;
            if (toolset) {
                settings_args.push('-T' + toolset);
            }
            if (!is_multi_conf) {
                settings_args.push('-DCMAKE_BUILD_TYPE=' + this.selectedBuildType);
            }
            const settings = Object.assign({}, this.config.configureSettings);
            settings.CMAKE_EXPORT_COMPILE_COMMANDS = true;
            const variant = this.activeVariant;
            if (variant) {
                Object.assign(settings, variant.settings || {});
                settings.BUILD_SHARED_LIBS = variant.linkage === 'shared';
            }
            if (!(yield async.exists(this.binaryDir))) {
                yield util_1.util.ensureDirectory(this.binaryDir);
            }
            const cmt_dir = path.join(this.binaryDir, 'CMakeTools');
            if (!(yield async.exists(cmt_dir))) {
                yield util_1.util.ensureDirectory(cmt_dir);
            }
            const helpers = path.join(cmt_dir, 'CMakeToolsHelpers.cmake');
            const helper_content = util_1.util.replaceAll(CMAKETOOLS_HELPER_SCRIPT, '{{{IS_MULTICONF}}}', is_multi_conf
                ? '1'
                : '0');
            yield util_1.util.writeFile(helpers, helper_content);
            const old_path = settings['CMAKE_PREFIX_PATH'] || [];
            settings['CMAKE_MODULE_PATH'] = Array.from(old_path).concat([
                cmt_dir.replace(/\\/g, path.posix.sep)
            ]);
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
                    value = value ? "TRUE" : "FALSE";
                }
                if (typeof (value) === 'string') {
                    typestr = 'STRING';
                    value = value
                        .replace(';', '\\;')
                        .replace('${workspaceRoot}', vscode.workspace.rootPath)
                        .replace('${buildType}', this.selectedBuildType || 'Unknown');
                }
                if (value instanceof Number || typeof value === 'number') {
                    typestr = 'STRING';
                }
                if (value instanceof Array) {
                    typestr = 'STRING';
                    value = value.join(';');
                }
                initial_cache_content.push(`set(${key} "${value.toString().replace(/"/g, '\\"')}" CACHE ${typestr} "Variable supplied by CMakeTools. Value is forced." FORCE)`);
            }
            initial_cache_content.push('cmake_policy(POP)');
            const init_cache_path = path.join(this.binaryDir, 'CMakeTools', 'InitializeCache.cmake');
            yield util_1.util.writeFile(init_cache_path, initial_cache_content.join('\n'));
            let prefix = this.config.installPrefix;
            if (prefix && prefix !== "") {
                prefix = prefix
                    .replace('${workspaceRoot}', vscode.workspace.rootPath)
                    .replace('${buildType}', this.selectedBuildType || 'Unknown');
                settings_args.push("-DCMAKE_INSTALL_PREFIX=" + prefix);
            }
            const binary_dir = this.binaryDir;
            this.statusMessage = 'Configuring...';
            const result = yield this.execute(['-H' + this.sourceDir.replace(/\\/g, path.posix.sep),
                '-B' + binary_dir.replace(/\\/g, path.posix.sep),
                '-C' + init_cache_path]
                .concat(settings_args)
                .concat(extra_args)
                .concat(this.config.configureArgs), {
                silent: false,
                environment: this.config.configureEnvironment,
            }, new BuildParser(this.binaryDir, null, this.activeGenerator));
            this.statusMessage = 'Ready';
            if (!result.retc) {
                yield this._refreshAll();
                yield this._reloadConfiguration();
            }
            return result.retc;
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
                yield this.reloadCMakeCache();
                // We just configured which may change what the "all" target is.
                if (!target_) {
                    target = this.defaultBuildTarget || this.allTargetName;
                }
            }
            if (!target) {
                throw new Error('Unable to determine target to build. Something has gone horribly wrong!');
            }
            yield this._prebuild();
            if (this._needsReconfigure) {
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
                    return ['-j', this.numJobs.toString()];
                else if (/Visual Studio/.test(gen))
                    return ['/m', '/property:GenerateFullPaths=true'];
                else
                    return [];
            })();
            this._channel.show();
            this.statusMessage = 'Building...';
            const result = yield this.execute([
                '--build', this.binaryDir,
                '--target', target,
                '--config', this.selectedBuildType || 'Debug',
            ]
                .concat(this.config.buildArgs)
                .concat([
                '--'
            ]
                .concat(generator_args)
                .concat(this.config.buildToolArgs)), {
                silent: false,
                environment: this.config.buildEnvironment,
            }, (this.config.parseBuildDiagnostics ? new BuildParser(this.binaryDir, this.config.enableOutputParsers, this.activeGenerator) : new NullParser()));
            this.statusMessage = 'Ready';
            if (!result.retc) {
                yield this._refreshAll();
            }
            return result.retc;
        });
    }
    install() {
        return this.build('install');
    }
    clean() {
        return this.build('clean');
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
                yield util_1.util.rmdir(cmake_files);
            }
            return yield this.configure();
        });
    }
    jumpToCacheFile() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield async.exists(this.cachePath))) {
                const do_conf = !!(yield vscode.window.showErrorMessage('This project has not yet been configured.', 'Configure Now'));
                if (do_conf) {
                    if ((yield this.configure()) !== 0)
                        return null;
                }
            }
            const cache = yield vscode.workspace.openTextDocument(this.cachePath);
            return yield vscode.window.showTextDocument(cache);
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
    showTargetSelector() {
        return this._targets.length
            ? vscode.window.showQuickPick(this._targets)
            : vscode.window.showInputBox({
                prompt: 'Enter a target name'
            });
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
            const variants = Array.from(this.buildVariants.entries()).map(([key, variant]) => Array.from(variant.choices.entries()).map(([value_name, value]) => ({
                settingKey: key,
                settingValue: value_name,
                settings: value
            })));
            const product = util_1.util.product(variants);
            const items = product.map(optionset => ({
                label: optionset.map(o => o.settings['oneWordSummary$']
                    ? o.settings['oneWordSummary$']
                    : `${o.settingKey}=${o.settingValue}`).join('+'),
                keywordSettings: new Map(optionset.map(param => [param.settingKey, param.settingValue])),
                description: optionset.map(o => o.settings['description$']).join(' + '),
            }));
            const chosen = yield vscode.window.showQuickPick(items);
            if (!chosen)
                return false; // User cancelled
            this.activeVariantCombination = chosen;
            const old_build_path = this.binaryDir;
            if (this.binaryDir !== old_build_path) {
                yield this._setupCMakeCacheWatcher();
            }
            return true;
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
    debugTarget() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.executableTargets.length) {
                vscode.window.showWarningMessage('No targets are available for debugging. Be sure you have included CMakeToolsHelpers in your CMake project.');
                return;
            }
            const target = this.executableTargets.find(e => e.name === this.currentDebugTarget);
            if (!target) {
                vscode.window.showErrorMessage(`The current debug target "${this.currentDebugTarget}" no longer exists. Select a new target to debug.`);
                return;
            }
            const build_retc = yield this.build(target.name);
            if (build_retc !== 0)
                return;
            const config = {
                name: `Debugging Target ${target.name}`,
                type: (this.compilerId && this.compilerId.includes('MSVC'))
                    ? 'cppvsdbg'
                    : 'cppdbg',
                request: 'launch',
                cwd: '${workspaceRoot}',
                args: [],
                MIMode: process.platform === 'darwin' ? 'lldb' : 'gdb',
            };
            const user_config = this.config.debugConfig;
            Object.assign(config, user_config);
            config['program'] = target.path;
            console.log(JSON.stringify(config));
            return vscode.commands.executeCommand('vscode.startDebug', config);
        });
    }
    selectDebugTarget() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.executableTargets) {
                vscode.window.showWarningMessage('No targets are available for debugging. Be sure you have included the CMakeToolsProject in your CMake project.');
                return;
            }
            const target = yield vscode.window.showQuickPick(this.executableTargets.map(e => ({
                label: e.name,
                description: e.path,
            })));
            if (!target) {
                return;
            }
            this.currentDebugTarget = target.label;
        });
    }
    ctest() {
        return __awaiter(this, void 0, void 0, function* () {
            this._channel.show();
            this.failingTestDecorations = [];
            const build_retc = yield this.build();
            if (build_retc !== 0) {
                return build_retc;
            }
            const retc = (yield this.execute([
                '-E', 'chdir', this.binaryDir,
                'ctest', '-j' + this.numCTestJobs,
                '-C', this.selectedBuildType || 'Debug',
                '-T', 'test',
                '--output-on-failure',
            ].concat(this.config.ctestArgs), {
                silent: false,
                environment: this.config.testEnvironment,
            }, (this.config.parseBuildDiagnostics ? new BuildParser(this.binaryDir, ["cmake"], this.activeGenerator) : new NullParser()))).retc;
            yield this._refreshTests();
            this._ctestChannel.clear();
            if (this.testResults) {
                for (const test of this.testResults.Site.Testing.Test.filter(t => t.Status === 'failed')) {
                    this._ctestChannel.append(`The test "${test.Name}" failed with the following output:\n` +
                        '----------' + '-----------------------------------' + Array(test.Name.length).join('-') +
                        `\n${test.Output.trim().split('\n').map(line => '    ' + line).join('\n')}\n`);
                    // Only show the channel when a test fails
                    this._ctestChannel.show();
                }
            }
            return retc;
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
                }, {
                    label: 'Executable',
                    description: 'Create an executable'
                }
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
                    yield util_1.util.writeFile(path.join(this.sourceDir, project_name + '.cpp'), [
                        '#include <iostream>',
                        '',
                        `void say_hello(){ std::cout << "Hello, from ${project_name}!\\n"; }`,
                        '',
                    ].join('\n'));
                }
            }
            else {
                if (!(yield async.exists(path.join(this.sourceDir, 'main.cpp')))) {
                    yield util_1.util.writeFile(path.join(this.sourceDir, 'main.cpp'), [
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
            yield util_1.util.writeFile(this.mainListFile, init);
            const doc = yield vscode.workspace.openTextDocument(this.mainListFile);
            yield vscode.window.showTextDocument(doc);
            return this.configure();
        });
    }
    stop() {
        const child = this.currentChildProcess;
        if (!child)
            return;
        // Stopping the process isn't as easy as it may seem. cmake --build will
        // spawn child processes, and CMake won't forward signals to its
        // children. As a workaround, we list the children of the cmake process
        // and also send signals to them.
        this._killTree(child.pid);
    }
    _killTree(pid) {
        return __awaiter(this, void 0, void 0, function* () {
            if (process.platform !== 'win32') {
                let children = [];
                const stdout = (yield async.execute('pgrep', ['-P', pid.toString()])).stdout.trim();
                if (!!stdout.length) {
                    children = stdout.split('\n').map(line => Number.parseInt(line));
                }
                for (const other of children) {
                    if (other)
                        yield this._killTree(other);
                }
                process.kill(pid, 'SIGINT');
            }
            else {
                // Because reasons, Node's proc.kill doesn't work on killing child
                // processes transitively. We have to do a sad and manually kill the
                // task using taskkill.
                proc.exec('taskkill /pid ' + pid.toString() + ' /T /F');
            }
        });
    }
}
exports.CMakeTools = CMakeTools;
//# sourceMappingURL=cmake.js.map