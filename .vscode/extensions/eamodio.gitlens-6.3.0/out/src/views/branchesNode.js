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
const branchHistoryNode_1 = require("./branchHistoryNode");
const explorerNode_1 = require("./explorerNode");
class BranchesNode extends explorerNode_1.ExplorerNode {
    constructor(uri, repo, explorer) {
        super(uri);
        this.repo = repo;
        this.explorer = explorer;
    }
    getChildren() {
        return __awaiter(this, void 0, void 0, function* () {
            const branches = yield this.repo.getBranches();
            if (branches === undefined)
                return [];
            branches.sort((a, b) => (a.current ? -1 : 1) - (b.current ? -1 : 1) || a.name.localeCompare(b.name));
            return [...system_1.Iterables.filterMap(branches, b => b.remote ? undefined : new branchHistoryNode_1.BranchHistoryNode(b, this.uri, this.explorer))];
        });
    }
    getTreeItem() {
        return __awaiter(this, void 0, void 0, function* () {
            const item = new vscode_1.TreeItem(`Branches`, vscode_1.TreeItemCollapsibleState.Expanded);
            const remotes = yield this.repo.getRemotes();
            item.contextValue = (remotes !== undefined && remotes.length > 0)
                ? explorerNode_1.ResourceType.BranchesWithRemotes
                : explorerNode_1.ResourceType.Branches;
            item.iconPath = {
                dark: this.explorer.context.asAbsolutePath('images/dark/icon-branch.svg'),
                light: this.explorer.context.asAbsolutePath('images/light/icon-branch.svg')
            };
            return item;
        });
    }
}
exports.BranchesNode = BranchesNode;
//# sourceMappingURL=branchesNode.js.map