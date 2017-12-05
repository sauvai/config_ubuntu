"use strict";
/**
 * Module for controlling and working with Kits.
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const proc = require("./proc");
const dirs_1 = require("./dirs");
const logging = require("./logging");
const pr_1 = require("./pr");
const log = logging.createLogger('kit');
/**
 * Convert a binary (by path) to a CompilerKit. This checks if the named binary
 * is a GCC or Clang compiler and gets its version. If it is not a compiler,
 * returns `null`.
 * @param bin Path to a binary
 * @returns A CompilerKit, or null if `bin` is not a known compiler
 */
async function kitIfCompiler(bin) {
    const fname = path.basename(bin);
    // Check by filename what the compiler might be. This is just heuristic.
    const gcc_regex = /^gcc(-\d+(\.\d+(\.\d+)?)?)?(\.exe)?$/;
    const clang_regex = /^clang(-\d+(\.\d+(\.\d+)?)?)?(\.exe)?$/;
    const gcc_res = gcc_regex.exec(fname);
    const clang_res = clang_regex.exec(fname);
    if (gcc_res) {
        log.debug('Testing GCC-ish binary:', bin);
        const exec = await proc.execute(bin, ['-v']).result;
        if (exec.retc != 0) {
            return null;
        }
        const last_line = exec.stderr.trim().split('\n').reverse()[0];
        const version_re = /^gcc version (.*?) .*/;
        const version_match = version_re.exec(last_line);
        if (version_match === null) {
            return null;
        }
        const version = version_match[1];
        const gxx_fname = fname.replace(/^gcc/, 'g++');
        const gxx_bin = path.join(path.dirname(bin), gxx_fname);
        const name = `GCC ${version}`;
        log.debug('Detected GCC compiler kit:', bin);
        if (await pr_1.fs.exists(gxx_bin)) {
            return {
                type: 'compilerKit',
                name: name,
                compilers: {
                    'CXX': gxx_bin,
                    'C': bin,
                }
            };
        }
        else {
            return {
                type: 'compilerKit',
                name: name,
                compilers: {
                    'C': bin,
                }
            };
        }
    }
    else if (clang_res) {
        log.debug('Testing Clang-ish binary:', bin);
        const exec = await proc.execute(bin, ['-v']).result;
        if (exec.retc != 0) {
            return null;
        }
        const first_line = exec.stderr.split('\n')[0];
        const version_re = /^clang version (.*?)[ -]/;
        const version_match = version_re.exec(first_line);
        if (version_match === null) {
            return null;
        }
        const version = version_match[1];
        const clangxx_fname = fname.replace(/^clang/, 'clang++');
        const clangxx_bin = path.join(path.dirname(bin), clangxx_fname);
        const name = `Clang ${version}`;
        log.debug('Detected Clang compiler kit:', bin);
        if (await pr_1.fs.exists(clangxx_bin)) {
            return {
                type: 'compilerKit',
                name: name,
                compilers: {
                    'C': bin,
                    'CXX': clangxx_bin,
                },
            };
        }
        else {
            return {
                type: 'compilerKit',
                name: name,
                compilers: {
                    'C': bin,
                },
            };
        }
    }
    else {
        return null;
    }
}
exports.kitIfCompiler = kitIfCompiler;
/**
 * Scans a directory for compiler binaries.
 * @param dir Directory containing candidate binaries
 * @returns A list of CompilerKits found
 */
async function scanDirForCompilerKits(dir) {
    log.debug('Scanning directory', dir, 'for compilers');
    try {
        const stat = await pr_1.fs.stat(dir);
        if (!stat.isDirectory()) {
            console.log('Skipping scan of non-directory', dir);
            return [];
        }
    }
    catch (e) {
        log.warning('Failed to scan', dir, 'by exception:', e);
        if (e.code == 'ENOENT') {
            return [];
        }
        throw e;
    }
    // Get files in the directory
    const bins = (await pr_1.fs.readdir(dir)).map(f => path.join(dir, f));
    // Scan each binary in parallel
    const prs = bins.map(async (bin) => {
        log.trace('Checking file for compiler-ness:', bin);
        try {
            return await kitIfCompiler(bin);
        }
        catch (e) {
            log.warning('Failed to check binary', bin, 'by exception:', e);
            // The binary may not be executable by this user...
            if (e.code == 'EACCES') {
                return null;
            }
            throw e;
        }
    });
    const maybe_kits = await Promise.all(prs);
    const kits = maybe_kits.filter(k => k !== null);
    log.debug('Found', kits.length, 'kits in directory', dir);
    return kits;
}
exports.scanDirForCompilerKits = scanDirForCompilerKits;
/**
 * Get a list of all Visual Studio installations available from vswhere.exe
 *
 * Will not include older versions. vswhere doesn't seem to list them?
 */
async function vsInstallations() {
    const pf_native = process.env['programfiles'];
    const pf_x86 = process.env['programfiles(x86)'];
    const installs = [];
    const inst_ids = [];
    for (const progdir of [pf_native, pf_x86]) {
        const vswhere_exe = path.join(progdir, 'Microsoft Visual Studio/Installer/vswhere.exe');
        if (await pr_1.fs.exists(vswhere_exe)) {
            const vswhere_res = await proc.execute(vswhere_exe, ['-all', '-format', 'json', '-products', '*', '-legacy', '-prerelease']).result;
            if (vswhere_res.retc !== 0) {
                log.error('Failed to execute vswhere.exe:', vswhere_res.stdout);
                continue;
            }
            const vs_installs = JSON.parse(vswhere_res.stdout);
            for (const inst of vs_installs) {
                if (inst_ids.indexOf(inst.instanceId) < 0) {
                    installs.push(inst);
                    inst_ids.push(inst.instanceId);
                }
            }
        }
    }
    return installs;
}
exports.vsInstallations = vsInstallations;
/**
 * List of environment variables required for Visual C++ to run as expected for
 * a VS installation.
 */
const MSVC_ENVIRONMENT_VARIABLES = [
    'CL',
    '_CL_',
    'INCLUDE',
    'LIBPATH',
    'LINK',
    '_LINK_',
    'LIB',
    'PATH',
    'TMP',
    'FRAMEWORKDIR',
    'FRAMEWORKDIR64',
    'FRAMEWORKVERSION',
    'FRAMEWORKVERSION64',
    'UCRTCONTEXTROOT',
    'UCRTVERSION',
    'UNIVERSALCRTSDKDIR',
    'VCINSTALLDIR',
    'VCTARGETSPATH',
    'WINDOWSLIBPATH',
    'WINDOWSSDKDIR',
    'WINDOWSSDKLIBVERSION',
    'WINDOWSSDKVERSION',
];
/**
 * Get the environment variables corresponding to a VS dev batch file.
 * @param devbat Path to a VS environment batch file
 * @param args List of arguments to pass to the batch file
 */
async function collectDevBatVars(devbat, args) {
    const bat = [
        `@echo off`,
        `call "${devbat}" ${args.join(" ")} || exit`,
    ];
    for (const envvar of MSVC_ENVIRONMENT_VARIABLES) {
        bat.push(`echo ${envvar} := %${envvar}%`);
    }
    const fname = Math.random().toString() + '.bat';
    const batpath = path.join(dirs_1.default.tmpDir, `vs-cmt-${fname}`);
    await pr_1.fs.writeFile(batpath, bat.join('\r\n'));
    const res = await proc.execute(batpath, [], null, { shell: true }).result;
    pr_1.fs.unlink(batpath);
    const output = res.stdout;
    if (res.retc !== 0) {
        console.log(`Error running ${devbat}`, output);
        return;
    }
    if (output.includes("Invalid host architecture") || output.includes("Error in script usage")) {
        return;
    }
    if (!output) {
        console.log(`Environment detection for using ${devbat} failed`);
        return;
    }
    const vars = output.split('\n')
        .map(l => l.trim())
        .filter(l => l.length !== 0)
        .reduce((acc, line) => {
        const mat = /(\w+) := ?(.*)/.exec(line);
        if (mat) {
            acc.set(mat[1], mat[2]);
        }
        else {
            console.error(`Error parsing environment variable: ${line}`);
        }
        return acc;
    }, new Map());
    return vars;
}
/**
 * Platform arguments for VS Generators
 */
const VsArchitectures = {
    'amd64': 'x64',
    'arm': 'ARM',
    'amd64_arm': 'ARM',
};
/**
 * Preferred CMake VS generators by VS version
 */
const VsGenerators = {
    '15': 'Visual Studio 15 2017',
    'VS120COMNTOOLS': 'Visual Studio 12 2013',
    'VS140COMNTOOLS': 'Visual Studio 14 2015',
};
async function varsForVSInstallation(inst, arch) {
    const common_dir = path.join(inst.installationPath, 'Common7', 'Tools');
    const devbat = path.join(common_dir, 'VsDevCmd.bat');
    const variables = await collectDevBatVars(devbat, ['-no_logo', `-arch=${arch}`]);
    if (!variables) {
        return null;
    }
    else {
        return variables;
    }
}
/**
 * Try to get a VSKit from a VS installation and architecture
 * @param inst A VS installation from vswhere
 * @param arch The architecture to try
 */
async function tryCreateNewVCEnvironment(inst, arch) {
    const name = inst.displayName + ' - ' + arch;
    log.debug('Checking for kit: ' + name);
    const variables = await varsForVSInstallation(inst, arch);
    if (!variables)
        return null;
    const kit = {
        type: 'vsKit',
        name: name,
        visualStudio: inst.displayName,
        visualStudioArchitecture: arch,
    };
    const version = /^(\d+)+./.exec(inst.installationVersion);
    if (version) {
        const generatorName = VsGenerators[version[1]];
        if (generatorName) {
            kit.preferredGenerator = {
                name: generatorName,
                platform: VsArchitectures[arch] || undefined,
            };
        }
    }
    return kit;
}
/**
 * Scans the system for Visual C++ installations using vswhere
 */
async function scanForVSKits() {
    const installs = await vsInstallations();
    const prs = installs.map(async (inst) => {
        const ret = [];
        const arches = ['x86', 'amd64', 'x86_amd64', 'x86_arm', 'amd64_arm', 'amd64_x86'];
        const sub_prs = arches.map(arch => tryCreateNewVCEnvironment(inst, arch));
        const maybe_kits = await Promise.all(sub_prs);
        maybe_kits.map(k => k ? ret.push(k) : null);
        return ret;
    });
    const vs_kits = await Promise.all(prs);
    return [].concat(...vs_kits);
}
exports.scanForVSKits = scanForVSKits;
async function getVSKitEnvironment(kit) {
    const installs = await vsInstallations();
    const requested = installs.find(inst => inst.displayName == kit.visualStudio);
    if (!requested) {
        return null;
    }
    return varsForVSInstallation(requested, kit.visualStudioArchitecture);
}
exports.getVSKitEnvironment = getVSKitEnvironment;
/**
 * Search for Kits available on the platform.
 * @returns A list of Kits.
 */
async function scanForKits() {
    log.debug('Scanning for Kits on system');
    // Search directories on `PATH` for compiler binaries
    const pathvar = process.env['PATH'];
    const sep = process.platform === 'win32' ? ';' : ':';
    const paths = pathvar.split(sep);
    // Search them all in parallel
    const prs = [];
    const compiler_kits = paths.map(path => scanDirForCompilerKits(path));
    prs.concat(compiler_kits);
    const vs_kits = scanForVSKits();
    prs.push(vs_kits);
    const arrays = await Promise.all(prs);
    const kits = [].concat(...arrays);
    kits.map(k => log.info(`Found Kit: ${k.name}`));
    return kits;
}
exports.scanForKits = scanForKits;
/**
 * Generates a string description of a kit. This is shown to the user.
 * @param kit The kit to generate a description for
 */
function descriptionForKit(kit) {
    switch (kit.type) {
        case 'toolchainKit': {
            return `Kit for toolchain file ${kit.toolchainFile}`;
        }
        case 'vsKit': {
            return `Using compilers for ${kit.visualStudio} (${kit.visualStudioArchitecture} architecture)`;
        }
        case 'compilerKit': {
            return 'Using compilers: '
                + Object.keys(kit.compilers).map(k => `\n  ${k} = ${kit.compilers[k]}`);
        }
    }
}
/**
 * Class that manages and tracks Kits
 */
class KitManager {
    /**
     * Create a new kit manager.
     * @param stateManager The workspace state manager
     */
    constructor(stateManager) {
        this.stateManager = stateManager;
        this._kits = [];
        /**
         * Watches the file at `_kitsPath`.
         */
        this._kitsWatcher = vscode.workspace.createFileSystemWatcher(this._kitsPath);
        this._activeKitChangedEmitter = new vscode.EventEmitter();
        log.debug('Constructing KitManager');
        // Re-read the kits file when it is changed
        this._kitsWatcher.onDidChange(_e => this._rereadKits());
    }
    /**
     * The known kits
     */
    get kits() { return this._kits; }
    /**
     * The path to the `cmake-kits.json` file
     */
    get _kitsPath() { return path.join(dirs_1.default.dataDir, 'cmake-kits.json'); }
    /**
     * The active build kit
     */
    get activeKit() {
        return this._activeKit;
    }
    /**
     * Event emitted when the Kit changes. This can be via user action, by the
     * available kits changing, or on initial load when the prior workspace kit
     * is reloaded.
     */
    get onActiveKitChanged() {
        return this._activeKitChangedEmitter.event;
    }
    /**
     * Change the current kit. Commits the current kit name to workspace-local
     * persistent state so that the same kit is reloaded when the user opens
     * the workspace again.
     * @param kit The new Kit
     */
    _setActiveKit(kit) {
        log.debug('Active kit set to', kit ? kit.name : 'null');
        if (kit) {
            this.stateManager.activeKitName = kit.name;
        }
        else {
            this.stateManager.activeKitName = null;
        }
        this._activeKit = kit;
        this._activeKitChangedEmitter.fire(kit);
    }
    /**
     * Dispose the kit manager
     */
    dispose() {
        log.debug('Disposing KitManager');
        this._kitsWatcher.dispose();
        this._activeKitChangedEmitter.dispose();
    }
    /**
     * Shows a QuickPick that lets the user select a new kit.
     * @returns The selected Kit, or `null` if the user cancelled the selection
     * @note The user cannot reset the active kit to `null`. If they make no
     * selection, the current kit is kept. The only way it can reset to `null` is
     * if the active kit becomes somehow unavailable.
     */
    async selectKit() {
        log.debug('Opening kit selection QuickPick');
        const items = this._kits.map((kit) => {
            return {
                label: kit.name,
                description: descriptionForKit(kit),
                kit: kit,
            };
        });
        const chosen = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a Kit',
        });
        if (chosen === undefined) {
            log.debug('User cancelled Kit selection');
            // No selection was made
            return null;
        }
        else {
            this._setActiveKit(chosen.kit);
            return chosen.kit;
        }
    }
    async selectKitByName(kitName) {
        log.debug('Setting active Kit by name', kitName);
        const chosen = this._kits.find(k => k.name == kitName);
        if (chosen === undefined) {
            log.warning('Kit set by name to non-existent kit:', kitName);
            return null;
        }
        else {
            this._setActiveKit(chosen);
            return chosen;
        }
    }
    /**
     * Rescan the system for kits.
     *
     * This will update the `cmake-kits.json` file with any newly discovered kits,
     * and rewrite any previously discovered kits with the new data.
     */
    async rescanForKits() {
        log.debug('Rescanning for Kits');
        // clang-format off
        const old_kits_by_name = this._kits.reduce((acc, kit) => Object.assign({}, acc, { [kit.name]: kit }), {});
        const discovered_kits = await scanForKits();
        const new_kits_by_name = discovered_kits.reduce((acc, new_kit) => {
            acc[new_kit.name] = new_kit;
            return acc;
        }, old_kits_by_name);
        // clang-format on
        const new_kits = Object.keys(new_kits_by_name).map(k => new_kits_by_name[k]);
        log.debug('Saving news kits to', this._kitsPath);
        await pr_1.fs.mkdir_p(path.dirname(this._kitsPath));
        const stripped_kits = new_kits.map((k) => {
            k.type = undefined;
            return k;
        });
        const sorted_kits = stripped_kits.sort((a, b) => {
            if (a.name == b.name) {
                return 0;
            }
            else if (a.name < b.name) {
                return -1;
            }
            else {
                return 1;
            }
        });
        await pr_1.fs.writeFile(this._kitsPath, JSON.stringify(sorted_kits, null, 2));
        log.debug(this._kitsPath, 'saved');
    }
    /**
     * Reread the `cmake-kits.json` file. This will be called if we write the
     * file in `rescanForKits`, or if the user otherwise edits the file manually.
     */
    async _rereadKits() {
        log.debug('Re-reading kits file', this._kitsPath);
        const content_str = await pr_1.fs.readFile(this._kitsPath);
        const content = JSON.parse(content_str.toLocaleString());
        this._kits = content.map((item_) => {
            if ('compilers' in item_) {
                const item = item_;
                return {
                    type: 'compilerKit',
                    name: item.name,
                    compilers: item['compilers'],
                };
            }
            else if ('toolchainFile' in item_) {
                const item = item_;
                return {
                    type: 'toolchainKit',
                    name: item.name,
                    toolchainFile: item.toolchainFile,
                };
            }
            else if ('visualStudio' in item_) {
                const item = item_;
                return {
                    type: 'vsKit',
                    name: item.name,
                    visualStudio: item.visualStudio,
                    visualStudioArchitecture: item.visualStudioArchitecture,
                };
            }
            else {
                vscode.window.showErrorMessage('Your cmake-kits.json file contains one or more invalid entries.');
                throw new Error('Invalid kits');
            }
        });
        // Set the current kit to the one we have named
        const already_active_kit = this._kits.find((kit) => kit.name === this.stateManager.activeKitName);
        this._setActiveKit(already_active_kit || null);
    }
    /**
     * Initialize the kits manager. Must be called before using an instance.
     */
    async initialize() {
        log.debug('Second phase init for KitManager');
        if (await pr_1.fs.exists(this._kitsPath)) {
            log.debug('Re-read kits file from prior session');
            // Load up the list of kits that we've saved
            await this._rereadKits();
        }
        else {
            await this.rescanForKits();
            const item = await vscode.window.showInformationMessage('CMake Tools has scanned for available kits and saved them to a file. Would you like to edit the Kits file?', {}, { title: "Yes", doOpen: true }, { title: "No", isCloseAffordance: true, doOpen: false });
            if (item === undefined) {
                return;
            }
            if (item.doOpen) {
                this.openKitsEditor();
            }
        }
    }
    /**
     * Opens a text editor with the user-local `cmake-kits.json` file.
     */
    async openKitsEditor() {
        log.debug('Opening TextEditor for', this._kitsPath);
        const text = await vscode.workspace.openTextDocument(this._kitsPath);
        return await vscode.window.showTextDocument(text);
    }
}
exports.KitManager = KitManager;
//# sourceMappingURL=kit.js.map