'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const proc = require("child_process");
const fs = require("fs");
function doAsync(fn, p) {
    return new Promise((resolve, reject) => {
        fn(p, (err, res) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(res);
            }
        });
    });
}
exports.doAsync = doAsync;
function doVoidAsync(fn, p) {
    return new Promise((resolve, reject) => {
        fn(p, (er) => {
            if (er) {
                reject(er);
            }
            else {
                resolve();
            }
        });
    });
}
exports.doVoidAsync = doVoidAsync;
function doNoErrorAsync(fn, p) {
    return new Promise((resolve) => {
        fn(p, (res) => {
            resolve(res);
        });
    });
}
exports.doNoErrorAsync = doNoErrorAsync;
function exists(filepath) {
    return doNoErrorAsync(fs.exists, filepath);
}
exports.exists = exists;
function isDirectory(filepath) {
    return doAsync(fs.stat, filepath).then(stat => {
        return stat.isDirectory();
    });
}
exports.isDirectory = isDirectory;
function unlink(filepath) {
    return doVoidAsync(fs.unlink, filepath);
}
exports.unlink = unlink;
function readFile(filepath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filepath, (err, data) => {
            if (err)
                reject(err);
            else
                resolve(data);
        });
    });
}
exports.readFile = readFile;
function stat(path) {
    return new Promise((resolve, reject) => {
        fs.stat(path, (err, stats) => {
            if (err)
                reject(err);
            else
                resolve(stats);
        });
    });
}
exports.stat = stat;
function execute(command, args, options) {
    return new Promise((resolve, reject) => {
        const child = proc.spawn(command, args, options);
        child.on('error', (err) => {
            reject(err);
        });
        let stdout_acc = '';
        let stderr_acc = '';
        child.stdout.on('data', (data) => {
            stdout_acc += data.toString();
        });
        child.stderr.on('data', (data) => {
            stderr_acc += data.toString();
        });
        child.on('exit', (retc) => {
            resolve({ retc: retc, stdout: stdout_acc, stderr: stderr_acc });
        });
    });
}
exports.execute = execute;
/**
 * A helper to prevent accumulation of sequential async tasks.
 *
 * Imagine a mail man with the sole task of delivering letters. As soon as
 * a letter submitted for delivery, he drives to the destination, delivers it
 * and returns to his base. Imagine that during the trip, N more letters were submitted.
 * When the mail man returns, he picks those N letters and delivers them all in a
 * single trip. Even though N+1 submissions occurred, only 2 deliveries were made.
 *
 * The throttler implements this via the queue() method, by providing it a task
 * factory. Following the example:
 *
 * 		var throttler = new Throttler();
 * 		var letters = [];
 *
 * 		function letterReceived(l) {
 * 			letters.push(l);
 * 			throttler.queue(() => { return makeTheTrip(); });
 * 		}
 */
class Throttler {
    constructor() {
        this.activePromise = null;
        this.queuedPromise = null;
        this.queuedPromiseFactory = null;
    }
    queue(promiseFactory) {
        if (this.activePromise) {
            this.queuedPromiseFactory = promiseFactory;
            if (!this.queuedPromise) {
                var onComplete = () => {
                    this.queuedPromise = null;
                    var result = this.queue(this.queuedPromiseFactory);
                    this.queuedPromiseFactory = null;
                    return result;
                };
                this.queuedPromise = new Promise((resolve, reject) => {
                    this.activePromise.then(onComplete, onComplete).then(resolve);
                });
            }
            return new Promise((resolve, reject) => {
                this.queuedPromise.then(resolve, reject);
            });
        }
        this.activePromise = promiseFactory();
        return new Promise((resolve, reject) => {
            this.activePromise.then((result) => {
                this.activePromise = null;
                resolve(result);
            }, (err) => {
                this.activePromise = null;
                reject(err);
            });
        });
    }
}
exports.Throttler = Throttler;
//# sourceMappingURL=async.js.map