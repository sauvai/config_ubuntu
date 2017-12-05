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
const quickPicks_1 = require("../quickPicks");
class DiffWithRevisionCommand extends common_1.ActiveEditorCommand {
    constructor(git) {
        super(common_1.Commands.DiffWithRevision);
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
            const gitUri = yield gitService_1.GitUri.fromUri(uri, this.git);
            if (args.maxCount == null) {
                args.maxCount = this.git.config.advanced.maxQuickHistory;
            }
            const progressCancellation = quickPicks_1.FileHistoryQuickPick.showProgress(gitUri);
            try {
                const log = yield this.git.getLogForFile(gitUri.repoPath, gitUri.fsPath, gitUri.sha, { maxCount: args.maxCount });
                if (log === undefined)
                    return messages_1.Messages.showFileNotUnderSourceControlWarningMessage('Unable to open history compare');
                if (progressCancellation.token.isCancellationRequested)
                    return undefined;
                const pick = yield quickPicks_1.FileHistoryQuickPick.show(this.git, log, gitUri, progressCancellation, { pickerOnly: true });
                if (pick === undefined)
                    return undefined;
                if (pick instanceof quickPicks_1.CommandQuickPickItem)
                    return pick.execute();
                const diffArgs = {
                    repoPath: gitUri.repoPath,
                    lhs: {
                        sha: pick.commit.sha,
                        uri: gitUri
                    },
                    rhs: {
                        sha: '',
                        uri: gitUri
                    },
                    line: args.line,
                    showOptions: args.showOptions
                };
                return yield vscode_1.commands.executeCommand(common_1.Commands.DiffWith, diffArgs);
            }
            catch (ex) {
                logger_1.Logger.error(ex, 'DiffWithRevisionCommand');
                return vscode_1.window.showErrorMessage(`Unable to open compare. See output channel for more details`);
            }
            finally {
                progressCancellation.dispose();
            }
        });
    }
}
exports.DiffWithRevisionCommand = DiffWithRevisionCommand;
//# sourceMappingURL=diffWithRevision.js.map