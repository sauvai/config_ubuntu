"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const fs = require('fs');
const path = require('path');
const vscode = require('vscode');
const async = require('./async');
const config_1 = require('./config');
const util = require('./util');
const logging_1 = require('./logging');
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
function collectDevBatVars(devbat, args) {
    return __awaiter(this, void 0, void 0, function* () {
        const bat = [
            `@echo off`,
            `call "${devbat}" ${args.join(" ")} || exit`,
        ];
        for (const envvar of MSVC_ENVIRONMENT_VARIABLES) {
            bat.push(`echo ${envvar} := %${envvar}%`);
        }
        const fname = Math.random().toString() + '.bat';
        const batpath = path.join(vscode.workspace.rootPath, '.vscode', fname);
        yield util.ensureDirectory(path.dirname(batpath));
        yield util.writeFile(batpath, bat.join('\r\n'));
        const res = yield async.execute(batpath, [], { shell: true });
        fs.unlink(batpath, err => {
            if (err) {
                console.error(`Error removing temporary batch file!`, err);
            }
        });
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
    });
}
const VsArchitectures = {
    'amd64': 'x64',
    'arm': 'ARM',
    'amd64_arm': 'ARM',
};
const VsGenerators = {
    '15': 'Visual Studio 15 2017',
    'VS120COMNTOOLS': 'Visual Studio 12 2013',
    'VS140COMNTOOLS': 'Visual Studio 14 2015',
};
function tryCreateNewVCEnvironment(where, arch) {
    return __awaiter(this, void 0, void 0, function* () {
        const name = where.displayName + ' - ' + arch;
        const mutex = 'msvc';
        const common_dir = path.join(where.installationPath, 'Common7', 'Tools');
        const devbat = path.join(common_dir, 'VsDevCmd.bat');
        logging_1.log.verbose('Detecting environment: ' + name);
        const variables = yield collectDevBatVars(devbat, ['-no_logo', `-arch=${arch}`]);
        if (!variables)
            return;
        let env = {
            name: name,
            mutex: mutex,
            variables: variables
        };
        const version = /^(\d+)+./.exec(where.installationVersion);
        if (version) {
            const generatorName = VsGenerators[version[1]];
            if (generatorName) {
                env.preferredGenerator = {
                    name: generatorName,
                    platform: VsArchitectures[arch] || undefined,
                };
            }
        }
        return env;
    });
}
// Detect Visual C++ environments
function tryCreateVCEnvironment(dist, arch) {
    return __awaiter(this, void 0, void 0, function* () {
        const name = `${dist.name} - ${arch}`;
        const mutex = 'msvc';
        const common_dir = process.env[dist.variable];
        if (!common_dir) {
            return;
        }
        const vcdir = path.normalize(path.join(common_dir, '../../VC'));
        const vcvarsall = path.join(vcdir, 'vcvarsall.bat');
        if (!(yield async.exists(vcvarsall))) {
            return;
        }
        const variables = yield collectDevBatVars(vcvarsall, [arch]);
        if (!variables)
            return;
        let env = {
            name: name,
            mutex: mutex,
            variables: variables,
        };
        const generatorName = VsGenerators[dist.variable];
        if (generatorName) {
            env.preferredGenerator = {
                name: generatorName,
                platform: VsArchitectures[arch] || undefined,
            };
        }
        return env;
    });
}
// Detect MinGW environments
function tryCreateMinGWEnvironment(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        function prependEnv(key, ...values) {
            let env_init = process.env[key] || '';
            return values.reduce((acc, val) => {
                if (acc.length !== 0) {
                    return val + ';' + acc;
                }
                else {
                    return val;
                }
            }, env_init);
        }
        ;
        const gcc_path = path.join(dir, 'bin', 'gcc.exe');
        if (yield async.exists(gcc_path)) {
            const ret = {
                name: `MinGW - ${dir}`,
                mutex: 'mingw',
                description: `Root at ${dir}`,
                variables: new Map([
                    [
                        'PATH',
                        prependEnv('PATH', path.join(dir, 'bin'), path.join(dir, 'git', 'cmd'))
                    ],
                    [
                        'C_INCLUDE_PATH', prependEnv('C_INCLUDE_PATH', path.join(dir, 'include'), path.join(dir, 'include', 'freetype'))
                    ],
                    [
                        'CXX_INCLUDE_PATH',
                        prependEnv('CXX_INCLUDE_PATH', path.join(dir, 'include'), path.join(dir, 'include', 'freetype'))
                    ]
                ]),
                preferredGenerator: {
                    name: 'MinGW Makefiles',
                },
            };
            return ret;
        }
        return;
    });
}
// Detect Emscripten environment
function tryCreateEmscriptenEnvironment(emscripten) {
    return __awaiter(this, void 0, void 0, function* () {
        let cmake_toolchain = path.join(emscripten, 'cmake', 'Modules', 'Platform', 'Emscripten.cmake');
        if (yield async.exists(cmake_toolchain)) {
            // read version and strip "" and newlines
            let version = fs.readFileSync(path.join(emscripten, 'emscripten-version.txt'), 'utf8');
            version = version.replace(/["\r\n]/g, '');
            logging_1.log.verbose('Found Emscripten ' + version + ': ' + cmake_toolchain);
            if (process.platform === 'win32') {
                cmake_toolchain = cmake_toolchain.replace(/\\/g, path.posix.sep);
            }
            const ret = {
                name: `Emscripten - ${version}`,
                mutex: 'emscripten',
                description: `Root at ${emscripten}`,
                settings: {
                    'CMAKE_TOOLCHAIN_FILE': cmake_toolchain
                },
                variables: new Map([]),
            };
            return ret;
        }
        return;
    });
}
const ENVIRONMENTS = [
    {
        getEnvironments() {
            return __awaiter(this, void 0, void 0, function* () {
                if (process.platform !== 'win32') {
                    return [];
                }
                ;
                const dists = [
                    {
                        name: 'Visual C++ 12.0',
                        variable: 'VS120COMNTOOLS',
                    },
                    {
                        name: 'Visual C++ 14.0',
                        variable: 'VS140COMNTOOLS',
                    }
                ];
                const archs = ['x86', 'amd64', 'amd64_arm'];
                const all_promices = dists
                    .map((dist) => archs.map((arch) => tryCreateVCEnvironment(dist, arch)))
                    .reduce((acc, proms) => acc.concat(proms));
                const envs = yield Promise.all(all_promices);
                return envs.filter((e) => !!e);
            });
        }
    },
    {
        getEnvironments() {
            return __awaiter(this, void 0, void 0, function* () {
                if (process.platform !== 'win32') {
                    return [];
                }
                const progfiles = process.env['programfiles(x86)'] || process.env['programfiles'];
                if (!progfiles) {
                    logging_1.log.error('Unable to find Program Files directory');
                    return [];
                }
                const vswhere = path.join(progfiles, 'Microsoft Visual Studio', 'Installer', 'vswhere.exe');
                if (!(yield async.exists(vswhere))) {
                    logging_1.log.verbose('VSWhere is not installed. Not searching for VS 2017');
                    return [];
                }
                const vswhere_res = yield async.execute(vswhere, ['-all', '-format', 'json', '-products', '*', '-legacy', '-prerelease']);
                const installs = JSON.parse(vswhere_res.stdout);
                const archs = ['x86', 'amd64', 'arm'];
                const all_promices = installs
                    .map((where) => archs.map((arch) => tryCreateNewVCEnvironment(where, arch)))
                    .reduce((acc, proms) => acc.concat(proms));
                const envs = yield Promise.all(all_promices);
                return envs.filter((e) => !!e);
            });
        }
    },
    {
        getEnvironments() {
            return __awaiter(this, void 0, void 0, function* () {
                if (process.platform !== 'win32') {
                    return [];
                }
                ;
                const envs = yield Promise.all(config_1.config.mingwSearchDirs.map(tryCreateMinGWEnvironment));
                return envs.filter((e) => !!e);
            });
        }
    },
    {
        getEnvironments() {
            return __awaiter(this, void 0, void 0, function* () {
                var dirs = config_1.config.emscriptenSearchDirs;
                var env_dir = process.env['EMSCRIPTEN'];
                if (env_dir && dirs.indexOf(env_dir) == -1)
                    dirs.push(env_dir);
                const envs = yield Promise.all(dirs.map(tryCreateEmscriptenEnvironment));
                return envs.filter((e) => !!e);
            });
        }
    },
];
function availableEnvironments() {
    return __awaiter(this, void 0, void 0, function* () {
        const prs = ENVIRONMENTS.map(e => e.getEnvironments());
        const all_envs = yield Promise.all(prs);
        return all_envs.reduce((acc, envs) => (acc.concat(envs)));
    });
}
exports.availableEnvironments = availableEnvironments;
class EnvironmentManager {
    constructor() {
        /**
         * List of availalble build environments.
         */
        this._availableEnvironments = new Map();
        this.environmentsLoaded = (() => __awaiter(this, void 0, void 0, function* () {
            console.log('Loading environments');
            const envs = yield availableEnvironments();
            console.log('Environments loaded');
            for (const env of envs) {
                logging_1.log.info(`Detected available environment "${env.name}`);
                this._availableEnvironments.set(env.name, env);
            }
        }))();
        /**
         * The environments (by name) which are currently active in the workspace
         */
        this.activeEnvironments = [];
        this._activeEnvironmentsChangedEmitter = new vscode.EventEmitter();
        this.onActiveEnvironmentsChanges = this._activeEnvironmentsChangedEmitter.event;
    }
    get availableEnvironments() {
        return this._availableEnvironments;
    }
    activateEnvironments(...names) {
        for (const name of names) {
            const env = this.availableEnvironments.get(name);
            if (!env) {
                const msg = `Invalid build environment named ${name}`;
                vscode.window.showErrorMessage(msg);
                console.error(msg);
                continue;
            }
            for (const other of this.availableEnvironments.values()) {
                if (other.mutex === env.mutex && env.mutex !== undefined) {
                    const other_idx = this.activeEnvironments.indexOf(other.name);
                    if (other_idx >= 0) {
                        this.activeEnvironments.splice(other_idx, 1);
                    }
                }
            }
            this.activeEnvironments.push(name);
        }
        this._activeEnvironmentsChangedEmitter.fire(this.activeEnvironments);
    }
    deactivateEnvironment(name) {
        const idx = this.activeEnvironments.indexOf(name);
        if (idx >= 0) {
            this.activeEnvironments.splice(idx, 1);
            this._activeEnvironmentsChangedEmitter.fire(this.activeEnvironments);
        }
        else {
            throw new Error(`Attempted to deactivate environment ${name} which is not yet active!`);
        }
    }
    selectEnvironments() {
        return __awaiter(this, void 0, void 0, function* () {
            const entries = Array.from(this.availableEnvironments.entries())
                .map(([name, env]) => ({
                name: name,
                label: this.activeEnvironments.indexOf(name) >= 0 ?
                    `$(check) ${name}` :
                    name,
                description: env.description || '',
            }));
            const chosen = yield vscode.window.showQuickPick(entries);
            if (!chosen) {
                return;
            }
            this.activeEnvironments.indexOf(chosen.name) >= 0 ?
                this.deactivateEnvironment(chosen.name) :
                this.activateEnvironments(chosen.name);
        });
    }
    /**
     * @brief The current environment variables to use when executing commands,
     *    as specified by the active build environments.
     */
    get currentEnvironmentVariables() {
        const active_env = this.activeEnvironments.reduce((acc, name) => {
            const env_ = this.availableEnvironments.get(name);
            console.assert(env_);
            const env = env_;
            for (const entry of env.variables.entries()) {
                acc[entry[0]] = entry[1];
            }
            return acc;
        }, {});
        const proc_env = process.env;
        return util.mergeEnvironment(process.env, active_env);
    }
    /**
     * @brief The current cmake settings to use when configuring,
     *    as specified by the active build environments.
     */
    get currentEnvironmentSettings() {
        const active_settings = this.activeEnvironments.reduce((acc, name) => {
            const env_ = this.availableEnvironments.get(name);
            console.assert(env_);
            const env = env_;
            return env.settings || {};
        }, {});
        return active_settings;
    }
    get preferredEnvironmentGenerators() {
        const allEnvs = this.availableEnvironments;
        return this.activeEnvironments.reduce((gens, envName) => {
            const env = allEnvs.get(envName);
            if (env && env.preferredGenerator)
                gens.push(env.preferredGenerator);
            return gens;
        }, []);
    }
}
exports.EnvironmentManager = EnvironmentManager;
//# sourceMappingURL=environment.js.map