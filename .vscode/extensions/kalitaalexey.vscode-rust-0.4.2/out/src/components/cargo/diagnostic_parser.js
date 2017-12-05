"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
class DiagnosticParser {
    /**
     * Parses diagnostics from a line
     * @param line A line to parse
     * @return parsed diagnostics
     */
    parseLine(line) {
        const cargoMessage = JSON.parse(line);
        if (cargoMessage.reason === 'compiler-message') {
            return this.parseCompilerMessage(cargoMessage.message);
        }
        else {
            return [];
        }
    }
    parseCompilerMessage(compilerMessage) {
        const spans = compilerMessage.spans;
        if (spans.length === 0) {
            return [];
        }
        // Only add the primary span, as VSCode orders the problem window by the
        // error's range, which causes a lot of confusion if there are duplicate messages.
        let primarySpan = spans.find(span => span.is_primary);
        if (!primarySpan) {
            return [];
        }
        // Following macro expansion to get correct file name and range.
        while (primarySpan.expansion && primarySpan.expansion.span && primarySpan.expansion.macro_decl_name !== 'include!') {
            primarySpan = primarySpan.expansion.span;
        }
        const range = new vscode_1.Range(primarySpan.line_start - 1, primarySpan.column_start - 1, primarySpan.line_end - 1, primarySpan.column_end - 1);
        let message = compilerMessage.message;
        if (compilerMessage.code) {
            message = `${compilerMessage.code.code}: ${message}`;
        }
        if (primarySpan.label) {
            message += `\n  label: ${primarySpan.label}`;
        }
        message = this.addNotesToMessage(message, compilerMessage.children, 1);
        const diagnostic = new vscode_1.Diagnostic(range, message, this.toSeverity(compilerMessage.level));
        const fileDiagnostic = { filePath: primarySpan.file_name, diagnostic: diagnostic };
        return [fileDiagnostic];
    }
    toSeverity(severity) {
        switch (severity) {
            case 'warning':
                return vscode_1.DiagnosticSeverity.Warning;
            case 'note':
                return vscode_1.DiagnosticSeverity.Information;
            case 'help':
                return vscode_1.DiagnosticSeverity.Hint;
            default:
                return vscode_1.DiagnosticSeverity.Error;
        }
    }
    addNotesToMessage(msg, children, level) {
        const indentation = '  '.repeat(level);
        for (const child of children) {
            msg += `\n${indentation}${child.level}: ${child.message}`;
            if (child.spans && child.spans.length > 0) {
                msg += ': ';
                const lines = [];
                for (const span of child.spans) {
                    if (!span.file_name || !span.line_start) {
                        continue;
                    }
                    lines.push(`${span.file_name}(${span.line_start})`);
                }
                msg += lines.join(', ');
            }
            if (child.children) {
                msg = this.addNotesToMessage(msg, child.children, level + 1);
            }
        }
        return msg;
    }
}
exports.DiagnosticParser = DiagnosticParser;
//# sourceMappingURL=diagnostic_parser.js.map