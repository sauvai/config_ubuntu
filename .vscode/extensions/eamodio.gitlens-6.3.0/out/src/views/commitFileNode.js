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
const explorerNode_1 = require("./explorerNode");
const gitService_1 = require("../gitService");
const path = require("path");
var CommitFileNodeDisplayAs;
(function (CommitFileNodeDisplayAs) {
    CommitFileNodeDisplayAs[CommitFileNodeDisplayAs["CommitLabel"] = 1] = "CommitLabel";
    CommitFileNodeDisplayAs[CommitFileNodeDisplayAs["CommitIcon"] = 2] = "CommitIcon";
    CommitFileNodeDisplayAs[CommitFileNodeDisplayAs["FileLabel"] = 4] = "FileLabel";
    CommitFileNodeDisplayAs[CommitFileNodeDisplayAs["StatusIcon"] = 8] = "StatusIcon";
    CommitFileNodeDisplayAs[CommitFileNodeDisplayAs["Commit"] = 3] = "Commit";
    CommitFileNodeDisplayAs[CommitFileNodeDisplayAs["File"] = 12] = "File";
})(CommitFileNodeDisplayAs = exports.CommitFileNodeDisplayAs || (exports.CommitFileNodeDisplayAs = {}));
class CommitFileNode extends explorerNode_1.ExplorerNode {
    constructor(status, commit, explorer, displayAs = CommitFileNodeDisplayAs.Commit, branch) {
        super(new gitService_1.GitUri(vscode_1.Uri.file(path.resolve(commit.repoPath, status.fileName)), { repoPath: commit.repoPath, fileName: status.fileName, sha: commit.sha }));
        this.status = status;
        this.commit = commit;
        this.explorer = explorer;
        this.displayAs = displayAs;
        this.branch = branch;
        this.priority = false;
        this.repoPath = commit.repoPath;
    }
    getChildren() {
        return __awaiter(this, void 0, void 0, function* () {
            return [];
        });
    }
    getTreeItem() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.commit.type !== gitService_1.GitCommitType.File) {
                const log = yield this.explorer.git.getLogForFile(this.repoPath, this.status.fileName, this.commit.sha, { maxCount: 2 });
                if (log !== undefined) {
                    this.commit = log.commits.get(this.commit.sha) || this.commit;
                }
            }
            const item = new vscode_1.TreeItem(this.label, vscode_1.TreeItemCollapsibleState.None);
            item.contextValue = this.resourceType;
            const icon = (this.displayAs & CommitFileNodeDisplayAs.CommitIcon)
                ? 'icon-commit.svg'
                : gitService_1.getGitStatusIcon(this.status.status);
            item.iconPath = {
                dark: this.explorer.context.asAbsolutePath(path.join('images', 'dark', icon)),
                light: this.explorer.context.asAbsolutePath(path.join('images', 'light', icon))
            };
            item.command = this.getCommand();
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
            this._label = (this.displayAs & CommitFileNodeDisplayAs.CommitLabel)
                ? gitService_1.CommitFormatter.fromTemplate(this.getCommitTemplate(), this.commit, {
                    truncateMessageAtNewLine: true,
                    dataFormat: this.explorer.git.config.defaultDateFormat
                })
                : gitService_1.StatusFileFormatter.fromTemplate(this.getCommitFileTemplate(), this.status, { relativePath: this.relativePath });
        }
        return this._label;
    }
    get relativePath() {
        return this._relativePath;
    }
    set relativePath(value) {
        this._relativePath = value;
        this._label = undefined;
    }
    get resourceType() {
        return explorerNode_1.ResourceType.CommitFile;
    }
    getCommitTemplate() {
        return this.explorer.config.commitFormat;
    }
    getCommitFileTemplate() {
        return this.explorer.config.commitFileFormat;
    }
    getCommand() {
        return {
            title: 'Compare File with Previous Revision',
            command: commands_1.Commands.DiffWithPrevious,
            arguments: [
                gitService_1.GitUri.fromFileStatus(this.status, this.commit.repoPath),
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
exports.CommitFileNode = CommitFileNode;
//# sourceMappingURL=commitFileNode.js.map