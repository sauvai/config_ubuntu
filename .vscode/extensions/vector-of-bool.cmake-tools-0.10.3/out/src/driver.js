"use strict";
/**
 * Defines base class for CMake drivers
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode = require("vscode");
const rollbar_1 = require("./rollbar");
const kit_1 = require("./kit");
const cache_1 = require("./cache");
const util = require("./util");
const config_1 = require("./config");
const logging = require("./logging");
const pr_1 = require("./pr");
const proc = require("./proc");
const log = logging.createLogger('driver');
/**
 * Base class for CMake drivers.
 *
 * CMake drivers are separated because different CMake version warrant different
 * communication methods. Older CMake versions need to be driven by the command
 * line, but newer versions may be controlled via CMake server, which provides
 * a much richer interface.
 *
 * This class defines the basis for what a driver must implement to work.
 */
class CMakeDriver {
    /**
     * Construct the driver. Concrete instances should provide their own creation
     * routines.
     */
    constructor() {
        /**
         * The current Kit. Starts out `null`, but once set, is never `null` again.
         * We do some separation here to protect ourselves: The `_baseKit` property
         * is `private`, so derived classes cannot change it, except via
         * `_setBaseKit`, which only allows non-null kits. This prevents the derived
         * classes from resetting the kit back to `null`.
         */
        this._baseKit = null;
        /**
         * The environment variables required by the current kit
         */
        this._kitEnvironmentVariables = new Map();
        this._projectNameChangedEmitter = new vscode.EventEmitter();
        this._isBusy = false;
        this._cmakeCache = Promise.resolve(null);
        /**
         * Watcher for the CMake cache file on disk.
         */
        this._cacheWatcher = vscode.workspace.createFileSystemWatcher(this.cachePath);
    }
    /**
     * Dispose the driver. This disposes some things synchronously, but also
     * calls the `asyncDispose()` method to start any asynchronous shutdown.
     */
    dispose() {
        log.debug('Disposing base CMakeDriver');
        rollbar_1.default.invokeAsync('Async disposing CMake driver', () => this.asyncDispose());
        this._cacheWatcher.dispose();
        this._projectNameChangedEmitter.dispose();
    }
    /**
     * Sets the kit on the base class.
     * @param k The new kit
     */
    async _setBaseKit(k) {
        this._baseKit = k;
        log.debug('CMakeDriver Kit set to', k.name);
        this._kitEnvironmentVariables = new Map();
        switch (this._baseKit.type) {
            case 'vsKit': {
                const vars = await kit_1.getVSKitEnvironment(this._baseKit);
                if (!vars) {
                    log.error('Invalid VS environment:', this._baseKit.name);
                    log.error('We couldn\'t find the required environment variables');
                }
                else {
                    this._kitEnvironmentVariables = vars;
                }
            }
            default: {
                // Other kits don't have environment variables
            }
        }
    }
    /**
     * Get the environment variables required by the current Kit
     */
    _getKitEnvironmentVariablesObject() {
        return util.reduce(this._kitEnvironmentVariables.entries(), {}, (acc, [key, value]) => Object.assign(acc, { [key]: value }));
    }
    /**
     * Event fired when the name of the CMake project is discovered or changes
     */
    get onProjectNameChanged() { return this._projectNameChangedEmitter.event; }
    /**
     * The name of the project
     */
    get projectName() {
        return this.cmakeCache.then(cache => {
            if (cache) {
                const project = cache.get('CMAKE_PROJECT_NAME');
                if (project) {
                    return project.as();
                }
            }
            return null;
        });
    }
    /**
     * Get the current kit. Once non-`null`, the kit is never `null` again.
     */
    get _kit() { return this._baseKit; }
    /**
     * Get the current kit as a `CompilerKit`.
     *
     * @precondition `this._kit` is non-`null` and `this._kit.type` is `compilerKit`.
     * Guarded with an `assert`
     */
    get _compilerKit() {
        console.assert(this._kit && this._kit.type == 'compilerKit', JSON.stringify(this._kit));
        return this._kit;
    }
    /**
     * Get the current kit as a `ToolchainKit`.
     *
     * @precondition `this._kit` is non-`null` and `this._kit.type` is `toolchainKit`.
     * Guarded with an `assert`
     */
    get _toolchainFileKit() {
        console.assert(this._kit && this._kit.type == 'toolchainKit', JSON.stringify(this._kit));
        return this._kit;
    }
    /**
     * Get the current kit as a `VSKit`.
     *
     * @precondition `this._kit` is non-`null` and `this._kit.type` is `vsKit`.
     * Guarded with an `assert`
     */
    get _vsKit() {
        console.assert(this._kit && this._kit.type == 'vsKit', JSON.stringify(this._kit));
        return this._kit;
    }
    /**
     * Determine if we need to wipe the build directory if we change adopt `kit`
     * @param kit The new kit
     * @returns `true` if the new kit requires a clean reconfigure.
     */
    _kitChangeNeedsClean(kit) {
        log.debug('Checking if Kit change necessitates cleaning');
        if (!this._kit) {
            // First kit? We never clean
            log.debug('Clean not needed: No prior Kit selected');
            return false;
        }
        if (kit.type !== this._kit.type) {
            // If the kit type changed, we must clean up
            log.debug('Need clean: Kit type changed', this._kit.type, '->', kit.type);
            return true;
        }
        switch (kit.type) {
            case 'compilerKit': {
                // We need to wipe out the build directory if the compiler for any language was changed.
                const comp_changed = Object.keys(this._compilerKit.compilers).some(lang => {
                    return !!this._compilerKit.compilers[lang]
                        && this._compilerKit.compilers[lang] !== kit.compilers[lang];
                });
                if (comp_changed) {
                    log.debug('Need clean: Compilers for one or more languages changed');
                }
                else {
                    log.debug('Clean not needed: No compilers changed');
                }
                return comp_changed;
            }
            case 'toolchainKit': {
                // We'll assume that a new toolchain is very destructive
                const tc_chained = kit.toolchainFile !== this._toolchainFileKit.toolchainFile;
                if (tc_chained) {
                    log.debug('Need clean: Toolchain file changed', this._toolchainFileKit.toolchainFile, '->', kit.toolchainFile);
                }
                else {
                    log.debug('Clean not needed: toolchain file unchanged');
                }
                return tc_chained;
            }
            case 'vsKit': {
                // Switching VS changes everything
                const vs_changed = kit.visualStudio !== this._vsKit.visualStudio
                    || kit.visualStudioArchitecture !== this._vsKit.visualStudioArchitecture;
                if (vs_changed) {
                    const old_vs = this._vsKit.name;
                    const new_vs = kit.name;
                    log.debug('Need clean: Visual Studio changed:', old_vs, '->', new_vs);
                }
                else {
                    log.debug('Clean not needed: Same Visual Studio');
                }
                return vs_changed;
            }
        }
    }
    executeCommand(command, args, consumer, options) {
        let env = this._getKitEnvironmentVariablesObject();
        if (options && options.environment) {
            env = Object.assign({}, env, options.environment);
        }
        const final_options = Object.assign({}, options, { environment: env });
        return proc.execute(command, args, consumer, final_options);
    }
    /**
     * Is the driver busy? ie. running a configure/build/test
     */
    get isBusy() { return this._isBusy; }
    /**
     * The source directory, where the root CMakeLists.txt lives.
     *
     * @note This is distinct from the config values, since we do variable
     * substitution.
     */
    get sourceDir() {
        const dir = util.replaceVars(config_1.default.sourceDirectory);
        return util.normalizePath(dir);
    }
    /**
     * Path to where the root CMakeLists.txt file should be
     */
    get mainListFile() {
        const file = path.join(this.sourceDir, 'CMakeLists.txt');
        return util.normalizePath(file);
    }
    /**
     * Directory where build output is stored.
     */
    get binaryDir() {
        const dir = util.replaceVars(config_1.default.buildDirectory);
        return util.normalizePath(dir);
    }
    /**
     * @brief Get the path to the CMakeCache file in the build directory
     */
    get cachePath() {
        // TODO: Cache path can change if build dir changes at runtime
        const file = path.join(this.binaryDir, 'CMakeCache.txt');
        return util.normalizePath(file);
    }
    /**
     * Get the name of the current CMake generator, or `null` if we have not yet
     * configured the project.
     */
    get generatorName() { return this._generatorName(); }
    async _generatorName() {
        const cache = await this.cmakeCache;
        if (!cache) {
            return null;
        }
        const gen = cache.get('CMAKE_GENERATOR');
        if (!gen) {
            return null;
        }
        return gen.as();
    }
    /**
     * Execute pre-configure tasks. This should be called by a derived driver
     * before any configuration tasks are run
     */
    async _beforeConfigure() {
        log.debug('Runnnig pre-configure checks and steps');
        if (this._isBusy) {
            log.debug('No configuring: We\'re busy.');
            vscode.window.showErrorMessage('A CMake task is already running. Stop it before trying to configure.');
            return false;
        }
        if (!this.sourceDir) {
            log.debug('No configuring: There is no source directory.');
            vscode.window.showErrorMessage('You do not have a source directory open');
            return false;
        }
        const cmake_list = this.mainListFile;
        if (!await pr_1.fs.exists(cmake_list)) {
            log.debug('No configuring: There is no', cmake_list);
            await vscode.window.showErrorMessage('You do not have a CMakeLists.txt');
            // if (do_quickstart) // TODO
            //   await this.quickStart();
            return false;
        }
        // Save open files before we configure/build
        if (config_1.default.saveBeforeBuild) {
            log.debug('Saving open files before configure/build');
            const save_good = await vscode.workspace.saveAll();
            if (!save_good) {
                log.debug('Saving open files failed');
                const chosen = await vscode.window.showErrorMessage('Not all open documents were saved. Would you like to continue anyway?', {
                    title: 'Yes',
                    isCloseAffordance: false,
                }, {
                    title: 'No',
                    isCloseAffordance: true,
                });
                return chosen !== undefined && (chosen.title === 'Yes');
            }
        }
        // TODO
        // // If no build variant has been chosen, ask the user now
        // if (!this.variants.activeVariantCombination) {
        //   const ok = await this.setBuildTypeWithoutConfigure();
        //   if (!ok) {
        //     return false;
        //   }
        // }
        // this._channel.show();
        return true;
    }
    /**
     * The CMake cache for the driver.
     *
     * Will be automatically reloaded when the file on disk changes.
     */
    get cmakeCache() { return this._cmakeCache; }
    /**
     * Get all cache entries
     */
    get allCacheEntries() { return this._allCacheEntries(); }
    async _allCacheEntries() {
        const cache = await this.cmakeCache;
        if (!cache) {
            return [];
        }
        else {
            return cache.allEntries.map(e => ({
                type: e.type,
                key: e.key,
                value: e.value,
                advanced: e.advanced,
                helpString: e.helpString,
            }));
        }
    }
    /**
     * Asynchronous initialization. Should be called by base classes during
     * their initialization.
     */
    async _init() {
        log.debug('Base _init() of CMakeDriver');
        if (await pr_1.fs.exists(this.cachePath)) {
            await this._reloadCMakeCache();
        }
        this._cacheWatcher.onDidChange(() => {
            log.debug(`Reload CMake cache: ${this.cachePath} changed`);
            rollbar_1.default.invokeAsync('Reloading CMake Cache', () => this._reloadCMakeCache());
        });
    }
    async _reloadCMakeCache() {
        this._cmakeCache = cache_1.CMakeCache.fromPath(this.cachePath);
        // Force await here so that any errors are thrown into rollbar
        await this._cmakeCache;
        const name = await this.projectName;
        if (name) {
            this._projectNameChangedEmitter.fire(name);
        }
    }
    /**
     * Get the list of command line flags that should be passed to CMake
     */
    _cmakeFlags() {
        const settings = Object.assign({}, config_1.default.configureSettings);
        // TODO: Detect multi-conf
        settings.CMAKE_BUILD_TYPE = 'Debug';
        settings.CMAKE_EXPORT_COMPILE_COMMANDS = true;
        const _makeFlag = (key, value) => {
            if (value === true || value === false) {
                return `-D${key}:BOOL=${value ? 'TRUE' : 'FALSE'}`;
            }
            else if (typeof (value) === 'string') {
                return `-D${key}:STRING=${value}`;
            }
            else if (value instanceof Number || typeof value === 'number') {
                return `-D${key}:STRING=${value}`;
            }
            else if (value instanceof Array) {
                return `-D${key}:STRING=${value.join(';')}`;
            }
            else if (typeof value === 'object') {
                // TODO: Log invalid value
                throw new Error();
            }
            else {
                console.assert(false, 'Unknown value passed to CMake settings', key, value);
                throw new Error();
            }
        };
        const settings_flags = util.objectPairs(settings).map(([key, value]) => _makeFlag(key, value));
        const flags = ['--no-warn-unused-cli'];
        const final_flags = flags.concat(settings_flags);
        log.trace('CMake flags are', JSON.stringify(final_flags));
        return final_flags;
    }
}
exports.CMakeDriver = CMakeDriver;
//# sourceMappingURL=driver.js.map