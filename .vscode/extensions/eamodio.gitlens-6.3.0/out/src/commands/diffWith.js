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
const constants_1 = require("../constants");
const gitService_1 = require("../gitService");
const logger_1 = require("../logger");
const path = require("path");
class DiffWithCommand extends common_1.ActiveEditorCommand {
    constructor(git) {
        super(common_1.Commands.DiffWith);
        this.git = git;
    }
    static getMarkdownCommandArgs(argsOrCommit1, commit2) {
        let args;
        if (argsOrCommit1 instanceof gitService_1.GitCommit) {
            const commit1 = argsOrCommit1;
            if (commit2 === undefined) {
                if (commit1.isUncommitted) {
                    args = {
                        repoPath: commit1.repoPath,
                        lhs: {
                            sha: 'HEAD',
                            uri: commit1.uri
                        },
                        rhs: {
                            sha: '',
                            uri: commit1.uri
                        }
                    };
                }
                else {
                    args = {
                        repoPath: commit1.repoPath,
                        lhs: {
                            sha: commit1.previousSha !== undefined ? commit1.previousSha : gitService_1.GitService.deletedSha,
                            uri: commit1.previousUri
                        },
                        rhs: {
                            sha: commit1.sha,
                            uri: commit1.uri
                        }
                    };
                }
            }
            else {
                args = {
                    repoPath: commit1.repoPath,
                    lhs: {
                        sha: commit1.sha,
                        uri: commit1.uri
                    },
                    rhs: {
                        sha: commit2.sha,
                        uri: commit2.uri
                    }
                };
            }
        }
        else {
            args = argsOrCommit1;
        }
        return super.getMarkdownCommandArgsCore(common_1.Commands.DiffWith, args);
    }
    execute(editor, uri, args = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            args = Object.assign({}, args);
            if (args.repoPath === undefined || args.lhs === undefined || args.rhs === undefined)
                return undefined;
            try {
                const [lhs, rhs] = yield Promise.all([
                    this.git.getVersionedFile(args.repoPath, args.lhs.uri.fsPath, args.lhs.sha),
                    this.git.getVersionedFile(args.repoPath, args.rhs.uri.fsPath, args.rhs.sha)
                ]);
                if (args.line !== undefined && args.line !== 0) {
                    if (args.showOptions === undefined) {
                        args.showOptions = {};
                    }
                    args.showOptions.selection = new vscode_1.Range(args.line, 0, args.line, 0);
                }
                let rhsPrefix = '';
                if (rhs === undefined) {
                    rhsPrefix = 'deleted in ';
                }
                else if (lhs === undefined || args.lhs.sha === gitService_1.GitService.deletedSha) {
                    rhsPrefix = 'added in ';
                }
                if (args.lhs.title === undefined && lhs !== undefined && args.lhs.sha !== gitService_1.GitService.deletedSha) {
                    const suffix = gitService_1.GitService.shortenSha(args.lhs.sha) || '';
                    args.lhs.title = `${path.basename(args.lhs.uri.fsPath)}${suffix !== '' ? ` (${suffix})` : ''}`;
                }
                if (args.rhs.title === undefined && args.rhs.sha !== gitService_1.GitService.deletedSha) {
                    const suffix = gitService_1.GitService.shortenSha(args.rhs.sha) || '';
                    args.rhs.title = `${path.basename(args.rhs.uri.fsPath)}${suffix !== '' ? ` (${rhsPrefix}${suffix})` : ''}`;
                }
                const title = (args.lhs.title !== undefined && args.rhs.title !== undefined)
                    ? `${args.lhs.title} ${constants_1.GlyphChars.ArrowLeftRight} ${args.rhs.title}`
                    : args.lhs.title || args.rhs.title;
                return yield vscode_1.commands.executeCommand(constants_1.BuiltInCommands.Diff, lhs === undefined
                    ? gitService_1.GitService.toGitContentUri(gitService_1.GitService.deletedSha, args.lhs.uri.fsPath, args.repoPath)
                    : vscode_1.Uri.file(lhs), rhs === undefined
                    ? gitService_1.GitService.toGitContentUri(gitService_1.GitService.deletedSha, args.rhs.uri.fsPath, args.repoPath)
                    : vscode_1.Uri.file(rhs), title, args.showOptions);
            }
            catch (ex) {
                logger_1.Logger.error(ex, 'DiffWithCommand', 'getVersionedFile');
                return vscode_1.window.showErrorMessage(`Unable to open compare. See output channel for more details`);
            }
        });
    }
}
exports.DiffWithCommand = DiffWithCommand;
//# sourceMappingURL=diffWith.js.map