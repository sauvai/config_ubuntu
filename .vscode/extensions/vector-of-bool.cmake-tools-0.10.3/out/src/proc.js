"use strict";
/**
 * Wrappers and utilities around the NodeJS `child_process` module.
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const proc = require("child_process");
const logging_1 = require("./logging");
const log = logging_1.createLogger('proc');
/**
 * Execute a command and return the result
 * @param command The binary to execute
 * @param args The arguments to pass to the binary
 * @param outputConsumer An output consumer for the command execution
 * @param options Additional execution options
 *
 * @note Output from the command is accumulated into a single buffer: Commands
 * which produce a lot of output should be careful about memory constraints.
 */
function execute(command, args, outputConsumer, options) {
    let child = null;
    const result = new Promise((resolve, reject) => {
        if (options && options.silent !== true) {
            log.info('Executing command: '
                +
                    [command]
                        .concat(args)
                        .map(a => a.replace('"', '\"'))
                        .map(a => /[ \n\r\f;\t]/.test(a) ? `"${a}"` : a)
                        .join(' '));
        }
        if (!options) {
            options = {};
        }
        const final_env = Object.assign({}, process.env, options.environment || {});
        const spawn_opts = {
            env: final_env,
            shell: !!options.shell,
        };
        if (options && options.cwd) {
            spawn_opts.cwd = options.cwd;
        }
        if (process.platform != 'win32') {
            // We wrap things in `stdbuf` to disable output buffering.
            const subargs = ['-o', '0', '-e', '0'].concat([command], args);
            child = proc.spawn('stdbuf', subargs, spawn_opts);
        }
        else {
            child = proc.spawn(command, args, spawn_opts);
        }
        child.on('error', (err) => { reject(err); });
        let stdout_acc = '';
        let line_acc = '';
        let stderr_acc = '';
        let stderr_line_acc = '';
        child.stdout.on('data', (data) => {
            const str = data.toString();
            const lines = str.split('\n').map(l => l.endsWith('\r') ? l.substr(0, l.length - 1) : l);
            while (lines.length > 1) {
                line_acc += lines[0];
                if (outputConsumer) {
                    outputConsumer.output(line_acc);
                }
                line_acc = '';
                // Erase the first line from the list
                lines.splice(0, 1);
            }
            console.assert(lines.length, 'Invalid lines', JSON.stringify(lines));
            line_acc += lines[0];
            stdout_acc += str;
        });
        child.stderr.on('data', (data) => {
            const str = data.toString();
            const lines = str.split('\n').map(l => l.endsWith('\r') ? l.substr(0, l.length - 1) : l);
            while (lines.length > 1) {
                stderr_line_acc += lines[0];
                if (outputConsumer) {
                    outputConsumer.error(stderr_line_acc);
                }
                stderr_line_acc = '';
                // Erase the first line from the list
                lines.splice(0, 1);
            }
            console.assert(lines.length, 'Invalid lines', JSON.stringify(lines));
            stderr_line_acc += lines[0];
            stderr_acc += str;
        });
        // Don't stop until the child stream is closed, otherwise we might not read
        // the whole output of the command.
        child.on('close', (retc) => {
            if (line_acc && outputConsumer) {
                outputConsumer.output(line_acc);
            }
            if (stderr_line_acc && outputConsumer) {
                outputConsumer.error(stderr_line_acc);
            }
            resolve({ retc: retc, stdout: stdout_acc, stderr: stderr_acc });
        });
    });
    console.assert(!!child, "Didn't start child?");
    return { child: child, result };
}
exports.execute = execute;
//# sourceMappingURL=proc.js.map