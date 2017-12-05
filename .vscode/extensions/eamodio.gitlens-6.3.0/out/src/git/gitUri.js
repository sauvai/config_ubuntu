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
const system_1 = require("../system");
const vscode_1 = require("vscode");
const constants_1 = require("../constants");
const gitService_1 = require("../gitService");
const path = require("path");
class GitUri extends vscode_1.Uri {
    constructor(uri, commitOrRepoPath) {
        if (uri === undefined) {
            super();
            return;
        }
        if (uri.scheme === constants_1.DocumentSchemes.GitLensGit) {
            const data = gitService_1.GitService.fromGitContentUri(uri);
            super(uri.scheme, uri.authority, path.resolve(data.repoPath, data.originalFileName || data.fileName), uri.query, uri.fragment);
            if (gitService_1.GitService.isStagedUncommitted(data.sha) || !gitService_1.GitService.isUncommitted(data.sha)) {
                this.sha = data.sha;
                this.repoPath = data.repoPath;
            }
            return;
        }
        if (commitOrRepoPath === undefined) {
            super(uri.scheme, uri.authority, uri.path, uri.query, uri.fragment);
            return;
        }
        if (typeof commitOrRepoPath === 'string') {
            super(uri.scheme, uri.authority, uri.path, uri.query, uri.fragment);
            this.repoPath = commitOrRepoPath;
            return;
        }
        const commit = commitOrRepoPath;
        super(uri.scheme, uri.authority, path.resolve(commit.repoPath, commit.originalFileName || commit.fileName || ''), uri.query, uri.fragment);
        if (commit.repoPath !== undefined) {
            this.repoPath = commit.repoPath;
        }
        if (commit.sha !== undefined && (gitService_1.GitService.isStagedUncommitted(commit.sha) || !gitService_1.GitService.isUncommitted(commit.sha))) {
            this.sha = commit.sha;
        }
    }
    get shortSha() {
        return this.sha && gitService_1.GitService.shortenSha(this.sha);
    }
    fileUri() {
        return vscode_1.Uri.file(this.sha ? this.path : this.fsPath);
    }
    getFormattedPath(separator = system_1.Strings.pad(constants_1.GlyphChars.Dot, 2, 2), relativeTo) {
        let directory = path.dirname(this.fsPath);
        if (this.repoPath) {
            directory = path.relative(this.repoPath, directory);
        }
        if (relativeTo !== undefined) {
            directory = path.relative(relativeTo, directory);
        }
        directory = gitService_1.GitService.normalizePath(directory);
        return (!directory || directory === '.')
            ? path.basename(this.fsPath)
            : `${path.basename(this.fsPath)}${separator}${directory}`;
    }
    getRelativePath(relativeTo) {
        let relativePath = path.relative(this.repoPath || '', this.fsPath);
        if (relativeTo !== undefined) {
            relativePath = path.relative(relativeTo, relativePath);
        }
        return gitService_1.GitService.normalizePath(relativePath);
    }
    static fromUri(uri, git) {
        return __awaiter(this, void 0, void 0, function* () {
            if (uri instanceof GitUri)
                return uri;
            if (!git.isTrackable(uri))
                return new GitUri(uri, undefined);
            if (uri.scheme === constants_1.DocumentSchemes.GitLensGit)
                return new GitUri(uri);
            if (uri.scheme === constants_1.DocumentSchemes.Git) {
                const data = JSON.parse(uri.query);
                const repoPath = yield git.getRepoPath(data.path);
                return new GitUri(uri, {
                    fileName: data.path,
                    repoPath: repoPath,
                    sha: data.ref === '' || data.ref == null
                        ? undefined
                        : data.ref
                });
            }
            const gitUri = git.getGitUriForVersionedFile(uri);
            if (gitUri)
                return gitUri;
            return new GitUri(uri, yield git.getRepoPath(uri));
        });
    }
    static fromFileStatus(status, repoPathOrCommit, original = false) {
        const repoPath = typeof repoPathOrCommit === 'string' ? repoPathOrCommit : repoPathOrCommit.repoPath;
        const uri = vscode_1.Uri.file(path.resolve(repoPath, original ? status.originalFileName || status.fileName : status.fileName));
        return new GitUri(uri, repoPathOrCommit);
    }
    static getDirectory(fileName, relativeTo) {
        let directory = path.dirname(fileName);
        if (relativeTo !== undefined) {
            directory = path.relative(relativeTo, directory);
        }
        directory = gitService_1.GitService.normalizePath(directory);
        return (!directory || directory === '.') ? '' : directory;
    }
    static getFormattedPath(fileNameOrUri, separator = system_1.Strings.pad(constants_1.GlyphChars.Dot, 2, 2), relativeTo) {
        let fileName;
        if (fileNameOrUri instanceof vscode_1.Uri) {
            if (fileNameOrUri instanceof GitUri)
                return fileNameOrUri.getFormattedPath(separator, relativeTo);
            fileName = fileNameOrUri.fsPath;
        }
        else {
            fileName = fileNameOrUri;
        }
        const directory = GitUri.getDirectory(fileName, relativeTo);
        return !directory
            ? path.basename(fileName)
            : `${path.basename(fileName)}${separator}${directory}`;
    }
    static getRelativePath(fileNameOrUri, relativeTo, repoPath) {
        let fileName;
        if (fileNameOrUri instanceof vscode_1.Uri) {
            if (fileNameOrUri instanceof GitUri)
                return fileNameOrUri.getRelativePath(relativeTo);
            fileName = fileNameOrUri.fsPath;
        }
        else {
            fileName = fileNameOrUri;
        }
        let relativePath = path.relative(repoPath || '', fileName);
        if (relativeTo !== undefined) {
            relativePath = path.relative(relativeTo, relativePath);
        }
        return gitService_1.GitService.normalizePath(relativePath);
    }
}
exports.GitUri = GitUri;
//# sourceMappingURL=gitUri.js.map