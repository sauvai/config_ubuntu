"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
class SymbolInformationParser {
    constructor() {
        this.kinds = {
            'struct': vscode_1.SymbolKind.Class,
            'method': vscode_1.SymbolKind.Method,
            'field': vscode_1.SymbolKind.Field,
            'function': vscode_1.SymbolKind.Function,
            'constant': vscode_1.SymbolKind.Constant,
            'static': vscode_1.SymbolKind.Constant,
            'enum': vscode_1.SymbolKind.Enum,
            // Don't really like this,
            // but this was the best alternative given the absense of SymbolKind.Macro
            'macro': vscode_1.SymbolKind.Function
        };
    }
    parseJson(json) {
        const rustSymbols = JSON.parse(json);
        const symbolInformationList = rustSymbols.map(rustSymbol => {
            const kind = this.getSymbolKind(rustSymbol.kind);
            if (!kind) {
                return undefined;
            }
            const pos = new vscode_1.Position(rustSymbol.line - 1, 0);
            const range = new vscode_1.Range(pos, pos);
            const uri = vscode_1.Uri.file(rustSymbol.path);
            const symbolInformation = new vscode_1.SymbolInformation(rustSymbol.name, kind, range, uri, rustSymbol.container);
            return symbolInformation;
        }).filter(value => value !== undefined);
        // It is safe to cast because we filtered out `undefined` values
        return symbolInformationList;
    }
    getSymbolKind(kind) {
        if (kind === '') {
            return undefined;
        }
        else {
            return this.kinds[kind];
        }
    }
}
exports.SymbolInformationParser = SymbolInformationParser;
//# sourceMappingURL=symbol_information_parser.js.map