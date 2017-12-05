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
const configuration_1 = require("../configuration");
const explorerNode_1 = require("./explorerNode");
const folderNode_1 = require("./folderNode");
const gitService_1 = require("../gitService");
const statusFileCommitsNode_1 = require("./statusFileCommitsNode");
const path = require("path");
class StatusFilesNode extends explorerNode_1.ExplorerNode {
    constructor(status, range, explorer, branch) {
        super(new gitService_1.GitUri(vscode_1.Uri.file(status.repoPath), { repoPath: status.repoPath, fileName: status.repoPath }));
        this.status = status;
        this.range = range;
        this.explorer = explorer;
        this.branch = branch;
        this.maxCount = undefined;
        this.repoPath = status.repoPath;
    }
    getChildren() {
        return __awaiter(this, void 0, void 0, function* () {
            let statuses = [];
            const repoPath = this.repoPath;
            let log;
            if (this.range !== undefined) {
                log = yield this.explorer.git.getLogForRepo(repoPath, this.range, this.maxCount);
                if (log !== undefined) {
                    statuses = Array.from(system_1.Iterables.flatMap(log.commits.values(), c => {
                        return c.fileStatuses.map(s => {
                            return Object.assign({}, s, { commit: c });
                        });
                    }));
                }
            }
            if (this.status.files.length !== 0 && this.includeWorkingTree) {
                statuses.splice(0, 0, ...system_1.Iterables.flatMap(this.status.files, s => {
                    if (s.workTreeStatus !== undefined && s.indexStatus !== undefined) {
                        const older = new Date();
                        older.setMilliseconds(older.getMilliseconds() - 1);
                        return [
                            Object.assign({}, s, { commit: new gitService_1.GitLogCommit(gitService_1.GitCommitType.File, repoPath, gitService_1.GitService.uncommittedSha, s.fileName, 'You', new Date(), '', s.status, [s], s.originalFileName, gitService_1.GitService.stagedUncommittedSha, s.fileName) }),
                            Object.assign({}, s, { commit: new gitService_1.GitLogCommit(gitService_1.GitCommitType.File, repoPath, gitService_1.GitService.stagedUncommittedSha, s.fileName, 'You', older, '', s.status, [s], s.originalFileName, 'HEAD', s.fileName) })
                        ];
                    }
                    else if (s.indexStatus !== undefined) {
                        return [
                            Object.assign({}, s, { commit: new gitService_1.GitLogCommit(gitService_1.GitCommitType.File, repoPath, gitService_1.GitService.stagedUncommittedSha, s.fileName, 'You', new Date(), '', s.status, [s], s.originalFileName, 'HEAD', s.fileName) })
                        ];
                    }
                    else {
                        return [
                            Object.assign({}, s, { commit: new gitService_1.GitLogCommit(gitService_1.GitCommitType.File, repoPath, gitService_1.GitService.uncommittedSha, s.fileName, 'You', new Date(), '', s.status, [s], s.originalFileName, 'HEAD', s.fileName) })
                        ];
                    }
                }));
            }
            statuses.sort((a, b) => b.commit.date.getTime() - a.commit.date.getTime());
            const groups = system_1.Arrays.groupBy(statuses, s => s.fileName);
            let children = [
                ...system_1.Iterables.map(system_1.Objects.values(groups), statuses => new statusFileCommitsNode_1.StatusFileCommitsNode(repoPath, statuses[statuses.length - 1], statuses.map(s => s.commit), this.explorer, this.branch))
            ];
            if (this.explorer.config.files.layout !== configuration_1.GitExplorerFilesLayout.List) {
                const hierarchy = system_1.Arrays.makeHierarchical(children, n => n.uri.getRelativePath().split('/'), (...paths) => gitService_1.GitService.normalizePath(path.join(...paths)), this.explorer.config.files.compact);
                const root = new folderNode_1.FolderNode(repoPath, '', undefined, hierarchy, this.explorer);
                children = (yield root.getChildren());
            }
            else {
                children.sort((a, b) => (a.priority ? -1 : 1) - (b.priority ? -1 : 1) || a.label.localeCompare(b.label));
            }
            if (log !== undefined && log.truncated) {
                children.push(new explorerNode_1.ShowAllNode('Show All Changes', this, this.explorer.context));
            }
            return children;
        });
    }
    getTreeItem() {
        return __awaiter(this, void 0, void 0, function* () {
            let files = (this.status.files !== undefined && this.includeWorkingTree) ? this.status.files.length : 0;
            if (this.status.upstream !== undefined) {
                const stats = yield this.explorer.git.getChangedFilesCount(this.repoPath, `${this.status.upstream}...`);
                if (stats !== undefined) {
                    files += stats.files;
                }
            }
            const label = `${files} file${files > 1 ? 's' : ''} changed`;
            const item = new vscode_1.TreeItem(label, vscode_1.TreeItemCollapsibleState.Collapsed);
            item.contextValue = explorerNode_1.ResourceType.StatusFiles;
            item.iconPath = {
                dark: this.explorer.context.asAbsolutePath(`images/dark/icon-diff.svg`),
                light: this.explorer.context.asAbsolutePath(`images/light/icon-diff.svg`)
            };
            return item;
        });
    }
    get includeWorkingTree() {
        return this.explorer.config.includeWorkingTree;
    }
}
exports.StatusFilesNode = StatusFilesNode;
//# sourceMappingURL=statusFilesNode.js.map