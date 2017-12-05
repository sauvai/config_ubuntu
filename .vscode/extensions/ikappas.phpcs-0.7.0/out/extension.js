/* --------------------------------------------------------------------------------------------
 * Copyright (c) Ioannis Kappas. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
var path = require('path');
var vscode_1 = require('vscode');
var vscode_languageclient_1 = require('vscode-languageclient');
function activate(context) {
    // The server is implemented in node
    var serverModule = context.asAbsolutePath(path.join('server', 'server.js'));
    // The debug options for the server
    var debugOptions = { execArgv: ["--nolazy", "--debug=6004"] };
    // If the extension is launch in debug mode the debug server options are use
    // Otherwise the run options are used
    var serverOptions = {
        run: { module: serverModule },
        debug: { module: serverModule, options: debugOptions }
    };
    // Options to control the language client
    var clientOptions = {
        // Register the server for php documents
        documentSelector: ['php'],
        synchronize: {
            // Synchronize the setting section 'phpcs' to the server
            configurationSection: 'phpcs',
            // Notify the server about file changes to 'phpcs.xml' files contain in the workspace
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/phpcs.xml')
        }
    };
    // Create the language client the client.
    var client = new vscode_languageclient_1.LanguageClient('PHP CodeSniffer Linter', serverOptions, clientOptions);
    // Create the settings monitor and start the monitor for the client.
    var monitor = new vscode_languageclient_1.SettingMonitor(client, 'phpcs.enable').start();
    // Push the monitor to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(monitor);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map