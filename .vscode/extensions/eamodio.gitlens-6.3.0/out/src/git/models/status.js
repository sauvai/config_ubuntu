'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const system_1 = require("../../system");
const vscode_1 = require("vscode");
const constants_1 = require("../../constants");
const gitUri_1 = require("../gitUri");
const path = require("path");
class GitStatusFile {
    constructor(repoPath, status, workTreeStatus, indexStatus, fileName, staged, originalFileName) {
        this.repoPath = repoPath;
        this.status = status;
        this.workTreeStatus = workTreeStatus;
        this.indexStatus = indexStatus;
        this.fileName = fileName;
        this.staged = staged;
        this.originalFileName = originalFileName;
    }
    getFormattedDirectory(includeOriginal = false) {
        return GitStatusFile.getFormattedDirectory(this, includeOriginal);
    }
    getFormattedPath(separator = system_1.Strings.pad(constants_1.GlyphChars.Dot, 2, 2)) {
        return GitStatusFile.getFormattedPath(this, separator);
    }
    getOcticon() {
        return getGitStatusOcticon(this.status);
    }
    get Uri() {
        return vscode_1.Uri.file(path.resolve(this.repoPath, this.fileName));
    }
    static getFormattedDirectory(status, includeOriginal = false, relativeTo) {
        const directory = gitUri_1.GitUri.getDirectory(status.fileName, relativeTo);
        return (includeOriginal && status.status === 'R' && status.originalFileName)
            ? `${directory} ${system_1.Strings.pad(constants_1.GlyphChars.ArrowLeft, 1, 1)} ${status.originalFileName}`
            : directory;
    }
    static getFormattedPath(status, separator = system_1.Strings.pad(constants_1.GlyphChars.Dot, 2, 2), relativeTo) {
        return gitUri_1.GitUri.getFormattedPath(status.fileName, separator, relativeTo);
    }
    static getRelativePath(status, relativeTo) {
        return gitUri_1.GitUri.getRelativePath(status.fileName, relativeTo);
    }
}
exports.GitStatusFile = GitStatusFile;
const statusOcticonsMap = {
    '!': '$(diff-ignored)',
    '?': '$(diff-added)',
    A: '$(diff-added)',
    C: '$(diff-added)',
    D: '$(diff-removed)',
    M: '$(diff-modified)',
    R: '$(diff-renamed)',
    T: '$(diff-modified)',
    U: '$(alert)',
    X: '$(question)',
    B: '$(question)'
};
function getGitStatusOcticon(status, missing = constants_1.GlyphChars.Space.repeat(4)) {
    return statusOcticonsMap[status] || missing;
}
exports.getGitStatusOcticon = getGitStatusOcticon;
const statusIconsMap = {
    '!': 'icon-status-ignored.svg',
    '?': 'icon-status-untracked.svg',
    A: 'icon-status-added.svg',
    C: 'icon-status-copied.svg',
    D: 'icon-status-deleted.svg',
    M: 'icon-status-modified.svg',
    R: 'icon-status-renamed.svg',
    T: 'icon-status-modified.svg',
    U: 'icon-status-conflict.svg',
    X: 'icon-status-unknown.svg',
    B: 'icon-status-unknown.svg'
};
function getGitStatusIcon(status) {
    return statusIconsMap[status];
}
exports.getGitStatusIcon = getGitStatusIcon;
//# sourceMappingURL=status.js.map