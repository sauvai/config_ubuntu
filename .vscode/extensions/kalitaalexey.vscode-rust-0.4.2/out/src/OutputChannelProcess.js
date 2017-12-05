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
const vscode_1 = require("vscode");
const child_process_1 = require("child_process");
function create(spawnCommand, spawnArgs, spawnOptions, outputChannelName) {
    return __awaiter(this, void 0, void 0, function* () {
        if (spawnOptions === undefined) {
            spawnOptions = {};
        }
        spawnOptions.stdio = 'pipe';
        const spawnedProcess = child_process_1.spawn(spawnCommand, spawnArgs, spawnOptions);
        const outputChannel = vscode_1.window.createOutputChannel(outputChannelName);
        outputChannel.show();
        const result = yield process(spawnedProcess, outputChannel);
        if (result.success && result.code === 0) {
            outputChannel.hide();
            outputChannel.dispose();
        }
        return result;
    });
}
exports.create = create;
/**
 * Writes data from the process to the output channel. The function also can accept options
 * @param process The process to write data from. The process should be creates with
 * options.stdio = "pipe"
 * @param outputChannel The output channel to write data to
 * @return The result of processing the process
 */
function process(process, outputChannel, options) {
    const stdout = '';
    const captureStdout = getOption(options, o => o.captureStdout, false);
    subscribeToDataEvent(process.stdout, outputChannel, captureStdout, stdout);
    const stderr = '';
    const captureStderr = getOption(options, o => o.captureStderr, false);
    subscribeToDataEvent(process.stderr, outputChannel, captureStderr, stderr);
    return new Promise(resolve => {
        const processProcessEnding = (code) => {
            resolve({
                success: true,
                code,
                stdout,
                stderr
            });
        };
        // If some error happens, then the "error" and "close" events happen.
        // If the process ends, then the "exit" and "close" events happen.
        // It is known that the order of events is not determined.
        let processExited = false;
        let processClosed = false;
        process.on('error', (error) => {
            outputChannel.appendLine(`error: error=${error}`);
            resolve({ success: false });
        });
        process.on('close', (code, signal) => {
            outputChannel.appendLine(`\nclose: code=${code}, signal=${signal}`);
            processClosed = true;
            if (processExited) {
                processProcessEnding(code);
            }
        });
        process.on('exit', (code, signal) => {
            outputChannel.appendLine(`\nexit: code=${code}, signal=${signal}`);
            processExited = true;
            if (processClosed) {
                processProcessEnding(code);
            }
        });
    });
}
exports.process = process;
function getOption(options, getOption, defaultValue) {
    if (options === undefined) {
        return defaultValue;
    }
    const option = getOption(options);
    if (option === undefined) {
        return defaultValue;
    }
    return option;
}
function subscribeToDataEvent(readable, outputChannel, saveData, dataStorage) {
    readable.on('data', chunk => {
        const chunkAsString = typeof chunk === 'string' ? chunk : chunk.toString();
        outputChannel.append(chunkAsString);
        if (saveData) {
            dataStorage += chunkAsString;
        }
    });
}
//# sourceMappingURL=OutputChannelProcess.js.map