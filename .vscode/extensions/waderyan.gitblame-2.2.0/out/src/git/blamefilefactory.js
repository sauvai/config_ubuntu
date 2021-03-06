"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const blamefile_1 = require("./blamefile");
const blamefiledummy_1 = require("./blamefiledummy");
class GitBlameFileFactory {
    static create(fileName, disposeCallback = () => { }) {
        if (GitBlameFileFactory.inWorkspace(fileName)) {
            return new blamefile_1.GitBlameFile(fileName, disposeCallback);
        }
        else {
            return new blamefiledummy_1.GitBlameFileDummy(fileName, disposeCallback);
        }
    }
    static inWorkspace(fileName) {
        const uriFileName = vscode_1.Uri.file(fileName);
        return typeof vscode_1.workspace.getWorkspaceFolder(uriFileName) !== 'undefined';
    }
}
exports.GitBlameFileFactory = GitBlameFileFactory;
//# sourceMappingURL=blamefilefactory.js.map