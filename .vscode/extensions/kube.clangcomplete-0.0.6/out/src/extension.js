/*#######.
########",#:
#########',##".
##'##'## .##',##.
## ## ## # ##",#.
## ## ## ## ##'
## ## ## :##
## ## ##*/
'use strict';
const path = require("path");
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
function activate(context) {
    const serverModule = context.asAbsolutePath(path.join('server', 'server.js'));
    const debugOptions = { execArgv: ["--nolazy", "--debug=6004"] };
    const serverOptions = {
        run: {
            module: serverModule,
            transport: vscode_languageclient_1.TransportKind.ipc
        },
        debug: {
            module: serverModule,
            transport: vscode_languageclient_1.TransportKind.ipc,
            options: debugOptions
        }
    };
    const clientOptions = {
        // Register server for C and C++ files
        documentSelector: ['c', 'cpp'],
        synchronize: {
            configurationSection: 'clangComplete',
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/.clang_complete')
        }
    };
    const disposable = new vscode_languageclient_1.LanguageClient('ClangComplete', serverOptions, clientOptions).start();
    context.subscriptions.push(disposable);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map