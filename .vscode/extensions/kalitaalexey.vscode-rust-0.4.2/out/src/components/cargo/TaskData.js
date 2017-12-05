"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * The class contains properties representing a single cargo task.
 * Cargo task managers start tasks using information from objects of the class.
 * The class will be renamed to Task when Task will be renamed to OutputChannelTask
 */
class TaskData {
    constructor(command, commandArgs, env, workingDirectory, manifestPath) {
        this.command = command;
        this.commandArgs = commandArgs;
        this.env = env;
        this.workingDirectory = workingDirectory;
        this.manifestPath = manifestPath;
    }
    /**
     * Combines `command`, `commandArgs` and `manifestPath` and returns it as arguments
     */
    constructArgs() {
        const args = [this.command];
        if (this.manifestPath) {
            args.push('--manifest-path', this.manifestPath);
        }
        args.push(...this.commandArgs);
        return args;
    }
    /**
     * Creates a new object with the same properties, but command - it is taken from the parameter
     * @param command The new command
     */
    withCommand(command) {
        return new TaskData(command, this.commandArgs, this.env, this.workingDirectory, this.manifestPath);
    }
    /**
     * Creates a new object with the same properties, but command arguments - it is taken from the
     * parameter
     * @param commandArgs The new command arguments
     */
    withCommandArgs(commandArgs) {
        return new TaskData(this.command, commandArgs, this.env, this.workingDirectory, this.manifestPath);
    }
    /**
     * Creates a new object with the same properties, but manifest path - it is taken from the
     * parameter
     * @param manifestPath The new manifest path
     */
    withManifestPath(manifestPath) {
        return new TaskData(this.command, this.commandArgs, this.env, this.workingDirectory, manifestPath);
    }
    /**
     * Creates a new object with the same properties, but working directory - it is taken from the
     * parameter
     * @param workingDirectory The new working directory
     */
    withWorkingDirectory(workingDirectory) {
        return new TaskData(this.command, this.commandArgs, this.env, workingDirectory, this.manifestPath);
    }
}
exports.TaskData = TaskData;
//# sourceMappingURL=TaskData.js.map