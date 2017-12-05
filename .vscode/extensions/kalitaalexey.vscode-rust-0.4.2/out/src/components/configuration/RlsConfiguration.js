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
const expandTilde = require("expand-tilde");
const vscode_languageclient_1 = require("vscode-languageclient");
const FileSystem_1 = require("../file_system/FileSystem");
const Configuration_1 = require("./Configuration");
/**
 * This class provides functionality related to RLS configuration
 */
class RlsConfiguration {
    /**
     * Creates a new instance of the class
     * @param rustup The rustup object
     * @param rustSource The rust's source object
     */
    static create(rustup, rustSource) {
        return __awaiter(this, void 0, void 0, function* () {
            const executableUserPath = yield getCheckedExecutableUserPath();
            return new RlsConfiguration(rustup, rustSource, executableUserPath);
        });
    }
    /**
     * Returns if there is some executable path specified by the user
     */
    isExecutableUserPathSet() {
        return this._executableUserPath !== undefined;
    }
    /**
     * Returns a path to RLS executable
     */
    getExecutablePath() {
        if (this._executableUserPath) {
            return this._executableUserPath;
        }
        if (this._rustup && this._rustup.isRlsInstalled()) {
            return 'rustup';
        }
        return undefined;
    }
    /**
     * Returns arguments for RLS
     */
    getArgs() {
        // When the user specifies some executable path, the user expects the extension not to add
        // some arguments
        if (this._executableUserPath === undefined && this._rustup && this._rustup.isRlsInstalled()) {
            const userToolchain = this._rustup.getUserNightlyToolchain();
            if (!userToolchain) {
                // It is actually impossible because `isRlsInstalled` uses `getUserNightlyToolchain`
                return this._userArgs;
            }
            return ['run', userToolchain.toString(true, false), 'rls'].concat(this._userArgs);
        }
        else {
            return this._userArgs;
        }
    }
    /**
     * Returns environment to run RLS in
     */
    getEnv() {
        const env = Object.assign({}, this._userEnv);
        if (!env.RUST_SRC_PATH) {
            const rustSourcePath = this._rustSource.getPath();
            if (rustSourcePath) {
                env.RUST_SRC_PATH = rustSourcePath;
            }
        }
        return env;
    }
    /**
     * Returns how the output channel of RLS should behave when receiving messages
     */
    getRevealOutputChannelOn() {
        return this._revealOutputChannelOn;
    }
    /**
     * Returns whether rustfmt should be used for formatting
     */
    getUseRustfmt() {
        return this._useRustfmt;
    }
    /**
     * Updates the property "useRustfmt" in the user configuration
     * @param value The new value
     */
    setUseRustfmt(value) {
        if (this._useRustfmt === value) {
            return;
        }
        this._useRustfmt = value;
        const suitableValue = typeof value === 'boolean' ? value : null;
        updateUserConfigurationParameter(c => { c.useRustfmt = suitableValue; });
    }
    constructor(rustup, rustSource, executableUserPath) {
        this._rustup = rustup;
        this._rustSource = rustSource;
        this._executableUserPath = executableUserPath;
        this._userArgs = getUserArgs();
        this._userEnv = getUserEnv();
        this._revealOutputChannelOn = getUserRevealOutputChannelOn();
        this._useRustfmt = getUserUseRustfmt();
    }
}
exports.RlsConfiguration = RlsConfiguration;
function getUserConfiguration() {
    return Configuration_1.Configuration.getConfiguration()['rls'];
}
function updateUserConfigurationParameter(updateParameter) {
    let configuration = getUserConfiguration();
    if (!configuration) {
        configuration = {};
    }
    updateParameter(configuration);
    Configuration_1.Configuration.getConfiguration().update('rls', configuration, true);
}
function getExecutableUserPath() {
    const configuration = getUserConfiguration();
    if (!configuration) {
        return configuration;
    }
    const path = configuration.executable;
    // This condition will evaluate to `true` if `path` is `null`, `undefined` or an empty string and in that case it is possible to return just `undefined`
    if (!path) {
        return undefined;
    }
    return path;
}
function getUserArgs() {
    const configuration = getUserConfiguration();
    if (!configuration) {
        return [];
    }
    const args = configuration.args;
    if (!args) {
        return [];
    }
    return args;
}
function getUserEnv() {
    const configuration = getUserConfiguration();
    if (!configuration) {
        return {};
    }
    const env = configuration.env;
    if (!env) {
        return {};
    }
    return env;
}
function getUserRevealOutputChannelOn() {
    const configuration = getUserConfiguration();
    const value = configuration ? configuration.revealOutputChannelOn : undefined;
    switch (value) {
        case 'info':
            return vscode_languageclient_1.RevealOutputChannelOn.Info;
        case 'warn':
            return vscode_languageclient_1.RevealOutputChannelOn.Warn;
        case 'error':
            return vscode_languageclient_1.RevealOutputChannelOn.Error;
        case 'never':
            return vscode_languageclient_1.RevealOutputChannelOn.Never;
        default:
            return vscode_languageclient_1.RevealOutputChannelOn.Error;
    }
}
function getUserUseRustfmt() {
    const configuration = getUserConfiguration();
    if (!configuration) {
        return undefined;
    }
    const useRustfmt = configuration.useRustfmt;
    if (typeof useRustfmt === 'boolean') {
        return useRustfmt;
    }
    else {
        return undefined;
    }
}
function getCheckedExecutableUserPath() {
    return __awaiter(this, void 0, void 0, function* () {
        const path = getExecutableUserPath();
        if (!path) {
            return undefined;
        }
        const tildeExpandedPath = expandTilde(path);
        const foundPath = yield FileSystem_1.FileSystem.findExecutablePath(tildeExpandedPath);
        return foundPath;
    });
}
//# sourceMappingURL=RlsConfiguration.js.map