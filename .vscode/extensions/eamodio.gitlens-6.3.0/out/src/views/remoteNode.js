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
const constants_1 = require("../constants");
const explorerNode_1 = require("./explorerNode");
const gitService_1 = require("../gitService");
class RemoteNode extends explorerNode_1.ExplorerNode {
    constructor(remote, uri, repo, explorer) {
        super(uri);
        this.remote = remote;
        this.repo = repo;
        this.explorer = explorer;
    }
    getChildren() {
        return __awaiter(this, void 0, void 0, function* () {
            const branches = yield this.repo.getBranches();
            if (branches === undefined)
                return [];
            branches.sort((a, b) => a.name.localeCompare(b.name));
            return [...system_1.Iterables.filterMap(branches, b => !b.remote || !b.name.startsWith(this.remote.name) ? undefined : new branchHistoryNode_1.BranchHistoryNode(b, this.uri, this.explorer))];
        });
    }
    getTreeItem() {
        const fetch = this.remote.types.find(rt => rt.type === gitService_1.GitRemoteType.Fetch);
        const push = this.remote.types.find(rt => rt.type === gitService_1.GitRemoteType.Push);
        let separator;
        if (fetch && push) {
            separator = constants_1.GlyphChars.ArrowLeftRight;
        }
        else if (fetch) {
            separator = constants_1.GlyphChars.ArrowLeft;
        }
        else if (push) {
            separator = constants_1.GlyphChars.ArrowRight;
        }
        else {
            separator = constants_1.GlyphChars.Dash;
        }
        const label = `${this.remote.name} ${constants_1.GlyphChars.Space}${separator}${constants_1.GlyphChars.Space} ${(this.remote.provider !== undefined) ? this.remote.provider.name : this.remote.domain} ${constants_1.GlyphChars.Space}${constants_1.GlyphChars.Dot}${constants_1.GlyphChars.Space} ${this.remote.path}`;
        const item = new vscode_1.TreeItem(label, vscode_1.TreeItemCollapsibleState.Collapsed);
        item.contextValue = explorerNode_1.ResourceType.Remote;
        return item;
    }
}
exports.RemoteNode = RemoteNode;
//# sourceMappingURL=remoteNode.js.map