"use strict";
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
const xml2js = require('xml2js');
const async = require('./async');
const config_1 = require('./config');
const util = require('./util');
// clang-format on
function cleanupResultsXML(messy) {
    return {
        Site: {
            $: messy.Site.$,
            Testing: {
                TestList: messy.Site.Testing[0].TestList.map(l => l.Test[0]),
                Test: messy.Site.Testing[0].Test.map((test) => ({
                    FullName: test.FullName[0],
                    FullCommandLine: test.FullCommandLine[0],
                    Name: test.Name[0],
                    Path: test.Path[0],
                    Status: test.$.Status,
                    Measurements: new Map(),
                    Output: test.Results[0].Measurement[0].Value[0]
                }))
            }
        }
    };
}
function cleanupCoverageXML(messy) {
    return messy.Site.CoverageLog[0].File.reduce((acc, file) => {
        acc[file.$.FullPath] = file.Report[0].Line.map(l => parseInt(l.$.Count));
        return acc;
    }, {});
}
function parseXMLString(xml) {
    return new Promise((resolve, reject) => {
        xml2js.parseString(xml, (err, result) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(result);
            }
        });
    });
}
function readTestResultsFile(test_xml) {
    return __awaiter(this, void 0, void 0, function* () {
        const content = (yield async.readFile(test_xml)).toString();
        const data = yield parseXMLString(content);
        const clean = cleanupResultsXML(data);
        return clean;
    });
}
exports.readTestResultsFile = readTestResultsFile;
function readTestCoverageFiles(tagdir) {
    return __awaiter(this, void 0, void 0, function* () {
        let counter = 0;
        const acc = {};
        while (1) {
            const logfile = path.join(tagdir, `CoverageLog-${counter++}.xml`);
            if (!(yield async.exists(logfile))) {
                break;
            }
            console.log('Reading in CTest coverage report', logfile);
            const content = (yield async.readFile(logfile)).toString();
            const mess = yield parseXMLString(content);
            Object.assign(acc, cleanupCoverageXML(mess));
        }
        return acc;
    });
}
exports.readTestCoverageFiles = readTestCoverageFiles;
function parseCatchTestOutput(output) {
    const lines_with_ws = output.split('\n');
    const lines = lines_with_ws.map(l => l.trim());
    const decorations = [];
    for (let cursor = 0; cursor < lines.length; ++cursor) {
        const line = lines[cursor];
        const regex = process.platform === 'win32' ?
            new RegExp(/^(.*)\((\d+)\): FAILED:/) :
            new RegExp(/^(.*):(\d+): FAILED:/);
        const res = regex.exec(line);
        if (res) {
            const [_, file, lineno_] = res;
            const lineno = parseInt(lineno_) - 1;
            let message = '~~~c++\n';
            for (let i = 0;; ++i) {
                const expr_line = lines_with_ws[cursor + i];
                if (expr_line.startsWith('======') || expr_line.startsWith('------')) {
                    break;
                }
                message += expr_line + '\n';
            }
            decorations.push({
                fileName: file,
                lineNumber: lineno,
                hoverMessage: `${message}\n~~~`,
            });
        }
    }
    return decorations;
}
exports.parseCatchTestOutput = parseCatchTestOutput;
function parseTestOutput(output) {
    return __awaiter(this, void 0, void 0, function* () {
        if (/is a Catch .* host application\./.test(output)) {
            return parseCatchTestOutput(output);
        }
        else {
            return [];
        }
    });
}
exports.parseTestOutput = parseTestOutput;
function generateCoverageDecorations(sourceDir, cover) {
    const acc = [];
    for (const filename in cover) {
        const lines = cover[filename];
        const filepath = path.isAbsolute(filename) ? filename : path.join(sourceDir, filename);
        let slide = null;
        let last_count = Number.POSITIVE_INFINITY;
        for (let line_ in cover[filename]) {
            const line = parseInt(line_);
            const exe = cover[filename][line];
            if (!slide || exe != last_count) {
                // We ignore coverage of -1, meaning the line is not executable
                if (slide && last_count != -1) {
                    acc.push(slide);
                }
                slide = {
                    file: filepath,
                    start: line,
                    end: line,
                    executionCounter: exe
                };
            }
            else {
                console.assert(exe == last_count);
                slide.end = line;
            }
            last_count = exe;
        }
        if (slide && last_count != -1) {
            acc.push(slide);
        }
    }
    return acc;
}
exports.generateCoverageDecorations = generateCoverageDecorations;
class DecorationManager {
    constructor() {
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
        this._coverageMissDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            isWholeLine: true
        });
        this._coverageHitLowDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(0, 200, 0, 0.1)',
            isWholeLine: true
        });
        this._coverageHitHighDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(0, 200, 0, 0.3)',
            isWholeLine: true
        });
        this._showCoverageData = false;
        this._failingTestDecorations = [];
        this._coverageDecorations = [];
        vscode.window.onDidChangeActiveTextEditor(_ => {
            this._refreshActiveEditorDecorations();
        });
    }
    get binaryDir() {
        return this._binaryDir;
    }
    set binaryDir(v) {
        this._binaryDir = v;
        this._refreshActiveEditorDecorations();
    }
    get showCoverageData() {
        return this._showCoverageData;
    }
    set showCoverageData(v) {
        this._showCoverageData = v;
        this._refreshAllEditorDecorations();
    }
    _refreshAllEditorDecorations() {
        for (const editor of vscode.window.visibleTextEditors) {
            this._refreshEditorDecorations(editor);
        }
    }
    _refreshActiveEditorDecorations() {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            // Seems that sometimes the activeTextEditor is undefined. A VSCode bug?
            this._refreshEditorDecorations(editor);
        }
    }
    _refreshEditorDecorations(editor) {
        const fails_acc = [];
        const editor_file = util.normalizePath(editor.document.fileName);
        for (const decor of this.failingTestDecorations) {
            const decor_file = util.normalizePath(path.isAbsolute(decor.fileName) ?
                decor.fileName :
                path.join(this.binaryDir, decor.fileName));
            if (editor_file !== decor_file) {
                continue;
            }
            const file_line = editor.document.lineAt(decor.lineNumber);
            const range = new vscode.Range(decor.lineNumber, file_line.firstNonWhitespaceCharacterIndex, decor.lineNumber, file_line.range.end.character);
            fails_acc.push({
                hoverMessage: decor.hoverMessage,
                range: range,
            });
        }
        editor.setDecorations(this._failingTestDecorationType, fails_acc);
        for (const t of [this._coverageMissDecorationType, this._coverageHitLowDecorationType, this._coverageHitHighDecorationType]) {
            editor.setDecorations(t, []);
        }
        if (this.showCoverageData) {
            const miss_acc = [];
            const low_acc = [];
            const high_acc = [];
            for (const decor of this.coverageDecorations) {
                const decor_file = util.normalizePath(decor.file);
                if (editor_file !== decor_file) {
                    continue;
                }
                const start_line = editor.document.lineAt(decor.start);
                const end_line = editor.document.lineAt(decor.end);
                const range = new vscode.Range(decor.start, start_line.firstNonWhitespaceCharacterIndex, decor.end, end_line.range.end.character);
                (decor.executionCounter == 0
                    ? miss_acc
                    : decor.executionCounter >= 3
                        ? high_acc
                        : low_acc).push({
                    range: range,
                    hoverMessage: decor.executionCounter.toString(),
                });
            }
            editor.setDecorations(this._coverageMissDecorationType, miss_acc);
            editor.setDecorations(this._coverageHitLowDecorationType, low_acc);
            editor.setDecorations(this._coverageHitHighDecorationType, high_acc);
        }
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
        this._refreshAllEditorDecorations();
    }
    get coverageDecorations() {
        return this._coverageDecorations;
    }
    set coverageDecorations(v) {
        this._coverageDecorations = v;
        this._refreshAllEditorDecorations();
    }
}
exports.DecorationManager = DecorationManager;
class CTestController {
    constructor() {
        this._decorationManager = new DecorationManager();
        this._channel = new util.ThrottledOutputChannel('CMake/Build');
        /**
         * Hods the most recent test informations
         */
        this._tests = [];
        this._testsChangedEmitter = new vscode.EventEmitter();
        this.onTestsChanged = this._testsChangedEmitter.event;
        this._resultsChangedEmitter = new vscode.EventEmitter();
        this.onResultsChanged = this._resultsChangedEmitter.event;
        this._testingEnabled = false;
        this._testingEnabledEmitter = new vscode.EventEmitter();
        this.onTestingEnabledChanged = this._testingEnabledEmitter.event;
    }
    executeCTest(sourceDir, binarydir, configuration, env) {
        return __awaiter(this, void 0, void 0, function* () {
            // Reset test decorations
            this._channel.clear();
            this._channel.show();
            this._decorationManager.failingTestDecorations = [];
            const pr = util.execute(config_1.config.ctestPath, [
                '-j' + config_1.config.numCTestJobs, '-C', configuration, '-T', 'test',
                '--output-on-failure'
            ].concat(config_1.config.ctestArgs), util.mergeEnvironment(config_1.config.testEnvironment, env), binarydir, this._channel);
            const rp = pr.onComplete.then(res => res.retc);
            rp.then(() => __awaiter(this, void 0, void 0, function* () {
                yield this.reloadTests(sourceDir, binarydir, configuration);
                if (this.testResults) {
                    for (const test of this.testResults.Site.Testing.Test.filter(t => t.Status === 'failed')) {
                        this._channel.append(`The test "${test.Name}" failed with the following output:\n` +
                            '----------' +
                            '-----------------------------------' +
                            Array(test.Name.length).join('-') +
                            `\n${test.Output.trim()
                                .split('\n')
                                .map(line => '    ' + line)
                                .join('\n')}\n`);
                        // Only show the channel when a test fails
                        this._channel.show();
                    }
                }
            }));
            return rp;
        });
    }
    /**
     * @brief Reload the list of CTest tests
     */
    reloadTests(sourceDir, binaryDir, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const ctest_file = path.join(binaryDir, 'CTestTestfile.cmake');
            if (!(yield async.exists(ctest_file))) {
                this.testingEnabled = false;
                return this.tests = [];
            }
            this._decorationManager.binaryDir = binaryDir;
            this.testingEnabled = true;
            const bt = config;
            const result = yield async.execute('ctest', ['-N', '-C', bt], { cwd: binaryDir });
            if (result.retc !== 0) {
                // There was an error running CTest. Odd...
                console.error('[vscode] There was an error running ctest to determine available test executables');
                return this.tests = [];
            }
            const tests = result.stdout.split('\n')
                .map(l => l.trim())
                .filter(l => /^Test\s*#(\d+):\s(.*)/.test(l))
                .map(l => /^Test\s*#(\d+):\s(.*)/.exec(l))
                .map(([_, id, tname]) => ({ id: parseInt(id), name: tname }));
            const tagfile = path.join(binaryDir, 'Testing', 'TAG');
            const tag = (yield async.exists(tagfile)) ?
                (yield async.readFile(tagfile)).toString().split('\n')[0].trim() :
                null;
            const tagdir = tag ? path.join(binaryDir, 'Testing', tag) : null;
            const results_file = tagdir ? path.join(tagdir, 'Test.xml') : null;
            this.tests = tests;
            if (results_file && (yield async.exists(results_file))) {
                console.assert(tagdir);
                yield this._reloadTestResults(sourceDir, tagdir, results_file);
            }
            else {
                this.testResults = null;
            }
            return tests;
        });
    }
    _reloadTestResults(sourcedir, tagdir, test_xml) {
        return __awaiter(this, void 0, void 0, function* () {
            this.testResults = yield readTestResultsFile(test_xml);
            const failing = this.testResults.Site.Testing.Test.filter(t => t.Status === 'failed');
            this._decorationManager.clearFailingTestDecorations();
            let new_decors = [];
            for (const t of failing) {
                new_decors.push(...yield parseTestOutput(t.Output));
            }
            this._decorationManager.failingTestDecorations = new_decors;
            const coverage = yield readTestCoverageFiles(tagdir);
            const decors = generateCoverageDecorations(sourcedir, coverage);
            this._decorationManager.coverageDecorations = decors;
        });
    }
    get tests() {
        return this._tests;
    }
    set tests(v) {
        this._tests = v;
        this._testsChangedEmitter.fire(v);
        ;
    }
    /**
     * Whether we show coverage data in the editor or not
     */
    get showCoverageData() {
        return this._decorationManager.showCoverageData;
    }
    set showCoverageData(v) {
        this._decorationManager.showCoverageData = v;
    }
    get testResults() {
        return this._testResults;
    }
    set testResults(v) {
        this._testResults = v;
        if (v) {
            const total = this.tests.length;
            const passing = v.Site.Testing.Test.reduce((acc, test) => acc + (test.Status !== 'failed' ? 1 : 0), 0);
            this._resultsChangedEmitter.fire({ passing, total });
        }
        else {
            this._resultsChangedEmitter.fire(null);
        }
    }
    get testingEnabled() {
        return this._testingEnabled;
    }
    set testingEnabled(v) {
        this._testingEnabled = v;
        this._testingEnabledEmitter.fire(v);
    }
    setBinaryDir(dir) {
        this._decorationManager.binaryDir = dir;
    }
}
exports.CTestController = CTestController;
//# sourceMappingURL=ctest.js.map