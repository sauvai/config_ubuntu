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
const vscode_1 = require("vscode");
const constants_1 = require("../../constants");
var RemoteResourceType;
(function (RemoteResourceType) {
    RemoteResourceType["Branch"] = "branch";
    RemoteResourceType["Branches"] = "branches";
    RemoteResourceType["Commit"] = "commit";
    RemoteResourceType["File"] = "file";
    RemoteResourceType["Repo"] = "repo";
    RemoteResourceType["Revision"] = "revision";
})(RemoteResourceType = exports.RemoteResourceType || (exports.RemoteResourceType = {}));
function getNameFromRemoteResource(resource) {
    switch (resource.type) {
        case RemoteResourceType.Branch: return 'Branch';
        case RemoteResourceType.Branches: return 'Branches';
        case RemoteResourceType.Commit: return 'Commit';
        case RemoteResourceType.File: return 'File';
        case RemoteResourceType.Repo: return 'Repository';
        case RemoteResourceType.Revision: return 'Revision';
        default: return '';
    }
}
exports.getNameFromRemoteResource = getNameFromRemoteResource;
class RemoteProvider {
    constructor(domain, path, protocol = 'https', name, custom = false) {
        this.domain = domain;
        this.path = path;
        this.protocol = protocol;
        this.custom = custom;
        this._name = name;
    }
    get baseUrl() {
        return `${this.protocol}://${this.domain}/${this.path}`;
    }
    formatName(name) {
        if (this._name !== undefined)
            return this._name;
        return `${name}${this.custom ? ` (${this.domain})` : ''}`;
    }
    splitPath() {
        const index = this.path.indexOf('/');
        return [this.path.substring(0, index), this.path.substring(index + 1)];
    }
    getUrlForRepository() {
        return this.baseUrl;
    }
    openUrl(url) {
        return __awaiter(this, void 0, void 0, function* () {
            if (url === undefined)
                return undefined;
            return vscode_1.commands.executeCommand(constants_1.BuiltInCommands.Open, vscode_1.Uri.parse(url));
        });
    }
    open(resource) {
        switch (resource.type) {
            case RemoteResourceType.Branch: return this.openBranch(resource.branch);
            case RemoteResourceType.Branches: return this.openBranches();
            case RemoteResourceType.Commit: return this.openCommit(resource.sha);
            case RemoteResourceType.File: return this.openFile(resource.fileName, resource.branch, undefined, resource.range);
            case RemoteResourceType.Repo: return this.openRepo();
            case RemoteResourceType.Revision: return this.openFile(resource.fileName, resource.branch, resource.sha, resource.range);
        }
    }
    openRepo() {
        return this.openUrl(this.getUrlForRepository());
    }
    openBranches() {
        return this.openUrl(this.getUrlForBranches());
    }
    openBranch(branch) {
        return this.openUrl(this.getUrlForBranch(branch));
    }
    openCommit(sha) {
        return this.openUrl(this.getUrlForCommit(sha));
    }
    openFile(fileName, branch, sha, range) {
        return this.openUrl(this.getUrlForFile(fileName, branch, sha, range));
    }
}
exports.RemoteProvider = RemoteProvider;
//# sourceMappingURL=provider.js.map