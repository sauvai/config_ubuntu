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
const gitService_1 = require("../gitService");
class FolderNode extends explorerNode_1.ExplorerNode {
    constructor(repoPath, folderName, relativePath, root, explorer) {
        super(new gitService_1.GitUri(vscode_1.Uri.file(repoPath), { repoPath: repoPath, fileName: repoPath }));
        this.repoPath = repoPath;
        this.folderName = folderName;
        this.relativePath = relativePath;
        this.root = root;
        this.explorer = explorer;
        this.priority = true;
    }
    getChildren() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.root.descendants === undefined || this.root.children === undefined)
                return [];
            let children;
            const nesting = FolderNode.getFileNesting(this.explorer.config, this.root.descendants, this.relativePath === undefined);
            if (nesting !== configuration_1.GitExplorerFilesLayout.List) {
                children = [];
                for (const folder of system_1.Objects.values(this.root.children)) {
                    if (folder.value === undefined) {
                        children.push(new FolderNode(this.repoPath, folder.name, folder.relativePath, folder, this.explorer));
                        continue;
                    }
                    folder.value.relativePath = this.root.relativePath;
                    children.push(folder.value);
                }
            }
            else {
                this.root.descendants.forEach(n => n.relativePath = this.root.relativePath);
                children = this.root.descendants;
            }
            children.sort((a, b) => {
                return ((a instanceof FolderNode) ? -1 : 1) - ((b instanceof FolderNode) ? -1 : 1) ||
                    (a.priority ? -1 : 1) - (b.priority ? -1 : 1) ||
                    a.label.localeCompare(b.label);
            });
            return children;
        });
    }
    getTreeItem() {
        return __awaiter(this, void 0, void 0, function* () {
            const item = new vscode_1.TreeItem(this.label, vscode_1.TreeItemCollapsibleState.Collapsed);
            item.contextValue = explorerNode_1.ResourceType.Folder;
            return item;
        });
    }
    get label() {
        return this.folderName;
    }
    static getFileNesting(config, children, isRoot) {
        const nesting = config.files.layout || configuration_1.GitExplorerFilesLayout.Auto;
        if (nesting === configuration_1.GitExplorerFilesLayout.Auto) {
            if (isRoot || config.files.compact) {
                const nestingThreshold = config.files.threshold || 5;
                if (children.length <= nestingThreshold)
                    return configuration_1.GitExplorerFilesLayout.List;
            }
            return configuration_1.GitExplorerFilesLayout.Tree;
        }
        return nesting;
    }
}
exports.FolderNode = FolderNode;
//# sourceMappingURL=folderNode.js.map