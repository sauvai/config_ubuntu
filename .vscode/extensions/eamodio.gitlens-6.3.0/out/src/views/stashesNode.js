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
const stashNode_1 = require("./stashNode");
class StashesNode extends explorerNode_1.ExplorerNode {
    constructor(uri, repo, explorer) {
        super(uri);
        this.repo = repo;
        this.explorer = explorer;
    }
    getChildren() {
        return __awaiter(this, void 0, void 0, function* () {
            const stash = yield this.repo.getStashList();
            if (stash === undefined)
                return [new explorerNode_1.MessageNode('No stashed changes')];
            return [...system_1.Iterables.map(stash.commits.values(), c => new stashNode_1.StashNode(c, this.explorer))];
        });
    }
    getTreeItem() {
        const item = new vscode_1.TreeItem(`Stashes`, vscode_1.TreeItemCollapsibleState.Collapsed);
        item.contextValue = explorerNode_1.ResourceType.Stashes;
        item.iconPath = {
            dark: this.explorer.context.asAbsolutePath('images/dark/icon-stash.svg'),
            light: this.explorer.context.asAbsolutePath('images/light/icon-stash.svg')
        };
        return item;
    }
}
exports.StashesNode = StashesNode;
//# sourceMappingURL=stashesNode.js.map