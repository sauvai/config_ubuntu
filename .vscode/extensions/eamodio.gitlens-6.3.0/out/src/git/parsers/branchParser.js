'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const git_1 = require("./../git");
const branchWithTrackingRegex = /^(\*?)\s+(.+?)\s+([0-9,a-f]+)\s+(?:\[(.*?\/.*?)(?:\:\s(.*)\]|\]))?/gm;
const branchWithTrackingStateRegex = /^(?:ahead\s([0-9]+))?[,\s]*(?:behind\s([0-9]+))?/;
class GitBranchParser {
    static parse(data, repoPath) {
        if (!data)
            return undefined;
        const branches = [];
        let match = null;
        do {
            match = branchWithTrackingRegex.exec(data);
            if (match == null)
                break;
            const [ahead, behind] = this.parseState(match[5]);
            branches.push(new git_1.GitBranch(repoPath, match[2], match[1] === '*', match[4], ahead, behind));
        } while (match != null);
        if (!branches.length)
            return undefined;
        return branches;
    }
    static parseState(state) {
        if (state == null)
            return [0, 0];
        const match = branchWithTrackingStateRegex.exec(state);
        if (match == null)
            return [0, 0];
        const ahead = parseInt(match[1], 10);
        const behind = parseInt(match[2], 10);
        return [
            isNaN(ahead) ? 0 : ahead,
            isNaN(behind) ? 0 : behind
        ];
    }
}
exports.GitBranchParser = GitBranchParser;
//# sourceMappingURL=branchParser.js.map