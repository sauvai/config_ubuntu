'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const system_1 = require("../../system");
const vscode_1 = require("vscode");
const constants_1 = require("../../constants");
const git_1 = require("../git");
const gitUri_1 = require("../gitUri");
const path = require("path");
var GitCommitType;
(function (GitCommitType) {
    GitCommitType["Blame"] = "blame";
    GitCommitType["Branch"] = "branch";
    GitCommitType["File"] = "file";
    GitCommitType["Stash"] = "stash";
})(GitCommitType = exports.GitCommitType || (exports.GitCommitType = {}));
class GitCommit {
    constructor(type, repoPath, sha, fileName, author, date, message, originalFileName, previousSha, previousFileName) {
        this.repoPath = repoPath;
        this.sha = sha;
        this.fileName = fileName;
        this.author = author;
        this.date = date;
        this.message = message;
        this.type = type;
        this.fileName = this.fileName && this.fileName.replace(/, ?$/, '');
        this.originalFileName = originalFileName;
        this.previousSha = previousSha;
        this.previousFileName = previousFileName;
    }
    get shortSha() {
        if (this._shortSha === undefined) {
            this._shortSha = git_1.Git.shortenSha(this.sha);
        }
        return this._shortSha;
    }
    get isStagedUncommitted() {
        if (this._isStagedUncommitted === undefined) {
            this._isStagedUncommitted = git_1.Git.isStagedUncommitted(this.sha);
        }
        return this._isStagedUncommitted;
    }
    get isUncommitted() {
        if (this._isUncommitted === undefined) {
            this._isUncommitted = git_1.Git.isUncommitted(this.sha);
        }
        return this._isUncommitted;
    }
    get previousShortSha() {
        return this.previousSha && git_1.Git.shortenSha(this.previousSha);
    }
    get previousUri() {
        return this.previousFileName ? vscode_1.Uri.file(path.resolve(this.repoPath, this.previousFileName)) : this.uri;
    }
    get uri() {
        return vscode_1.Uri.file(path.resolve(this.repoPath, this.originalFileName || this.fileName || ''));
    }
    formatDate(format) {
        if (this._dateFormatter === undefined) {
            this._dateFormatter = system_1.Dates.toFormatter(this.date);
        }
        return this._dateFormatter.format(format);
    }
    fromNow() {
        if (this._dateFormatter === undefined) {
            this._dateFormatter = system_1.Dates.toFormatter(this.date);
        }
        return this._dateFormatter.fromNow();
    }
    getFormattedPath(separator = system_1.Strings.pad(constants_1.GlyphChars.Dot, 2, 2)) {
        return gitUri_1.GitUri.getFormattedPath(this.fileName, separator);
    }
    with(changes) {
        return new GitCommit(changes.type || this.type, this.repoPath, changes.sha || this.sha, changes.fileName || this.fileName, this.author, this.date, this.message, this.getChangedValue(changes.originalFileName, this.originalFileName), this.getChangedValue(changes.previousSha, this.previousSha), this.getChangedValue(changes.previousFileName, this.previousFileName));
    }
    getChangedValue(change, original) {
        if (change === undefined)
            return original;
        return change !== null ? change : undefined;
    }
}
exports.GitCommit = GitCommit;
//# sourceMappingURL=commit.js.map