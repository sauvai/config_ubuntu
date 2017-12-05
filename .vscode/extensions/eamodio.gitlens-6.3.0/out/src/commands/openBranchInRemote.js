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
const quickPicks_1 = require("../quickPicks");
class OpenBranchInRemoteCommand extends common_1.ActiveEditorCommand {
    constructor(git) {
        super(common_1.Commands.OpenBranchInRemote);
        this.git = git;
    }
    preExecute(context, args = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (common_1.isCommandViewContextWithBranch(context)) {
                args = Object.assign({}, args);
                args.branch = context.node.branch.name;
                args.remote = context.node.branch.getRemote();
            }
            return this.execute(context.editor, context.uri, args);
        });
    }
    execute(editor, uri, args = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            uri = common_1.getCommandUri(uri, editor);
            const gitUri = uri && (yield gitService_1.GitUri.fromUri(uri, this.git));
            const repoPath = gitUri === undefined ? this.git.getHighlanderRepoPath() : gitUri.repoPath;
            if (!repoPath)
                return undefined;
            try {
                if (args.branch === undefined) {
                    args = Object.assign({}, args);
                    const branches = yield this.git.getBranches(repoPath);
                    const pick = yield quickPicks_1.BranchesQuickPick.show(branches, `Show history for branch${constants_1.GlyphChars.Ellipsis}`);
                    if (pick === undefined)
                        return undefined;
                    if (pick instanceof quickPicks_1.CommandQuickPickItem)
                        return undefined;
                    args.branch = pick.branch.name;
                    if (args.branch === undefined)
                        return undefined;
                }
                const remotes = (yield this.git.getRemotes(repoPath)).filter(r => r.provider !== undefined);
                return vscode_1.commands.executeCommand(common_1.Commands.OpenInRemote, uri, {
                    resource: {
                        type: 'branch',
                        branch: args.branch
                    },
                    remote: args.remote,
                    remotes
                });
            }
            catch (ex) {
                logger_1.Logger.error(ex, 'OpenBranchInRemoteCommandArgs');
                return vscode_1.window.showErrorMessage(`Unable to open branch in remote provider. See output channel for more details`);
            }
        });
    }
}
exports.OpenBranchInRemoteCommand = OpenBranchInRemoteCommand;
//# sourceMappingURL=openBranchInRemote.js.map