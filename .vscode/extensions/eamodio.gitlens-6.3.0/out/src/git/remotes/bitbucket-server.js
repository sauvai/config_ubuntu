'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const provider_1 = require("./provider");
class BitbucketServerService extends provider_1.RemoteProvider {
    constructor(domain, path, protocol, name, custom = false) {
        super(domain, path, protocol, name, custom);
    }
    get name() {
        return this.formatName('Bitbucket Server');
    }
    get baseUrl() {
        const [project, repo] = super.splitPath();
        return `https://${this.domain}/projects/${project}/repos/${repo}`;
    }
    getUrlForBranches() {
        return `${this.baseUrl}/branches`;
    }
    getUrlForBranch(branch) {
        return `${this.baseUrl}/commits?until=${branch}`;
    }
    getUrlForCommit(sha) {
        return `${this.baseUrl}/commits/${sha}`;
    }
    getUrlForFile(fileName, branch, sha, range) {
        let line = '';
        if (range) {
            if (range.start.line === range.end.line) {
                line = `#${range.start.line}`;
            }
            else {
                line = `#${range.start.line}-${range.end.line}`;
            }
        }
        if (sha)
            return `${this.baseUrl}/browse/${fileName}?at=${sha}${line}`;
        if (branch)
            return `${this.baseUrl}/browse/${fileName}?at=${branch}${line}`;
        return `${this.baseUrl}/browse/${fileName}${line}`;
    }
}
exports.BitbucketServerService = BitbucketServerService;
//# sourceMappingURL=bitbucket-server.js.map