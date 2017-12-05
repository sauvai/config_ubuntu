/* --------------------------------------------------------------------------------------------
 * Copyright (c) Ioannis Kappas. All rights reserved.
 * Licensed under the MIT License. See License.md in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
"use strict";
const path = require("path");
const proto = require("./protocol");
const status_1 = require("./status");
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
function activate(context) {
    // The server is implemented in node
    let serverModule = context.asAbsolutePath(path.join("server", "server.js"));
    // The debug options for the server
    let debugOptions = { execArgv: ["--nolazy", "--debug=6199"] };
    // If the extension is launch in debug mode the debug server options are use
    // Otherwise the run options are used
    let serverOptions = {
        run: { module: serverModule, transport: vscode_languageclient_1.TransportKind.ipc },
        debug: { module: serverModule, transport: vscode_languageclient_1.TransportKind.ipc, options: debugOptions }
    };
    // Options to control the language client
    let clientOptions = {
        // Register the server for php documents
        documentSelector: ["php"],
        synchronize: {
            // Synchronize the setting section "phpcs"" to the server
            configurationSection: "phpcs",
            // Notify the server about file changes to 'ruleset.xml' files contain in the workspace
            fileEvents: vscode_1.workspace.createFileSystemWatcher("**/ruleset.xml")
        }
    };
    // Create the language client the client.
    let client = new vscode_languageclient_1.LanguageClient("PHP CodeSniffer Linter", serverOptions, clientOptions);
    // Create the save handler.
    let saveHandler = vscode_1.workspace.onDidSaveTextDocument(document => {
        if (document.languageId != `php`) {
            return;
        }
        let params = { textDocument: vscode_languageclient_1.TextDocumentIdentifier.create(document.uri.toString()) };
        client.sendNotification(proto.DidSaveTextDocumentNotification.type, params);
    });
    let status = new status_1.PhpcsStatus();
    client.onNotification(proto.DidStartValidateTextDocumentNotification.type, (event) => {
        status.startProcessing(event.textDocument.uri);
    });
    client.onNotification(proto.DidEndValidateTextDocumentNotification.type, (event) => {
        status.endProcessing(event.textDocument.uri);
    });
    context.subscriptions.push(saveHandler);
    // Create the settings monitor and start the monitor for the client.
    let monitor = new vscode_languageclient_1.SettingMonitor(client, "phpcs.enable").start();
    // Push the monitor to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(monitor);
    context.subscriptions.push(status);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map