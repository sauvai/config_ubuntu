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
const explorerNodes_1 = require("../views/explorerNodes");
const gitService_1 = require("../gitService");
const logger_1 = require("../logger");
const telemetry_1 = require("../telemetry");
var Commands;
(function (Commands) {
    Commands["ClearFileAnnotations"] = "gitlens.clearFileAnnotations";
    Commands["CloseUnchangedFiles"] = "gitlens.closeUnchangedFiles";
    Commands["CopyMessageToClipboard"] = "gitlens.copyMessageToClipboard";
    Commands["CopyShaToClipboard"] = "gitlens.copyShaToClipboard";
    Commands["DiffDirectory"] = "gitlens.diffDirectory";
    Commands["ExternalDiffAll"] = "gitlens.externalDiffAll";
    Commands["DiffWith"] = "gitlens.diffWith";
    Commands["DiffWithBranch"] = "gitlens.diffWithBranch";
    Commands["DiffWithNext"] = "gitlens.diffWithNext";
    Commands["DiffWithPrevious"] = "gitlens.diffWithPrevious";
    Commands["DiffLineWithPrevious"] = "gitlens.diffLineWithPrevious";
    Commands["DiffWithRevision"] = "gitlens.diffWithRevision";
    Commands["DiffWithWorking"] = "gitlens.diffWithWorking";
    Commands["DiffLineWithWorking"] = "gitlens.diffLineWithWorking";
    Commands["ExternalDiff"] = "gitlens.externalDiff";
    Commands["OpenChangedFiles"] = "gitlens.openChangedFiles";
    Commands["OpenBranchesInRemote"] = "gitlens.openBranchesInRemote";
    Commands["OpenBranchInRemote"] = "gitlens.openBranchInRemote";
    Commands["OpenCommitInRemote"] = "gitlens.openCommitInRemote";
    Commands["OpenFileInRemote"] = "gitlens.openFileInRemote";
    Commands["OpenFileRevision"] = "gitlens.openFileRevision";
    Commands["OpenInRemote"] = "gitlens.openInRemote";
    Commands["OpenRepoInRemote"] = "gitlens.openRepoInRemote";
    Commands["ResetSuppressedWarnings"] = "gitlens.resetSuppressedWarnings";
    Commands["ShowCommitSearch"] = "gitlens.showCommitSearch";
    Commands["ShowFileBlame"] = "gitlens.showFileBlame";
    Commands["ShowLastQuickPick"] = "gitlens.showLastQuickPick";
    Commands["ShowLineBlame"] = "gitlens.showLineBlame";
    Commands["ShowQuickCommitDetails"] = "gitlens.showQuickCommitDetails";
    Commands["ShowQuickCommitFileDetails"] = "gitlens.showQuickCommitFileDetails";
    Commands["ShowQuickFileHistory"] = "gitlens.showQuickFileHistory";
    Commands["ShowQuickBranchHistory"] = "gitlens.showQuickBranchHistory";
    Commands["ShowQuickCurrentBranchHistory"] = "gitlens.showQuickRepoHistory";
    Commands["ShowQuickRepoStatus"] = "gitlens.showQuickRepoStatus";
    Commands["ShowQuickStashList"] = "gitlens.showQuickStashList";
    Commands["StashApply"] = "gitlens.stashApply";
    Commands["StashDelete"] = "gitlens.stashDelete";
    Commands["StashSave"] = "gitlens.stashSave";
    Commands["ToggleCodeLens"] = "gitlens.toggleCodeLens";
    Commands["ToggleFileBlame"] = "gitlens.toggleFileBlame";
    Commands["ToggleFileRecentChanges"] = "gitlens.toggleFileRecentChanges";
    Commands["ToggleLineBlame"] = "gitlens.toggleLineBlame";
})(Commands = exports.Commands || (exports.Commands = {}));
function getCommandUri(uri, editor) {
    if (uri instanceof vscode_1.Uri)
        return uri;
    if (editor === undefined || editor.document === undefined)
        return undefined;
    return editor.document.uri;
}
exports.getCommandUri = getCommandUri;
function isCommandViewContextWithBranch(context) {
    return context.type === 'view' && context.node.branch && context.node.branch instanceof gitService_1.GitBranch;
}
exports.isCommandViewContextWithBranch = isCommandViewContextWithBranch;
function isCommandViewContextWithCommit(context) {
    return context.type === 'view' && context.node.commit && context.node.commit instanceof gitService_1.GitCommit;
}
exports.isCommandViewContextWithCommit = isCommandViewContextWithCommit;
function isCommandViewContextWithRemote(context) {
    return context.type === 'view' && context.node.remote && context.node.remote instanceof gitService_1.GitRemote;
}
exports.isCommandViewContextWithRemote = isCommandViewContextWithRemote;
function isScmResourceGroup(group) {
    if (group === undefined)
        return false;
    return group.id !== undefined && (group.handle !== undefined || group.label !== undefined || group.resourceStates !== undefined);
}
function isScmResourceState(state) {
    if (state === undefined)
        return false;
    return state.resourceUri !== undefined;
}
function isTextEditor(editor) {
    if (editor === undefined)
        return false;
    return editor.id !== undefined && (editor.edit !== undefined || editor.document !== undefined);
}
class Command extends vscode_1.Disposable {
    constructor(command) {
        super(() => this.dispose());
        this.contextParsingOptions = { editor: false, uri: false };
        if (!Array.isArray(command)) {
            command = [command];
        }
        const subscriptions = [];
        for (const cmd of command) {
            subscriptions.push(vscode_1.commands.registerCommand(cmd, (...args) => this._execute(cmd, ...args), this));
        }
        this._disposable = vscode_1.Disposable.from(...subscriptions);
    }
    static getMarkdownCommandArgsCore(command, args) {
        return `command:${command}?${encodeURIComponent(JSON.stringify(args))}`;
    }
    dispose() {
        this._disposable && this._disposable.dispose();
    }
    preExecute(context, ...args) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.execute(...args);
        });
    }
    _execute(command, ...args) {
        telemetry_1.Telemetry.trackEvent(command);
        const [context, rest] = Command.parseContext(command, this.contextParsingOptions, ...args);
        return this.preExecute(context, ...rest);
    }
    static parseContext(command, options, ...args) {
        let editor = undefined;
        let firstArg = args[0];
        if (options.editor && (firstArg === undefined || isTextEditor(firstArg))) {
            editor = firstArg;
            args = args.slice(1);
            firstArg = args[0];
        }
        if (options.uri && (firstArg === undefined || firstArg instanceof vscode_1.Uri)) {
            const [uri, ...rest] = args;
            return [{ command: command, type: 'uri', editor: editor, uri: uri }, rest];
        }
        if (firstArg instanceof explorerNodes_1.ExplorerNode) {
            const [node, ...rest] = args;
            return [{ command: command, type: 'view', node: node, uri: node.uri }, rest];
        }
        if (isScmResourceState(firstArg)) {
            const states = [];
            let count = 0;
            for (const arg of args) {
                if (!isScmResourceState(arg))
                    break;
                count++;
                states.push(arg);
            }
            return [{ command: command, type: 'scm-states', scmResourceStates: states, uri: states[0].resourceUri }, args.slice(count)];
        }
        if (isScmResourceGroup(firstArg)) {
            const groups = [];
            let count = 0;
            for (const arg of args) {
                if (!isScmResourceGroup(arg))
                    break;
                count++;
                groups.push(arg);
            }
            return [{ command: command, type: 'scm-groups', scmResourceGroups: groups }, args.slice(count)];
        }
        return [{ command: command, type: 'unknown', editor: editor }, args];
    }
}
exports.Command = Command;
class ActiveEditorCommand extends Command {
    constructor(command) {
        super(command);
        this.contextParsingOptions = { editor: true, uri: true };
    }
    preExecute(context, ...args) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.execute(context.editor, context.uri, ...args);
        });
    }
    _execute(command, ...args) {
        return super._execute(command, vscode_1.window.activeTextEditor, ...args);
    }
}
exports.ActiveEditorCommand = ActiveEditorCommand;
let lastCommand = undefined;
function getLastCommand() {
    return lastCommand;
}
exports.getLastCommand = getLastCommand;
class ActiveEditorCachedCommand extends ActiveEditorCommand {
    constructor(command) {
        super(command);
    }
    _execute(command, ...args) {
        lastCommand = {
            command: command,
            args: args
        };
        return super._execute(command, ...args);
    }
}
exports.ActiveEditorCachedCommand = ActiveEditorCachedCommand;
class EditorCommand extends vscode_1.Disposable {
    constructor(command) {
        super(() => this.dispose());
        if (!Array.isArray(command)) {
            command = [command];
        }
        const subscriptions = [];
        for (const cmd of command) {
            subscriptions.push(vscode_1.commands.registerTextEditorCommand(cmd, (editor, edit, ...args) => this.executeCore(cmd, editor, edit, ...args), this));
        }
        this._disposable = vscode_1.Disposable.from(...subscriptions);
    }
    dispose() {
        this._disposable && this._disposable.dispose();
    }
    executeCore(command, editor, edit, ...args) {
        telemetry_1.Telemetry.trackEvent(command);
        return this.execute(editor, edit, ...args);
    }
}
exports.EditorCommand = EditorCommand;
function openEditor(uri, options) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const defaults = {
                preserveFocus: false,
                preview: true,
                viewColumn: (vscode_1.window.activeTextEditor && vscode_1.window.activeTextEditor.viewColumn) || 1
            };
            if (uri instanceof gitService_1.GitUri) {
                uri = vscode_1.Uri.file(uri.fsPath);
            }
            const document = yield vscode_1.workspace.openTextDocument(uri);
            return vscode_1.window.showTextDocument(document, Object.assign({}, defaults, (options || {})));
        }
        catch (ex) {
            logger_1.Logger.error(ex, 'openEditor');
            return undefined;
        }
    });
}
exports.openEditor = openEditor;
//# sourceMappingURL=common.js.map