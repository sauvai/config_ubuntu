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
const branchesNode_1 = require("./branchesNode");
const constants_1 = require("../constants");
const explorerNode_1 = require("./explorerNode");
const gitService_1 = require("../gitService");
const remotesNode_1 = require("./remotesNode");
const statusNode_1 = require("./statusNode");
const stashesNode_1 = require("./stashesNode");
const logger_1 = require("../logger");
class RepositoryNode extends explorerNode_1.ExplorerNode {
    constructor(uri, repo, explorer) {
        super(uri);
        this.repo = repo;
        this.explorer = explorer;
    }
    getChildren() {
        return __awaiter(this, void 0, void 0, function* () {
            this.resetChildren();
            this.updateSubscription();
            this.children = [
                new statusNode_1.StatusNode(this.uri, this.repo, this, this.explorer),
                new branchesNode_1.BranchesNode(this.uri, this.repo, this.explorer),
                new remotesNode_1.RemotesNode(this.uri, this.repo, this.explorer),
                new stashesNode_1.StashesNode(this.uri, this.repo, this.explorer)
            ];
            return this.children;
        });
    }
    getTreeItem() {
        this.updateSubscription();
        const item = new vscode_1.TreeItem(`Repository ${system_1.Strings.pad(constants_1.GlyphChars.Dash, 1, 1)} ${this.repo.formattedName || this.uri.repoPath}`, vscode_1.TreeItemCollapsibleState.Expanded);
        item.contextValue = explorerNode_1.ResourceType.Repository;
        return item;
    }
    updateSubscription() {
        if (this.explorer.autoRefresh) {
            this.disposable = this.disposable || vscode_1.Disposable.from(this.explorer.onDidChangeAutoRefresh(this.onAutoRefreshChanged, this), this.repo.onDidChange(this.onRepoChanged, this));
        }
        else if (this.disposable !== undefined) {
            this.disposable.dispose();
            this.disposable = undefined;
        }
    }
    onAutoRefreshChanged() {
        this.updateSubscription();
    }
    onRepoChanged(e) {
        logger_1.Logger.log(`RepositoryNode.onRepoChanged(${e.changes.join()}); triggering node refresh`);
        if (this.children === undefined || e.changed(gitService_1.RepositoryChange.Repository) || e.changed(gitService_1.RepositoryChange.Config)) {
            this.explorer.refreshNode(this);
            return;
        }
        if (e.changed(gitService_1.RepositoryChange.Stashes)) {
            const node = this.children.find(c => c instanceof stashesNode_1.StashesNode);
            if (node !== undefined) {
                this.explorer.refreshNode(node);
            }
        }
        if (e.changed(gitService_1.RepositoryChange.Remotes)) {
            const node = this.children.find(c => c instanceof remotesNode_1.RemotesNode);
            if (node !== undefined) {
                this.explorer.refreshNode(node);
            }
        }
    }
}
exports.RepositoryNode = RepositoryNode;
//# sourceMappingURL=repositoryNode.js.map