'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
// import * as vscode from 'vscode';
const vscode_1 = require('vscode');
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    let indentationLevelMover = new IndentationLevelMover();
    var moveDown = vscode_1.commands.registerCommand('indentation-level-movement.moveDown', () => {
        indentationLevelMover.moveDown();
    });
    var moveUp = vscode_1.commands.registerCommand('indentation-level-movement.moveUp', () => {
        indentationLevelMover.moveUp();
    });
    var moveRight = vscode_1.commands.registerCommand('indentation-level-movement.moveRight', () => {
        indentationLevelMover.moveRight();
    });
    var selectDown = vscode_1.commands.registerCommand('indentation-level-movement.selectDown', () => {
        indentationLevelMover.selectDown();
    });
    var selectUp = vscode_1.commands.registerCommand('indentation-level-movement.selectUp', () => {
        indentationLevelMover.selectUp();
    });
    context.subscriptions.push(indentationLevelMover);
    context.subscriptions.push(moveDown);
    context.subscriptions.push(moveUp);
    context.subscriptions.push(moveRight);
    context.subscriptions.push(selectDown);
    context.subscriptions.push(selectUp);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
class IndentationLevelMover {
    moveUp() {
        let editor = vscode_1.window.activeTextEditor;
        if (!editor) {
            return;
        }
        let currentLineNumber = editor.selection.start.line;
        let currentLevel = this.indentationLevelForLine(currentLineNumber);
        let nextLine = this.findPreviousLine(currentLineNumber, currentLevel);
        this.move(nextLine);
    }
    moveDown() {
        let editor = vscode_1.window.activeTextEditor;
        if (!editor) {
            return;
        }
        let currentLineNumber = editor.selection.start.line;
        let currentLevel = this.indentationLevelForLine(currentLineNumber);
        let nextLine = this.findNextLine(currentLineNumber, currentLevel);
        this.move(nextLine);
    }
    moveRight() {
        let editor = vscode_1.window.activeTextEditor;
        if (!editor) {
            return;
        }
        let currentPosition = editor.selection.active.character;
        let indentationPosition = this.indentationLevelForLine(editor.selection.start.line);
        if (currentPosition < indentationPosition) {
            if (editor.selections.length > 1) {
                vscode_1.commands.executeCommand('cursorWordEndRight').then(() => {
                    vscode_1.commands.executeCommand('cursorWordStartLeft');
                });
            }
            else {
                let position = new vscode_1.Position(editor.selection.active.line, indentationPosition);
                editor.selection = new vscode_1.Selection(position, position);
            }
        }
        else {
            vscode_1.commands.executeCommand('cursorWordEndRight');
        }
    }
    selectUp() {
        let editor = vscode_1.window.activeTextEditor;
        if (!editor) {
            return;
        }
        let startPoint = editor.selection.start;
        this.moveUp();
        let endPoint = editor.selection.end;
        editor.selection = new vscode_1.Selection(startPoint, endPoint);
    }
    selectDown() {
        let editor = vscode_1.window.activeTextEditor;
        if (!editor) {
            return;
        }
        let startPoint = editor.selection.start;
        this.moveDown();
        let endPoint = editor.selection.end;
        editor.selection = new vscode_1.Selection(startPoint, endPoint);
    }
    move(toLine) {
        let editor = vscode_1.window.activeTextEditor;
        let currentLineNumber = editor.selection.start.line;
        let currentCharacter = editor.selection.start.character;
        let position = editor.selection.active;
        let newPosition = position.with(toLine, currentCharacter);
        let selection = new vscode_1.Selection(newPosition, newPosition);
        editor.selection = selection;
        editor.revealRange(new vscode_1.Range(newPosition, newPosition));
    }
    indentationLevelForLine(lineToCheck) {
        let editor = vscode_1.window.activeTextEditor;
        let line = editor.document.lineAt(lineToCheck);
        if (line.text.toString().length === 0) {
            return -1;
        }
        else {
            return line.firstNonWhitespaceCharacterIndex;
        }
    }
    findNextLine(currentLineNumber, currentIndentationLevel) {
        let editor = vscode_1.window.activeTextEditor;
        if (currentLineNumber === editor.document.lineCount - 1) {
            return;
        }
        var gap = (this.indentationLevelForLine(currentLineNumber + 1) !== currentIndentationLevel ? true : false);
        for (let lineNumber = currentLineNumber + 1; lineNumber < editor.document.lineCount; lineNumber++) {
            let indentationForLine = this.indentationLevelForLine(lineNumber);
            if (gap && indentationForLine === currentIndentationLevel) {
                return lineNumber;
            }
            else if ((!gap) && indentationForLine !== currentIndentationLevel) {
                return lineNumber - 1;
            }
        }
        return editor.document.lineCount - 1;
    }
    findPreviousLine(currentLineNumber, currentIndentationLevel) {
        let editor = vscode_1.window.activeTextEditor;
        if (currentLineNumber === 0) {
            return;
        }
        var gap = (this.indentationLevelForLine(currentLineNumber - 1) !== currentIndentationLevel ? true : false);
        for (let lineNumber = currentLineNumber - 1; lineNumber > 0; lineNumber--) {
            let indentationForLine = this.indentationLevelForLine(lineNumber);
            if (gap && indentationForLine === currentIndentationLevel) {
                return lineNumber;
            }
            else if ((!gap) && indentationForLine !== currentIndentationLevel) {
                return lineNumber + 1;
            }
        }
        return 0;
    }
    dispose() {
    }
}
//# sourceMappingURL=extension.js.map