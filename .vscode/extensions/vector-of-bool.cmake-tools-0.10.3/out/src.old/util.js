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
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const vscode = require('vscode');
const async = require('./async');
const config_1 = require('./config');
const logging_1 = require('./logging');
/**
 * An interface providing registry of reusable VS Code output windows
 * so they could be reused from different parts of the extension.
 */
class OutputChannelManager {
    constructor() {
        this._channels = [];
    }
    get(name) {
        let channel = this._channels.find((c) => c.name === name);
        if (!channel) {
            channel = vscode.window.createOutputChannel(name);
            this._channels.push(channel);
        }
        return channel;
    }
    dispose() {
        for (const channel of this._channels) {
            channel.dispose();
        }
    }
}
exports.OutputChannelManager = OutputChannelManager;
exports.outputChannels = new OutputChannelManager();
class ThrottledOutputChannel {
    constructor(name) {
        this._channel = exports.outputChannels.get(name);
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
exports.ThrottledOutputChannel = ThrottledOutputChannel;
function isTruthy(value) {
    if (typeof value === 'string') {
        return !(['', 'FALSE', 'OFF', '0', 'NOTFOUND', 'NO', 'N', 'IGNORE'].indexOf(value) >= 0 ||
            value.endsWith('-NOTFOUND'));
    }
    return !!value;
}
exports.isTruthy = isTruthy;
function rmdir(dirpath) {
    return new Promise((resolve, reject) => {
        rimraf(dirpath, err => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
exports.rmdir = rmdir;
function isMultiConfGenerator(gen) {
    return gen.includes('Visual Studio') || gen.includes('Xcode');
}
exports.isMultiConfGenerator = isMultiConfGenerator;
function product(arrays) {
    // clang-format off
    return arrays.reduce((acc, curr) => acc
        .map(prev => curr.map(item => prev.concat(item)))
        .reduce(
    // Join all the lists
        (a, b) => a.concat(b), []), [[]]);
    // clang-format on
}
exports.product = product;
function escapeStringForRegex(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
}
exports.escapeStringForRegex = escapeStringForRegex;
function replaceAll(str, needle, what) {
    const pattern = escapeStringForRegex(needle);
    const re = new RegExp(pattern, 'g');
    return str.replace(re, what);
}
exports.replaceAll = replaceAll;
function removeAllPatterns(str, patterns) {
    return patterns.reduce((acc, needle) => {
        return replaceAll(acc, needle, '');
    }, str);
}
exports.removeAllPatterns = removeAllPatterns;
function normalizePath(p, normalize_case = true) {
    let norm = path.normalize(p);
    while (path.sep !== path.posix.sep && norm.includes(path.sep)) {
        norm = norm.replace(path.sep, path.posix.sep);
    }
    if (normalize_case && process.platform === 'win32') {
        norm = norm.toLocaleLowerCase().normalize();
    }
    norm = norm.replace(/\/$/, '');
    while (norm.includes('//')) {
        norm = replaceAll(norm, '//', '/');
    }
    return norm;
}
exports.normalizePath = normalizePath;
class OutputParser {
}
exports.OutputParser = OutputParser;
function ensureDirectory(dirpath) {
    return __awaiter(this, void 0, void 0, function* () {
        const abs = path.normalize(path.resolve(dirpath));
        if (!(yield async.exists(dirpath))) {
            const parent = path.dirname(dirpath);
            yield ensureDirectory(parent);
            try {
                yield async.doVoidAsync(fs.mkdir, dirpath);
            }
            catch (e) {
                if (e.code === 'EEXIST') {
                    // It already exists, but that's ok
                    return;
                }
                throw e;
            }
        }
        else {
            if (!(yield async.isDirectory(dirpath))) {
                throw new Error(`Failed to create directory: "${dirpath}" is an existing file and is not a directory`);
            }
        }
    });
}
exports.ensureDirectory = ensureDirectory;
function writeFile(filepath, content) {
    return __awaiter(this, void 0, void 0, function* () {
        yield ensureDirectory(path.dirname(filepath));
        return new Promise((resolve, reject) => {
            fs.writeFile(filepath, content, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    });
}
exports.writeFile = writeFile;
function parseVersion(str) {
    const version_re = /(\d+)\.(\d+)\.(\d+)/;
    const mat = version_re.exec(str);
    if (!mat) {
        throw new Error(`Invalid version string ${str}`);
    }
    const [, major, minor, patch] = mat;
    return {
        major: parseInt(major),
        minor: parseInt(minor),
        patch: parseInt(patch),
    };
}
exports.parseVersion = parseVersion;
function versionGreater(lhs, rhs) {
    if (typeof (rhs) === 'string') {
        return versionGreater(lhs, parseVersion(rhs));
    }
    if (lhs.major > rhs.major) {
        return true;
    }
    else if (lhs.major === rhs.major) {
        if (lhs.minor > rhs.minor) {
            return true;
        }
        else if (lhs.minor === rhs.minor) {
            return lhs.patch > rhs.patch;
        }
    }
    return false;
}
exports.versionGreater = versionGreater;
function versionEquals(lhs, rhs) {
    if (typeof (rhs) === 'string') {
        return versionEquals(lhs, parseVersion(rhs));
    }
    return lhs.major === rhs.major && lhs.minor === rhs.minor &&
        lhs.patch === rhs.patch;
}
exports.versionEquals = versionEquals;
function versionLess(lhs, rhs) {
    return !versionGreater(lhs, rhs) && !versionEquals(lhs, rhs);
}
exports.versionLess = versionLess;
/**
 * An OutputParser that doesn't do anything when it parses
 */
class NullParser extends OutputParser {
    parseLine(line) {
        return null;
    }
}
exports.NullParser = NullParser;
function mergeEnvironment(...env) {
    return env.reduce((acc, vars) => {
        if (process.platform === 'win32') {
            // Env vars on windows are case insensitive, so we take the ones from
            // active env and overwrite the ones in our current process env
            const norm_vars = Object.getOwnPropertyNames(vars).reduce((acc2, key) => {
                acc2[key.toUpperCase()] = vars[key];
                return acc2;
            }, {});
            return Object.assign({}, acc, norm_vars);
        }
        else {
            return Object.assign({}, acc, vars);
        }
    }, {});
}
exports.mergeEnvironment = mergeEnvironment;
function execute(program, args, env = {}, workingDirectory, outputChannel = null) {
    const acc = { stdout: '', stderr: '' };
    if (outputChannel) {
        outputChannel.appendLine('[vscode] Executing command: '
            +
                [program]
                    .concat(args)
                    .map(a => a.replace('"', '\"'))
                    .map(a => /[ \n\r\f;\t]/.test(a) ? `"${a}"` : a)
                    .join(' '));
    }
    const final_env = mergeEnvironment(process.env, env);
    const pipe = proc.spawn(program, args, {
        env: final_env,
        cwd: workingDirectory,
    });
    for (const [acckey, stream] of [
        ['stdout', pipe.stdout],
        ['stderr', pipe.stderr]]) {
        let backlog = '';
        stream.on('data', (data) => {
            backlog += data.toString();
            acc[acckey] += data.toString();
            let n = backlog.indexOf('\n');
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
                if (outputChannel) {
                    outputChannel.appendLine(backlog.replace(/\r+$/, ''));
                }
            }
        });
        stream.on('line', (line) => {
            logging_1.log.verbose(`[${program} output]: ${line}`);
            if (outputChannel) {
                outputChannel.appendLine(line);
            }
        });
    }
    const pr = new Promise((resolve, reject) => {
        pipe.on('error', reject);
        pipe.on('close', (retc) => {
            const msg = `${program} exited with return code ${retc}`;
            if (outputChannel) {
                outputChannel.appendLine(`[vscode] ${msg}`);
            }
            else {
                logging_1.log.verbose(msg);
            }
            resolve({ retc, stdout: acc.stdout, stderr: acc.stderr });
        });
    });
    return {
        process: pipe,
        onComplete: pr,
    };
}
exports.execute = execute;
function termProc(child) {
    return __awaiter(this, void 0, void 0, function* () {
        // Stopping the process isn't as easy as it may seem. cmake --build will
        // spawn child processes, and CMake won't forward signals to its
        // children. As a workaround, we list the children of the cmake process
        // and also send signals to them.
        yield _killTree(child.pid);
        return true;
    });
}
exports.termProc = termProc;
function _killTree(pid) {
    return __awaiter(this, void 0, void 0, function* () {
        if (process.platform !== 'win32') {
            let children = [];
            const stdout = (yield async.execute('pgrep', ['-P', pid.toString()])).stdout.trim();
            if (!!stdout.length) {
                children = stdout.split('\n').map(line => Number.parseInt(line));
            }
            for (const other of children) {
                if (other)
                    yield _killTree(other);
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
function splitCommandLine(cmd) {
    const cmd_re = /('(\\'|[^'])*'|"(\\"|[^"])*"|(\\ |[^ ])+|[\w-]+)/g;
    const quoted_args = cmd.match(cmd_re);
    console.assert(quoted_args);
    // Our regex will parse escaped quotes, but they remain. We must
    // remove them ourselves
    return quoted_args.map(arg => arg.replace(/\\(")/g, '$1').replace(/^"(.*)"$/g, '$1'));
}
exports.splitCommandLine = splitCommandLine;
function parseRawCompilationInfo(raw) {
    // Here we try to get more interesting information about a compilation
    // than the raw command line.
    // First we should start by splitting the command up into the individual
    // arguments.
    const command = splitCommandLine(raw.command);
    const compiler = command[0];
    const flags = [];
    const inc_dirs = [];
    const definitions = {};
    const include_flags = [{ flag: '-I', isSystem: false }, { flag: '-isystem', isSystem: true }];
    const def_flags = ['-D'];
    if (compiler.endsWith('cl.exe')) {
        include_flags.push({ flag: '/I', isSystem: false });
        def_flags.push('/D');
    }
    // We are parsing an MSVC-style command line.
    // It has options which may appear with a different argument prefix.
    const non_include_args = [];
    let arg = (n) => command[n];
    next_arg: for (let i = 1; i < command.length; ++i) {
        for (const iflag of include_flags) {
            const flagstr = iflag.flag;
            if (arg(i).startsWith(flagstr)) {
                const ipath = arg(i) === flagstr ? arg(++i) : arg(i).substr(flagstr.length);
                const abs_ipath = path.isAbsolute(ipath) ?
                    ipath :
                    path.join(raw.directory, ipath);
                inc_dirs.push({
                    path: normalizePath(abs_ipath),
                    isSystem: iflag.isSystem,
                });
                continue next_arg;
            }
        }
        non_include_args.push(arg(i));
    }
    const unparsed_args = [];
    arg = (n) => non_include_args[n];
    next_arg2: for (let i = 0; i < non_include_args.length; ++i) {
        for (const dflag of def_flags) {
            if (arg(i).startsWith(dflag)) {
                const defstr = arg(i) === dflag ? arg(++i) : arg(i).substr(dflag.length);
                const def = parseCompileDefinition(defstr);
                definitions[def[0]] = def[1];
                continue next_arg2;
            }
        }
        unparsed_args.push(arg(i));
    }
    return {
        compiler,
        compile: raw,
        compileDefinitions: definitions,
        file: raw.file,
        includeDirectories: inc_dirs,
        compileFlags: unparsed_args,
    };
}
exports.parseRawCompilationInfo = parseRawCompilationInfo;
function parseCompileDefinition(str) {
    if (/^\w+$/.test(str)) {
        return [str, null];
    }
    else {
        const key = str.split('=', 1)[0];
        return [key, str.substr(key.length + 1)];
    }
}
exports.parseCompileDefinition = parseCompileDefinition;
function pause(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}
exports.pause = pause;
/**
 * @brief Replace all predefined variable by their actual values in the
 * input string.
 *
 * This method handles all variables that do not need to know of CMake.
 */
function replaceVars(str) {
    const replacements = [
        ['${workspaceRoot}', vscode.workspace.rootPath],
        [
            '${workspaceRootFolderName}', path.basename(vscode.workspace.rootPath || '.')
        ],
        ['${toolset}', config_1.config.toolset]
    ];
    return replacements.reduce((accdir, [needle, what]) => replaceAll(accdir, needle, what), str);
}
exports.replaceVars = replaceVars;
//# sourceMappingURL=util.js.map