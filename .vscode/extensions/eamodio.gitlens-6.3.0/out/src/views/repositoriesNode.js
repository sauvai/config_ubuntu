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
const explorerNode_1 = require("./explorerNode");
const gitService_1 = require("../gitService");
const repositoryNode_1 = require("./repositoryNode");
class RepositoriesNode extends explorerNode_1.ExplorerNode {
    constructor(repositories, explorer) {
        super(undefined);
        this.repositories = repositories;
        this.explorer = explorer;
    }
    getChildren() {
        return __awaiter(this, void 0, void 0, function* () {
            this.resetChildren();
            this.children = this.repositories
                .sort((a, b) => a.index - b.index)
                .map(repo => new repositoryNode_1.RepositoryNode(new gitService_1.GitUri(vscode_1.Uri.file(repo.path), { repoPath: repo.path, fileName: repo.path }), repo, this.explorer));
            return this.children;
        });
    }
    getTreeItem() {
        const item = new vscode_1.TreeItem(`Repositories`, vscode_1.TreeItemCollapsibleState.Expanded);
        item.contextValue = explorerNode_1.ResourceType.Repositories;
        return item;
    }
}
exports.RepositoriesNode = RepositoriesNode;
//# sourceMappingURL=repositoriesNode.js.map