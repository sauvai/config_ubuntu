"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const symbol_search_manager_1 = require("./symbol_search_manager");
class WorkspaceSymbolProvisionManager {
    constructor(context, configuration, currentWorkingDirectoryManager) {
        this.configuration = configuration;
        this.currentWorkingDirectoryManager = currentWorkingDirectoryManager;
        this.symbolSearchManager = new symbol_search_manager_1.SymbolSearchManager(configuration);
        context.subscriptions.push(vscode_1.languages.registerWorkspaceSymbolProvider(this));
    }
    provideWorkspaceSymbols(query) {
        return new Promise((resolve, reject) => {
            const cwdPromise = this.currentWorkingDirectoryManager.cwd();
            cwdPromise.then((workspaceDirPath) => {
                const symbolInformationListPromise = this.symbolSearchManager.findSymbolsInWorkspace(workspaceDirPath, query);
                symbolInformationListPromise.then((symbolInformationList) => {
                    resolve(symbolInformationList);
                });
            }).catch((error) => {
                vscode_1.window.showErrorMessage(error.message);
                reject(error.message);
            });
        });
    }
}
exports.WorkspaceSymbolProvisionManager = WorkspaceSymbolProvisionManager;
//# sourceMappingURL=workspace_symbol_provision_manager.js.map