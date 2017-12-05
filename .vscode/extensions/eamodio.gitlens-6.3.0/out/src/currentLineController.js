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
const system_1 = require("./system");
const vscode_1 = require("vscode");
const annotationController_1 = require("./annotations/annotationController");
const annotations_1 = require("./annotations/annotations");
const commands_1 = require("./commands");
const comparers_1 = require("./comparers");
const configuration_1 = require("./configuration");
const constants_1 = require("./constants");
const gitService_1 = require("./gitService");
const annotationDecoration = vscode_1.window.createTextEditorDecorationType({
    after: {
        margin: '0 0 0 3em',
        textDecoration: 'none'
    },
    rangeBehavior: vscode_1.DecorationRangeBehavior.ClosedClosed
});
var LineAnnotationType;
(function (LineAnnotationType) {
    LineAnnotationType["Trailing"] = "trailing";
    LineAnnotationType["Hover"] = "hover";
})(LineAnnotationType = exports.LineAnnotationType || (exports.LineAnnotationType = {}));
class CurrentLineController extends vscode_1.Disposable {
    constructor(context, git, gitContextTracker, annotationController) {
        super(() => this.dispose());
        this.git = git;
        this.gitContextTracker = gitContextTracker;
        this.annotationController = annotationController;
        this._currentLine = { line: -1 };
        this._isAnnotating = false;
        this._updateBlameDebounced = system_1.Functions.debounce(this.updateBlame, 250);
        this._disposable = vscode_1.Disposable.from(configuration_1.configuration.onDidChange(this.onConfigurationChanged, this), annotationController.onDidToggleAnnotations(this.onFileAnnotationsToggled, this), vscode_1.debug.onDidStartDebugSession(this.onDebugSessionStarted, this));
        this.onConfigurationChanged(configuration_1.configuration.initializingChangeEvent);
    }
    dispose() {
        this.clearAnnotations(this._editor, true);
        this.unregisterHoverProviders();
        this._trackCurrentLineDisposable && this._trackCurrentLineDisposable.dispose();
        this._statusBarItem && this._statusBarItem.dispose();
        this._debugSessionEndDisposable && this._debugSessionEndDisposable.dispose();
        this._disposable && this._disposable.dispose();
    }
    onConfigurationChanged(e) {
        const initializing = configuration_1.configuration.initializing(e);
        const cfg = configuration_1.configuration.get();
        let changed = false;
        if (initializing || configuration_1.configuration.changed(e, configuration_1.configuration.name('blame')('line').value)) {
            changed = true;
            this._blameLineAnnotationState = undefined;
        }
        if (initializing ||
            configuration_1.configuration.changed(e, configuration_1.configuration.name('annotations')('line')('trailing').value) ||
            configuration_1.configuration.changed(e, configuration_1.configuration.name('annotations')('line')('hover').value)) {
            changed = true;
        }
        if (initializing || configuration_1.configuration.changed(e, configuration_1.configuration.name('statusBar').value)) {
            changed = true;
            if (cfg.statusBar.enabled) {
                const alignment = cfg.statusBar.alignment !== 'left' ? vscode_1.StatusBarAlignment.Right : vscode_1.StatusBarAlignment.Left;
                if (this._statusBarItem !== undefined && this._statusBarItem.alignment !== alignment) {
                    this._statusBarItem.dispose();
                    this._statusBarItem = undefined;
                }
                this._statusBarItem = this._statusBarItem || vscode_1.window.createStatusBarItem(alignment, alignment === vscode_1.StatusBarAlignment.Right ? 1000 : 0);
                this._statusBarItem.command = cfg.statusBar.command;
            }
            else if (this._statusBarItem !== undefined) {
                this._statusBarItem.dispose();
                this._statusBarItem = undefined;
            }
        }
        this._config = cfg;
        if (!changed)
            return;
        const trackCurrentLine = cfg.statusBar.enabled ||
            cfg.blame.line.enabled ||
            (this._blameLineAnnotationState !== undefined && this._blameLineAnnotationState.enabled);
        if (trackCurrentLine) {
            this._trackCurrentLineDisposable = this._trackCurrentLineDisposable || vscode_1.Disposable.from(vscode_1.window.onDidChangeActiveTextEditor(system_1.Functions.debounce(this.onActiveTextEditorChanged, 50), this), vscode_1.window.onDidChangeTextEditorSelection(this.onTextEditorSelectionChanged, this), this.gitContextTracker.onDidChangeBlameability(this.onBlameabilityChanged, this));
        }
        else if (this._trackCurrentLineDisposable !== undefined) {
            this._trackCurrentLineDisposable.dispose();
            this._trackCurrentLineDisposable = undefined;
        }
        this.refresh(vscode_1.window.activeTextEditor);
    }
    onActiveTextEditorChanged(editor) {
        if (this._editor === editor)
            return;
        if (editor !== undefined && !constants_1.isTextEditor(editor))
            return;
        this.refresh(editor);
    }
    onBlameabilityChanged(e) {
        if (!comparers_1.TextEditorComparer.equals(this._editor, e.editor))
            return;
        if (!this._blameable && !e.blameable) {
            this._updateBlameDebounced.cancel();
            return;
        }
        this._blameable = e.blameable;
        if (!e.blameable || this._editor === undefined) {
            this._updateBlameDebounced.cancel();
            this.updateBlame(this._currentLine.line, e.editor);
            return;
        }
        this._updateBlameDebounced(this._editor.selection.active.line, this._editor);
    }
    onDebugSessionStarted() {
        const state = this.getLineAnnotationState();
        if (!state.enabled)
            return;
        this._debugSessionEndDisposable = vscode_1.debug.onDidTerminateDebugSession(this.onDebugSessionEnded, this);
        this.toggleAnnotations(vscode_1.window.activeTextEditor, state.annotationType, 'debugging');
    }
    onDebugSessionEnded() {
        this._debugSessionEndDisposable && this._debugSessionEndDisposable.dispose();
        this._debugSessionEndDisposable = undefined;
        if (this._blameLineAnnotationState === undefined || this._blameLineAnnotationState.enabled || this._blameLineAnnotationState.reason !== 'debugging')
            return;
        this.toggleAnnotations(vscode_1.window.activeTextEditor, this._blameLineAnnotationState.annotationType);
    }
    onFileAnnotationsToggled() {
        this.refresh(vscode_1.window.activeTextEditor);
    }
    onTextEditorSelectionChanged(e) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._blameable || !comparers_1.TextEditorComparer.equals(this._editor, e.textEditor))
                return;
            const line = e.selections[0].active.line;
            if (line === this._currentLine.line)
                return;
            this._currentLine.line = line;
            this._currentLine.commit = undefined;
            this._currentLine.logCommit = undefined;
            if (this._uri === undefined && e.textEditor !== undefined) {
                this._uri = yield gitService_1.GitUri.fromUri(e.textEditor.document.uri, this.git);
            }
            this.clearAnnotations(e.textEditor);
            this._updateBlameDebounced(line, e.textEditor);
        });
    }
    getLineAnnotationState() {
        return this._blameLineAnnotationState !== undefined ? this._blameLineAnnotationState : this._config.blame.line;
    }
    isEditorBlameable(editor) {
        if (editor === undefined || editor.document === undefined)
            return false;
        if (!this.git.isTrackable(editor.document.uri))
            return false;
        if (editor.document.isUntitled && editor.document.uri.scheme === constants_1.DocumentSchemes.File)
            return false;
        return this.git.isEditorBlameable(editor);
    }
    updateBlame(line, editor) {
        return __awaiter(this, void 0, void 0, function* () {
            this._currentLine.line = line;
            this._currentLine.commit = undefined;
            this._currentLine.logCommit = undefined;
            let commit = undefined;
            let commitLine = undefined;
            if (this._blameable && line >= 0) {
                const blameLine = yield this.git.getBlameForLine(this._uri, line);
                if (this._blameable) {
                    commitLine = blameLine === undefined ? undefined : blameLine.line;
                    commit = blameLine === undefined ? undefined : blameLine.commit;
                }
            }
            this._currentLine.commit = commit;
            if (commit !== undefined && commitLine !== undefined) {
                this.show(commit, commitLine, editor, line);
            }
            else {
                this.clear(editor);
            }
        });
    }
    clear(editor) {
        return __awaiter(this, void 0, void 0, function* () {
            this.unregisterHoverProviders();
            this.clearAnnotations(editor, true);
            this._statusBarItem && this._statusBarItem.hide();
        });
    }
    clearAnnotations(editor, force = false) {
        if (editor === undefined || (!this._isAnnotating && !force))
            return;
        editor.setDecorations(annotationDecoration, []);
        this._isAnnotating = false;
    }
    refresh(editor) {
        return __awaiter(this, void 0, void 0, function* () {
            this._currentLine.line = -1;
            if (editor === undefined && this._editor === undefined)
                return;
            this.clearAnnotations(this._editor);
            this._blameable = this.isEditorBlameable(editor);
            if (!this._blameable || editor === undefined) {
                this.updateBlame(this._currentLine.line, editor);
                this._editor = undefined;
                return;
            }
            this._editor = editor;
            this._uri = yield gitService_1.GitUri.fromUri(editor.document.uri, this.git);
            const maxLines = this._config.advanced.caching.maxLines;
            if (this._config.advanced.caching.enabled && (maxLines <= 0 || editor.document.lineCount <= maxLines)) {
                this.git.getBlameForFile(this._uri);
            }
            const state = this.getLineAnnotationState();
            if (state.enabled && this._blameable) {
                const cfg = this._config.annotations.line;
                this.registerHoverProviders(state.annotationType === LineAnnotationType.Trailing ? cfg.trailing.hover : cfg.hover);
            }
            else {
                this.unregisterHoverProviders();
            }
            this._updateBlameDebounced(editor.selection.active.line, editor);
        });
    }
    show(commit, blameLine, editor, line) {
        return __awaiter(this, void 0, void 0, function* () {
            if (editor.document === undefined)
                return;
            this.updateStatusBar(commit);
            this.updateTrailingAnnotation(commit, blameLine, editor, line);
        });
    }
    showAnnotations(editor, type, reason = 'user') {
        return __awaiter(this, void 0, void 0, function* () {
            if (editor === undefined)
                return;
            const state = this.getLineAnnotationState();
            if (!state.enabled || state.annotationType !== type) {
                this._blameLineAnnotationState = { enabled: true, annotationType: type, reason: reason };
                this.clearAnnotations(editor);
                yield this.updateBlame(editor.selection.active.line, editor);
            }
        });
    }
    toggleAnnotations(editor, type, reason = 'user') {
        return __awaiter(this, void 0, void 0, function* () {
            if (editor === undefined)
                return;
            const state = this.getLineAnnotationState();
            this._blameLineAnnotationState = { enabled: !state.enabled, annotationType: type, reason: reason };
            this.clearAnnotations(editor);
            yield this.updateBlame(editor.selection.active.line, editor);
        });
    }
    updateStatusBar(commit) {
        const cfg = this._config.statusBar;
        if (!cfg.enabled || this._statusBarItem === undefined)
            return;
        this._statusBarItem.text = `$(git-commit) ${gitService_1.CommitFormatter.fromTemplate(cfg.format, commit, {
            truncateMessageAtNewLine: true,
            dateFormat: cfg.dateFormat === null ? this._config.defaultDateFormat : cfg.dateFormat
        })}`;
        switch (cfg.command) {
            case configuration_1.StatusBarCommand.ToggleFileBlame:
                this._statusBarItem.tooltip = 'Toggle Blame Annotations';
                break;
            case configuration_1.StatusBarCommand.DiffWithPrevious:
                this._statusBarItem.command = commands_1.Commands.DiffLineWithPrevious;
                this._statusBarItem.tooltip = 'Compare Line Revision with Previous';
                break;
            case configuration_1.StatusBarCommand.DiffWithWorking:
                this._statusBarItem.command = commands_1.Commands.DiffLineWithWorking;
                this._statusBarItem.tooltip = 'Compare Line Revision with Working';
                break;
            case configuration_1.StatusBarCommand.ToggleCodeLens:
                this._statusBarItem.tooltip = 'Toggle Git CodeLens';
                break;
            case configuration_1.StatusBarCommand.ShowQuickCommitDetails:
                this._statusBarItem.tooltip = 'Show Commit Details';
                break;
            case configuration_1.StatusBarCommand.ShowQuickCommitFileDetails:
                this._statusBarItem.tooltip = 'Show Line Commit Details';
                break;
            case configuration_1.StatusBarCommand.ShowQuickFileHistory:
                this._statusBarItem.tooltip = 'Show File History';
                break;
            case configuration_1.StatusBarCommand.ShowQuickCurrentBranchHistory:
                this._statusBarItem.tooltip = 'Show Branch History';
                break;
        }
        this._statusBarItem.show();
    }
    updateTrailingAnnotation(commit, blameLine, editor, line) {
        return __awaiter(this, void 0, void 0, function* () {
            const state = this.getLineAnnotationState();
            if (!state.enabled || state.annotationType !== LineAnnotationType.Trailing)
                return;
            line = line === undefined ? blameLine.line : line;
            const cfg = this._config.annotations.line.trailing;
            const decoration = annotations_1.Annotations.trailing(commit, cfg.format, cfg.dateFormat === null ? this._config.defaultDateFormat : cfg.dateFormat);
            decoration.range = editor.document.validateRange(new vscode_1.Range(line, annotations_1.endOfLineIndex, line, annotations_1.endOfLineIndex));
            editor.setDecorations(annotationDecoration, [decoration]);
            this._isAnnotating = true;
        });
    }
    registerHoverProviders(providers) {
        this.unregisterHoverProviders();
        if (this._editor === undefined)
            return;
        if (!providers.details && !providers.changes)
            return;
        const subscriptions = [];
        if (providers.changes) {
            subscriptions.push(vscode_1.languages.registerHoverProvider({ pattern: this._editor.document.uri.fsPath }, { provideHover: this.provideChangesHover.bind(this) }));
        }
        if (providers.details) {
            subscriptions.push(vscode_1.languages.registerHoverProvider({ pattern: this._editor.document.uri.fsPath }, { provideHover: this.provideDetailsHover.bind(this) }));
        }
        this._hoverProviderDisposable = vscode_1.Disposable.from(...subscriptions);
    }
    unregisterHoverProviders() {
        if (this._hoverProviderDisposable !== undefined) {
            this._hoverProviderDisposable.dispose();
            this._hoverProviderDisposable = undefined;
        }
    }
    provideDetailsHover(document, position, token) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._editor === undefined || this._editor.document !== document)
                return undefined;
            if (this._currentLine.line !== position.line)
                return undefined;
            const commit = this._currentLine.commit;
            if (commit === undefined)
                return undefined;
            const fileAnnotations = this.annotationController.getAnnotationType(this._editor);
            if ((fileAnnotations === annotationController_1.FileAnnotationType.Gutter && this._config.annotations.file.gutter.hover.details) ||
                (fileAnnotations === annotationController_1.FileAnnotationType.Hover && this._config.annotations.file.hover.details)) {
                return undefined;
            }
            const state = this.getLineAnnotationState();
            const wholeLine = state.annotationType === LineAnnotationType.Hover || (state.annotationType === LineAnnotationType.Trailing && this._config.annotations.line.trailing.hover.wholeLine) ||
                fileAnnotations === annotationController_1.FileAnnotationType.Hover || (fileAnnotations === annotationController_1.FileAnnotationType.Gutter && this._config.annotations.file.gutter.hover.wholeLine);
            const range = document.validateRange(new vscode_1.Range(position.line, wholeLine ? 0 : annotations_1.endOfLineIndex, position.line, annotations_1.endOfLineIndex));
            if (!wholeLine && range.start.character !== position.character)
                return undefined;
            let logCommit = this._currentLine.logCommit;
            if (logCommit === undefined && !commit.isUncommitted) {
                logCommit = yield this.git.getLogCommit(commit.repoPath, commit.uri.fsPath, commit.sha);
                if (logCommit !== undefined) {
                    logCommit.previousFileName = commit.previousFileName;
                    logCommit.previousSha = commit.previousSha;
                    this._currentLine.logCommit = logCommit;
                }
            }
            const message = annotations_1.Annotations.getHoverMessage(logCommit || commit, this._config.defaultDateFormat, yield this.git.hasRemote(commit.repoPath), this._config.blame.file.annotationType);
            return new vscode_1.Hover(message, range);
        });
    }
    provideChangesHover(document, position, token) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._editor === undefined || this._editor.document !== document)
                return undefined;
            if (this._currentLine.line !== position.line)
                return undefined;
            const commit = this._currentLine.commit;
            if (commit === undefined)
                return undefined;
            const fileAnnotations = this.annotationController.getAnnotationType(this._editor);
            if ((fileAnnotations === annotationController_1.FileAnnotationType.Gutter && this._config.annotations.file.gutter.hover.changes) ||
                (fileAnnotations === annotationController_1.FileAnnotationType.Hover && this._config.annotations.file.hover.changes)) {
                return undefined;
            }
            const state = this.getLineAnnotationState();
            const wholeLine = state.annotationType === LineAnnotationType.Hover || (state.annotationType === LineAnnotationType.Trailing && this._config.annotations.line.trailing.hover.wholeLine) ||
                fileAnnotations === annotationController_1.FileAnnotationType.Hover || (fileAnnotations === annotationController_1.FileAnnotationType.Gutter && this._config.annotations.file.gutter.hover.wholeLine);
            const range = document.validateRange(new vscode_1.Range(position.line, wholeLine ? 0 : annotations_1.endOfLineIndex, position.line, annotations_1.endOfLineIndex));
            if (!wholeLine && range.start.character !== position.character)
                return undefined;
            const hover = yield annotations_1.Annotations.changesHover(commit, position.line, this._uri, this.git);
            return new vscode_1.Hover(hover.hoverMessage, range);
        });
    }
}
exports.CurrentLineController = CurrentLineController;
//# sourceMappingURL=currentLineController.js.map