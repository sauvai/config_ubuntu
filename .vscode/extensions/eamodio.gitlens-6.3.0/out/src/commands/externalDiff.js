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
const messages_1 = require("../messages");
var Status;
(function (Status) {
    Status[Status["INDEX_MODIFIED"] = 0] = "INDEX_MODIFIED";
    Status[Status["INDEX_ADDED"] = 1] = "INDEX_ADDED";
    Status[Status["INDEX_DELETED"] = 2] = "INDEX_DELETED";
    Status[Status["INDEX_RENAMED"] = 3] = "INDEX_RENAMED";
    Status[Status["INDEX_COPIED"] = 4] = "INDEX_COPIED";
    Status[Status["MODIFIED"] = 5] = "MODIFIED";
    Status[Status["DELETED"] = 6] = "DELETED";
    Status[Status["UNTRACKED"] = 7] = "UNTRACKED";
    Status[Status["IGNORED"] = 8] = "IGNORED";
    Status[Status["ADDED_BY_US"] = 9] = "ADDED_BY_US";
    Status[Status["ADDED_BY_THEM"] = 10] = "ADDED_BY_THEM";
    Status[Status["DELETED_BY_US"] = 11] = "DELETED_BY_US";
    Status[Status["DELETED_BY_THEM"] = 12] = "DELETED_BY_THEM";
    Status[Status["BOTH_ADDED"] = 13] = "BOTH_ADDED";
    Status[Status["BOTH_DELETED"] = 14] = "BOTH_DELETED";
    Status[Status["BOTH_MODIFIED"] = 15] = "BOTH_MODIFIED";
})(Status || (Status = {}));
var ResourceGroupType;
(function (ResourceGroupType) {
    ResourceGroupType[ResourceGroupType["Merge"] = 0] = "Merge";
    ResourceGroupType[ResourceGroupType["Index"] = 1] = "Index";
    ResourceGroupType[ResourceGroupType["WorkingTree"] = 2] = "WorkingTree";
})(ResourceGroupType || (ResourceGroupType = {}));
class ExternalDiffFile {
    constructor(uri, staged) {
        this.uri = uri;
        this.staged = staged;
    }
}
class ExternalDiffCommand extends common_1.Command {
    constructor(git) {
        super(common_1.Commands.ExternalDiff);
        this.git = git;
    }
    preExecute(context, args = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (context.type === 'scm-states') {
                args = Object.assign({}, args);
                args.files = context.scmResourceStates
                    .map(r => new ExternalDiffFile(r.resourceUri, r.resourceGroupType === ResourceGroupType.Index));
                return this.execute(args);
            }
            else if (context.type === 'scm-groups') {
                args = Object.assign({}, args);
                args.files = system_1.Arrays.filterMap(context.scmResourceGroups[0].resourceStates, r => this.isModified(r) ? new ExternalDiffFile(r.resourceUri, r.resourceGroupType === ResourceGroupType.Index) : undefined);
                return this.execute(args);
            }
            return this.execute(args);
        });
    }
    isModified(resource) {
        const status = resource.type;
        return status === Status.BOTH_MODIFIED || status === Status.INDEX_MODIFIED || status === Status.MODIFIED;
    }
    execute(args = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repoPath = yield this.git.getRepoPath(undefined);
                if (!repoPath)
                    return messages_1.Messages.showNoRepositoryWarningMessage(`Unable to open changed files`);
                const tool = yield this.git.getDiffTool(repoPath);
                if (tool === undefined) {
                    const result = yield vscode_1.window.showWarningMessage(`Unable to open file compare because there is no Git diff tool configured`, 'View Git Docs');
                    if (!result)
                        return undefined;
                    return vscode_1.commands.executeCommand(constants_1.BuiltInCommands.Open, vscode_1.Uri.parse('https://git-scm.com/docs/git-config#git-config-difftool'));
                }
                if (args.files === undefined) {
                    const status = yield this.git.getStatusForRepo(repoPath);
                    if (status === undefined)
                        return vscode_1.window.showWarningMessage(`Unable to open changed files`);
                    args.files = [];
                    for (const file of status.files) {
                        if (file.indexStatus === 'M') {
                            args.files.push(new ExternalDiffFile(file.Uri, true));
                        }
                        if (file.workTreeStatus === 'M') {
                            args.files.push(new ExternalDiffFile(file.Uri, false));
                        }
                    }
                }
                for (const file of args.files) {
                    this.git.openDiffTool(repoPath, file.uri, file.staged, tool);
                }
                return undefined;
            }
            catch (ex) {
                logger_1.Logger.error(ex, 'ExternalDiffCommand');
                return vscode_1.window.showErrorMessage(`Unable to open external diff. See output channel for more details`);
            }
        });
    }
}
exports.ExternalDiffCommand = ExternalDiffCommand;
//# sourceMappingURL=externalDiff.js.map