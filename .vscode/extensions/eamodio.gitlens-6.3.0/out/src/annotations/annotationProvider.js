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
const comparers_1 = require("../comparers");
const configuration_1 = require("../configuration");
class AnnotationProviderBase extends vscode_1.Disposable {
    constructor(context, editor, decoration, highlightDecoration) {
        super(() => this.dispose());
        this.editor = editor;
        this.decoration = decoration;
        this.highlightDecoration = highlightDecoration;
        this.correlationKey = AnnotationProviderBase.getCorrelationKey(this.editor);
        this.document = this.editor.document;
        this._config = configuration_1.configuration.get();
        this._disposable = vscode_1.Disposable.from(vscode_1.window.onDidChangeTextEditorSelection(this.onTextEditorSelectionChanged, this));
    }
    static getCorrelationKey(editor) {
        return editor !== undefined ? editor.id : '';
    }
    dispose() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.clear();
            this._disposable && this._disposable.dispose();
        });
    }
    onTextEditorSelectionChanged(e) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!comparers_1.TextDocumentComparer.equals(this.document, e.textEditor && e.textEditor.document))
                return;
            return this.selection(e.selections[0].active.line);
        });
    }
    get editorId() {
        if (this.editor === undefined || this.editor.document === undefined)
            return '';
        return this.editor.id;
    }
    get editorUri() {
        if (this.editor === undefined || this.editor.document === undefined)
            return undefined;
        return this.editor.document.uri;
    }
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.editor !== undefined) {
                try {
                    if (this.highlightDecoration !== undefined) {
                        this.editor.setDecorations(this.highlightDecoration, []);
                    }
                    if (this.decoration !== undefined) {
                        this.editor.setDecorations(this.decoration, []);
                    }
                }
                catch (ex) { }
            }
        });
    }
    reset(decoration, highlightDecoration) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.clear();
            this._config = configuration_1.configuration.get();
            this.decoration = decoration;
            this.highlightDecoration = highlightDecoration;
            yield this.provideAnnotation(this.editor === undefined ? undefined : this.editor.selection.active.line);
        });
    }
    restore(editor, force = false) {
        if (!force && this.editor._disposed === false)
            return;
        this.editor = editor;
        this.correlationKey = AnnotationProviderBase.getCorrelationKey(editor);
        this.document = editor.document;
        if (this._decorations !== undefined && this._decorations.length) {
            this.editor.setDecorations(this.decoration, this._decorations);
        }
    }
}
exports.AnnotationProviderBase = AnnotationProviderBase;
//# sourceMappingURL=annotationProvider.js.map