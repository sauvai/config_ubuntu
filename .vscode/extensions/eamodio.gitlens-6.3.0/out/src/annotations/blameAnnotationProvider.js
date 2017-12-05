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
const annotationController_1 = require("./annotationController");
const annotationProvider_1 = require("./annotationProvider");
const annotations_1 = require("./annotations");
const gitService_1 = require("../gitService");
class BlameAnnotationProviderBase extends annotationProvider_1.AnnotationProviderBase {
    constructor(context, editor, decoration, highlightDecoration, git, uri) {
        super(context, editor, decoration, highlightDecoration);
        this.git = git;
        this.uri = uri;
        this._blame = this.git.getBlameForFile(this.uri);
    }
    clear() {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            this._hoverProviderDisposable && this._hoverProviderDisposable.dispose();
            _super("clear").call(this);
        });
    }
    selection(shaOrLine, blame) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.highlightDecoration)
                return;
            if (blame === undefined) {
                blame = yield this._blame;
                if (!blame || !blame.lines.length)
                    return;
            }
            let sha = undefined;
            if (typeof shaOrLine === 'string') {
                sha = shaOrLine;
            }
            else if (typeof shaOrLine === 'number') {
                if (shaOrLine >= 0) {
                    const commitLine = blame.lines[shaOrLine];
                    sha = commitLine && commitLine.sha;
                }
            }
            else {
                sha = system_1.Iterables.first(blame.commits.values()).sha;
            }
            if (!sha) {
                this.editor.setDecorations(this.highlightDecoration, []);
                return;
            }
            const highlightDecorationRanges = system_1.Arrays.filterMap(blame.lines, l => l.sha !== sha ? this.editor.document.validateRange(new vscode_1.Range(l.line, 0, l.line, 1000000)) : undefined);
            this.editor.setDecorations(this.highlightDecoration, highlightDecorationRanges);
        });
    }
    validate() {
        return __awaiter(this, void 0, void 0, function* () {
            const blame = yield this._blame;
            return blame !== undefined && blame.lines.length !== 0;
        });
    }
    getBlame() {
        return __awaiter(this, void 0, void 0, function* () {
            const blame = yield this._blame;
            if (blame === undefined || blame.lines.length === 0)
                return undefined;
            return blame;
        });
    }
    registerHoverProviders(providers) {
        if (!providers.details && !providers.changes)
            return;
        const subscriptions = [];
        if (providers.changes) {
            subscriptions.push(vscode_1.languages.registerHoverProvider({ pattern: this.document.uri.fsPath }, { provideHover: this.provideChangesHover.bind(this) }));
        }
        if (providers.details) {
            subscriptions.push(vscode_1.languages.registerHoverProvider({ pattern: this.document.uri.fsPath }, { provideHover: this.provideDetailsHover.bind(this) }));
        }
        this._hoverProviderDisposable = vscode_1.Disposable.from(...subscriptions);
    }
    provideDetailsHover(document, position, token) {
        return __awaiter(this, void 0, void 0, function* () {
            const commit = yield this.getCommitForHover(position);
            if (commit === undefined)
                return undefined;
            let logCommit = undefined;
            if (!commit.isUncommitted) {
                logCommit = yield this.git.getLogCommit(commit.repoPath, commit.uri.fsPath, commit.sha);
                if (logCommit !== undefined) {
                    logCommit.previousFileName = commit.previousFileName;
                    logCommit.previousSha = commit.previousSha;
                }
            }
            const message = annotations_1.Annotations.getHoverMessage(logCommit || commit, this._config.defaultDateFormat, yield this.git.hasRemote(commit.repoPath), this._config.blame.file.annotationType);
            return new vscode_1.Hover(message, document.validateRange(new vscode_1.Range(position.line, 0, position.line, annotations_1.endOfLineIndex)));
        });
    }
    provideChangesHover(document, position, token) {
        return __awaiter(this, void 0, void 0, function* () {
            const commit = yield this.getCommitForHover(position);
            if (commit === undefined)
                return undefined;
            const hover = yield annotations_1.Annotations.changesHover(commit, position.line, yield gitService_1.GitUri.fromUri(document.uri, this.git), this.git);
            return new vscode_1.Hover(hover.hoverMessage, document.validateRange(new vscode_1.Range(position.line, 0, position.line, annotations_1.endOfLineIndex)));
        });
    }
    getCommitForHover(position) {
        return __awaiter(this, void 0, void 0, function* () {
            const annotationType = this._config.blame.file.annotationType;
            const wholeLine = annotationType === annotationController_1.FileAnnotationType.Hover || (annotationType === annotationController_1.FileAnnotationType.Gutter && this._config.annotations.file.gutter.hover.wholeLine);
            if (!wholeLine && position.character !== 0)
                return undefined;
            const blame = yield this.getBlame();
            if (blame === undefined)
                return undefined;
            const line = blame.lines[position.line];
            return blame.commits.get(line.sha);
        });
    }
}
exports.BlameAnnotationProviderBase = BlameAnnotationProviderBase;
//# sourceMappingURL=blameAnnotationProvider.js.map