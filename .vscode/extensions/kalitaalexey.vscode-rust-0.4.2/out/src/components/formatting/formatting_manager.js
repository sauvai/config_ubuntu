"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const fs = require("fs");
const vscode_1 = require("vscode");
const mod_1 = require("../configuration/mod");
const FileSystem_1 = require("../file_system/FileSystem");
const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
class FormattingManager {
    /**
     * To create an instance of the class use the method `create`
     * @param context The extension context
     * @param configuration The configuration
     */
    constructor(context, configuration) {
        this.newFormatRegex = /^Diff in (.*) at line (\d+):$/;
        this.configuration = configuration;
        context.subscriptions.push(vscode_1.languages.registerDocumentFormattingEditProvider(mod_1.getDocumentFilter(), this), vscode_1.languages.registerDocumentRangeFormattingEditProvider(mod_1.getDocumentFilter(), this));
    }
    static create(context, configuration) {
        return __awaiter(this, void 0, void 0, function* () {
            const rustfmtPath = yield FileSystem_1.FileSystem.findExecutablePath(configuration.getRustfmtPath());
            if (rustfmtPath === undefined) {
                return undefined;
            }
            return new FormattingManager(context, configuration);
        });
    }
    provideDocumentFormattingEdits(document) {
        return this.formattingEdits(document);
    }
    provideDocumentRangeFormattingEdits(document, range) {
        return this.formattingEdits(document, range);
    }
    formattingEdits(document, range) {
        return new Promise((resolve, reject) => {
            const fileName = document.fileName + '.fmt';
            fs.writeFileSync(fileName, document.getText());
            const args = ['--skip-children', '--write-mode=diff'];
            if (range !== undefined) {
                args.push('--file-lines', `[{"file":"${fileName}","range":[${range.start.line + 1}, ${range.end.line + 1}]}]`);
            }
            else {
                args.push(fileName);
            }
            const env = Object.assign({ TERM: 'xterm' }, process.env);
            cp.execFile(this.configuration.getRustfmtPath(), args, { env: env }, (err, stdout, stderr) => {
                try {
                    if (err && err.code === 'ENOENT') {
                        vscode_1.window.showInformationMessage('The "rustfmt" command is not available. Make sure it is installed.');
                        return resolve([]);
                    }
                    // rustfmt will return with exit code 3 when it encounters code that could not
                    // be automatically formatted. However, it will continue to format the rest of the file.
                    // New releases will return exit code 4 when the write mode is diff and a valid diff is provided.
                    // For these reasons, if the exit code is 1 or 2, then it should be treated as an error.
                    const hasFatalError = (err && err.code < 3);
                    if ((err || stderr.length) && hasFatalError) {
                        vscode_1.window.setStatusBarMessage('$(alert) Cannot format due to syntax errors', 5000);
                        return reject();
                    }
                    return resolve(this.parseDiff(document.uri, stdout));
                }
                catch (e) {
                    reject(e);
                }
                finally {
                    fs.unlinkSync(fileName);
                }
            });
        });
    }
    cleanDiffLine(line) {
        if (line.endsWith('\u23CE')) {
            return line.slice(1, -1) + '\n';
        }
        return line.slice(1);
    }
    stripColorCodes(input) {
        return input.replace(ansiRegex, '');
    }
    parseDiffOldFormat(fileToProcess, diff) {
        const patches = [];
        let currentPatch = undefined;
        let currentFile = undefined;
        for (const line of diff.split(/\n/)) {
            if (line.startsWith('Diff of')) {
                currentFile = vscode_1.Uri.file(line.slice('Diff of '.length, -1));
            }
            if (!currentFile) {
                continue;
            }
            if (currentFile.toString() !== fileToProcess.toString() + '.fmt') {
                continue;
            }
            if (line.startsWith('Diff at line')) {
                if (currentPatch != null) {
                    patches.push(currentPatch);
                }
                currentPatch = {
                    startLine: parseInt(line.slice('Diff at line'.length), 10),
                    newLines: [],
                    removedLines: 0
                };
            }
            else if (currentPatch !== undefined) {
                if (line.startsWith('+')) {
                    currentPatch.newLines.push(this.cleanDiffLine(line));
                }
                else if (line.startsWith('-')) {
                    currentPatch.removedLines += 1;
                }
                else if (line.startsWith(' ')) {
                    currentPatch.newLines.push(this.cleanDiffLine(line));
                    currentPatch.removedLines += 1;
                }
            }
        }
        if (currentPatch) {
            patches.push(currentPatch);
        }
        return patches;
    }
    parseDiffNewFormat(fileToProcess, diff) {
        const patches = [];
        let currentPatch = undefined;
        let currentFile = undefined;
        for (const line of diff.split(/\n/)) {
            if (line.startsWith('Diff in')) {
                const matches = this.newFormatRegex.exec(line);
                if (!matches) {
                    continue;
                }
                // Filter out malformed lines
                if (matches.length !== 3) {
                    continue;
                }
                // If we begin a new diff while already building one, push it as its now complete
                if (currentPatch !== undefined) {
                    patches.push(currentPatch);
                }
                currentFile = vscode_1.Uri.file(matches[1]);
                currentPatch = {
                    startLine: parseInt(matches[2], 10),
                    newLines: [],
                    removedLines: 0
                };
            }
            // We haven't managed to figure out what file we're diffing yet, this shouldn't happen.
            // Probably a malformed diff.
            if (!currentFile) {
                continue;
            }
            if (currentFile.toString() !== fileToProcess.toString() + '.fmt') {
                continue;
            }
            if (!currentPatch) {
                continue;
            }
            if (line.startsWith('+')) {
                currentPatch.newLines.push(this.cleanDiffLine(line));
            }
            else if (line.startsWith('-')) {
                currentPatch.removedLines += 1;
            }
            else if (line.startsWith(' ')) {
                currentPatch.newLines.push(this.cleanDiffLine(line));
                currentPatch.removedLines += 1;
            }
        }
        // We've reached the end of the data, push the current patch if we were building one
        if (currentPatch) {
            patches.push(currentPatch);
        }
        return patches;
    }
    parseDiff(fileToProcess, diff) {
        diff = this.stripColorCodes(diff);
        let patches = [];
        const oldFormat = diff.startsWith('Diff of');
        if (oldFormat) {
            patches = this.parseDiffOldFormat(fileToProcess, diff);
        }
        else {
            patches = this.parseDiffNewFormat(fileToProcess, diff);
        }
        let cummulativeOffset = 0;
        const textEdits = patches.map(patch => {
            const newLines = patch.newLines;
            const removedLines = patch.removedLines;
            const startLine = patch.startLine - 1 + cummulativeOffset;
            const endLine = removedLines === 0 ? startLine : startLine + removedLines - 1;
            const range = new vscode_1.Range(startLine, 0, endLine, Number.MAX_SAFE_INTEGER);
            cummulativeOffset += (removedLines - newLines.length);
            const lastLineIndex = newLines.length - 1;
            newLines[lastLineIndex] = newLines[lastLineIndex].replace('\n', '');
            return vscode_1.TextEdit.replace(range, newLines.join(''));
        });
        return textEdits;
    }
}
exports.FormattingManager = FormattingManager;
//# sourceMappingURL=formatting_manager.js.map