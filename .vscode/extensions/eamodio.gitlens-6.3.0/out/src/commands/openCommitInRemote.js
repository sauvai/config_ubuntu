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
class OpenCommitInRemoteCommand extends common_1.ActiveEditorCommand {
    constructor(git) {
        super(common_1.Commands.OpenCommitInRemote);
        this.git = git;
    }
    static getMarkdownCommandArgs(argsOrSha) {
        const args = typeof argsOrSha === 'string'
            ? { sha: argsOrSha }
            : argsOrSha;
        return super.getMarkdownCommandArgsCore(common_1.Commands.OpenCommitInRemote, args);
    }
    preExecute(context, args = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (common_1.isCommandViewContextWithCommit(context)) {
                args = Object.assign({}, args);
                args.sha = context.node.commit.sha;
                return this.execute(context.editor, context.node.commit.uri, args);
            }
            return this.execute(context.editor, context.uri, args);
        });
    }
    execute(editor, uri, args = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            uri = common_1.getCommandUri(uri, editor);
            if (uri === undefined)
                return undefined;
            if (editor !== undefined && editor.document !== undefined && editor.document.isDirty)
                return undefined;
            const gitUri = yield gitService_1.GitUri.fromUri(uri, this.git);
            if (!gitUri.repoPath)
                return undefined;
            try {
                if (args.sha === undefined) {
                    const blameline = editor === undefined ? 0 : editor.selection.active.line;
                    if (blameline < 0)
                        return undefined;
                    const blame = yield this.git.getBlameForLine(gitUri, blameline);
                    if (blame === undefined)
                        return messages_1.Messages.showFileNotUnderSourceControlWarningMessage('Unable to open commit in remote provider');
                    let commit = blame.commit;
                    if (commit.isUncommitted) {
                        commit = new gitService_1.GitBlameCommit(commit.repoPath, commit.previousSha, commit.previousFileName, commit.author, commit.date, commit.message, []);
                    }
                    args.sha = commit.sha;
                }
                const remotes = (yield this.git.getRemotes(gitUri.repoPath)).filter(r => r.provider !== undefined);
                return vscode_1.commands.executeCommand(common_1.Commands.OpenInRemote, uri, {
                    resource: {
                        type: 'commit',
                        sha: args.sha
                    },
                    remotes
                });
            }
            catch (ex) {
                logger_1.Logger.error(ex, 'OpenCommitInRemoteCommand');
                return vscode_1.window.showErrorMessage(`Unable to open commit in remote provider. See output channel for more details`);
            }
        });
    }
}
exports.OpenCommitInRemoteCommand = OpenCommitInRemoteCommand;
//# sourceMappingURL=openCommitInRemote.js.map