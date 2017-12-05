'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
const system_1 = require("../system");
const vscode_1 = require("vscode");
const comparers_1 = require("../comparers");
const configuration_1 = require("../configuration");
const constants_1 = require("../constants");
const explorerCommands_1 = require("./explorerCommands");
const explorerNodes_1 = require("./explorerNodes");
const gitService_1 = require("../gitService");
const logger_1 = require("../logger");
__export(require("./explorerNodes"));
var RefreshReason;
(function (RefreshReason) {
    RefreshReason["ActiveEditorChanged"] = "active-editor-changed";
    RefreshReason["AutoRefreshChanged"] = "auto-refresh-changed";
    RefreshReason["Command"] = "command";
    RefreshReason["NodeCommand"] = "node-command";
    RefreshReason["RepoChanged"] = "repo-changed";
    RefreshReason["ViewChanged"] = "view-changed";
    RefreshReason["VisibleEditorsChanged"] = "visible-editors-changed";
})(RefreshReason || (RefreshReason = {}));
var GitExplorerView;
(function (GitExplorerView) {
    GitExplorerView["Auto"] = "auto";
    GitExplorerView["History"] = "history";
    GitExplorerView["Repository"] = "repository";
})(GitExplorerView = exports.GitExplorerView || (exports.GitExplorerView = {}));
class GitExplorer {
    constructor(context, git, gitContextTracker) {
        this.context = context;
        this.git = git;
        this.gitContextTracker = gitContextTracker;
        this._onDidChangeAutoRefresh = new vscode_1.EventEmitter();
        this._onDidChangeTreeData = new vscode_1.EventEmitter();
        context.subscriptions.push(new explorerCommands_1.ExplorerCommands(this), vscode_1.window.onDidChangeActiveTextEditor(system_1.Functions.debounce(this.onActiveEditorChanged, 500), this), vscode_1.window.onDidChangeVisibleTextEditors(system_1.Functions.debounce(this.onVisibleEditorsChanged, 500), this), configuration_1.configuration.onDidChange(this.onConfigurationChanged, this));
        this.onConfigurationChanged(configuration_1.configuration.initializingChangeEvent);
    }
    get onDidChangeAutoRefresh() {
        return this._onDidChangeAutoRefresh.event;
    }
    get onDidChangeTreeData() {
        return this._onDidChangeTreeData.event;
    }
    onActiveEditorChanged(editor) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._view !== GitExplorerView.History)
                return;
            const root = yield this.getRootNode(editor);
            if (!this.setRoot(root))
                return;
            this.refresh(RefreshReason.ActiveEditorChanged, root);
        });
    }
    onConfigurationChanged(e) {
        return __awaiter(this, void 0, void 0, function* () {
            const initializing = configuration_1.configuration.initializing(e);
            const section = configuration_1.configuration.name('gitExplorer');
            if (!initializing && !configuration_1.configuration.changed(e, section.value))
                return;
            const cfg = configuration_1.configuration.get(section.value);
            if (initializing || configuration_1.configuration.changed(e, section('autoRefresh').value)) {
                this.setAutoRefresh(cfg.autoRefresh);
            }
            if (initializing || configuration_1.configuration.changed(e, section('files')('layout').value)) {
                constants_1.setCommandContext(constants_1.CommandContext.GitExplorerFilesLayout, cfg.files.layout);
            }
            let view = cfg.view;
            if (view === GitExplorerView.Auto) {
                view = this.context.workspaceState.get(constants_1.WorkspaceState.GitExplorerView, GitExplorerView.Repository);
            }
            if (initializing) {
                this._view = view;
                constants_1.setCommandContext(constants_1.CommandContext.GitExplorerView, this._view);
                this.setRoot(yield this.getRootNode(vscode_1.window.activeTextEditor));
            }
            else {
                this.reset(view);
            }
            this._config = cfg;
        });
    }
    onGitChanged(e) {
        if (this._view !== GitExplorerView.Repository || e.reason !== gitService_1.GitChangeReason.Repositories)
            return;
        this.clearRoot();
        logger_1.Logger.log(`GitExplorer[view=${this._view}].onGitChanged(${e.reason})`);
        this.refresh(RefreshReason.RepoChanged);
    }
    onVisibleEditorsChanged(editors) {
        if (this._root === undefined || this._view !== GitExplorerView.History)
            return;
        if (editors.length === 0 || !editors.some(e => e.document && this.git.isTrackable(e.document.uri))) {
            this.clearRoot();
            this.refresh(RefreshReason.VisibleEditorsChanged);
        }
    }
    get autoRefresh() {
        return configuration_1.configuration.get(configuration_1.configuration.name('gitExplorer')('autoRefresh').value) &&
            this.context.workspaceState.get(constants_1.WorkspaceState.GitExplorerAutoRefresh, true);
    }
    get config() {
        return this._config;
    }
    getChildren(node) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._loading !== undefined) {
                yield this._loading;
                this._loading = undefined;
            }
            if (this._root === undefined) {
                if (this._view === GitExplorerView.History)
                    return [new explorerNodes_1.MessageNode(`No active file ${constants_1.GlyphChars.Dash} no history to show`)];
                return [new explorerNodes_1.MessageNode('No repositories found')];
            }
            if (node === undefined)
                return this._root.getChildren();
            return node.getChildren();
        });
    }
    getTreeItem(node) {
        return __awaiter(this, void 0, void 0, function* () {
            return node.getTreeItem();
        });
    }
    getRootNode(editor) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (this._view) {
                case GitExplorerView.History: {
                    const promise = this.getHistoryNode(editor || vscode_1.window.activeTextEditor);
                    this._loading = promise.then(_ => system_1.Functions.wait(0));
                    return promise;
                }
                default: {
                    const promise = this.git.getRepositories();
                    this._loading = promise.then(_ => system_1.Functions.wait(0));
                    const repositories = [...yield promise];
                    if (repositories.length === 0)
                        return undefined;
                    if (repositories.length === 1) {
                        const repo = repositories[0];
                        return new explorerNodes_1.RepositoryNode(new gitService_1.GitUri(vscode_1.Uri.file(repo.path), { repoPath: repo.path, fileName: repo.path }), repo, this);
                    }
                    return new explorerNodes_1.RepositoriesNode(repositories, this);
                }
            }
        });
    }
    getHistoryNode(editor) {
        return __awaiter(this, void 0, void 0, function* () {
            if (editor === undefined || vscode_1.window.visibleTextEditors.length === 0 || !vscode_1.window.visibleTextEditors.some(e => e.document && this.git.isTrackable(e.document.uri)))
                return undefined;
            if (editor.document === undefined || !this.git.isTrackable(editor.document.uri))
                return this._root;
            const uri = yield gitService_1.GitUri.fromUri(editor.document.uri, this.git);
            const repo = yield this.git.getRepository(uri);
            if (repo === undefined)
                return undefined;
            if (comparers_1.UriComparer.equals(uri, this._root && this._root.uri))
                return this._root;
            return new explorerNodes_1.HistoryNode(uri, repo, this);
        });
    }
    refresh(reason, root) {
        return __awaiter(this, void 0, void 0, function* () {
            if (reason === undefined) {
                reason = RefreshReason.Command;
            }
            logger_1.Logger.log(`GitExplorer[view=${this._view}].refresh`, `reason='${reason}'`);
            if (this._root === undefined || (root === undefined && this._view === GitExplorerView.History)) {
                this.clearRoot();
                this.setRoot(yield this.getRootNode(vscode_1.window.activeTextEditor));
            }
            this._onDidChangeTreeData.fire();
        });
    }
    refreshNode(node, args) {
        logger_1.Logger.log(`GitExplorer[view=${this._view}].refreshNode`);
        if (node === this._root) {
            this._onDidChangeTreeData.fire();
            return;
        }
        if (args !== undefined && node instanceof explorerNodes_1.BranchHistoryNode) {
            node.maxCount = args.maxCount;
        }
        this._onDidChangeTreeData.fire(node);
    }
    reset(view, force = false) {
        return __awaiter(this, void 0, void 0, function* () {
            this.setView(view);
            if (force && this._root !== undefined) {
                this.clearRoot();
            }
            const requiresRefresh = this.setRoot(yield this.getRootNode(vscode_1.window.activeTextEditor));
            if (requiresRefresh || force) {
                this.refresh(RefreshReason.ViewChanged);
            }
        });
    }
    clearRoot() {
        if (this._root === undefined)
            return;
        this._root.dispose();
        this._root = undefined;
    }
    setRoot(root) {
        if (this._root === root)
            return false;
        if (this._root !== undefined) {
            this._root.dispose();
        }
        this._root = root;
        return true;
    }
    setView(view) {
        if (this._view === view)
            return;
        if (configuration_1.configuration.get(configuration_1.configuration.name('gitExplorer')('view').value) === GitExplorerView.Auto) {
            this.context.workspaceState.update(constants_1.WorkspaceState.GitExplorerView, view);
        }
        this._view = view;
        constants_1.setCommandContext(constants_1.CommandContext.GitExplorerView, this._view);
        if (view !== GitExplorerView.Repository) {
            this.git.stopWatchingFileSystem();
        }
    }
    switchTo(view) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._view === view)
                return;
            this.reset(view, true);
        });
    }
    setAutoRefresh(enabled, workspaceEnabled) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._autoRefreshDisposable !== undefined) {
                this._autoRefreshDisposable.dispose();
                this._autoRefreshDisposable = undefined;
            }
            let toggled = false;
            if (enabled) {
                if (workspaceEnabled === undefined) {
                    workspaceEnabled = this.context.workspaceState.get(constants_1.WorkspaceState.GitExplorerAutoRefresh, true);
                }
                else {
                    toggled = workspaceEnabled;
                    yield this.context.workspaceState.update(constants_1.WorkspaceState.GitExplorerAutoRefresh, workspaceEnabled);
                    this._onDidChangeAutoRefresh.fire();
                }
                if (workspaceEnabled) {
                    this._autoRefreshDisposable = this.git.onDidChange(this.onGitChanged, this);
                    this.context.subscriptions.push(this._autoRefreshDisposable);
                }
            }
            constants_1.setCommandContext(constants_1.CommandContext.GitExplorerAutoRefresh, enabled && workspaceEnabled);
            if (toggled) {
                this.refresh(RefreshReason.AutoRefreshChanged);
            }
        });
    }
}
exports.GitExplorer = GitExplorer;
//# sourceMappingURL=gitExplorer.js.map