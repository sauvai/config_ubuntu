'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const system_1 = require("../../system");
const provider_1 = require("./provider");
class CustomService extends provider_1.RemoteProvider {
    constructor(domain, path, urls, protocol, name) {
        super(domain, path, protocol, name, true);
        this.urls = urls;
    }
    get name() {
        return this.formatName('Custom');
    }
    getUrlForRepository() {
        return system_1.Strings.interpolate(this.urls.repository, { repo: this.path });
    }
    getUrlForBranches() {
        return system_1.Strings.interpolate(this.urls.branches, { repo: this.path });
    }
    getUrlForBranch(branch) {
        return system_1.Strings.interpolate(this.urls.branch, { repo: this.path, branch: branch });
    }
    getUrlForCommit(sha) {
        return system_1.Strings.interpolate(this.urls.commit, { repo: this.path, id: sha });
    }
    getUrlForFile(fileName, branch, sha, range) {
        let line = '';
        if (range) {
            if (range.start.line === range.end.line) {
                line = system_1.Strings.interpolate(this.urls.fileLine, { line: range.start.line });
            }
            else {
                line = system_1.Strings.interpolate(this.urls.fileRange, { start: range.start.line, end: range.end.line });
            }
        }
        if (sha)
            return system_1.Strings.interpolate(this.urls.fileInCommit, { repo: this.path, id: sha, file: fileName, line: line });
        if (branch)
            return system_1.Strings.interpolate(this.urls.fileInBranch, { repo: this.path, branch: branch, file: fileName, line: line });
        return system_1.Strings.interpolate(this.urls.file, { repo: this.path, file: fileName, line: line });
    }
}
exports.CustomService = CustomService;
//# sourceMappingURL=custom.js.map