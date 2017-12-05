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
const system_1 = require("../../system");
const vscode_1 = require("vscode");
const configuration_1 = require("../../configuration");
const gitService_1 = require("../../gitService");
const factory_1 = require("../remotes/factory");
const _path = require("path");
var RepositoryChange;
(function (RepositoryChange) {
    RepositoryChange["Config"] = "config";
    RepositoryChange["Remotes"] = "remotes";
    RepositoryChange["Repository"] = "repository";
    RepositoryChange["Stashes"] = "stashes";
})(RepositoryChange = exports.RepositoryChange || (exports.RepositoryChange = {}));
class RepositoryChangeEvent {
    constructor(repository) {
        this.repository = repository;
        this.changes = [];
    }
    changed(change, solely = false) {
        if (solely)
            return this.changes.length === 1 && this.changes[0] === change;
        return this.changes.includes(change);
    }
}
exports.RepositoryChangeEvent = RepositoryChangeEvent;
var RepositoryStorage;
(function (RepositoryStorage) {
    RepositoryStorage["StatusNode"] = "statusNode";
})(RepositoryStorage = exports.RepositoryStorage || (exports.RepositoryStorage = {}));
class Repository extends vscode_1.Disposable {
    constructor(folder, path, root, git, onAnyRepositoryChanged, suspended) {
        super(() => this.dispose());
        this.folder = folder;
        this.path = path;
        this.root = root;
        this.git = git;
        this.onAnyRepositoryChanged = onAnyRepositoryChanged;
        this._onDidChange = new vscode_1.EventEmitter();
        this._onDidChangeFileSystem = new vscode_1.EventEmitter();
        this._fireChangeDebounced = undefined;
        this._fireFileSystemChangeDebounced = undefined;
        this._fsWatchCounter = 0;
        this._pendingChanges = {};
        this.formattedName = root
            ? folder.name
            : `${folder.name} (${_path.relative(folder.uri.fsPath, path)})`;
        this.index = folder.index;
        this.name = folder.name;
        this.normalizedPath = (this.path.endsWith('/') ? this.path : `${this.path}/`).toLowerCase();
        this._suspended = suspended;
        const watcher = vscode_1.workspace.createFileSystemWatcher(new vscode_1.RelativePattern(folder, '**/.git/{config,index,HEAD,refs/stash,refs/heads/**,refs/remotes/**}'));
        this._disposable = vscode_1.Disposable.from(watcher, watcher.onDidChange(this.onRepositoryChanged, this), watcher.onDidCreate(this.onRepositoryChanged, this), watcher.onDidDelete(this.onRepositoryChanged, this), configuration_1.configuration.onDidChange(this.onConfigurationChanged, this));
        this.onConfigurationChanged(configuration_1.configuration.initializingChangeEvent);
    }
    get onDidChange() {
        return this._onDidChange.event;
    }
    get onDidChangeFileSystem() {
        return this._onDidChangeFileSystem.event;
    }
    dispose() {
        this.stopWatchingFileSystem();
        this._disposable && this._disposable.dispose();
    }
    onConfigurationChanged(e) {
        const initializing = configuration_1.configuration.initializing(e);
        const section = configuration_1.configuration.name('remotes').value;
        if (initializing || configuration_1.configuration.changed(e, section, this.folder.uri)) {
            this._providerMap = undefined;
            if (!initializing) {
                this._remotes = undefined;
                this.fireChange(RepositoryChange.Remotes);
            }
        }
    }
    onFileSystemChanged(uri) {
        if (/\.git/.test(uri.fsPath))
            return;
        this.fireFileSystemChange(uri);
    }
    onRepositoryChanged(uri) {
        if (uri !== undefined && uri.path.endsWith('refs/stash')) {
            this.fireChange(RepositoryChange.Stashes);
            return;
        }
        this._branch = undefined;
        if (uri !== undefined && uri.path.endsWith('refs/remotes')) {
            this._remotes = undefined;
            this.fireChange(RepositoryChange.Remotes);
            return;
        }
        if (uri !== undefined && uri.path.endsWith('config')) {
            this._remotes = undefined;
            this.fireChange(RepositoryChange.Config, RepositoryChange.Remotes);
            return;
        }
        this.onAnyRepositoryChanged();
        this.fireChange(RepositoryChange.Repository);
    }
    fireChange(...reasons) {
        if (this._fireChangeDebounced === undefined) {
            this._fireChangeDebounced = system_1.Functions.debounce(this.fireChangeCore, 250);
        }
        if (this._pendingChanges.repo === undefined) {
            this._pendingChanges.repo = new RepositoryChangeEvent(this);
        }
        const e = this._pendingChanges.repo;
        for (const reason of reasons) {
            if (!e.changes.includes(reason)) {
                e.changes.push(reason);
            }
        }
        if (this._suspended)
            return;
        this._fireChangeDebounced(e);
    }
    fireChangeCore(e) {
        this._pendingChanges.repo = undefined;
        this._onDidChange.fire(e);
    }
    fireFileSystemChange(uri) {
        if (this._fireFileSystemChangeDebounced === undefined) {
            this._fireFileSystemChangeDebounced = system_1.Functions.debounce(this.fireFileSystemChangeCore, 2500);
        }
        if (this._pendingChanges.fs === undefined) {
            this._pendingChanges.fs = { repository: this, uris: [] };
        }
        const e = this._pendingChanges.fs;
        e.uris.push(uri);
        if (this._suspended)
            return;
        this._fireFileSystemChangeDebounced(e);
    }
    fireFileSystemChangeCore(e) {
        this._pendingChanges.fs = undefined;
        this._onDidChangeFileSystem.fire(e);
    }
    containsUri(uri) {
        if (uri instanceof gitService_1.GitUri) {
            uri = uri.repoPath !== undefined
                ? vscode_1.Uri.file(uri.repoPath)
                : uri.fileUri();
        }
        return this.folder === vscode_1.workspace.getWorkspaceFolder(uri);
    }
    getBranch() {
        if (this._branch === undefined) {
            this._branch = this.git.getBranch(this.path);
        }
        return this._branch;
    }
    getBranches() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.git.getBranches(this.path);
        });
    }
    getChangedFilesCount(sha) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.git.getChangedFilesCount(this.path, sha);
        });
    }
    getRemotes() {
        if (this._remotes === undefined) {
            if (this._providerMap === undefined) {
                const remotesCfg = configuration_1.configuration.get(configuration_1.configuration.name('remotes').value, this.folder.uri);
                this._providerMap = factory_1.RemoteProviderFactory.createMap(remotesCfg);
            }
            this._remotes = this.git.getRemotesCore(this.path, this._providerMap);
        }
        return this._remotes;
    }
    getStashList() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.git.getStashList(this.path);
        });
    }
    getStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.git.getStatusForRepo(this.path);
        });
    }
    hasRemote() {
        return __awaiter(this, void 0, void 0, function* () {
            const branch = yield this.getBranch();
            return branch !== undefined && branch.tracking !== undefined;
        });
    }
    hasRemotes() {
        return __awaiter(this, void 0, void 0, function* () {
            const remotes = yield this.getRemotes();
            return remotes !== undefined && remotes.length > 0;
        });
    }
    resume() {
        if (!this._suspended)
            return;
        this._suspended = false;
        if (this._pendingChanges.repo !== undefined) {
            this._fireChangeDebounced(this._pendingChanges.repo);
        }
        if (this._pendingChanges.fs !== undefined) {
            this._fireFileSystemChangeDebounced(this._pendingChanges.fs);
        }
    }
    startWatchingFileSystem() {
        this._fsWatchCounter++;
        if (this._fsWatcherDisposable !== undefined)
            return;
        const watcher = vscode_1.workspace.createFileSystemWatcher(new vscode_1.RelativePattern(this.folder, `**`));
        this._fsWatcherDisposable = vscode_1.Disposable.from(watcher, watcher.onDidChange(this.onFileSystemChanged, this), watcher.onDidCreate(this.onFileSystemChanged, this), watcher.onDidDelete(this.onFileSystemChanged, this));
    }
    stopWatchingFileSystem() {
        if (this._fsWatcherDisposable === undefined)
            return;
        if (--this._fsWatchCounter > 0)
            return;
        this._fsWatcherDisposable.dispose();
        this._fsWatcherDisposable = undefined;
    }
    suspend() {
        this._suspended = true;
    }
}
exports.Repository = Repository;
//# sourceMappingURL=repository.js.map