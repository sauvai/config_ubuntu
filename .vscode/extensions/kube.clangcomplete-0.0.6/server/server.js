/*#######.
########",#:
#########',##".
##'##'## .##',##.
## ## ## # ##",#.
## ## ## ## ##'
## ## ## :##
## ## ##*/
'use strict';
const fs_1 = require("fs");
const path_1 = require("path");
const vscode_languageserver_1 = require("vscode-languageserver");
const completion_1 = require("./completion");
let connection = vscode_languageserver_1.createConnection(new vscode_languageserver_1.IPCMessageReader(process), new vscode_languageserver_1.IPCMessageWriter(process));
let documents = new vscode_languageserver_1.TextDocuments();
documents.listen(connection);
const config = {
    workspaceRoot: '',
    userFlags: []
};
const getFlagsFromClangCompleteFile = () => new Promise(resolve => {
    // Check presence of a .clang_complete file
    let filePath = path_1.join(config.workspaceRoot, './.clang_complete');
    fs_1.readFile(filePath, (err, data) => {
        // If found file set userFlags, else set no flag
        let userFlags = data ? data.toString().split('\n') : [];
        resolve(userFlags);
    });
});
connection.onInitialize((params) => new Promise(resolve => getFlagsFromClangCompleteFile()
    .then(userFlags => {
    // Initialize config
    config.userFlags = userFlags;
    config.workspaceRoot = params.rootPath;
    resolve({
        capabilities: {
            // TextDocument Full-Sync mode
            textDocumentSync: documents.syncKind,
            // Accept completion, and set triggerCharacters
            completionProvider: {
                resolveProvider: true,
                triggerCharacters: ['.', '>', ':']
            }
        }
    });
})));
connection.onDidChangeWatchedFiles(notification => {
    // Remove file:// protocol at beginning of uri
    let fileAbsolutePath = notification.changes[0].uri.substring(5);
    let fileRelativePath = path_1.relative(config.workspaceRoot, fileAbsolutePath);
    // If file is .clang_complete at workspace root
    if (fileRelativePath === '.clang_complete') {
        getFlagsFromClangCompleteFile()
            .then(userFlags => config.userFlags = userFlags);
    }
});
connection.onCompletion(textDocumentPosition => {
    let document = documents.get(textDocumentPosition.textDocument.uri);
    let position = textDocumentPosition.position;
    return completion_1.getCompletion(config, document, position);
});
connection.onCompletionResolve(item => item);
connection.listen();
//# sourceMappingURL=server.js.map