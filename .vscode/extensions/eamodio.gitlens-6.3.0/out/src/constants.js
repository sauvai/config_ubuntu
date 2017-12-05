'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
exports.ExtensionId = 'gitlens';
exports.ExtensionKey = exports.ExtensionId;
exports.ExtensionOutputChannelName = 'GitLens';
exports.ExtensionTerminalName = 'GitLens';
exports.QualifiedExtensionId = `eamodio.${exports.ExtensionId}`;
exports.ApplicationInsightsKey = 'a9c302f8-6483-4d01-b92c-c159c799c679';
var BuiltInCommands;
(function (BuiltInCommands) {
    BuiltInCommands["CloseActiveEditor"] = "workbench.action.closeActiveEditor";
    BuiltInCommands["CloseAllEditors"] = "workbench.action.closeAllEditors";
    BuiltInCommands["CursorMove"] = "cursorMove";
    BuiltInCommands["Diff"] = "vscode.diff";
    BuiltInCommands["EditorScroll"] = "editorScroll";
    BuiltInCommands["ExecuteDocumentSymbolProvider"] = "vscode.executeDocumentSymbolProvider";
    BuiltInCommands["ExecuteCodeLensProvider"] = "vscode.executeCodeLensProvider";
    BuiltInCommands["Open"] = "vscode.open";
    BuiltInCommands["NextEditor"] = "workbench.action.nextEditor";
    BuiltInCommands["PreviewHtml"] = "vscode.previewHtml";
    BuiltInCommands["RevealLine"] = "revealLine";
    BuiltInCommands["SetContext"] = "setContext";
    BuiltInCommands["ShowReferences"] = "editor.action.showReferences";
})(BuiltInCommands = exports.BuiltInCommands || (exports.BuiltInCommands = {}));
var CommandContext;
(function (CommandContext) {
    CommandContext["AnnotationStatus"] = "gitlens:annotationStatus";
    CommandContext["CanToggleCodeLens"] = "gitlens:canToggleCodeLens";
    CommandContext["Enabled"] = "gitlens:enabled";
    CommandContext["GitExplorer"] = "gitlens:gitExplorer";
    CommandContext["GitExplorerAutoRefresh"] = "gitlens:gitExplorer:autoRefresh";
    CommandContext["GitExplorerFilesLayout"] = "gitlens:gitExplorer:files:layout";
    CommandContext["GitExplorerView"] = "gitlens:gitExplorer:view";
    CommandContext["HasRemotes"] = "gitlens:hasRemotes";
    CommandContext["HasRepository"] = "gitlens:hasRepository";
    CommandContext["ActiveHasRemote"] = "gitlens:activeHasRemote";
    CommandContext["ActiveIsBlameable"] = "gitlens:activeIsBlameable";
    CommandContext["ActiveFileIsTracked"] = "gitlens:activeIsTracked";
    CommandContext["Key"] = "gitlens:key";
})(CommandContext = exports.CommandContext || (exports.CommandContext = {}));
function setCommandContext(key, value) {
    return vscode_1.commands.executeCommand(BuiltInCommands.SetContext, key, value);
}
exports.setCommandContext = setCommandContext;
var DocumentSchemes;
(function (DocumentSchemes) {
    DocumentSchemes["DebugConsole"] = "debug";
    DocumentSchemes["File"] = "file";
    DocumentSchemes["Git"] = "git";
    DocumentSchemes["GitLensGit"] = "gitlens-git";
    DocumentSchemes["Output"] = "output";
})(DocumentSchemes = exports.DocumentSchemes || (exports.DocumentSchemes = {}));
function isTextEditor(editor) {
    const scheme = editor.document.uri.scheme;
    return scheme !== DocumentSchemes.Output && scheme !== DocumentSchemes.DebugConsole;
}
exports.isTextEditor = isTextEditor;
var GlyphChars;
(function (GlyphChars) {
    GlyphChars["ArrowBack"] = "\u21A9";
    GlyphChars["ArrowDown"] = "\u2193";
    GlyphChars["ArrowDropRight"] = "\u2937";
    GlyphChars["ArrowLeft"] = "\u2190";
    GlyphChars["ArrowLeftRight"] = "\u2194";
    GlyphChars["ArrowRight"] = "\u2192";
    GlyphChars["ArrowRightHollow"] = "\u21E8";
    GlyphChars["ArrowUp"] = "\u2191";
    GlyphChars["ArrowUpRight"] = "\u2197";
    GlyphChars["Asterisk"] = "\u2217";
    GlyphChars["Check"] = "\u2713";
    GlyphChars["Dash"] = "\u2014";
    GlyphChars["Dot"] = "\u2022";
    GlyphChars["DoubleArrowLeft"] = "\u226A";
    GlyphChars["DoubleArrowRight"] = "\u22D8";
    GlyphChars["Ellipsis"] = "\u2026";
    GlyphChars["MiddleEllipsis"] = "\u22EF";
    GlyphChars["Pensil"] = "\u270E";
    GlyphChars["Space"] = "\u00A0";
    GlyphChars["SquareWithBottomShadow"] = "\u274F";
    GlyphChars["SquareWithTopShadow"] = "\u2750";
    GlyphChars["ZeroWidthSpace"] = "\u200B";
})(GlyphChars = exports.GlyphChars || (exports.GlyphChars = {}));
var GlobalState;
(function (GlobalState) {
    GlobalState["GitLensVersion"] = "gitlensVersion";
})(GlobalState = exports.GlobalState || (exports.GlobalState = {}));
var WorkspaceState;
(function (WorkspaceState) {
    WorkspaceState["GitExplorerAutoRefresh"] = "gitlens:gitExplorer:autoRefresh";
    WorkspaceState["GitExplorerView"] = "gitlens:gitExplorer:view";
})(WorkspaceState = exports.WorkspaceState || (exports.WorkspaceState = {}));
//# sourceMappingURL=constants.js.map