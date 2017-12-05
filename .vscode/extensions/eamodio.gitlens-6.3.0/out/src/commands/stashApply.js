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
const constants_1 = require("../constants");
const logger_1 = require("../logger");
const quickPicks_1 = require("../quickPicks");
class StashApplyCommand extends common_1.Command {
    constructor(git) {
        super(common_1.Commands.StashApply);
        this.git = git;
    }
    preExecute(context, args = { confirm: true, deleteAfter: false }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (common_1.isCommandViewContextWithCommit(context)) {
                args = Object.assign({}, args);
                args.stashItem = context.node.commit;
                return this.execute(args);
            }
            return this.execute(args);
        });
    }
    execute(args = { confirm: true, deleteAfter: false }) {
        return __awaiter(this, void 0, void 0, function* () {
            args = Object.assign({}, args);
            if (args.stashItem === undefined || args.stashItem.stashName === undefined) {
                let goBackToRepositoriesCommand;
                let repoPath = yield this.git.getActiveRepoPath();
                if (!repoPath) {
                    const pick = yield quickPicks_1.RepositoriesQuickPick.show(this.git, `Apply stashed changes from which repository${constants_1.GlyphChars.Ellipsis}`, args.goBackCommand);
                    if (pick instanceof quickPicks_1.CommandQuickPickItem)
                        return pick.execute();
                    if (pick === undefined)
                        return args.goBackCommand === undefined ? undefined : args.goBackCommand.execute();
                    goBackToRepositoriesCommand = new quickPicks_1.CommandQuickPickItem({
                        label: `go back ${constants_1.GlyphChars.ArrowBack}`,
                        description: `${system_1.Strings.pad(constants_1.GlyphChars.Dash, 2, 3)} to pick another repository`
                    }, common_1.Commands.StashApply, [args]);
                    repoPath = pick.repoPath;
                }
                const stash = yield this.git.getStashList(repoPath);
                if (stash === undefined)
                    return vscode_1.window.showInformationMessage(`There are no stashed changes`);
                const currentCommand = new quickPicks_1.CommandQuickPickItem({
                    label: `go back ${constants_1.GlyphChars.ArrowBack}`,
                    description: `${system_1.Strings.pad(constants_1.GlyphChars.Dash, 2, 3)} to apply stashed changes`
                }, common_1.Commands.StashApply, [args]);
                const pick = yield quickPicks_1.StashListQuickPick.show(this.git, stash, 'apply', goBackToRepositoriesCommand || args.goBackCommand, currentCommand);
                if (pick instanceof quickPicks_1.CommandQuickPickItem)
                    return pick.execute();
                if (pick === undefined)
                    return args.goBackCommand === undefined ? undefined : args.goBackCommand.execute();
                args.goBackCommand = currentCommand;
                args.stashItem = pick.commit;
            }
            try {
                if (args.confirm) {
                    const message = args.stashItem.message.length > 80 ? `${args.stashItem.message.substring(0, 80)}${constants_1.GlyphChars.Ellipsis}` : args.stashItem.message;
                    const result = yield vscode_1.window.showWarningMessage(`Apply stashed changes '${message}' to your working tree?`, { title: 'Yes, delete after applying' }, { title: 'Yes' }, { title: 'No', isCloseAffordance: true });
                    if (result === undefined || result.title === 'No')
                        return args.goBackCommand === undefined ? undefined : args.goBackCommand.execute();
                    args.deleteAfter = result.title !== 'Yes';
                }
                return yield this.git.stashApply(args.stashItem.repoPath, args.stashItem.stashName, args.deleteAfter);
            }
            catch (ex) {
                logger_1.Logger.error(ex, 'StashApplyCommand');
                if (ex.message.includes('Your local changes to the following files would be overwritten by merge')) {
                    return vscode_1.window.showWarningMessage(`Unable to apply stash. Your working tree changes would be overwritten.`);
                }
                else if (ex.message.includes('Auto-merging') && ex.message.includes('CONFLICT')) {
                    return vscode_1.window.showInformationMessage(`Stash applied with conflicts`);
                }
                else {
                    return vscode_1.window.showErrorMessage(`Unable to apply stash. See output channel for more details`);
                }
            }
        });
    }
}
exports.StashApplyCommand = StashApplyCommand;
//# sourceMappingURL=stashApply.js.map