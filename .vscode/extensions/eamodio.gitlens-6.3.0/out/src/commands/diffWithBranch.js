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
const messages_1 = require("../messages");
const quickPicks_1 = require("../quickPicks");
const path = require("path");
class DiffWithBranchCommand extends common_1.ActiveEditorCommand {
    constructor(git) {
        super(common_1.Commands.DiffWithBranch);
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
            if (!gitUri.repoPath)
                return messages_1.Messages.showNoRepositoryWarningMessage(`Unable to open branch compare`);
            const branches = yield this.git.getBranches(gitUri.repoPath);
            const pick = yield quickPicks_1.BranchesQuickPick.show(branches, `Compare ${path.basename(gitUri.fsPath)} to ${constants_1.GlyphChars.Ellipsis}`, args.goBackCommand);
            if (pick === undefined)
                return undefined;
            if (pick instanceof quickPicks_1.CommandQuickPickItem)
                return pick.execute();
            const branch = pick.branch.name;
            if (branch === undefined)
                return undefined;
            let renamedUri;
            let renamedTitle;
            const statuses = yield this.git.getDiffStatus(gitUri.repoPath, 'HEAD', branch, { filter: 'R' });
            if (statuses !== undefined) {
                const fileName = gitService_1.GitService.normalizePath(path.relative(gitUri.repoPath, gitUri.fsPath));
                const rename = statuses.find(s => s.fileName === fileName);
                if (rename !== undefined && rename.originalFileName !== undefined) {
                    renamedUri = vscode_1.Uri.file(path.join(gitUri.repoPath, rename.originalFileName));
                    renamedTitle = `${path.basename(rename.originalFileName)} (${branch})`;
                }
            }
            const diffArgs = {
                repoPath: gitUri.repoPath,
                lhs: {
                    sha: pick.branch.remote ? `remotes/${branch}` : branch,
                    uri: renamedUri || gitUri,
                    title: renamedTitle || `${path.basename(gitUri.fsPath)} (${branch})`
                },
                rhs: {
                    sha: '',
                    uri: gitUri
                },
                line: args.line,
                showOptions: args.showOptions
            };
            return vscode_1.commands.executeCommand(common_1.Commands.DiffWith, diffArgs);
        });
    }
}
exports.DiffWithBranchCommand = DiffWithBranchCommand;
//# sourceMappingURL=diffWithBranch.js.map