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
const fileHistoryNode_1 = require("./fileHistoryNode");
class HistoryNode extends explorerNode_1.ExplorerNode {
    constructor(uri, repo, explorer) {
        super(uri);
        this.repo = repo;
        this.explorer = explorer;
    }
    getChildren() {
        return __awaiter(this, void 0, void 0, function* () {
            this.resetChildren();
            this.children = [
                new fileHistoryNode_1.FileHistoryNode(this.uri, this.repo, this.explorer)
            ];
            return this.children;
        });
    }
    getTreeItem() {
        const item = new vscode_1.TreeItem(`${this.uri.getFormattedPath()}`, vscode_1.TreeItemCollapsibleState.Expanded);
        item.contextValue = explorerNode_1.ResourceType.History;
        item.iconPath = {
            dark: this.explorer.context.asAbsolutePath('images/dark/icon-history.svg'),
            light: this.explorer.context.asAbsolutePath('images/light/icon-history.svg')
        };
        return item;
    }
}
exports.HistoryNode = HistoryNode;
//# sourceMappingURL=historyNode.js.map