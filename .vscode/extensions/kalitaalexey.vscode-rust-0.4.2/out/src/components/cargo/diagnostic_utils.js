"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const vscode_1 = require("vscode");
/**
 * The path of a diagnostic must be absolute.
 * The function prepends the path of the project to the path of the diagnostic.
 * @param diagnosticPath The path of the diagnostic
 * @param projectPath The path of the project
 */
function normalizeDiagnosticPath(diagnosticPath, projectPath) {
    if (path_1.isAbsolute(diagnosticPath)) {
        return diagnosticPath;
    }
    else {
        return path_1.join(projectPath, diagnosticPath);
    }
}
exports.normalizeDiagnosticPath = normalizeDiagnosticPath;
/**
 * Adds the diagnostic to the diagnostics only if the diagnostic isn't in the diagnostics.
 * @param diagnostic The diagnostic to add
 * @param diagnostics The collection of diagnostics to take the diagnostic
 */
function addUniqueDiagnostic(diagnostic, diagnostics) {
    const uri = vscode_1.Uri.file(diagnostic.filePath);
    const fileDiagnostics = diagnostics.get(uri);
    if (!fileDiagnostics) {
        // No diagnostics for the file
        // The diagnostic is unique
        diagnostics.set(uri, [diagnostic.diagnostic]);
    }
    else if (isUniqueDiagnostic(diagnostic.diagnostic, fileDiagnostics)) {
        const newFileDiagnostics = fileDiagnostics.concat([diagnostic.diagnostic]);
        diagnostics.set(uri, newFileDiagnostics);
    }
}
exports.addUniqueDiagnostic = addUniqueDiagnostic;
function isUniqueDiagnostic(diagnostic, diagnostics) {
    const foundDiagnostic = diagnostics.find(uniqueDiagnostic => {
        if (!diagnostic.range.isEqual(uniqueDiagnostic.range)) {
            return false;
        }
        if (diagnostic.message !== uniqueDiagnostic.message) {
            return false;
        }
        return true;
    });
    return !foundDiagnostic;
}
exports.isUniqueDiagnostic = isUniqueDiagnostic;
//# sourceMappingURL=diagnostic_utils.js.map