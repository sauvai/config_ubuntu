"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * This class contains the fields which specify how the process should be started
 */
class ProcessInfo {
    constructor(executable, args, env) {
        this.executable = executable;
        this.args = args;
        this.env = env;
    }
    appendArg(arg) {
        return this.appendArgs([arg]);
    }
    appendArgs(args) {
        return new ProcessInfo(this.executable, this.args.concat(args), this.env);
    }
    replaceExecutable(executable) {
        return new ProcessInfo(executable, this.args, this.env);
    }
}
exports.ProcessInfo = ProcessInfo;
//# sourceMappingURL=ProcessInfo.js.map