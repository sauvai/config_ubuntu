'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var GitRemoteType;
(function (GitRemoteType) {
    GitRemoteType["Fetch"] = "fetch";
    GitRemoteType["Push"] = "push";
})(GitRemoteType = exports.GitRemoteType || (exports.GitRemoteType = {}));
class GitRemote {
    constructor(repoPath, name, domain, path, provider, types) {
        this.repoPath = repoPath;
        this.name = name;
        this.domain = domain;
        this.path = path;
        this.provider = provider;
        this.types = types;
    }
}
exports.GitRemote = GitRemote;
//# sourceMappingURL=remote.js.map