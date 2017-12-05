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
const system_1 = require("../system");
const vscode_1 = require("vscode");
const common_1 = require("./common");
const gitService_1 = require("../gitService");
const logger_1 = require("../logger");
const messages_1 = require("../messages");
class DiffWithPreviousCommand extends common_1.ActiveEditorCommand {
    constructor(git) {
        super(common_1.Commands.DiffWithPrevious);
        this.git = git;
    }
    execute(editor, uri, args = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            uri = common_1.getCommandUri(uri, editor);
            if (uri === undefined)
                return undefined;
            args = Object.assign({}, args);
            if (args.line === undefined) {
                args.line = editor === undefined ? 0 : editor.selection.active.line;
            }
            if (args.commit === undefined || args.commit.type !== gitService_1.GitCommitType.File || args.range !== undefined) {
                const gitUri = yield gitService_1.GitUri.fromUri(uri, this.git);
                try {
                    let sha = args.commit === undefined ? gitUri.sha : args.commit.sha;
                    if (sha === gitService_1.GitService.deletedSha)
                        return messages_1.Messages.showCommitHasNoPreviousCommitWarningMessage();
                    let isStagedUncommitted = false;
                    if (gitService_1.GitService.isStagedUncommitted(sha)) {
                        gitUri.sha = sha = undefined;
                        isStagedUncommitted = true;
                    }
                    const log = yield this.git.getLogForFile(gitUri.repoPath, gitUri.fsPath, sha, { maxCount: 2, range: args.range, skipMerges: true });
                    if (log === undefined)
                        return messages_1.Messages.showFileNotUnderSourceControlWarningMessage('Unable to open compare');
                    args.commit = (sha && log.commits.get(sha)) || system_1.Iterables.first(log.commits.values());
                    if (gitUri.sha === undefined) {
                        const status = yield this.git.getStatusForFile(gitUri.repoPath, gitUri.fsPath);
                        if (status !== undefined) {
                            if (isStagedUncommitted) {
                                const diffArgs = {
                                    repoPath: args.commit.repoPath,
                                    lhs: {
                                        sha: args.commit.sha,
                                        uri: args.commit.uri
                                    },
                                    rhs: {
                                        sha: gitService_1.GitService.stagedUncommittedSha,
                                        uri: args.commit.uri
                                    },
                                    line: args.line,
                                    showOptions: args.showOptions
                                };
                                return vscode_1.commands.executeCommand(common_1.Commands.DiffWith, diffArgs);
                            }
                            if (status.indexStatus !== undefined) {
                                const diffArgs = {
                                    repoPath: args.commit.repoPath,
                                    lhs: {
                                        sha: gitService_1.GitService.stagedUncommittedSha,
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
                            }
                            return vscode_1.commands.executeCommand(common_1.Commands.DiffWithWorking, uri, { commit: args.commit, showOptions: args.showOptions });
                        }
                    }
                }
                catch (ex) {
                    logger_1.Logger.error(ex, 'DiffWithPreviousCommand', `getLogForFile(${gitUri.repoPath}, ${gitUri.fsPath})`);
                    return vscode_1.window.showErrorMessage(`Unable to open compare. See output channel for more details`);
                }
            }
            const diffArgs = {
                repoPath: args.commit.repoPath,
                lhs: {
                    sha: args.commit.previousSha !== undefined ? args.commit.previousSha : gitService_1.GitService.deletedSha,
                    uri: args.commit.previousUri
                },
                rhs: {
                    sha: args.commit.sha,
                    uri: args.commit.uri
                },
                line: args.line,
                showOptions: args.showOptions
            };
            return vscode_1.commands.executeCommand(common_1.Commands.DiffWith, diffArgs);
        });
    }
}
exports.DiffWithPreviousCommand = DiffWithPreviousCommand;
//# sourceMappingURL=diffWithPrevious.js.map