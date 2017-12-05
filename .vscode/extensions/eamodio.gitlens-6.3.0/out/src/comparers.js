'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
class Comparer {
}
class UriComparer extends Comparer {
    equals(lhs, rhs) {
        if (lhs === rhs)
            return true;
        if (lhs === undefined || rhs === undefined)
            return false;
        return lhs.scheme === rhs.scheme && lhs.fsPath === rhs.fsPath;
    }
}
class TextDocumentComparer extends Comparer {
    equals(lhs, rhs) {
        return lhs === rhs;
    }
}
class TextEditorComparer extends Comparer {
    equals(lhs, rhs, options = { useId: false, usePosition: false }) {
        if (lhs === rhs)
            return true;
        if (lhs === undefined || rhs === undefined)
            return false;
        if (options.usePosition && (lhs.viewColumn !== rhs.viewColumn))
            return false;
        if (options.useId && (!lhs.document || !rhs.document)) {
            if (lhs.id !== rhs.id)
                return false;
            return true;
        }
        return textDocumentComparer.equals(lhs.document, rhs.document);
    }
}
const textDocumentComparer = new TextDocumentComparer();
exports.TextDocumentComparer = textDocumentComparer;
const textEditorComparer = new TextEditorComparer();
exports.TextEditorComparer = textEditorComparer;
const uriComparer = new UriComparer();
exports.UriComparer = uriComparer;
//# sourceMappingURL=comparers.js.map