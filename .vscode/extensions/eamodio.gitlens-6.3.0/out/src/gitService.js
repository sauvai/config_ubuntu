'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
const system_1 = require("./system");
const vscode_1 = require("vscode");
const configuration_1 = require("./configuration");
const constants_1 = require("./constants");
const factory_1 = require("./git/remotes/factory");
const git_1 = require("./git/git");
const gitUri_1 = require("./git/gitUri");
exports.GitUri = gitUri_1.GitUri;
const logger_1 = require("./logger");
const fs = require("fs");
const path = require("path");
__export(require("./git/models/models"));
__export(require("./git/formatters/commit"));
__export(require("./git/formatters/status"));
var provider_1 = require("./git/remotes/provider");
exports.getNameFromRemoteResource = provider_1.getNameFromRemoteResource;
exports.RemoteProvider = provider_1.RemoteProvider;
exports.RemoteResourceType = provider_1.RemoteResourceType;
var factory_2 = require("./git/remotes/factory");
exports.RemoteProviderFactory = factory_2.RemoteProviderFactory;
__export(require("./git/gitContextTracker"));
class UriCacheEntry {
    constructor(uri) {
        this.uri = uri;
    }
}
class GitCacheEntry {
    constructor(key) {
        this.key = key;
        this.cache = new Map();
    }
    get hasErrors() {
        return system_1.Iterables.every(this.cache.values(), entry => entry.errorMessage !== undefined);
    }
    get(key) {
        return this.cache.get(key);
    }
    set(key, value) {
        this.cache.set(key, value);
    }
}
var RemoveCacheReason;
(function (RemoveCacheReason) {
    RemoveCacheReason[RemoveCacheReason["DocumentChanged"] = 0] = "DocumentChanged";
    RemoveCacheReason[RemoveCacheReason["DocumentClosed"] = 1] = "DocumentClosed";
})(RemoveCacheReason || (RemoveCacheReason = {}));
var GitRepoSearchBy;
(function (GitRepoSearchBy) {
    GitRepoSearchBy["Author"] = "author";
    GitRepoSearchBy["Changes"] = "changes";
    GitRepoSearchBy["ChangesOccurrences"] = "changes-occurrences";
    GitRepoSearchBy["Files"] = "files";
    GitRepoSearchBy["Message"] = "message";
    GitRepoSearchBy["Sha"] = "sha";
})(GitRepoSearchBy = exports.GitRepoSearchBy || (exports.GitRepoSearchBy = {}));
var GitChangeReason;
(function (GitChangeReason) {
    GitChangeReason["GitCache"] = "git-cache";
    GitChangeReason["Repositories"] = "repositories";
})(GitChangeReason = exports.GitChangeReason || (exports.GitChangeReason = {}));
class GitService extends vscode_1.Disposable {
    constructor() {
        super(() => this.dispose());
        this._onDidBlameFail = new vscode_1.EventEmitter();
        this._onDidChange = new vscode_1.EventEmitter();
        this._suspended = false;
        this._documentKeyMap = new Map();
        this._gitCache = new Map();
        this._repositoryTree = system_1.TernarySearchTree.forPaths();
        this._trackedCache = new Map();
        this._versionedUriCache = new Map();
        this._disposable = vscode_1.Disposable.from(vscode_1.window.onDidChangeWindowState(this.onWindowStateChanged, this), vscode_1.workspace.onDidChangeWorkspaceFolders(this.onWorkspaceFoldersChanged, this), configuration_1.configuration.onDidChange(this.onConfigurationChanged, this));
        this.onConfigurationChanged(configuration_1.configuration.initializingChangeEvent);
        this._repositoriesLoadingPromise = this.onWorkspaceFoldersChanged();
    }
    get onDidBlameFail() {
        return this._onDidBlameFail.event;
    }
    get onDidChange() {
        return this._onDidChange.event;
    }
    dispose() {
        this._repositoryTree.forEach(r => r.dispose());
        this._disposable && this._disposable.dispose();
        this._cacheDisposable && this._cacheDisposable.dispose();
        this._cacheDisposable = undefined;
        this._documentKeyMap.clear();
        this._gitCache.clear();
        this._trackedCache.clear();
        this._versionedUriCache.clear();
    }
    get UseCaching() {
        return this.config.advanced.caching.enabled;
    }
    onAnyRepositoryChanged() {
        this._gitCache.clear();
        this._trackedCache.clear();
    }
    onConfigurationChanged(e) {
        const initializing = configuration_1.configuration.initializing(e);
        const cfg = configuration_1.configuration.get();
        if (initializing || configuration_1.configuration.changed(e, configuration_1.configuration.name('advanced')('caching')('enabled').value)) {
            if (cfg.advanced.caching.enabled) {
                this._cacheDisposable && this._cacheDisposable.dispose();
                this._cacheDisposable = vscode_1.Disposable.from(vscode_1.workspace.onDidChangeTextDocument(system_1.Functions.debounce(this.onTextDocumentChanged, 50), this), vscode_1.workspace.onDidCloseTextDocument(this.onTextDocumentClosed, this));
            }
            else {
                this._cacheDisposable && this._cacheDisposable.dispose();
                this._cacheDisposable = undefined;
                this._documentKeyMap.clear();
                this._gitCache.clear();
            }
        }
        this.config = cfg;
        if (!initializing && configuration_1.configuration.changed(e, configuration_1.configuration.name('blame')('ignoreWhitespace').value, null)) {
            this._gitCache.clear();
            this.fireChange(GitChangeReason.GitCache);
        }
    }
    onTextDocumentChanged(e) {
        let key = this._documentKeyMap.get(e.document);
        if (key === undefined) {
            key = this.getCacheEntryKey(e.document.uri);
            this._documentKeyMap.set(e.document, key);
        }
        const entry = this._gitCache.get(key);
        if (entry === undefined || entry.hasErrors)
            return;
        if (this._gitCache.delete(key)) {
            logger_1.Logger.log(`Clear cache entry for '${key}', reason=${RemoveCacheReason[RemoveCacheReason.DocumentChanged]}`);
        }
    }
    onTextDocumentClosed(document) {
        this._documentKeyMap.delete(document);
        const key = this.getCacheEntryKey(document.uri);
        if (this._gitCache.delete(key)) {
            logger_1.Logger.log(`Clear cache entry for '${key}', reason=${RemoveCacheReason[RemoveCacheReason.DocumentClosed]}`);
        }
    }
    onWindowStateChanged(e) {
        if (e.focused) {
            this._repositoryTree.forEach(r => r.resume());
        }
        else {
            this._repositoryTree.forEach(r => r.suspend());
        }
        this._suspended = !e.focused;
    }
    onWorkspaceFoldersChanged(e) {
        return __awaiter(this, void 0, void 0, function* () {
            let initializing = false;
            if (e === undefined) {
                initializing = true;
                e = {
                    added: vscode_1.workspace.workspaceFolders || [],
                    removed: []
                };
            }
            for (const f of e.added) {
                if (f.uri.scheme !== constants_1.DocumentSchemes.File)
                    continue;
                const repositories = yield this.repositorySearch(f);
                for (const r of repositories) {
                    this._repositoryTree.set(r.path, r);
                }
            }
            for (const f of e.removed) {
                if (f.uri.scheme !== constants_1.DocumentSchemes.File)
                    continue;
                const fsPath = f.uri.fsPath;
                const filteredTree = this._repositoryTree.findSuperstr(fsPath);
                const reposToDelete = filteredTree !== undefined
                    ? [...system_1.Iterables.map(filteredTree.entries(), ([r, k]) => [r, path.join(fsPath, k)])]
                    : [];
                const repo = this._repositoryTree.get(fsPath);
                if (repo !== undefined) {
                    reposToDelete.push([repo, fsPath]);
                }
                for (const [r, k] of reposToDelete) {
                    this._repositoryTree.delete(k);
                    r.dispose();
                }
            }
            yield constants_1.setCommandContext(constants_1.CommandContext.HasRepository, this._repositoryTree.any());
            if (!initializing) {
                setTimeout(() => this.fireChange(GitChangeReason.Repositories), 1);
            }
        });
    }
    repositorySearch(folder) {
        return __awaiter(this, void 0, void 0, function* () {
            const folderUri = folder.uri;
            const repositories = [];
            const anyRepoChangedFn = this.onAnyRepositoryChanged.bind(this);
            const rootPath = yield this.getRepoPathCore(folderUri.fsPath, true);
            yield this.getRepoPathCore(folderUri.fsPath, true);
            if (rootPath !== undefined) {
                repositories.push(new git_1.Repository(folder, rootPath, true, this, anyRepoChangedFn, this._suspended));
            }
            let depth;
            try {
                depth = configuration_1.configuration.get(configuration_1.configuration.name('advanced')('repositorySearchDepth').value, folderUri);
            }
            catch (ex) {
                logger_1.Logger.error(ex);
                depth = configuration_1.configuration.get(configuration_1.configuration.name('advanced')('repositorySearchDepth').value, null);
            }
            if (depth <= 0)
                return repositories;
            let excludes = {};
            try {
                excludes = Object.assign({}, vscode_1.workspace.getConfiguration('files', folderUri).get('exclude', {}), vscode_1.workspace.getConfiguration('search', folderUri).get('exclude', {}));
            }
            catch (ex) {
                logger_1.Logger.error(ex);
                excludes = Object.assign({}, vscode_1.workspace.getConfiguration('files', null).get('exclude', {}), vscode_1.workspace.getConfiguration('search', null).get('exclude', {}));
            }
            const excludedPaths = [...system_1.Iterables.filterMap(system_1.Objects.entries(excludes), ([key, value]) => {
                    if (!value)
                        return undefined;
                    if (key.startsWith('**/'))
                        return key.substring(3);
                    return key;
                })];
            excludes = excludedPaths.reduce((accumulator, current) => {
                accumulator[current] = true;
                return accumulator;
            }, Object.create(null));
            const start = process.hrtime();
            const paths = yield this.repositorySearchCore(folderUri.fsPath, depth, excludes);
            const duration = process.hrtime(start);
            logger_1.Logger.log(`${(duration[0] * 1000) + Math.floor(duration[1] / 1000000)} ms to search (depth=${depth}) for repositories in ${folderUri.fsPath}`);
            for (const p of paths) {
                const rp = yield this.getRepoPathCore(path.dirname(p), true);
                if (rp !== undefined && rp !== rootPath) {
                    repositories.push(new git_1.Repository(folder, rp, false, this, anyRepoChangedFn, this._suspended));
                }
            }
            return repositories;
        });
    }
    repositorySearchCore(root, depth, excludes, repositories = []) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                fs.readdir(root, (err, files) => __awaiter(this, void 0, void 0, function* () {
                    if (err != null) {
                        reject(err);
                        return;
                    }
                    if (files.length === 0) {
                        resolve(repositories);
                        return;
                    }
                    const folders = [];
                    const promises = files.map(file => {
                        const fullPath = path.resolve(root, file);
                        return new Promise((res, rej) => {
                            fs.stat(fullPath, (err, stat) => {
                                if (file === '.git') {
                                    repositories.push(fullPath);
                                }
                                else if (err == null && excludes[file] !== true && stat != null && stat.isDirectory()) {
                                    folders.push(fullPath);
                                }
                                res();
                            });
                        });
                    });
                    yield Promise.all(promises);
                    if (depth-- > 0) {
                        for (const folder of folders) {
                            yield this.repositorySearchCore(folder, depth, excludes, repositories);
                        }
                    }
                    resolve(repositories);
                }));
            });
        });
    }
    fireChange(reason) {
        this._onDidChange.fire({ reason: reason });
    }
    checkoutFile(uri, sha) {
        sha = sha || uri.sha;
        logger_1.Logger.log(`checkoutFile('${uri.repoPath}', '${uri.fsPath}', '${sha}')`);
        return git_1.Git.checkout(uri.repoPath, uri.fsPath, sha);
    }
    fileExists(repoPath, fileName) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield new Promise((resolve, reject) => fs.exists(path.resolve(repoPath, fileName), resolve));
        });
    }
    findNextCommit(repoPath, fileName, sha) {
        return __awaiter(this, void 0, void 0, function* () {
            let log = yield this.getLogForFile(repoPath, fileName, sha, { maxCount: 1, reverse: true });
            let commit = log && system_1.Iterables.first(log.commits.values());
            if (commit)
                return commit;
            const nextFileName = yield this.findNextFileName(repoPath, fileName, sha);
            if (nextFileName) {
                log = yield this.getLogForFile(repoPath, nextFileName, sha, { maxCount: 1, reverse: true });
                commit = log && system_1.Iterables.first(log.commits.values());
            }
            return commit;
        });
    }
    findNextFileName(repoPath, fileName, sha) {
        return __awaiter(this, void 0, void 0, function* () {
            [fileName, repoPath] = git_1.Git.splitPath(fileName, repoPath);
            return (yield this.fileExists(repoPath, fileName))
                ? fileName
                : yield this.findNextFileNameCore(repoPath, fileName, sha);
        });
    }
    findNextFileNameCore(repoPath, fileName, sha) {
        return __awaiter(this, void 0, void 0, function* () {
            if (sha === undefined) {
                const c = yield this.getLogCommit(repoPath, fileName);
                if (c === undefined)
                    return undefined;
                sha = c.sha;
            }
            const log = yield this.getLogForRepo(repoPath, sha, 1);
            if (log === undefined)
                return undefined;
            const c = system_1.Iterables.first(log.commits.values());
            const status = c.fileStatuses.find(f => f.originalFileName === fileName);
            if (status === undefined)
                return undefined;
            return status.fileName;
        });
    }
    findWorkingFileName(commitOrRepoPath, fileName) {
        return __awaiter(this, void 0, void 0, function* () {
            let repoPath;
            if (commitOrRepoPath === undefined || typeof commitOrRepoPath === 'string') {
                repoPath = commitOrRepoPath;
                if (fileName === undefined)
                    throw new Error('Invalid fileName');
                [fileName] = git_1.Git.splitPath(fileName, repoPath);
            }
            else {
                const c = commitOrRepoPath;
                repoPath = c.repoPath;
                if (c.workingFileName && (yield this.fileExists(repoPath, c.workingFileName)))
                    return c.workingFileName;
                fileName = c.fileName;
            }
            while (true) {
                if (yield this.fileExists(repoPath, fileName))
                    return fileName;
                fileName = yield this.findNextFileNameCore(repoPath, fileName);
                if (fileName === undefined)
                    return undefined;
            }
        });
    }
    getActiveRepoPath(editor) {
        return __awaiter(this, void 0, void 0, function* () {
            if (editor === undefined) {
                const repoPath = this.getHighlanderRepoPath();
                if (repoPath !== undefined)
                    return repoPath;
            }
            editor = editor || vscode_1.window.activeTextEditor;
            if (editor === undefined)
                return undefined;
            return this.getRepoPath(editor.document.uri);
        });
    }
    getHighlanderRepoPath() {
        const entry = this._repositoryTree.highlander();
        if (entry === undefined)
            return undefined;
        const [repo] = entry;
        return repo.path;
    }
    getBlameability(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.UseCaching)
                return yield this.isTracked(uri);
            const cacheKey = this.getCacheEntryKey(uri);
            const entry = this._gitCache.get(cacheKey);
            if (entry === undefined)
                return yield this.isTracked(uri);
            return !entry.hasErrors;
        });
    }
    getBlameForFile(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            let key = 'blame';
            if (uri.sha !== undefined) {
                key += `:${uri.sha}`;
            }
            let entry;
            if (this.UseCaching) {
                const cacheKey = this.getCacheEntryKey(uri);
                entry = this._gitCache.get(cacheKey);
                if (entry !== undefined) {
                    const cachedBlame = entry.get(key);
                    if (cachedBlame !== undefined) {
                        logger_1.Logger.log(`getBlameForFile[Cached(${key})]('${uri.repoPath}', '${uri.fsPath}', '${uri.sha}')`);
                        return cachedBlame.item;
                    }
                }
                logger_1.Logger.log(`getBlameForFile[Not Cached(${key})]('${uri.repoPath}', '${uri.fsPath}', '${uri.sha}')`);
                if (entry === undefined) {
                    entry = new GitCacheEntry(cacheKey);
                    this._gitCache.set(entry.key, entry);
                }
            }
            else {
                logger_1.Logger.log(`getBlameForFile('${uri.repoPath}', '${uri.fsPath}', '${uri.sha}')`);
            }
            const promise = this.getBlameForFileCore(uri, entry, key);
            if (entry) {
                logger_1.Logger.log(`Add blame cache for '${entry.key}:${key}'`);
                entry.set(key, {
                    item: promise
                });
            }
            return promise;
        });
    }
    getBlameForFileCore(uri, entry, key) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield this.isTracked(uri))) {
                logger_1.Logger.log(`Skipping blame; '${uri.fsPath}' is not tracked`);
                if (entry && entry.key) {
                    this._onDidBlameFail.fire(entry.key);
                }
                return yield GitService.emptyPromise;
            }
            const [file, root] = git_1.Git.splitPath(uri.fsPath, uri.repoPath, false);
            try {
                const data = yield git_1.Git.blame(root, file, uri.sha, { ignoreWhitespace: this.config.blame.ignoreWhitespace });
                const blame = git_1.GitBlameParser.parse(data, root, file);
                return blame;
            }
            catch (ex) {
                if (entry) {
                    const msg = ex && ex.toString();
                    logger_1.Logger.log(`Replace blame cache with empty promise for '${entry.key}:${key}'`);
                    entry.set(key, {
                        item: GitService.emptyPromise,
                        errorMessage: msg
                    });
                    this._onDidBlameFail.fire(entry.key);
                    return yield GitService.emptyPromise;
                }
                return undefined;
            }
        });
    }
    getBlameForLine(uri, line) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.Logger.log(`getBlameForLine('${uri.repoPath}', '${uri.fsPath}', '${uri.sha}', ${line})`);
            if (this.UseCaching) {
                const blame = yield this.getBlameForFile(uri);
                if (blame === undefined)
                    return undefined;
                let blameLine = blame.lines[line];
                if (blameLine === undefined) {
                    if (blame.lines.length !== line)
                        return undefined;
                    blameLine = blame.lines[line - 1];
                }
                const commit = blame.commits.get(blameLine.sha);
                if (commit === undefined)
                    return undefined;
                return {
                    author: Object.assign({}, blame.authors.get(commit.author), { lineCount: commit.lines.length }),
                    commit: commit,
                    line: blameLine
                };
            }
            const fileName = uri.fsPath;
            try {
                const data = yield git_1.Git.blame(uri.repoPath, fileName, uri.sha, { ignoreWhitespace: this.config.blame.ignoreWhitespace, startLine: line + 1, endLine: line + 1 });
                const blame = git_1.GitBlameParser.parse(data, uri.repoPath, fileName);
                if (blame === undefined)
                    return undefined;
                const commit = system_1.Iterables.first(blame.commits.values());
                if (uri.repoPath) {
                    commit.repoPath = uri.repoPath;
                }
                return {
                    author: system_1.Iterables.first(blame.authors.values()),
                    commit: commit,
                    line: blame.lines[line]
                };
            }
            catch (ex) {
                return undefined;
            }
        });
    }
    getBlameForRange(uri, range) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.Logger.log(`getBlameForRange('${uri.repoPath}', '${uri.fsPath}', '${uri.sha}', [${range.start.line}, ${range.end.line}])`);
            const blame = yield this.getBlameForFile(uri);
            if (blame === undefined)
                return undefined;
            return this.getBlameForRangeSync(blame, uri, range);
        });
    }
    getBlameForRangeSync(blame, uri, range) {
        logger_1.Logger.log(`getBlameForRangeSync('${uri.repoPath}', '${uri.fsPath}', '${uri.sha}', [${range.start.line}, ${range.end.line}])`);
        if (blame.lines.length === 0)
            return Object.assign({ allLines: blame.lines }, blame);
        if (range.start.line === 0 && range.end.line === blame.lines.length - 1) {
            return Object.assign({ allLines: blame.lines }, blame);
        }
        const lines = blame.lines.slice(range.start.line, range.end.line + 1);
        const shas = new Set(lines.map(l => l.sha));
        const authors = new Map();
        const commits = new Map();
        for (const c of blame.commits.values()) {
            if (!shas.has(c.sha))
                continue;
            const commit = new git_1.GitBlameCommit(c.repoPath, c.sha, c.fileName, c.author, c.date, c.message, c.lines.filter(l => l.line >= range.start.line && l.line <= range.end.line), c.originalFileName, c.previousSha, c.previousFileName);
            commits.set(c.sha, commit);
            let author = authors.get(commit.author);
            if (author === undefined) {
                author = {
                    name: commit.author,
                    lineCount: 0
                };
                authors.set(author.name, author);
            }
            author.lineCount += commit.lines.length;
        }
        const sortedAuthors = new Map([...authors.entries()].sort((a, b) => b[1].lineCount - a[1].lineCount));
        return {
            authors: sortedAuthors,
            commits: commits,
            lines: lines,
            allLines: blame.lines
        };
    }
    getBranch(repoPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (repoPath === undefined)
                return undefined;
            logger_1.Logger.log(`getBranch('${repoPath}')`);
            const data = yield git_1.Git.revparse_currentBranch(repoPath);
            if (data === undefined)
                return undefined;
            const branch = data.split('\n');
            return new git_1.GitBranch(repoPath, branch[0], true, branch[1]);
        });
    }
    getBranches(repoPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (repoPath === undefined)
                return [];
            logger_1.Logger.log(`getBranches('${repoPath}')`);
            const data = yield git_1.Git.branch(repoPath, { all: true });
            if (data === '') {
                const current = yield this.getBranch(repoPath);
                return current !== undefined ? [current] : [];
            }
            return git_1.GitBranchParser.parse(data, repoPath) || [];
        });
    }
    getCacheEntryKey(fileNameOrUri) {
        return git_1.Git.normalizePath(typeof fileNameOrUri === 'string' ? fileNameOrUri : fileNameOrUri.fsPath).toLowerCase();
    }
    getChangedFilesCount(repoPath, sha) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.Logger.log(`getChangedFilesCount('${repoPath}', '${sha}')`);
            const data = yield git_1.Git.diff_shortstat(repoPath, sha);
            return git_1.GitDiffParser.parseShortStat(data);
        });
    }
    getConfig(key, repoPath) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.Logger.log(`getConfig('${key}', '${repoPath}')`);
            return yield git_1.Git.config_get(key, repoPath);
        });
    }
    getGitUriForVersionedFile(uri) {
        const cacheKey = this.getCacheEntryKey(uri);
        const entry = this._versionedUriCache.get(cacheKey);
        return entry && entry.uri;
    }
    getDiffForFile(uri, sha1, sha2) {
        return __awaiter(this, void 0, void 0, function* () {
            if (sha1 !== undefined && sha2 === undefined && uri.sha !== undefined) {
                sha2 = uri.sha;
            }
            let key = 'diff';
            if (sha1 !== undefined) {
                key += `:${sha1}`;
            }
            if (sha2 !== undefined) {
                key += `:${sha2}`;
            }
            let entry;
            if (this.UseCaching) {
                const cacheKey = this.getCacheEntryKey(uri);
                entry = this._gitCache.get(cacheKey);
                if (entry !== undefined) {
                    const cachedDiff = entry.get(key);
                    if (cachedDiff !== undefined) {
                        logger_1.Logger.log(`getDiffForFile[Cached(${key})]('${uri.repoPath}', '${uri.fsPath}', '${sha1}', '${sha2}')`);
                        return cachedDiff.item;
                    }
                }
                logger_1.Logger.log(`getDiffForFile[Not Cached(${key})]('${uri.repoPath}', '${uri.fsPath}', '${sha1}', '${sha2}')`);
                if (entry === undefined) {
                    entry = new GitCacheEntry(cacheKey);
                    this._gitCache.set(entry.key, entry);
                }
            }
            else {
                logger_1.Logger.log(`getDiffForFile('${uri.repoPath}', '${uri.fsPath}', '${sha1}', '${sha2}')`);
            }
            const promise = this.getDiffForFileCore(uri.repoPath, uri.fsPath, sha1, sha2, { encoding: GitService.getEncoding(uri) }, entry, key);
            if (entry) {
                logger_1.Logger.log(`Add log cache for '${entry.key}:${key}'`);
                entry.set(key, {
                    item: promise
                });
            }
            return promise;
        });
    }
    getDiffForFileCore(repoPath, fileName, sha1, sha2, options, entry, key) {
        return __awaiter(this, void 0, void 0, function* () {
            const [file, root] = git_1.Git.splitPath(fileName, repoPath, false);
            try {
                const data = yield git_1.Git.diff(root, file, sha1, sha2, options);
                const diff = git_1.GitDiffParser.parse(data);
                return diff;
            }
            catch (ex) {
                if (entry) {
                    const msg = ex && ex.toString();
                    logger_1.Logger.log(`Replace diff cache with empty promise for '${entry.key}:${key}'`);
                    entry.set(key, {
                        item: GitService.emptyPromise,
                        errorMessage: msg
                    });
                    return yield GitService.emptyPromise;
                }
                return undefined;
            }
        });
    }
    getDiffForLine(uri, line, sha1, sha2) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.Logger.log(`getDiffForLine('${uri.repoPath}', '${uri.fsPath}', ${line}, '${sha1}', '${sha2}')`);
            try {
                const diff = yield this.getDiffForFile(uri, sha1, sha2);
                if (diff === undefined)
                    return undefined;
                const chunk = diff.chunks.find(c => c.currentPosition.start <= line && c.currentPosition.end >= line);
                if (chunk === undefined)
                    return undefined;
                return chunk.lines[line - chunk.currentPosition.start + 1];
            }
            catch (ex) {
                return undefined;
            }
        });
    }
    getDiffStatus(repoPath, sha1, sha2, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.Logger.log(`getDiffStatus('${repoPath}', '${sha1}', '${sha2}', ${options.filter})`);
            try {
                const data = yield git_1.Git.diff_nameStatus(repoPath, sha1, sha2, options);
                const diff = git_1.GitDiffParser.parseNameStatus(data, repoPath);
                return diff;
            }
            catch (ex) {
                return undefined;
            }
        });
    }
    getLogCommit(repoPath, fileName, shaOrOptions, options) {
        return __awaiter(this, void 0, void 0, function* () {
            let sha = undefined;
            if (typeof shaOrOptions === 'string') {
                sha = shaOrOptions;
            }
            else if (options === undefined) {
                options = shaOrOptions;
            }
            options = options || {};
            logger_1.Logger.log(`getLogCommit('${repoPath}', '${fileName}', '${sha}', ${options.firstIfMissing}, ${options.previous})`);
            const log = yield this.getLogForFile(repoPath, fileName, sha, { maxCount: options.previous ? 2 : 1 });
            if (log === undefined)
                return undefined;
            const commit = sha && log.commits.get(sha);
            if (commit === undefined && sha && !options.firstIfMissing)
                return undefined;
            return commit || system_1.Iterables.first(log.commits.values());
        });
    }
    getLogForRepo(repoPath, sha, maxCount, reverse = false) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.Logger.log(`getLogForRepo('${repoPath}', '${sha}', ${maxCount}, ${reverse})`);
            if (maxCount == null) {
                maxCount = this.config.advanced.maxQuickHistory || 0;
            }
            try {
                const data = yield git_1.Git.log(repoPath, sha, maxCount, reverse);
                const log = git_1.GitLogParser.parse(data, git_1.GitCommitType.Branch, repoPath, undefined, sha, maxCount, reverse, undefined);
                return log;
            }
            catch (ex) {
                return undefined;
            }
        });
    }
    getLogForRepoSearch(repoPath, search, searchBy, maxCount) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.Logger.log(`getLogForRepoSearch('${repoPath}', '${search}', '${searchBy}', ${maxCount})`);
            if (maxCount == null) {
                maxCount = this.config.advanced.maxQuickHistory || 0;
            }
            let searchArgs = undefined;
            switch (searchBy) {
                case GitRepoSearchBy.Author:
                    searchArgs = [`--author=${search}`];
                    break;
                case GitRepoSearchBy.Changes:
                    searchArgs = [`-G${search}`];
                    break;
                case GitRepoSearchBy.ChangesOccurrences:
                    searchArgs = [`-S${search}`, '--pickaxe-regex'];
                    break;
                case GitRepoSearchBy.Files:
                    searchArgs = [`--`, `${search}`];
                    break;
                case GitRepoSearchBy.Message:
                    searchArgs = [`--grep=${search}`];
                    break;
                case GitRepoSearchBy.Sha:
                    searchArgs = [search];
                    maxCount = 1;
                    break;
            }
            try {
                const data = yield git_1.Git.log_search(repoPath, searchArgs, maxCount);
                const log = git_1.GitLogParser.parse(data, git_1.GitCommitType.Branch, repoPath, undefined, undefined, maxCount, false, undefined);
                return log;
            }
            catch (ex) {
                return undefined;
            }
        });
    }
    getLogForFile(repoPath, fileName, sha, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            options = Object.assign({ reverse: false, skipMerges: false }, options);
            let key = 'log';
            if (sha !== undefined) {
                key += `:${sha}`;
            }
            if (options.maxCount !== undefined) {
                key += `:n${options.maxCount}`;
            }
            let entry;
            if (this.UseCaching && options.range === undefined && !options.reverse) {
                const cacheKey = this.getCacheEntryKey(fileName);
                entry = this._gitCache.get(cacheKey);
                if (entry !== undefined) {
                    const cachedLog = entry.get(key);
                    if (cachedLog !== undefined) {
                        logger_1.Logger.log(`getLogForFile[Cached(${key})]('${repoPath}', '${fileName}', '${sha}', ${options.maxCount}, undefined, ${options.reverse}, ${options.skipMerges})`);
                        return cachedLog.item;
                    }
                    if (key !== 'log') {
                        const cachedLog = entry.get('log');
                        if (cachedLog !== undefined) {
                            if (sha === undefined) {
                                logger_1.Logger.log(`getLogForFile[Cached(~${key})]('${repoPath}', '${fileName}', '', ${options.maxCount}, undefined, ${options.reverse}, ${options.skipMerges})`);
                                return cachedLog.item;
                            }
                            logger_1.Logger.log(`getLogForFile[? Cache(${key})]('${repoPath}', '${fileName}', '${sha}', ${options.maxCount}, undefined, ${options.reverse}, ${options.skipMerges})`);
                            const log = yield cachedLog.item;
                            if (log !== undefined && log.commits.has(sha)) {
                                logger_1.Logger.log(`getLogForFile[Cached(${key})]('${repoPath}', '${fileName}', '${sha}', ${options.maxCount}, undefined, ${options.reverse}, ${options.skipMerges})`);
                                return cachedLog.item;
                            }
                        }
                    }
                }
                logger_1.Logger.log(`getLogForFile[Not Cached(${key})]('${repoPath}', '${fileName}', ${sha}, ${options.maxCount}, undefined, ${options.reverse}, ${options.skipMerges})`);
                if (entry === undefined) {
                    entry = new GitCacheEntry(cacheKey);
                    this._gitCache.set(entry.key, entry);
                }
            }
            else {
                logger_1.Logger.log(`getLogForFile('${repoPath}', '${fileName}', ${sha}, ${options.maxCount}, ${options.range && `[${options.range.start.line}, ${options.range.end.line}]`}, ${options.reverse}, ${options.skipMerges})`);
            }
            const promise = this.getLogForFileCore(repoPath, fileName, sha, options, entry, key);
            if (entry) {
                logger_1.Logger.log(`Add log cache for '${entry.key}:${key}'`);
                entry.set(key, {
                    item: promise
                });
            }
            return promise;
        });
    }
    getLogForFileCore(repoPath, fileName, sha, options, entry, key) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield this.isTracked(fileName, repoPath))) {
                logger_1.Logger.log(`Skipping log; '${fileName}' is not tracked`);
                return yield GitService.emptyPromise;
            }
            const [file, root] = git_1.Git.splitPath(fileName, repoPath, false);
            try {
                const { range } = options, opts = __rest(options, ["range"]);
                const data = yield git_1.Git.log_file(root, file, sha, Object.assign({}, opts, { startLine: range && range.start.line + 1, endLine: range && range.end.line + 1 }));
                const log = git_1.GitLogParser.parse(data, git_1.GitCommitType.File, root, file, sha, options.maxCount, options.reverse, range);
                return log;
            }
            catch (ex) {
                if (entry) {
                    const msg = ex && ex.toString();
                    logger_1.Logger.log(`Replace log cache with empty promise for '${entry.key}:${key}'`);
                    entry.set(key, {
                        item: GitService.emptyPromise,
                        errorMessage: msg
                    });
                    return yield GitService.emptyPromise;
                }
                return undefined;
            }
        });
    }
    hasRemote(repoPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (repoPath === undefined)
                return false;
            const repository = yield this.getRepository(repoPath);
            if (repository === undefined)
                return false;
            return repository.hasRemote();
        });
    }
    hasRemotes(repoPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (repoPath === undefined)
                return false;
            const repository = yield this.getRepository(repoPath);
            if (repository === undefined)
                return false;
            return repository.hasRemotes();
        });
    }
    getRemotes(repoPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (repoPath === undefined)
                return [];
            logger_1.Logger.log(`getRemotes('${repoPath}')`);
            const repository = yield this.getRepository(repoPath);
            if (repository !== undefined)
                return repository.getRemotes();
            return this.getRemotesCore(repoPath);
        });
    }
    getRemotesCore(repoPath, providerMap) {
        return __awaiter(this, void 0, void 0, function* () {
            if (repoPath === undefined)
                return [];
            logger_1.Logger.log(`getRemotesCore('${repoPath}')`);
            providerMap = providerMap || factory_1.RemoteProviderFactory.createMap(configuration_1.configuration.get(configuration_1.configuration.name('remotes').value, null));
            try {
                const data = yield git_1.Git.remote(repoPath);
                return git_1.GitRemoteParser.parse(data, repoPath, factory_1.RemoteProviderFactory.factory(providerMap));
            }
            catch (ex) {
                logger_1.Logger.error(ex, 'GitService.getRemotesCore');
                return [];
            }
        });
    }
    getRepoPath(filePathOrUri) {
        return __awaiter(this, void 0, void 0, function* () {
            if (filePathOrUri === undefined)
                return yield this.getActiveRepoPath();
            if (filePathOrUri instanceof gitUri_1.GitUri)
                return filePathOrUri.repoPath;
            const repo = yield this.getRepository(filePathOrUri);
            if (repo !== undefined)
                return repo.path;
            const rp = yield this.getRepoPathCore(typeof filePathOrUri === 'string' ? filePathOrUri : filePathOrUri.fsPath, false);
            if (rp === undefined)
                return undefined;
            if (this._repositoryTree.get(rp) !== undefined)
                return rp;
            const root = this._repositoryTree.findSubstr(rp);
            const folder = root === undefined
                ? vscode_1.workspace.getWorkspaceFolder(vscode_1.Uri.file(rp))
                : root.folder;
            if (folder !== undefined) {
                const repo = new git_1.Repository(folder, rp, false, this, this.onAnyRepositoryChanged.bind(this), this._suspended);
                this._repositoryTree.set(rp, repo);
                setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    yield constants_1.setCommandContext(constants_1.CommandContext.HasRepository, this._repositoryTree.any());
                    this.fireChange(GitChangeReason.Repositories);
                }), 0);
            }
            return rp;
        });
    }
    getRepoPathCore(filePath, isDirectory) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield git_1.Git.revparse_toplevel(isDirectory ? filePath : path.dirname(filePath));
            }
            catch (ex) {
                logger_1.Logger.error(ex, 'GitService.getRepoPathCore');
                return undefined;
            }
        });
    }
    getRepositories() {
        return __awaiter(this, void 0, void 0, function* () {
            const repositoryTree = yield this.getRepositoryTree();
            return repositoryTree.values();
        });
    }
    getRepositoryTree() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._repositoriesLoadingPromise !== undefined) {
                yield this._repositoriesLoadingPromise;
                this._repositoriesLoadingPromise = undefined;
            }
            return this._repositoryTree;
        });
    }
    getRepository(repoPathOrUri) {
        return __awaiter(this, void 0, void 0, function* () {
            const repositoryTree = yield this.getRepositoryTree();
            let path;
            if (typeof repoPathOrUri === 'string') {
                const repo = repositoryTree.get(repoPathOrUri);
                if (repo !== undefined)
                    return repo;
                path = repoPathOrUri;
            }
            else {
                if (repoPathOrUri instanceof gitUri_1.GitUri) {
                    if (repoPathOrUri.repoPath) {
                        const repo = repositoryTree.get(repoPathOrUri.repoPath);
                        if (repo !== undefined)
                            return repo;
                    }
                    path = repoPathOrUri.fsPath;
                }
                else {
                    path = repoPathOrUri.fsPath;
                }
            }
            const repo = repositoryTree.findSubstr(path);
            if (repo === undefined)
                return undefined;
            if (!(yield this.isTrackedCore(repo.path, path)))
                return undefined;
            return repo;
        });
    }
    getStashList(repoPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (repoPath === undefined)
                return undefined;
            logger_1.Logger.log(`getStashList('${repoPath}')`);
            const data = yield git_1.Git.stash_list(repoPath);
            const stash = git_1.GitStashParser.parse(data, repoPath);
            return stash;
        });
    }
    getStatusForFile(repoPath, fileName) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.Logger.log(`getStatusForFile('${repoPath}', '${fileName}')`);
            const porcelainVersion = git_1.Git.validateVersion(2, 11) ? 2 : 1;
            const data = yield git_1.Git.status_file(repoPath, fileName, porcelainVersion);
            const status = git_1.GitStatusParser.parse(data, repoPath, porcelainVersion);
            if (status === undefined || !status.files.length)
                return undefined;
            return status.files[0];
        });
    }
    getStatusForRepo(repoPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (repoPath === undefined)
                return undefined;
            logger_1.Logger.log(`getStatusForRepo('${repoPath}')`);
            const porcelainVersion = git_1.Git.validateVersion(2, 11) ? 2 : 1;
            const data = yield git_1.Git.status(repoPath, porcelainVersion);
            const status = git_1.GitStatusParser.parse(data, repoPath, porcelainVersion);
            return status;
        });
    }
    getVersionedFile(repoPath, fileName, sha) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.Logger.log(`getVersionedFile('${repoPath}', '${fileName}', '${sha}')`);
            if (!sha || (git_1.Git.isUncommitted(sha) && !git_1.Git.isStagedUncommitted(sha)))
                return fileName;
            const file = yield git_1.Git.getVersionedFile(repoPath, fileName, sha);
            if (file === undefined)
                return undefined;
            const cacheKey = this.getCacheEntryKey(file);
            const entry = new UriCacheEntry(new gitUri_1.GitUri(vscode_1.Uri.file(fileName), { sha: sha, repoPath: repoPath, fileName }));
            this._versionedUriCache.set(cacheKey, entry);
            return file;
        });
    }
    getVersionedFileText(repoPath, fileName, sha) {
        logger_1.Logger.log(`getVersionedFileText('${repoPath}', '${fileName}', ${sha})`);
        return git_1.Git.show(repoPath, fileName, sha, { encoding: GitService.getEncoding(repoPath, fileName) });
    }
    hasGitUriForFile(editor) {
        if (editor === undefined || editor.document === undefined || editor.document.uri === undefined)
            return false;
        const cacheKey = this.getCacheEntryKey(editor.document.uri);
        return this._versionedUriCache.has(cacheKey);
    }
    isEditorBlameable(editor) {
        return (editor.viewColumn !== undefined || this.isTrackable(editor.document.uri) || this.hasGitUriForFile(editor));
    }
    isTrackable(schemeOruri) {
        let scheme;
        if (typeof schemeOruri === 'string') {
            scheme = schemeOruri;
        }
        else {
            scheme = schemeOruri.scheme;
        }
        return scheme === constants_1.DocumentSchemes.File || scheme === constants_1.DocumentSchemes.Git || scheme === constants_1.DocumentSchemes.GitLensGit;
    }
    isTracked(fileNameOrUri, repoPath) {
        return __awaiter(this, void 0, void 0, function* () {
            let cacheKey;
            let fileName;
            let sha;
            if (typeof fileNameOrUri === 'string') {
                [fileName, repoPath] = git_1.Git.splitPath(fileNameOrUri, repoPath);
                cacheKey = this.getCacheEntryKey(fileNameOrUri);
            }
            else {
                if (!this.isTrackable(fileNameOrUri))
                    return false;
                fileName = fileNameOrUri.fsPath;
                repoPath = fileNameOrUri.repoPath;
                sha = fileNameOrUri.sha;
                cacheKey = this.getCacheEntryKey(fileName);
            }
            logger_1.Logger.log(`isTracked('${fileName}', '${repoPath}', '${sha}')`);
            let tracked = this._trackedCache.get(cacheKey);
            if (tracked !== undefined) {
                if (typeof tracked === 'boolean')
                    return tracked;
                return yield tracked;
            }
            tracked = this.isTrackedCore(repoPath === undefined ? '' : repoPath, fileName, sha);
            this._trackedCache.set(cacheKey, tracked);
            tracked = yield tracked;
            this._trackedCache.set(cacheKey, tracked);
            return tracked;
        });
    }
    isTrackedCore(repoPath, fileName, sha) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let tracked = !!(yield git_1.Git.ls_files(repoPath === undefined ? '' : repoPath, fileName));
                if (!tracked && sha !== undefined) {
                    tracked = !!(yield git_1.Git.ls_files(repoPath === undefined ? '' : repoPath, fileName, sha));
                }
                return tracked;
            }
            catch (ex) {
                logger_1.Logger.error(ex, 'GitService.isTrackedCore');
                return false;
            }
        });
    }
    getDiffTool(repoPath) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield git_1.Git.config_get('diff.guitool', repoPath)) || (yield git_1.Git.config_get('diff.tool', repoPath));
        });
    }
    openDiffTool(repoPath, uri, staged, tool) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!tool) {
                tool = yield this.getDiffTool(repoPath);
                if (tool === undefined)
                    throw new Error('No diff tool found');
            }
            logger_1.Logger.log(`openDiffTool('${repoPath}', '${uri.fsPath}', ${staged}, '${tool}')`);
            return git_1.Git.difftool_fileDiff(repoPath, uri.fsPath, tool, staged);
        });
    }
    openDirectoryDiff(repoPath, sha1, sha2, tool) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!tool) {
                tool = yield this.getDiffTool(repoPath);
                if (tool === undefined)
                    throw new Error('No diff tool found');
            }
            logger_1.Logger.log(`openDirectoryDiff('${repoPath}', '${sha1}', '${sha2}', '${tool}')`);
            return git_1.Git.difftool_dirDiff(repoPath, tool, sha1, sha2);
        });
    }
    stopWatchingFileSystem() {
        this._repositoryTree.forEach(r => r.stopWatchingFileSystem());
    }
    stashApply(repoPath, stashName, deleteAfter = false) {
        logger_1.Logger.log(`stashApply('${repoPath}', '${stashName}', ${deleteAfter})`);
        return git_1.Git.stash_apply(repoPath, stashName, deleteAfter);
    }
    stashDelete(repoPath, stashName) {
        logger_1.Logger.log(`stashDelete('${repoPath}', '${stashName}')`);
        return git_1.Git.stash_delete(repoPath, stashName);
    }
    stashSave(repoPath, message, uris) {
        logger_1.Logger.log(`stashSave('${repoPath}', '${message}', ${uris})`);
        if (uris === undefined)
            return git_1.Git.stash_save(repoPath, message);
        const pathspecs = uris.map(u => git_1.Git.splitPath(u.fsPath, repoPath)[0]);
        return git_1.Git.stash_push(repoPath, pathspecs, message);
    }
    static getEncoding(repoPathOrUri, fileName) {
        const uri = (typeof repoPathOrUri === 'string')
            ? vscode_1.Uri.file(path.join(repoPathOrUri, fileName))
            : repoPathOrUri;
        return git_1.Git.getEncoding(vscode_1.workspace.getConfiguration('files', uri).get('encoding'));
    }
    static initialize(gitPath) {
        return git_1.Git.getGitInfo(gitPath);
    }
    static getGitPath() {
        return git_1.Git.gitInfo().path;
    }
    static getGitVersion() {
        return git_1.Git.gitInfo().version;
    }
    static fromGitContentUri(uri) {
        if (uri.scheme !== constants_1.DocumentSchemes.GitLensGit)
            throw new Error(`fromGitUri(uri=${uri}) invalid scheme`);
        return GitService.fromGitContentUriCore(uri);
    }
    static fromGitContentUriCore(uri) {
        return JSON.parse(uri.query);
    }
    static isSha(sha) {
        return git_1.Git.isSha(sha);
    }
    static isStagedUncommitted(sha) {
        return git_1.Git.isStagedUncommitted(sha);
    }
    static isUncommitted(sha) {
        return git_1.Git.isUncommitted(sha);
    }
    static normalizePath(fileName) {
        return git_1.Git.normalizePath(fileName);
    }
    static shortenSha(sha) {
        if (sha === undefined)
            return undefined;
        return git_1.Git.shortenSha(sha);
    }
    static toGitContentUri(shaOrcommitOrUri, fileName, repoPath, originalFileName) {
        let data;
        let shortSha;
        if (typeof shaOrcommitOrUri === 'string') {
            data = GitService.toGitUriData({
                sha: shaOrcommitOrUri,
                fileName: fileName,
                repoPath: repoPath,
                originalFileName: originalFileName
            });
            shortSha = GitService.shortenSha(shaOrcommitOrUri);
        }
        else if (shaOrcommitOrUri instanceof git_1.GitCommit) {
            data = GitService.toGitUriData(shaOrcommitOrUri, shaOrcommitOrUri.originalFileName);
            fileName = shaOrcommitOrUri.fileName;
            shortSha = shaOrcommitOrUri.shortSha;
        }
        else {
            data = GitService.toGitUriData({
                sha: shaOrcommitOrUri.sha,
                fileName: shaOrcommitOrUri.fsPath,
                repoPath: shaOrcommitOrUri.repoPath
            });
            fileName = shaOrcommitOrUri.fsPath;
            shortSha = shaOrcommitOrUri.shortSha;
        }
        const parsed = path.parse(fileName);
        return vscode_1.Uri.parse(`${constants_1.DocumentSchemes.GitLensGit}:${path.join(parsed.dir, parsed.name)}:${shortSha}${parsed.ext}?${JSON.stringify(data)}`);
    }
    static toGitUriData(commit, originalFileName) {
        const fileName = git_1.Git.normalizePath(path.relative(commit.repoPath, commit.fileName));
        const data = { repoPath: commit.repoPath, fileName: fileName, sha: commit.sha };
        if (originalFileName) {
            data.originalFileName = git_1.Git.normalizePath(path.relative(commit.repoPath, originalFileName));
        }
        return data;
    }
    static validateGitVersion(major, minor) {
        const [gitMajor, gitMinor] = this.getGitVersion().split('.');
        return (parseInt(gitMajor, 10) >= major && parseInt(gitMinor, 10) >= minor);
    }
}
GitService.emptyPromise = Promise.resolve(undefined);
GitService.deletedSha = 'ffffffffffffffffffffffffffffffffffffffff';
GitService.stagedUncommittedSha = git_1.Git.stagedUncommittedSha;
GitService.uncommittedSha = git_1.Git.uncommittedSha;
exports.GitService = GitService;
//# sourceMappingURL=gitService.js.map