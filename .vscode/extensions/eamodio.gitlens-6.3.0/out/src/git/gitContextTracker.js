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
const comparers_1 = require("../comparers");
const configuration_1 = require("../configuration");
const constants_1 = require("../constants");
const gitService_1 = require("../gitService");
const logger_1 = require("../logger");
var BlameabilityChangeReason;
(function (BlameabilityChangeReason) {
    BlameabilityChangeReason["BlameFailed"] = "blame-failed";
    BlameabilityChangeReason["DocumentChanged"] = "document-changed";
    BlameabilityChangeReason["EditorChanged"] = "editor-changed";
    BlameabilityChangeReason["RepoChanged"] = "repo-changed";
})(BlameabilityChangeReason = exports.BlameabilityChangeReason || (exports.BlameabilityChangeReason = {}));
class GitContextTracker extends vscode_1.Disposable {
    constructor(git) {
        super(() => this.dispose());
        this.git = git;
        this._onDidChangeBlameability = new vscode_1.EventEmitter();
        this._context = { state: { dirty: false } };
        this._onDirtyStateChangedDebounced = system_1.Functions.debounce(this.onDirtyStateChanged, 250);
        this._disposable = vscode_1.Disposable.from(vscode_1.workspace.onDidChangeConfiguration(this.onConfigurationChanged, this));
        this.onConfigurationChanged(configuration_1.configuration.initializingChangeEvent);
    }
    get onDidChangeBlameability() {
        return this._onDidChangeBlameability.event;
    }
    dispose() {
        this._listenersDisposable && this._listenersDisposable.dispose();
        this._disposable && this._disposable.dispose();
    }
    onConfigurationChanged(e) {
        if (!configuration_1.configuration.initializing(e) && !e.affectsConfiguration('git.enabled', null))
            return;
        const enabled = vscode_1.workspace.getConfiguration('git', null).get('enabled', true);
        if (this._listenersDisposable !== undefined) {
            this._listenersDisposable.dispose();
            this._listenersDisposable = undefined;
        }
        constants_1.setCommandContext(constants_1.CommandContext.Enabled, enabled);
        if (enabled) {
            this._listenersDisposable = vscode_1.Disposable.from(vscode_1.window.onDidChangeActiveTextEditor(system_1.Functions.debounce(this.onActiveTextEditorChanged, 50), this), vscode_1.workspace.onDidChangeTextDocument(this.onTextDocumentChanged, this), this.git.onDidBlameFail(this.onBlameFailed, this), this.git.onDidChange(this.onGitChanged, this));
            this.updateContext(BlameabilityChangeReason.EditorChanged, vscode_1.window.activeTextEditor, true);
        }
        else {
            this.updateContext(BlameabilityChangeReason.EditorChanged, vscode_1.window.activeTextEditor, false);
        }
    }
    onActiveTextEditorChanged(editor) {
        if (editor === this._context.editor)
            return;
        if (editor !== undefined && !constants_1.isTextEditor(editor))
            return;
        this.updateContext(BlameabilityChangeReason.EditorChanged, editor, true);
    }
    onBlameFailed(key) {
        if (this._context.editor === undefined || key !== this.git.getCacheEntryKey(this._context.editor.document.uri))
            return;
        this.updateBlameability(BlameabilityChangeReason.BlameFailed, false);
    }
    onDirtyStateChanged(dirty) {
        this._context.state.dirty = dirty;
        this.updateBlameability(BlameabilityChangeReason.DocumentChanged);
    }
    onGitChanged(e) {
        if (e.reason !== gitService_1.GitChangeReason.Repositories)
            return;
        this.updateRemotes();
    }
    onRepoChanged(e) {
        this.updateContext(BlameabilityChangeReason.RepoChanged, this._context.editor);
        this.updateRemotes();
    }
    onTextDocumentChanged(e) {
        if (this._context.editor === undefined || !comparers_1.TextDocumentComparer.equals(this._context.editor.document, e.document))
            return;
        const dirty = e.document.isDirty;
        if (dirty === this._context.state.dirty) {
            this._onDirtyStateChangedDebounced.cancel();
            return;
        }
        if (dirty) {
            this._onDirtyStateChangedDebounced.cancel();
            this.onDirtyStateChanged(dirty);
            return;
        }
        this._onDirtyStateChangedDebounced(dirty);
    }
    updateContext(reason, editor, force = false) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let tracked;
                if (force || this._context.editor !== editor) {
                    this._context.editor = editor;
                    this._context.repo = undefined;
                    if (this._context.repoDisposable !== undefined) {
                        this._context.repoDisposable.dispose();
                        this._context.repoDisposable = undefined;
                    }
                    if (editor !== undefined) {
                        this._context.uri = yield gitService_1.GitUri.fromUri(editor.document.uri, this.git);
                        const repo = yield this.git.getRepository(this._context.uri);
                        if (repo !== undefined) {
                            this._context.repo = repo;
                            this._context.repoDisposable = repo.onDidChange(this.onRepoChanged, this);
                        }
                        this._context.state.dirty = editor.document.isDirty;
                        tracked = yield this.git.isTracked(this._context.uri);
                    }
                    else {
                        this._context.uri = undefined;
                        this._context.state.dirty = false;
                        this._context.state.blameable = false;
                        tracked = false;
                    }
                }
                else {
                    tracked = this._context.uri !== undefined
                        ? yield this.git.isTracked(this._context.uri)
                        : false;
                }
                if (this._context.state.tracked !== tracked) {
                    this._context.state.tracked = tracked;
                    constants_1.setCommandContext(constants_1.CommandContext.ActiveFileIsTracked, tracked);
                }
                this.updateBlameability(reason, undefined, force);
                this.updateRemotes();
            }
            catch (ex) {
                logger_1.Logger.error(ex, 'GitContextTracker.updateContext');
            }
        });
    }
    updateBlameability(reason, blameable, force = false) {
        try {
            if (blameable === undefined) {
                blameable = this._context.state.tracked && !this._context.state.dirty;
            }
            if (!force && this._context.state.blameable === blameable)
                return;
            this._context.state.blameable = blameable;
            constants_1.setCommandContext(constants_1.CommandContext.ActiveIsBlameable, blameable);
            this._onDidChangeBlameability.fire({
                blameable: blameable,
                editor: this._context && this._context.editor,
                reason: reason
            });
        }
        catch (ex) {
            logger_1.Logger.error(ex, 'GitContextTracker.updateBlameability');
        }
    }
    updateRemotes() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let hasRemotes = false;
                if (this._context.repo !== undefined) {
                    hasRemotes = yield this._context.repo.hasRemote();
                }
                constants_1.setCommandContext(constants_1.CommandContext.ActiveHasRemote, hasRemotes);
                if (!hasRemotes) {
                    const repositories = yield this.git.getRepositories();
                    for (const repo of repositories) {
                        if (repo === this._context.repo)
                            continue;
                        hasRemotes = yield repo.hasRemotes();
                        if (hasRemotes)
                            break;
                    }
                }
                constants_1.setCommandContext(constants_1.CommandContext.HasRemotes, hasRemotes);
            }
            catch (ex) {
                logger_1.Logger.error(ex, 'GitContextTracker.updateRemotes');
            }
        });
    }
}
exports.GitContextTracker = GitContextTracker;
//# sourceMappingURL=gitContextTracker.js.map