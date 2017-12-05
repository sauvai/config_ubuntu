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
const commitNode_1 = require("./commitNode");
const constants_1 = require("../constants");
const explorerNode_1 = require("./explorerNode");
class BranchHistoryNode extends explorerNode_1.ExplorerNode {
    constructor(branch, uri, explorer) {
        super(uri);
        this.branch = branch;
        this.explorer = explorer;
        this.maxCount = undefined;
    }
    getChildren() {
        return __awaiter(this, void 0, void 0, function* () {
            const log = yield this.explorer.git.getLogForRepo(this.uri.repoPath, this.branch.name, this.maxCount);
            if (log === undefined)
                return [new explorerNode_1.MessageNode('No commits yet')];
            const children = [...system_1.Iterables.map(log.commits.values(), c => new commitNode_1.CommitNode(c, this.explorer, this.branch))];
            if (log.truncated) {
                children.push(new explorerNode_1.ShowAllNode('Show All Commits', this, this.explorer.context));
            }
            return children;
        });
    }
    getTreeItem() {
        return __awaiter(this, void 0, void 0, function* () {
            let name = this.branch.getName();
            if (!this.branch.remote && this.branch.tracking !== undefined && this.explorer.config.showTrackingBranch) {
                name += ` ${constants_1.GlyphChars.Space}${constants_1.GlyphChars.ArrowLeftRight}${constants_1.GlyphChars.Space} ${this.branch.tracking}`;
            }
            const item = new vscode_1.TreeItem(`${this.branch.current ? `${constants_1.GlyphChars.Check} ${constants_1.GlyphChars.Space}` : ''}${name}`, vscode_1.TreeItemCollapsibleState.Collapsed);
            if (this.branch.remote) {
                item.contextValue = explorerNode_1.ResourceType.RemoteBranchHistory;
            }
            else if (this.branch.current) {
                item.contextValue = !!this.branch.tracking
                    ? explorerNode_1.ResourceType.CurrentBranchHistoryWithTracking
                    : explorerNode_1.ResourceType.CurrentBranchHistory;
            }
            else {
                item.contextValue = !!this.branch.tracking
                    ? explorerNode_1.ResourceType.BranchHistoryWithTracking
                    : explorerNode_1.ResourceType.BranchHistory;
            }
            let iconSuffix = '';
            if (this.branch.tracking) {
                if (this.branch.state.ahead && this.branch.state.behind) {
                    iconSuffix = '-yellow';
                }
                else if (this.branch.state.ahead) {
                    iconSuffix = '-green';
                }
                else if (this.branch.state.behind) {
                    iconSuffix = '-red';
                }
            }
            item.iconPath = {
                dark: this.explorer.context.asAbsolutePath(`images/dark/icon-branch${iconSuffix}.svg`),
                light: this.explorer.context.asAbsolutePath(`images/light/icon-branch${iconSuffix}.svg`)
            };
            return item;
        });
    }
}
exports.BranchHistoryNode = BranchHistoryNode;
//# sourceMappingURL=branchHistoryNode.js.map