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
const commands_1 = require("../commands");
const commitFileNode_1 = require("./commitFileNode");
const explorerNode_1 = require("./explorerNode");
const gitService_1 = require("../gitService");
const path = require("path");
class StatusFileCommitsNode extends explorerNode_1.ExplorerNode {
    constructor(repoPath, status, commits, explorer, branch) {
        super(new gitService_1.GitUri(vscode_1.Uri.file(path.resolve(repoPath, status.fileName)), { repoPath: repoPath, fileName: status.fileName, sha: 'HEAD' }));
        this.repoPath = repoPath;
        this.status = status;
        this.commits = commits;
        this.explorer = explorer;
        this.branch = branch;
    }
    getChildren() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.commits.map(c => new commitFileNode_1.CommitFileNode(this.status, c, this.explorer, commitFileNode_1.CommitFileNodeDisplayAs.Commit, this.branch));
        });
    }
    getTreeItem() {
        return __awaiter(this, void 0, void 0, function* () {
            const item = new vscode_1.TreeItem(this.label, vscode_1.TreeItemCollapsibleState.Collapsed);
            item.contextValue = explorerNode_1.ResourceType.StatusFileCommits;
            const icon = gitService_1.getGitStatusIcon(this.status.status);
            item.iconPath = {
                dark: this.explorer.context.asAbsolutePath(path.join('images', 'dark', icon)),
                light: this.explorer.context.asAbsolutePath(path.join('images', 'light', icon))
            };
            if (this.commits.length === 1 && this.commits[0].isUncommitted) {
                item.collapsibleState = vscode_1.TreeItemCollapsibleState.None;
                item.contextValue = 'gitlens:status-file';
                item.command = this.getCommand();
            }
            this._label = undefined;
            return item;
        });
    }
    get folderName() {
        if (this._folderName === undefined) {
            this._folderName = path.dirname(this.uri.getRelativePath());
        }
        return this._folderName;
    }
    get label() {
        if (this._label === undefined) {
            this._label = gitService_1.StatusFileFormatter.fromTemplate(this.explorer.config.statusFileFormat, Object.assign({}, this.status, { commit: this.commit }), { relativePath: this.relativePath });
        }
        return this._label;
    }
    get commit() {
        return this.commits[0];
    }
    get priority() {
        return this.commit.isUncommitted;
    }
    get relativePath() {
        return this._relativePath;
    }
    set relativePath(value) {
        this._relativePath = value;
        this._label = undefined;
    }
    getCommand() {
        return {
            title: 'Compare File with Previous Revision',
            command: commands_1.Commands.DiffWithPrevious,
            arguments: [
                gitService_1.GitUri.fromFileStatus(this.status, this.repoPath),
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
exports.StatusFileCommitsNode = StatusFileCommitsNode;
//# sourceMappingURL=statusFileCommitsNode.js.map