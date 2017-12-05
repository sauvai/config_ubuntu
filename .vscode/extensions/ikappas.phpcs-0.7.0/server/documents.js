/*---------------------------------------------------------
 * Copyright (C) Ioannis Kappas. All rights reserved.
 *--------------------------------------------------------*/
"use strict";
const vscode_languageserver_1 = require("vscode-languageserver");
const protocol_1 = require("./protocol");
const events_1 = require("./utils/events");
class FullTextDocument {
    constructor(uri, languageId, version, content) {
        this._uri = uri;
        this._languageId = languageId;
        this._version = version;
        this._content = content;
        this._lineOffsets = null;
    }
    get uri() {
        return this._uri;
    }
    get languageId() {
        return this._languageId;
    }
    get version() {
        return this._version;
    }
    getText() {
        return this._content;
    }
    update(event, version) {
        this._content = event.text;
        this._version = version;
        this._lineOffsets = null;
    }
    getLineOffsets() {
        if (this._lineOffsets === null) {
            let lineOffsets = [];
            let text = this._content;
            let isLineStart = true;
            for (let i = 0; i < text.length; i++) {
                if (isLineStart) {
                    lineOffsets.push(i);
                    isLineStart = false;
                }
                let ch = text.charAt(i);
                isLineStart = (ch === "\r" || ch === "\n");
                if (ch === "\r" && i + 1 < text.length && text.charAt(i + 1) === "\n") {
                    i++;
                }
            }
            if (isLineStart && text.length > 0) {
                lineOffsets.push(text.length);
            }
            this._lineOffsets = lineOffsets;
        }
        return this._lineOffsets;
    }
    positionAt(offset) {
        offset = Math.max(Math.min(offset, this._content.length), 0);
        let lineOffsets = this.getLineOffsets();
        let low = 0, high = lineOffsets.length;
        if (high === 0) {
            return vscode_languageserver_1.Position.create(0, offset);
        }
        while (low < high) {
            let mid = Math.floor((low + high) / 2);
            if (lineOffsets[mid] > offset) {
                high = mid;
            }
            else {
                low = mid + 1;
            }
        }
        // low is the least x for which the line offset is larger than the current offset
        // or array.length if no line offset is larger than the current offset
        let line = low - 1;
        return vscode_languageserver_1.Position.create(line, offset - lineOffsets[line]);
    }
    offsetAt(position) {
        let lineOffsets = this.getLineOffsets();
        if (position.line >= lineOffsets.length) {
            return this._content.length;
        }
        else if (position.line < 0) {
            return 0;
        }
        let lineOffset = lineOffsets[position.line];
        let nextLineOffset = (position.line + 1 < lineOffsets.length) ? lineOffsets[position.line + 1] : this._content.length;
        return Math.max(Math.min(lineOffset + position.character, nextLineOffset), lineOffset);
    }
    get lineCount() {
        return this.getLineOffsets().length;
    }
}
/**
 * A manager for simple text documents
 */
class PhpcsDocuments {
    /**
     * Create a new text document manager.
     */
    constructor() {
        this._documents = Object.create(null);
        this._onDidOpenDocument = new events_1.Emitter();
        this._onDidChangeContent = new events_1.Emitter();
        this._onDidSaveDocument = new events_1.Emitter();
        this._onDidCloseDocument = new events_1.Emitter();
    }
    /**
     * Returns the [TextDocumentSyncKind](#TextDocumentSyncKind) used by
     * this text document manager.
     */
    get syncKind() {
        return vscode_languageserver_1.TextDocumentSyncKind.Full;
    }
    /**
     * An event that fires when a text document managed by this manager
     * is opened.
     */
    get onDidOpenDocument() {
        return this._onDidOpenDocument.event;
    }
    /**
     * An event that fires when a text document managed by this manager
     * changes.
     */
    get onDidChangeContent() {
        return this._onDidChangeContent.event;
    }
    /**
     * An event that fires when a text document managed by this manager
     * is saved.
     */
    get onDidSaveDocument() {
        return this._onDidSaveDocument.event;
    }
    /**
     * An event that fires when a text document managed by this manager
     * is closed.
     */
    get onDidCloseDocument() {
        return this._onDidCloseDocument.event;
    }
    /**
     * Returns the document for the given URI. Returns undefined if
     * the document is not mananged by this instance.
     *
     * @param uri The text document's URI to retrieve.
     * @return the text document or `undefined`.
     */
    get(uri) {
        return this._documents[uri];
    }
    /**
     * Returns all text documents managed by this instance.
     *
     * @return all text documents.
     */
    all() {
        return Object.keys(this._documents).map(key => this._documents[key]);
    }
    /**
     * Returns the URIs of all text documents managed by this instance.
     *
     * @return the URI's of all text documents.
     */
    keys() {
        return Object.keys(this._documents);
    }
    /**
     * Listens for `low level` notification on the given connection to
     * update the text documents managed by this instance.
     *
     * @param connection The connection to listen on.
     */
    listen(connection) {
        connection.__textDocumentSync = vscode_languageserver_1.TextDocumentSyncKind.Full;
        connection.onDidOpenTextDocument((event) => {
            let document = new FullTextDocument(event.uri, event.languageId, -1, event.text);
            this._documents[event.uri] = document;
            this._onDidOpenDocument.fire({ document });
            this._onDidChangeContent.fire({ document });
        });
        connection.onDidChangeTextDocument((event) => {
            let changes = event.contentChanges;
            let last = changes.length > 0 ? changes[changes.length - 1] : null;
            if (last) {
                let document = this._documents[event.uri];
                document.update(last, -1);
                this._onDidChangeContent.fire({ document });
            }
        });
        connection.onNotification(protocol_1.DidSaveTextDocumentNotification.type, (event) => {
            let document = this._documents[event.textDocument.uri];
            this._onDidSaveDocument.fire({ document });
        });
        connection.onDidCloseTextDocument((event) => {
            let document = this._documents[event.uri];
            delete this._documents[event.uri];
            this._onDidCloseDocument.fire({ document });
        });
    }
}
exports.PhpcsDocuments = PhpcsDocuments;
//# sourceMappingURL=documents.js.map