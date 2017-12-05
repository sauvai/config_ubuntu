"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
/**
 * The class providing an ability to spawn a process and receive content of its both stdout and stderr.
 */
class OutputtingProcess {
    /**
     * Spawns a new process
     * @param executable an executable to spawn
     * @param args arguments to pass to the spawned process
     * @param options options to use for the spawning
     */
    static spawn(executable, args, options) {
        const process = child_process_1.spawn(executable, args, options);
        return new Promise(resolve => {
            let didStdoutClose = false;
            let didStderrClose = false;
            let stdoutData = '';
            let stderrData = '';
            let errorOccurred = false;
            let didProcessClose = false;
            let exitCode = undefined;
            const onCloseEventOfStream = () => {
                if (!errorOccurred &&
                    didStderrClose &&
                    didStdoutClose &&
                    didProcessClose &&
                    exitCode !== undefined) {
                    resolve({ success: true, stdoutData, stderrData, exitCode });
                }
            };
            const onCloseEventOfProcess = onCloseEventOfStream;
            const onExitEventOfProcess = onCloseEventOfProcess;
            process.stdout.on('data', (chunk) => {
                if (typeof chunk === 'string') {
                    stdoutData += chunk;
                }
                else {
                    stdoutData += chunk.toString();
                }
            });
            process.stdout.on('close', () => {
                didStdoutClose = true;
                onCloseEventOfStream();
            });
            process.stderr.on('data', (chunk) => {
                if (typeof chunk === 'string') {
                    stderrData += chunk;
                }
                else {
                    stderrData += chunk.toString();
                }
            });
            process.stderr.on('close', () => {
                didStderrClose = true;
                onCloseEventOfStream();
            });
            process.on('error', (error) => {
                errorOccurred = true;
                resolve({ success: false, error: error.code });
            });
            process.on('close', () => {
                didProcessClose = true;
                onCloseEventOfProcess();
            });
            process.on('exit', code => {
                exitCode = code;
                onExitEventOfProcess();
            });
        });
    }
}
exports.OutputtingProcess = OutputtingProcess;
//# sourceMappingURL=OutputtingProcess.js.map