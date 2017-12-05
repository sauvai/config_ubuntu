/* --------------------------------------------------------------------------------------------
 * Copyright (c) Ioannis Kappas. All rights reserved.
 * Licensed under the MIT License. See License.md in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
"use strict";
/**
 * The document save notification is sent from the client to the server to signal
 * saved text documents. The document's truth is now managed by the client
 * and the server must not try to read the document's truth using the document's
 * uri.
 */
var DidSaveTextDocumentNotification;
(function (DidSaveTextDocumentNotification) {
    DidSaveTextDocumentNotification.type = { get method() { return "textDocument/didSave"; } };
})(DidSaveTextDocumentNotification = exports.DidSaveTextDocumentNotification || (exports.DidSaveTextDocumentNotification = {}));
/**
 * The document start validation notification is sent from the server to the client to signal
 * the start of the validation on text documents.
 */
var DidStartValidateTextDocumentNotification;
(function (DidStartValidateTextDocumentNotification) {
    DidStartValidateTextDocumentNotification.type = { get method() { return "textDocument/didStartValidate"; } };
})(DidStartValidateTextDocumentNotification = exports.DidStartValidateTextDocumentNotification || (exports.DidStartValidateTextDocumentNotification = {}));
/**
 * The document end validation notification is sent from the server to the client to signal
 * the end of the validation on text documents.
 */
var DidEndValidateTextDocumentNotification;
(function (DidEndValidateTextDocumentNotification) {
    DidEndValidateTextDocumentNotification.type = { get method() { return "textDocument/didEndValidate"; } };
})(DidEndValidateTextDocumentNotification = exports.DidEndValidateTextDocumentNotification || (exports.DidEndValidateTextDocumentNotification = {}));
//# sourceMappingURL=protocol.js.map