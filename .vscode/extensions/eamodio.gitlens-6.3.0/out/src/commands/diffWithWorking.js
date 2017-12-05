'use strict';
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
const common_1 = require("./common");
const gitService_1 = require("../gitService");
const logger_1 = require("../logger");
const messages_1 = require("../messages");
class DiffWithWorkingCommand extends common_1.ActiveEditorCommand {
    constructor(git) {
        super(common_1.Commands.DiffWithWorking);
        this.git = git;
    }
    execute(editor, uri, args = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            uri = common_1.getCommandUri(uri, editor);
            if (uri === undefined)
                return undefined;
            const gitUri = yield gitService_1.GitUri.fromUri(uri, this.git);
            args = Object.assign({}, args);
            if (args.line === undefined) {
                args.line = editor === undefined ? 0 : editor.selection.active.line;
            }
            if (args.commit === undefined || gitService_1.GitService.isUncommitted(args.commit.sha)) {
                if (gitUri.sha === undefined)
                    return vscode_1.window.showInformationMessage(`File matches the working tree`);
                if (gitService_1.GitService.isStagedUncommitted(gitUri.sha)) {
                    gitUri.sha = undefined;
                    const status = yield this.git.getStatusForFile(gitUri.repoPath, gitUri.fsPath);
                    if (status !== undefined && status.indexStatus !== undefined) {
                        const diffArgs = {
                            repoPath: gitUri.repoPath,
                            lhs: {
                                sha: gitService_1.GitService.stagedUncommittedSha,
                                uri: gitUri.fileUri()
                            },
                            rhs: {
                                sha: '',
                                uri: gitUri.fileUri()
                            },
                            line: args.line,
                            showOptions: args.showOptions
                        };
                        return vscode_1.commands.executeCommand(common_1.Commands.DiffWith, diffArgs);
                    }
                }
                try {
                    args.commit = yield this.git.getLogCommit(gitUri.repoPath, gitUri.fsPath, gitUri.sha, { firstIfMissing: true });
                    if (args.commit === undefined)
                        return messages_1.Messages.showFileNotUnderSourceControlWarningMessage('Unable to open compare');
                }
                catch (ex) {
                    logger_1.Logger.error(ex, 'DiffWithWorkingCommand', `getLogCommit(${gitUri.repoPath}, ${gitUri.fsPath}, ${gitUri.sha})`);
                    return vscode_1.window.showErrorMessage(`Unable to open compare. See output channel for more details`);
                }
            }
            const workingFileName = yield this.git.findWorkingFileName(gitUri.repoPath, gitUri.fsPath);
            if (workingFileName === undefined)
                return undefined;
            const diffArgs = {
                repoPath: args.commit.repoPath,
                lhs: {
                    sha: args.commit.sha,
                    uri: args.commit.uri
                },
                rhs: {
                    sha: '',
                    uri: args.commit.uri
                },
                line: args.line,
                showOptions: args.showOptions
            };
            return vscode_1.commands.executeCommand(common_1.Commands.DiffWith, diffArgs);
        });
    }
}
exports.DiffWithWorkingCommand = DiffWithWorkingCommand;
//# sourceMappingURL=diffWithWorking.js.map