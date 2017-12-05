'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const constants_1 = require("../constants");
const gitService_1 = require("../gitService");
var ResourceType;
(function (ResourceType) {
    ResourceType["Branches"] = "gitlens:branches";
    ResourceType["BranchesWithRemotes"] = "gitlens:branches:remotes";
    ResourceType["BranchHistory"] = "gitlens:branch-history";
    ResourceType["BranchHistoryWithTracking"] = "gitlens:branch-history:tracking";
    ResourceType["CurrentBranchHistory"] = "gitlens:current-branch-history";
    ResourceType["CurrentBranchHistoryWithTracking"] = "gitlens:current-branch-history:tracking";
    ResourceType["RemoteBranchHistory"] = "gitlens:remote-branch-history";
    ResourceType["Commit"] = "gitlens:commit";
    ResourceType["CommitOnCurrentBranch"] = "gitlens:commit:current";
    ResourceType["CommitFile"] = "gitlens:commit-file";
    ResourceType["FileHistory"] = "gitlens:file-history";
    ResourceType["Folder"] = "gitlens:folder";
    ResourceType["History"] = "gitlens:history";
    ResourceType["Message"] = "gitlens:message";
    ResourceType["Pager"] = "gitlens:pager";
    ResourceType["Remote"] = "gitlens:remote";
    ResourceType["Remotes"] = "gitlens:remotes";
    ResourceType["Repositories"] = "gitlens:repositories";
    ResourceType["Repository"] = "gitlens:repository";
    ResourceType["Stash"] = "gitlens:stash";
    ResourceType["StashFile"] = "gitlens:stash-file";
    ResourceType["Stashes"] = "gitlens:stashes";
    ResourceType["Status"] = "gitlens:status";
    ResourceType["StatusFile"] = "gitlens:status-file";
    ResourceType["StatusFiles"] = "gitlens:status-files";
    ResourceType["StatusFileCommits"] = "gitlens:status-file-commits";
    ResourceType["StatusUpstream"] = "gitlens:status-upstream";
})(ResourceType = exports.ResourceType || (exports.ResourceType = {}));
class ExplorerNode extends vscode_1.Disposable {
    constructor(uri) {
        super(() => this.dispose());
        this.uri = uri;
    }
    dispose() {
        if (this.disposable !== undefined) {
            this.disposable.dispose();
            this.disposable = undefined;
        }
        this.resetChildren();
    }
    getCommand() {
        return undefined;
    }
    resetChildren() {
        if (this.children !== undefined) {
            this.children.forEach(c => c.dispose());
            this.children = undefined;
        }
    }
}
exports.ExplorerNode = ExplorerNode;
class MessageNode extends ExplorerNode {
    constructor(message) {
        super(new gitService_1.GitUri());
        this.message = message;
    }
    getChildren() {
        return [];
    }
    getTreeItem() {
        const item = new vscode_1.TreeItem(this.message, vscode_1.TreeItemCollapsibleState.None);
        item.contextValue = ResourceType.Message;
        return item;
    }
}
exports.MessageNode = MessageNode;
class PagerNode extends ExplorerNode {
    constructor(message, node, context) {
        super(new gitService_1.GitUri());
        this.message = message;
        this.node = node;
        this.context = context;
        this.args = {};
    }
    getChildren() {
        return [];
    }
    getTreeItem() {
        const item = new vscode_1.TreeItem(this.message, vscode_1.TreeItemCollapsibleState.None);
        item.contextValue = ResourceType.Pager;
        item.command = this.getCommand();
        item.iconPath = {
            dark: this.context.asAbsolutePath('images/dark/icon-unfold.svg'),
            light: this.context.asAbsolutePath('images/light/icon-unfold.svg')
        };
        return item;
    }
    getCommand() {
        return {
            title: 'Refresh',
            command: 'gitlens.gitExplorer.refreshNode',
            arguments: [this.node, this.args]
        };
    }
}
exports.PagerNode = PagerNode;
class ShowAllNode extends PagerNode {
    constructor(message, node, context) {
        super(`${message} ${constants_1.GlyphChars.Space}${constants_1.GlyphChars.Dash}${constants_1.GlyphChars.Space} this may take a while`, node, context);
        this.args = { maxCount: 0 };
    }
}
exports.ShowAllNode = ShowAllNode;
//# sourceMappingURL=explorerNode.js.map