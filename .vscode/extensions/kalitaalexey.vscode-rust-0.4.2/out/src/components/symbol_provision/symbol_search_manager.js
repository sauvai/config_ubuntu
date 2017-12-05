"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const vscode_1 = require("vscode");
const symbol_information_parser_1 = require("./symbol_information_parser");
class SymbolSearchManager {
    constructor(configuration) {
        this.configuration = configuration;
        this.symbolInformationParser = new symbol_information_parser_1.SymbolInformationParser();
    }
    findSymbolsInDocument(documentFilePath) {
        return this.findSymbols(['search', '-l', documentFilePath]);
    }
    findSymbolsInWorkspace(workspaceDirPath, query) {
        return this.findSymbols(['search', '-g', workspaceDirPath, query]);
    }
    findSymbols(args) {
        const executable = this.configuration.getRustsymPath();
        const options = { maxBuffer: 1024 * 1024 };
        return new Promise((resolve, reject) => {
            child_process_1.execFile(executable, args, options, (err, stdout) => {
                try {
                    if (err && err.code === 'ENOENT') {
                        vscode_1.window.showInformationMessage('The "rustsym" command is not available. Make sure it is installed.');
                        return resolve([]);
                    }
                    const result = stdout.toString();
                    const symbols = this.symbolInformationParser.parseJson(result);
                    return resolve(symbols);
                }
                catch (e) {
                    reject(e);
                }
            });
        });
    }
}
exports.SymbolSearchManager = SymbolSearchManager;
//# sourceMappingURL=symbol_search_manager.js.map