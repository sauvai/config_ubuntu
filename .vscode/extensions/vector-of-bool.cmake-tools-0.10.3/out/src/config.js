"use strict";
const os = require('os');
const path = require('path');
const vscode = require('vscode');
const util = require('./util');
class ConfigurationReader {
    readConfig(key, default_ = null) {
        const config = vscode.workspace.getConfiguration('cmake');
        const value = config.get(key);
        return (value !== undefined) ? value : default_;
    }
    _escapePaths(obj) {
        return Object.getOwnPropertyNames(obj).reduce((acc, key) => {
            acc[key] = util.replaceVars(obj[key]);
            return acc;
        }, {});
    }
    _readPrefixed(key) {
        const platform = { win32: 'windows',
            darwin: 'osx',
            linux: 'linux' }[os.platform()];
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
    get buildBeforeRun() {
        return !!this._readPrefixed('buildBeforeRun');
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
    get platform() {
        return this._readPrefixed('platform');
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
        return this._readPrefixed('cmakePath') || 'cmake';
    }
    get ctestPath() {
        const ctest_path = this._readPrefixed('ctestPath');
        if (!ctest_path) {
            const cmake = this.cmakePath;
            if (cmake === 'cmake' || cmake === 'cmake.exe') {
                return 'ctest';
            }
            return path.join(path.dirname(cmake), 'ctest');
        }
        else {
            return ctest_path;
        }
    }
    get debugConfig() {
        return this._readPrefixed('debugConfig');
    }
    get environment() {
        return this._escapePaths(this._readPrefixed('environment') || {});
    }
    get configureEnvironment() {
        return this._escapePaths(this._readPrefixed('configureEnvironment') || {});
    }
    get buildEnvironment() {
        return this._escapePaths(this._readPrefixed('buildEnvironment') || {});
    }
    get testEnvironment() {
        return this._escapePaths(this._readPrefixed('testEnvironment') || {});
    }
    get defaultVariants() {
        return this._readPrefixed('defaultVariants') || {};
    }
    get ctestArgs() {
        return this._readPrefixed('ctestArgs') || [];
    }
    get useCMakeServer() {
        return this._readPrefixed('useCMakeServer') || false;
    }
    get numJobs() {
        const jobs = this.parallelJobs;
        if (!!jobs) {
            return jobs;
        }
        return os.cpus().length + 2;
    }
    get numCTestJobs() {
        const ctest_jobs = this.ctest_parallelJobs;
        if (!ctest_jobs) {
            return this.numJobs;
        }
        return ctest_jobs;
    }
    get mingwSearchDirs() {
        return this._readPrefixed('mingwSearchDirs') || [];
    }
    get emscriptenSearchDirs() {
        return this._readPrefixed('emscriptenSearchDirs') || [];
    }
}
exports.ConfigurationReader = ConfigurationReader;
exports.config = new ConfigurationReader();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.config;
//# sourceMappingURL=config.js.map