"use strict";
/**
 * Logging utilities
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const util = require("./util");
const pr_1 = require("./pr");
const config_1 = require("./config");
const dirs_1 = require("./dirs");
/** Logging levels */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["Trace"] = 0] = "Trace";
    LogLevel[LogLevel["Debug"] = 1] = "Debug";
    LogLevel[LogLevel["Info"] = 2] = "Info";
    LogLevel[LogLevel["Note"] = 3] = "Note";
    LogLevel[LogLevel["Warning"] = 4] = "Warning";
    LogLevel[LogLevel["Error"] = 5] = "Error";
    LogLevel[LogLevel["Fatal"] = 6] = "Fatal";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
/**
 * Get the name of a logging level
 * @param level A logging level
 */
function levelName(level) {
    switch (level) {
        case LogLevel.Trace:
            return 'trace';
        case LogLevel.Debug:
            return 'debug';
        case LogLevel.Info:
            return 'info';
        case LogLevel.Note:
            return 'note';
        case LogLevel.Warning:
            return 'warning';
        case LogLevel.Error:
            return 'error';
        case LogLevel.Fatal:
            return 'fatal';
    }
}
/**
 * Determine if logging is enabled for the given LogLevel
 * @param level The log level to check
 */
function levelEnabled(level) {
    const strlevel = config_1.default.loggingLevel;
    switch (strlevel) {
        case 'trace':
            return level >= LogLevel.Trace;
        case 'debug':
            return level >= LogLevel.Debug;
        case 'info':
            return level >= LogLevel.Info;
        case 'note':
            return level >= LogLevel.Note;
        case 'warning':
            return level >= LogLevel.Warning;
        case 'error':
            return level >= LogLevel.Error;
        case 'fatal':
            return level >= LogLevel.Fatal;
        default:
            console.error('Invalid logging level in settings.json');
            return true;
    }
}
/**
 * Manages output channels.
 *
 * Ask the output channel manager when you want to get an output channel for a
 * particular name.
 */
class OutputChannelManager {
    constructor() {
        /**
         * Channels that this manager knows about
         */
        this._channels = new Map();
    }
    /**
     * Get the single instance of a channel with the given name. If the channel
     * doesn't exist, it will be created and returned.
     * @param name The name of the channel to obtain
     */
    get(name) {
        const channel = this._channels.get(name);
        if (!channel) {
            const new_channel = vscode.window.createOutputChannel(name);
            this._channels.set(name, new_channel);
            return new_channel;
        }
        return channel;
    }
    /**
     * Dispose all channels created by this manager
     */
    dispose() { util.map(this._channels.values(), c => c.dispose()); }
}
exports.channelManager = new OutputChannelManager;
async function _openLogFile() {
    const logfilepath = path.join(dirs_1.default.dataDir, 'log.txt');
    await pr_1.fs.mkdir_p(path.dirname(logfilepath));
    return node_fs.createWriteStream(logfilepath, { flags: 'r+' });
}
/**
 * Manages and controls logging
 */
class SingletonLogger {
    constructor() {
        this._logStream = _openLogFile();
    }
    _log(level, ...args) {
        if (level == LogLevel.Trace && !config_1.default.enableTraceLogging && !levelEnabled(LogLevel.Trace)) {
            return;
        }
        const user_message = args.map(a => a.toString()).join(' ');
        const prefix = new Date().toISOString() + ` [${levelName(level)}]`;
        const raw_message = prefix + ' ' + user_message;
        switch (level) {
            case LogLevel.Trace:
            case LogLevel.Debug:
            case LogLevel.Info:
            case LogLevel.Note:
                console.info("[CMakeTools]", raw_message);
                break;
            case LogLevel.Warning:
                console.warn("[CMakeTools]", raw_message);
                break;
            case LogLevel.Error:
            case LogLevel.Fatal:
                console.error("[CMakeTools]", raw_message);
                break;
        }
        // Write to the logfile asynchronously.
        this._logStream.then(strm => strm.write(raw_message + '\n')).catch(e => {
            console.error('Unhandled error while writing CMakeTools log file', e);
        });
        // Write to our output channel
        if (levelEnabled(level)) {
            const channel = exports.channelManager.get('CMake/Build');
            if (level >= LogLevel.Info) {
                channel.show();
            }
            channel.appendLine(user_message);
        }
    }
    trace(...args) { this._log(LogLevel.Trace, ...args); }
    debug(...args) { this._log(LogLevel.Debug, ...args); }
    info(...args) { this._log(LogLevel.Info, ...args); }
    note(...args) { this._log(LogLevel.Note, ...args); }
    warning(...args) { this._log(LogLevel.Warning, ...args); }
    error(...args) { this._log(LogLevel.Error, ...args); }
    fatal(...args) { this._log(LogLevel.Fatal, ...args); }
    createLogger(tag) {
        return new Logger(tag);
    }
}
// export function traced(_target: any, _key: string, method: PropertyDescriptor) {
//   const orig = method.value as Function;
//   method.value = function(...args: any[]) {
//     log.trace(`Call [${orig.name}]`);
//     try {
//       const ret = orig(...args);
//       log.trace(`Return from [${orig.name}]`);
//       return ret;
//     } catch (e) {
//       log.trace(`Exception thrown by [${orig.name}]`, e);
//       throw e;
//     }
//   };
//   return method;
// }
const LOG = new SingletonLogger();
class Logger {
    constructor(_tag) {
        this._tag = _tag;
    }
    get tag() { return `[${this._tag}]`; }
    trace(...args) { LOG.trace(this.tag, ...args); }
    debug(...args) { LOG.debug(this.tag, ...args); }
    info(...args) { LOG.info(this.tag, ...args); }
    note(...args) { LOG.note(this.tag, ...args); }
    warning(...args) { LOG.warning(this.tag, ...args); }
    error(...args) { LOG.error(this.tag, ...args); }
    fatal(...args) { LOG.fatal(this.tag, ...args); }
}
exports.log = new SingletonLogger();
exports.default = exports.log;
//# sourceMappingURL=log.js.map