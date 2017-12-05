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
const constants_1 = require("./constants");
const gitService_1 = require("./gitService");
const logger_1 = require("./logger");
const path = require("path");
class GitContentProvider {
    constructor(context, git) {
        this.git = git;
    }
    provideTextDocumentContent(uri, token) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = gitService_1.GitService.fromGitContentUri(uri);
            if (data.sha === gitService_1.GitService.deletedSha)
                return '';
            const fileName = data.originalFileName || data.fileName;
            try {
                return yield this.git.getVersionedFileText(data.repoPath, fileName, data.sha);
            }
            catch (ex) {
                logger_1.Logger.error(ex, 'GitContentProvider', 'getVersionedFileText');
                vscode_1.window.showErrorMessage(`Unable to show Git revision ${gitService_1.GitService.shortenSha(data.sha)} of '${path.relative(data.repoPath, fileName)}'`);
                return undefined;
            }
        });
    }
}
GitContentProvider.scheme = constants_1.DocumentSchemes.GitLensGit;
exports.GitContentProvider = GitContentProvider;
//# sourceMappingURL=gitContentProvider.js.map