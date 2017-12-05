/* --------------------------------------------------------------------------------------------
 * Copyright (c) Ioannis Kappas. All rights reserved.
 * Licensed under the MIT License. See License.md in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
/// <reference path="./thenable.ts" />
'use strict';
// import {
// 	createConnection, IConnection, TextDocumentSyncKind,
// 	ResponseError, NotificationType,
// 	InitializeParams, InitializeResult, InitializeError,
// 	Diagnostic, DiagnosticSeverity, Position, Files,
// 	TextDocuments, PublishDiagnosticsParams,
// 	ErrorMessageTracker, DidChangeConfigurationParams, DidChangeWatchedFilesParams,
// 	TextDocumentIdentifier
// } from 'vscode-languageserver';
const vscode_languageserver_types_1 = require("vscode-languageserver-types");
const vscode_languageserver_1 = require("vscode-languageserver");
const url = require("url");
const proto = require("./protocol");
const linter_1 = require("./linter");
class PhpcsServer {
    /**
     * Class constructor.
     *
     * @return A new instance of the server.
     */
    constructor() {
        this.ready = false;
        this._validating = Object.create(null);
        this.connection = vscode_languageserver_1.createConnection(new vscode_languageserver_1.IPCMessageReader(process), new vscode_languageserver_1.IPCMessageWriter(process));
        this.documents = new vscode_languageserver_1.TextDocuments();
        this.documents.listen(this.connection);
        this.connection.onInitialize((params) => {
            return this.onInitialize(params);
        });
        this.connection.onDidChangeConfiguration((params) => {
            this.onDidChangeConfiguration(params);
        });
        this.connection.onDidChangeWatchedFiles((params) => {
            this.onDidChangeWatchedFiles(params);
        });
        this.documents.onDidOpen((event) => {
            this.onDidOpenDocument(event);
        });
        this.documents.onDidSave((event) => {
            this.onDidSaveDocument(event);
        });
        this.documents.onDidClose((event) => {
            this.onDidCloseDocument(event);
        });
    }
    /**
     * Handles server initialization.
     *
     * @param params The initialization parameters.
     * @return A promise of initialization result or initialization error.
     */
    onInitialize(params) {
        this.rootPath = params.rootPath;
        return linter_1.PhpcsLinter.resolvePath(this.rootPath).then((linter) => {
            this.linter = linter;
            let result = { capabilities: { textDocumentSync: this.documents.syncKind } };
            return result;
        }, (error) => {
            return Promise.reject(new vscode_languageserver_1.ResponseError(99, error, { retry: true }));
        });
    }
    /**
     * Handles configuration changes.
     *
     * @param params The changed configuration parameters.
     * @return void
     */
    onDidChangeConfiguration(params) {
        this.settings = params.settings.phpcs;
        this.ready = true;
        this.validateMany(this.documents.all());
    }
    /**
     * Handles watched files changes.
     *
     * @param params The changed watched files parameters.
     * @return void
     */
    onDidChangeWatchedFiles(params) {
        this.validateMany(this.documents.all());
    }
    /**
     * Handles opening of text documents.
     *
     * @param event The text document change event.
     * @return void
     */
    onDidOpenDocument(event) {
        this.validateSingle(event.document);
    }
    /**
     * Handles saving of text documents.
     *
     * @param event The text document change event.
     * @return void
     */
    onDidSaveDocument(event) {
        this.validateSingle(event.document);
    }
    /**
     * Handles closing of text documents.
     *
     * @param event The text document change event.
     * @return void
     */
    onDidCloseDocument(event) {
        this.connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
    }
    /**
     * Start listening to requests.
     *
     * @return void
     */
    listen() {
        this.connection.listen();
    }
    /**
     * Validate a single text document.
     *
     * @param document The text document to validate.
     * @return void
     */
    validateSingle(document) {
        let docUrl = url.parse(document.uri);
        // Only process file documents.
        if (docUrl.protocol == "file:" && this._validating[document.uri] === undefined) {
            this._validating[document.uri] = document;
            this.sendStartValidationNotification(document);
            this.linter.lint(document, this.settings, this.rootPath).then(diagnostics => {
                delete this._validating[document.uri];
                this.sendEndValidationNotification(document);
                this.connection.sendDiagnostics({ uri: document.uri, diagnostics });
            }, (error) => {
                delete this._validating[document.uri];
                this.sendEndValidationNotification(document);
                this.connection.window.showErrorMessage(this.getExceptionMessage(error, document));
            });
        }
    }
    sendStartValidationNotification(document) {
        this.connection.sendNotification(proto.DidStartValidateTextDocumentNotification.type, { textDocument: vscode_languageserver_types_1.TextDocumentIdentifier.create(document.uri) });
    }
    sendEndValidationNotification(document) {
        this.connection.sendNotification(proto.DidEndValidateTextDocumentNotification.type, { textDocument: vscode_languageserver_types_1.TextDocumentIdentifier.create(document.uri) });
    }
    /**
     * Validate a list of text documents.
     *
     * @param documents The list of textdocuments to validate.
     * @return void
     */
    validateMany(documents) {
        let tracker = new vscode_languageserver_1.ErrorMessageTracker();
        let promises = [];
        documents.forEach(document => {
            this.sendStartValidationNotification(document);
            promises.push(this.linter.lint(document, this.settings, this.rootPath).then((diagnostics) => {
                this.connection.console.log(`processing: ${document.uri}`);
                this.sendEndValidationNotification(document);
                let diagnostic = { uri: document.uri, diagnostics };
                this.connection.sendDiagnostics(diagnostic);
                return diagnostic;
            }, (error) => {
                this.sendEndValidationNotification(document);
                tracker.add(this.getExceptionMessage(error, document));
                return { uri: document.uri, diagnostics: [] };
            }));
        });
        Promise.all(promises).then(results => {
            tracker.sendErrors(this.connection);
        });
    }
    /**
     * Get the exception message from an exception object.
     *
     * @param exeption The exception to parse.
     * @param document The document where the exception occured.
     * @return string The exception message.
     */
    getExceptionMessage(exception, document) {
        let msg = null;
        if (typeof exception.message === "string" || exception.message instanceof String) {
            msg = exception.message;
            msg = msg.replace(/\r?\n/g, " ");
            if (/^ERROR: /.test(msg)) {
                msg = msg.substr(5);
            }
        }
        else {
            msg = `An unknown error occured while validating file: ${vscode_languageserver_1.Files.uriToFilePath(document.uri)}`;
        }
        return `phpcs: ${msg}`;
    }
}
let server = new PhpcsServer();
server.listen();
//# sourceMappingURL=server.js.map