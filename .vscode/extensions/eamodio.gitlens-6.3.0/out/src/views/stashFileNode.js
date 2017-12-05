'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const commitFileNode_1 = require("./commitFileNode");
const explorerNode_1 = require("./explorerNode");
class StashFileNode extends commitFileNode_1.CommitFileNode {
    constructor(status, commit, explorer) {
        super(status, commit, explorer, commitFileNode_1.CommitFileNodeDisplayAs.File);
    }
    get resourceType() {
        return explorerNode_1.ResourceType.StashFile;
    }
    getCommitTemplate() {
        return this.explorer.config.stashFormat;
    }
    getCommitFileTemplate() {
        return this.explorer.config.stashFileFormat;
    }
}
exports.StashFileNode = StashFileNode;
//# sourceMappingURL=stashFileNode.js.map