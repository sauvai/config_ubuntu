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
const explorerNode_1 = require("./explorerNode");
const gitService_1 = require("../gitService");
class StatusUpstreamNode extends explorerNode_1.ExplorerNode {
    constructor(status, direction, explorer) {
        super(new gitService_1.GitUri(vscode_1.Uri.file(status.repoPath), { repoPath: status.repoPath, fileName: status.repoPath }));
        this.status = status;
        this.direction = direction;
        this.explorer = explorer;
    }
    getChildren() {
        return __awaiter(this, void 0, void 0, function* () {
            const range = this.direction === 'ahead'
                ? `${this.status.upstream}..${this.status.branch}`
                : `${this.status.branch}..${this.status.upstream}`;
            let log = yield this.explorer.git.getLogForRepo(this.uri.repoPath, range, 0);
            if (log === undefined)
                return [];
            if (this.direction !== 'ahead')
                return [...system_1.Iterables.map(log.commits.values(), c => new commitNode_1.CommitNode(c, this.explorer))];
            const commits = Array.from(log.commits.values());
            const commit = commits[commits.length - 1];
            if (commit.previousSha === undefined) {
                log = yield this.explorer.git.getLogForRepo(this.uri.repoPath, commit.sha, 2);
                if (log !== undefined) {
                    commits[commits.length - 1] = system_1.Iterables.first(log.commits.values());
                }
            }
            return [...system_1.Iterables.map(commits, c => new commitNode_1.CommitNode(c, this.explorer))];
        });
    }
    getTreeItem() {
        return __awaiter(this, void 0, void 0, function* () {
            const label = this.direction === 'ahead'
                ? `${this.status.state.ahead} commit${this.status.state.ahead > 1 ? 's' : ''} (ahead of ${this.status.upstream})`
                : `${this.status.state.behind} commit${this.status.state.behind > 1 ? 's' : ''} (behind ${this.status.upstream})`;
            const item = new vscode_1.TreeItem(label, vscode_1.TreeItemCollapsibleState.Collapsed);
            item.contextValue = explorerNode_1.ResourceType.StatusUpstream;
            item.iconPath = {
                dark: this.explorer.context.asAbsolutePath(`images/dark/icon-${this.direction === 'ahead' ? 'upload' : 'download'}.svg`),
                light: this.explorer.context.asAbsolutePath(`images/light/icon-${this.direction === 'ahead' ? 'upload' : 'download'}.svg`)
            };
            return item;
        });
    }
}
exports.StatusUpstreamNode = StatusUpstreamNode;
//# sourceMappingURL=statusUpstreamNode.js.map