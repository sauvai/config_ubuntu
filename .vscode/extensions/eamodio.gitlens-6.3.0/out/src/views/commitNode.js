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
const commands_1 = require("../commands");
const commitFileNode_1 = require("./commitFileNode");
const configuration_1 = require("../configuration");
const folderNode_1 = require("./folderNode");
const explorerNode_1 = require("./explorerNode");
const gitService_1 = require("../gitService");
const path = require("path");
class CommitNode extends explorerNode_1.ExplorerNode {
    constructor(commit, explorer, branch) {
        super(new gitService_1.GitUri(commit.uri, commit));
        this.commit = commit;
        this.explorer = explorer;
        this.branch = branch;
        this.repoPath = commit.repoPath;
    }
    getChildren() {
        return __awaiter(this, void 0, void 0, function* () {
            const repoPath = this.repoPath;
            const log = yield this.explorer.git.getLogForRepo(repoPath, this.commit.sha, 1);
            if (log === undefined)
                return [];
            const commit = system_1.Iterables.first(log.commits.values());
            if (commit === undefined)
                return [];
            let children = [
                ...system_1.Iterables.map(commit.fileStatuses, s => new commitFileNode_1.CommitFileNode(s, commit, this.explorer, commitFileNode_1.CommitFileNodeDisplayAs.File, this.branch))
            ];
            if (this.explorer.config.files.layout !== configuration_1.GitExplorerFilesLayout.List) {
                const hierarchy = system_1.Arrays.makeHierarchical(children, n => n.uri.getRelativePath().split('/'), (...paths) => gitService_1.GitService.normalizePath(path.join(...paths)), this.explorer.config.files.compact);
                const root = new folderNode_1.FolderNode(repoPath, '', undefined, hierarchy, this.explorer);
                children = (yield root.getChildren());
            }
            else {
                children.sort((a, b) => a.label.localeCompare(b.label));
            }
            return children;
        });
    }
    getTreeItem() {
        const item = new vscode_1.TreeItem(gitService_1.CommitFormatter.fromTemplate(this.explorer.config.commitFormat, this.commit, {
            truncateMessageAtNewLine: true,
            dataFormat: this.explorer.git.config.defaultDateFormat
        }), vscode_1.TreeItemCollapsibleState.Collapsed);
        item.contextValue = (this.branch === undefined || this.branch.current)
            ? explorerNode_1.ResourceType.CommitOnCurrentBranch
            : explorerNode_1.ResourceType.Commit;
        item.iconPath = {
            dark: this.explorer.context.asAbsolutePath('images/dark/icon-commit.svg'),
            light: this.explorer.context.asAbsolutePath('images/light/icon-commit.svg')
        };
        return item;
    }
    getCommand() {
        return {
            title: 'Compare File with Previous Revision',
            command: commands_1.Commands.DiffWithPrevious,
            arguments: [
                new gitService_1.GitUri(this.uri, this.commit),
                {
                    commit: this.commit,
                    line: 0,
                    showOptions: {
                        preserveFocus: true,
                        preview: true
                    }
                }
            ]
        };
    }
}
exports.CommitNode = CommitNode;
//# sourceMappingURL=commitNode.js.map