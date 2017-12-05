'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const git_1 = require("./../git");
const remoteRegex = /^(.*)\t(.*)\s\((.*)\)$/gm;
const urlRegex = /^(?:git:\/\/(.*?)\/|https:\/\/(.*?)\/|http:\/\/(.*?)\/|git@(.*):|ssh:\/\/(?:.*@)?(.*?)(?::.*?)?\/)(.*)$/;
class GitRemoteParser {
    static parse(data, repoPath, providerFactory) {
        if (!data)
            return [];
        const remotes = [];
        const groups = Object.create(null);
        let match = null;
        do {
            match = remoteRegex.exec(data);
            if (match == null)
                break;
            const url = match[2];
            const [domain, path] = this.parseGitUrl(url);
            const uniqueness = `${domain}/${path}`;
            let remote = groups[uniqueness];
            if (remote === undefined) {
                remote = new git_1.GitRemote(repoPath, match[1], domain, path, providerFactory(domain, path), [{ url: url, type: match[3] }]);
                remotes.push(remote);
                groups[uniqueness] = remote;
            }
            else {
                remote.types.push({ url: url, type: match[3] });
            }
        } while (match != null);
        if (!remotes.length)
            return [];
        return remotes;
    }
    static parseGitUrl(url) {
        const match = urlRegex.exec(url);
        if (match == null)
            return ['', ''];
        return [
            match[1] || match[2] || match[3] || match[4] || match[5],
            match[6].replace(/\.git\/?$/, '')
        ];
    }
}
exports.GitRemoteParser = GitRemoteParser;
//# sourceMappingURL=remoteParser.js.map