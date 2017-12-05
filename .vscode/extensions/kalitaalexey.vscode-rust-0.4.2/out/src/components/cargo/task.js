"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const kill = require("tree-kill");
const readline = require("readline");
class Task {
    constructor(configuration, logger, executable, args, cwd) {
        this.configuration = configuration;
        this.logger = logger;
        this.executable = executable;
        this.args = args;
        this.cwd = cwd;
        this.onStarted = undefined;
        this.onLineReceivedInStderr = undefined;
        this.onLineReceivedInStdout = undefined;
        this.process = undefined;
        this.interrupted = false;
    }
    setStarted(onStarted) {
        this.onStarted = onStarted;
    }
    setLineReceivedInStderr(onLineReceivedInStderr) {
        this.onLineReceivedInStderr = onLineReceivedInStderr;
    }
    setLineReceivedInStdout(onLineReceivedInStdout) {
        this.onLineReceivedInStdout = onLineReceivedInStdout;
    }
    execute() {
        return new Promise((resolve, reject) => {
            let env = Object.assign({}, process.env);
            const cargoEnv = this.configuration.getCargoEnv();
            if (cargoEnv) {
                env = Object.assign(env, cargoEnv);
            }
            this.logger.debug(`execute: this.executable = "${this.executable}"`);
            this.logger.debug(`execute: this.args = ${JSON.stringify(this.args)}`);
            this.logger.debug(`execute: cargoEnv = ${JSON.stringify(cargoEnv)}`);
            if (this.onStarted) {
                this.onStarted();
            }
            const spawnedProcess = child_process_1.spawn(this.executable, this.args, { cwd: this.cwd, env });
            this.process = spawnedProcess;
            if (this.onLineReceivedInStdout !== undefined) {
                const onLineReceivedInStdout = this.onLineReceivedInStdout;
                const stdout = readline.createInterface({ input: spawnedProcess.stdout });
                stdout.on('line', line => {
                    onLineReceivedInStdout(line);
                });
            }
            if (this.onLineReceivedInStderr !== undefined) {
                const onLineReceivedInStderr = this.onLineReceivedInStderr;
                const stderr = readline.createInterface({ input: spawnedProcess.stderr });
                stderr.on('line', line => {
                    onLineReceivedInStderr(line);
                });
            }
            spawnedProcess.on('error', error => {
                reject(error);
            });
            spawnedProcess.on('exit', code => {
                process.removeAllListeners();
                if (this.process === spawnedProcess) {
                    this.process = undefined;
                }
                if (this.interrupted) {
                    reject();
                    return;
                }
                resolve(code);
            });
        });
    }
    kill() {
        return new Promise(resolve => {
            if (!this.interrupted && this.process) {
                kill(this.process.pid, 'SIGTERM', resolve);
                this.interrupted = true;
            }
        });
    }
}
exports.Task = Task;
//# sourceMappingURL=task.js.map