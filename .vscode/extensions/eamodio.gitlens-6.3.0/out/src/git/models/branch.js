'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
class GitBranch {
    constructor(repoPath, branch, current = false, tracking, ahead = 0, behind = 0) {
        this.repoPath = repoPath;
        if (branch.startsWith('remotes/')) {
            branch = branch.substring(8);
            this.remote = true;
        }
        this.current = current;
        this.name = branch;
        this.tracking = tracking === '' || tracking == null ? undefined : tracking;
        this.state = {
            ahead: ahead,
            behind: behind
        };
    }
    getName() {
        return this.remote
            ? this.name.substring(this.name.indexOf('/') + 1)
            : this.name;
    }
    getRemote() {
        if (this.remote)
            return GitBranch.getRemote(this.name);
        if (this.tracking !== undefined)
            return GitBranch.getRemote(this.tracking);
        return undefined;
    }
    static getRemote(branch) {
        return branch.substring(0, branch.indexOf('/'));
    }
}
exports.GitBranch = GitBranch;
//# sourceMappingURL=branch.js.map