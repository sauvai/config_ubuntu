'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const provider_1 = require("./provider");
class VisualStudioService extends provider_1.RemoteProvider {
    constructor(domain, path, protocol, name) {
        super(domain, path, protocol, name);
    }
    get name() {
        return 'Visual Studio Team Services';
    }
    getUrlForBranches() {
        return `${this.baseUrl}/branches`;
    }
    getUrlForBranch(branch) {
        return `${this.baseUrl}/?version=GB${branch}&_a=history`;
    }
    getUrlForCommit(sha) {
        return `${this.baseUrl}/commit/${sha}`;
    }
    getUrlForFile(fileName, branch, sha, range) {
        let line = '';
        if (range) {
            if (range.start.line === range.end.line) {
                line = `&line=${range.start.line}`;
            }
            else {
                line = `&line=${range.start.line}&lineEnd=${range.end.line}`;
            }
        }
        if (sha)
            return `${this.baseUrl}/commit/${sha}/?_a=contents&path=%2F${fileName}${line}`;
        if (branch)
            return `${this.baseUrl}/?path=%2F${fileName}&version=GB${branch}&_a=contents${line}`;
        return `${this.baseUrl}?path=%2F${fileName}${line}`;
    }
}
exports.VisualStudioService = VisualStudioService;
//# sourceMappingURL=visualStudio.js.map