"use strict";
/**
 * Module for the legacy driver. Talks to pre-CMake Server versions of CMake.
 * Can also talk to newer versions of CMake via the command line.
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const driver_1 = require("./driver");
const pr_1 = require("./pr");
const config_1 = require("./config");
const util = require("./util");
// import * as proc from './proc';
const logging = require("./logging");
const log = logging.createLogger('legacy-driver');
/**
 * The legacy driver.
 */
class LegacyCMakeDriver extends driver_1.CMakeDriver {
    constructor() {
        super();
        /**
         * The currently running process. We keep a handle on it so we can stop it
         * upon user request
         */
        this._currentProcess = null;
        this._needsReconfigure = true;
        /**
         * The CMAKE_BUILD_TYPE to use
         */
        this._buildType = 'Debug';
        /**
         * The arguments to pass to CMake during a configuration
         */
        this._configArgs = [];
        /**
         * Determine if we set BUILD_SHARED_LIBS to TRUE or FALSE
         */
        this._linkage = 'static';
    }
    get needsReconfigure() { return this._needsReconfigure; }
    async setKit(kit) {
        log.debug('Setting new kit', kit.name);
        this._needsReconfigure = true;
        const need_clean = this._kitChangeNeedsClean(kit);
        if (need_clean) {
            log.debug('Wiping build directory', this.binaryDir);
            await pr_1.fs.rmdir(this.binaryDir);
        }
        await this._setBaseKit(kit);
    }
    async setVariantOptions(opts) {
        log.debug('Setting new variant', opts.description);
        this._buildType = opts.buildType || this._buildType;
        this._configArgs = opts.settings || this._configArgs;
        this._linkage = opts.linkage || this._linkage;
    }
    // Legacy disposal does nothing
    async asyncDispose() { log.debug('Dispose: Do nothing'); }
    async configure(outputConsumer) {
        if (!await this._beforeConfigure()) {
            log.debug('Pre-configure steps aborted configure');
            // Pre-configure steps failed. Bad...
            return -1;
        }
        log.debug('Proceeding with configuration');
        // Build up the CMake arguments
        const args = [];
        if (!await pr_1.fs.exists(this.cachePath)) {
            // No cache! We are free to change the generator!
            const generator = 'Ninja'; // TODO: Find generators!
            log.debug('Using', generator, 'CMake generator');
            args.push('-G' + generator);
            // TODO: Platform and toolset selection
        }
        for (const setting of this._configArgs) {
            const cmake_value = util.cmakeify(setting.value);
            args.push(`${setting.key}:${cmake_value.type}=${cmake_value.value}`);
        }
        args.push(`-DCMAKE_BUILD_TYPE:STRING=${this._buildType}`);
        // TODO: Make sure we are respecting all variant options
        // TODO: Read options from settings.json
        console.assert(!!this._kit);
        if (!this._kit) {
            throw new Error('No kit is set!');
        }
        switch (this._kit.type) {
            case 'compilerKit': {
                log.debug('Using compilerKit', this._kit.name, 'for usage');
                args.push(...util.objectPairs(this._kit.compilers)
                    .map(([lang, comp]) => `-DCMAKE_${lang}_COMPILER:FILEPATH=${comp}`));
            }
        }
        const cmake_settings = this._cmakeFlags();
        args.push(...cmake_settings);
        args.push('-H' + util.normalizePath(this.sourceDir));
        const bindir = util.normalizePath(this.binaryDir);
        args.push('-B' + bindir);
        log.debug('Invoking CMake', config_1.default.cmakePath, 'with arguments', JSON.stringify(args));
        const res = await this.executeCommand(config_1.default.cmakePath, args, outputConsumer).result;
        log.trace(res.stderr);
        log.trace(res.stdout);
        if (res.retc == 0) {
            this._needsReconfigure = false;
        }
        await this._reloadCMakeCache();
        return res.retc === null ? -1 : res.retc;
    }
    async cleanConfigure(consumer) {
        const build_dir = this.binaryDir;
        const cache = this.cachePath;
        const cmake_files = path.join(build_dir, 'CMakeFiles');
        if (await pr_1.fs.exists(cache)) {
            log.info('Removing ', cache);
            await pr_1.fs.unlink(cache);
        }
        if (await pr_1.fs.exists(cmake_files)) {
            log.info('[vscode] Removing ', cmake_files);
            await pr_1.fs.rmdir(cmake_files);
        }
        return this.configure(consumer);
    }
    async build(target, consumer) {
        const ok = await this._beforeConfigure();
        if (!ok) {
            return null;
        }
        const gen = await this.generatorName;
        const generator_args = (() => {
            if (!gen)
                return [];
            else if (/(Unix|MinGW) Makefiles|Ninja/.test(gen) && target !== 'clean')
                return ['-j', config_1.default.numJobs.toString()];
            else if (gen.includes('Visual Studio'))
                return [
                    '/m',
                    '/property:GenerateFullPaths=true',
                ]; // TODO: Older VS doesn't support these flags
            else
                return [];
        })();
        const args = ['--build', this.binaryDir, '--config', this._buildType, '--target', target, '--'].concat(generator_args);
        const child = this.executeCommand(config_1.default.cmakePath, args, consumer);
        this._currentProcess = child;
        await child.result;
        this._currentProcess = null;
        await this._reloadCMakeCache();
        return child;
    }
    async stopCurrentProcess() {
        const cur = this._currentProcess;
        if (!cur) {
            return false;
        }
        await util.termProc(cur.child);
        return true;
    }
    async _init() {
        await super._init();
    }
    static async create() {
        log.debug('Creating instance of LegacyCMakeDriver');
        const inst = new LegacyCMakeDriver();
        await inst._init();
        return inst;
    }
    get targets() { return []; }
    get executableTargets() { return []; }
}
exports.LegacyCMakeDriver = LegacyCMakeDriver;
//# sourceMappingURL=legacy-driver.js.map