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
const logger_1 = require("../logger");
const quickPicks_1 = require("../quickPicks");
const constants_1 = require("../constants");
class StashSaveCommand extends common_1.Command {
    constructor(git) {
        super(common_1.Commands.StashSave);
        this.git = git;
    }
    preExecute(context, args = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (context.type === 'scm-states') {
                args = Object.assign({}, args);
                args.uris = context.scmResourceStates.map(s => s.resourceUri);
                return this.execute(args);
            }
            if (context.type === 'scm-groups') {
                args = Object.assign({}, args);
                args.uris = context.scmResourceGroups.reduce((a, b) => a.concat(b.resourceStates.map(s => s.resourceUri)), []);
                return this.execute(args);
            }
            return this.execute(args);
        });
    }
    execute(args = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            let repoPath = yield this.git.getHighlanderRepoPath();
            if (!repoPath) {
                const pick = yield quickPicks_1.RepositoriesQuickPick.show(this.git, `Stash changes for which repository${constants_1.GlyphChars.Ellipsis}`, args.goBackCommand);
                if (pick instanceof quickPicks_1.CommandQuickPickItem)
                    return pick.execute();
                if (pick === undefined)
                    return args.goBackCommand === undefined ? undefined : args.goBackCommand.execute();
                repoPath = pick.repoPath;
            }
            try {
                if (args.message == null) {
                    args = Object.assign({}, args);
                    args.message = yield vscode_1.window.showInputBox({
                        prompt: `Please provide a stash message`,
                        placeHolder: `Stash message`
                    });
                    if (args.message === undefined)
                        return args.goBackCommand === undefined ? undefined : args.goBackCommand.execute();
                }
                return yield this.git.stashSave(repoPath, args.message, args.uris);
            }
            catch (ex) {
                logger_1.Logger.error(ex, 'StashSaveCommand');
                return vscode_1.window.showErrorMessage(`Unable to save stash. See output channel for more details`);
            }
        });
    }
}
exports.StashSaveCommand = StashSaveCommand;
//# sourceMappingURL=stashSave.js.map