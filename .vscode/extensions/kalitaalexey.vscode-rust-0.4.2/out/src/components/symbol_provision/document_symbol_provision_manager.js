"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const mod_1 = require("../configuration/mod");
const symbol_search_manager_1 = require("./symbol_search_manager");
class DocumentSymbolProvisionManager {
    constructor(context, configuration) {
        this.symbolSearchManager = new symbol_search_manager_1.SymbolSearchManager(configuration);
        context.subscriptions.push(vscode_1.languages.registerDocumentSymbolProvider(mod_1.getDocumentFilter(), this));
    }
    provideDocumentSymbols(document) {
        return this.symbolSearchManager.findSymbolsInDocument(document.fileName);
    }
}
exports.DocumentSymbolProvisionManager = DocumentSymbolProvisionManager;
//# sourceMappingURL=document_symbol_provision_manager.js.map