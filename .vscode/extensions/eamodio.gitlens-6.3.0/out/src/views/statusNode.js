"use strict";
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
const explorerNode_1 = require("./explorerNode");
const logger_1 = require("../logger");
const statusFilesNode_1 = require("./statusFilesNode");
const statusUpstreamNode_1 = require("./statusUpstreamNode");
class StatusNode extends explorerNode_1.ExplorerNode {
    constructor(uri, repo, parent, explorer) {
        super(uri);
        this.repo = repo;
        this.parent = parent;
        this.explorer = explorer;
    }
    getChildren() {
        return __awaiter(this, void 0, void 0, function* () {
            this.resetChildren();
            this.children = [];
            const status = yield this.repo.getStatus();
            if (status === undefined)
                return this.children;
            if (status.state.behind) {
                this.children.push(new statusUpstreamNode_1.StatusUpstreamNode(status, 'behind', this.explorer));
            }
            if (status.state.ahead) {
                this.children.push(new statusUpstreamNode_1.StatusUpstreamNode(status, 'ahead', this.explorer));
            }
            if (status.state.ahead || (status.files.length !== 0 && this.includeWorkingTree)) {
                const range = status.upstream
                    ? `${status.upstream}..${status.branch}`
                    : undefined;
                this.children.push(new statusFilesNode_1.StatusFilesNode(status, range, this.explorer));
            }
            return this.children;
        });
    }
    getTreeItem() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.disposable !== undefined) {
                this.disposable.dispose();
                this.disposable = undefined;
            }
            const status = yield this.repo.getStatus();
            if (status === undefined)
                return new vscode_1.TreeItem('No repo status');
            if (this.explorer.autoRefresh && this.includeWorkingTree) {
                this._status = status;
                this.disposable = vscode_1.Disposable.from(this.explorer.onDidChangeAutoRefresh(this.onAutoRefreshChanged, this), this.repo.onDidChangeFileSystem(this.onFileSystemChanged, this), { dispose: () => this.repo.stopWatchingFileSystem() });
                this.repo.startWatchingFileSystem();
            }
            let hasChildren = false;
            const hasWorkingChanges = status.files.length !== 0 && this.includeWorkingTree;
            let label = '';
            let iconSuffix = '';
            if (status.upstream) {
                if (!status.state.ahead && !status.state.behind) {
                    label = `${status.branch}${hasWorkingChanges ? ' has uncommitted changes and' : ''} is up-to-date with ${status.upstream}`;
                }
                else {
                    label = `${status.branch}${hasWorkingChanges ? ' has uncommitted changes and' : ''} is not up-to-date with ${status.upstream}`;
                    hasChildren = true;
                    if (status.state.ahead && status.state.behind) {
                        iconSuffix = '-yellow';
                    }
                    else if (status.state.ahead) {
                        iconSuffix = '-green';
                    }
                    else if (status.state.behind) {
                        iconSuffix = '-red';
                    }
                }
            }
            else {
                label = `${status.branch} ${hasWorkingChanges ? 'has uncommitted changes' : this.includeWorkingTree ? 'has no changes' : 'has nothing to commit'}`;
            }
            const item = new vscode_1.TreeItem(label, (hasChildren || hasWorkingChanges) ? vscode_1.TreeItemCollapsibleState.Expanded : vscode_1.TreeItemCollapsibleState.None);
            item.contextValue = explorerNode_1.ResourceType.Status;
            item.iconPath = {
                dark: this.explorer.context.asAbsolutePath(`images/dark/icon-repo${iconSuffix}.svg`),
                light: this.explorer.context.asAbsolutePath(`images/light/icon-repo${iconSuffix}.svg`)
            };
            return item;
        });
    }
    get includeWorkingTree() {
        return this.explorer.config.includeWorkingTree;
    }
    onAutoRefreshChanged() {
        if (this.disposable === undefined)
            return;
        this.disposable.dispose();
        this.disposable = undefined;
    }
    onFileSystemChanged(e) {
        return __awaiter(this, void 0, void 0, function* () {
            const status = yield this.repo.getStatus();
            if (this._status !== undefined && status !== undefined &&
                ((this._status.files.length === status.files.length) || (this._status.files.length > 0 && status.files.length > 0))) {
                logger_1.Logger.log(`StatusNode.onFileSystemChanged; triggering node refresh`);
                this.explorer.refreshNode(this);
                return;
            }
            logger_1.Logger.log(`StatusNode.onFileSystemChanged; triggering parent node refresh`);
            this.explorer.refreshNode(this.parent);
        });
    }
}
exports.StatusNode = StatusNode;
//# sourceMappingURL=statusNode.js.map