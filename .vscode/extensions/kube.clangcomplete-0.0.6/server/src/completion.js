/*#######.
########",#:
#########',##".
##'##'## .##',##.
## ## ## # ##",#.
## ## ## ## ##'
## ## ## :##
## ## ##*/
"use strict";
const child_process_1 = require('child_process');
const when_switch_1 = require('when-switch');
/**
 * Format Clang detail output to be readable
 */
const formatDetail = (detail) => detail ? detail
    .replace('#]', ' ')
    .replace(/([<\[]#)|(#>)/g, '')
    .trim()
    : '';
/**
 * Get CompletionItemKind from formatted detail
 * TODO: RegExes need rework and flow needs optimization
 */
const itemKind = (detail) => when_switch_1.default(detail)
    .match(/^[^a-z ]+\(.*\)/, 3 /* Function */)
    .match(/.*\(.*\)/, 3 /* Function */)
    .match(/^enum /, 13 /* Enum */)
    .match(/.*[*&]+/, 18 /* Reference */)
    .match(/^[^a-z]+$/, 15 /* Snippet */)
    .match(/^[^ ()*]+$/, 14 /* Keyword */)
    .else(6 /* Variable */);
/**
 * Get Clang completion output and format it for VSCode
 *
 * TODO: This function would be more optimized with function composition
 * or pipeline on item instead of array
 *
 * TODO: Use stream as input
 */
const completionList = (output) => output
    .split('\n')
    .filter(line => /^COMPLETION/.test(line))
    .map(line => line.substring(11))
    .map(line => line.split(/:(.+)?/))
    .map(([label, detail]) => ({
    label: label ? label.trim() : null,
    detail: detail ? detail.trim() : null
}))
    .map(({ label, detail }) => ({
    label,
    detail: formatDetail(detail)
}))
    .map(({ label, detail }) => ({
    label: label,
    detail: detail,
    kind: itemKind(detail)
}));
/**
 * Build Clang shell command
 */
const buildCommand = (userFlags, position, languageId) => ['clang', '-cc1']
    .concat(userFlags)
    .concat([
    '-fsyntax-only',
    languageId === 'c' ? '-xc' : '-xc++',
    '-code-completion-macros',
    '-code-completion-at',
    `-:${position.line + 1}:${position.character + 1}`
])
    .join(' ');
/**
 * Helper when checking completion start column
 */
const isDelimiter = (char) => '~`!@#$%^&*()-+={}[]|\\\'";:/?<>,. \t\n'.indexOf(char) !== -1;
/**
 * Get Clang completion correctly formatted for VSCode
 */
exports.getCompletion = (config, document, position) => new Promise(resolve => {
    let text = document.getText();
    // Prevent completion when typing first `:`
    // TODO: Optimize (Use of split will be slow on big files)
    let lineContent = text.split('\n')[position.line];
    let column = position.character;
    // Check for scope operator (::)
    // If scope operator not entirely typed return no completion
    if (lineContent.charAt(column - 1) === ':'
        && lineContent.charAt(column - 2) !== ':') {
        return Promise.resolve(null);
    }
    // Get real completion column
    // Clang won't give correct completion if token is already partially typed
    while (column > 0 && !isDelimiter(lineContent.charAt(column - 1))) {
        column--;
    }
    let command = buildCommand(config.userFlags, {
        line: position.line,
        character: column
    }, document.languageId);
    let execOptions = { cwd: config.workspaceRoot };
    let child = child_process_1.exec(command, execOptions, (err, stdout, stderr) => {
        // Omit errors, simply read stdout for clang completions
        let completions = completionList(stdout.toString());
        resolve(completions);
    });
    // Pass code to clang via stdin
    child.stdin.write(text);
    child.stdin.emit('end');
});
//# sourceMappingURL=completion.js.map