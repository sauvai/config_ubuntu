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
const explorerNode_1 = require("./explorerNode");
const gitService_1 = require("../gitService");
const stashFileNode_1 = require("./stashFileNode");
class StashNode extends explorerNode_1.ExplorerNode {
    constructor(commit, explorer) {
        super(new gitService_1.GitUri(commit.uri, commit));
        this.commit = commit;
        this.explorer = explorer;
    }
    getChildren() {
        return __awaiter(this, void 0, void 0, function* () {
            const statuses = this.commit.fileStatuses;
            const log = yield this.explorer.git.getLogForRepo(this.commit.repoPath, `${this.commit.stashName}^3`, 1);
            if (log !== undefined) {
                const commit = system_1.Iterables.first(log.commits.values());
                if (commit !== undefined && commit.fileStatuses.length !== 0) {
                    commit.fileStatuses.forEach(s => s.status = '?');
                    statuses.splice(statuses.length, 0, ...commit.fileStatuses);
                }
            }
            const children = statuses.map(s => new stashFileNode_1.StashFileNode(s, this.commit.toFileCommit(s), this.explorer));
            children.sort((a, b) => a.label.localeCompare(b.label));
            return children;
        });
    }
    getTreeItem() {
        const item = new vscode_1.TreeItem(gitService_1.CommitFormatter.fromTemplate(this.explorer.config.stashFormat, this.commit, {
            truncateMessageAtNewLine: true,
            dataFormat: this.explorer.git.config.defaultDateFormat
        }), vscode_1.TreeItemCollapsibleState.Collapsed);
        item.contextValue = explorerNode_1.ResourceType.Stash;
        return item;
    }
}
exports.StashNode = StashNode;
//# sourceMappingURL=stashNode.js.map