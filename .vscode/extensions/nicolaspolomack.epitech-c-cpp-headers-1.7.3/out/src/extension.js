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
const vscode = require("vscode");
const os = require("os");
const path = require("path");
const escapeRegExpString = require("escape-string-regexp");
const eols = ["", "\n", "\r\n"];
const supported = {
    "c": "c",
    "h": "c",
    "cpp": "cpp",
    "hpp": "cpp",
    "cc": "cpp",
    "hh": "cpp",
    "C": "cpp",
    "H": "cpp",
    "cxx": "cpp",
    "hxx": "cpp",
    "c++": "cpp",
    "h++": "cpp",
    "Makefile": "Makefile",
    "py": "Python",
    "sh": "Shell",
    "tex": "LaTeX",
    "java": "Java",
    "cs": "C#",
    "m": "ObjectiveC"
};
const syntax = {
    pre2017: {
        headerMadeBy: "Made by ",
        headerLogin: "Login   ",
        headerLoginBeg: "<",
        headerLoginMid: "",
        headerLoginEnd: ">",
        headerStarted: "Started on  ",
        headerLast: "Last update ",
        headerFor: " for ",
        headerIn: " in ",
        domaineName: "",
        offsetHeaderFile: 13,
        preProcessorStyle: "# "
    },
    post2017: {
        offsetHeaderFile: 10,
        preProcessorStyle: "	#"
    },
    commentStart: { c: "/*", cpp: "//", Makefile: "##", Python: "##", Shell: "##", LaTeX: "%%", Java: "/*", "C#": "/*", ObjectiveC: "/*" },
    commentMid: { c: "**", cpp: "//", Makefile: "##", Python: "##", Shell: "##", LaTeX: "%%", Java: "**", "C#": "**", ObjectiveC: "**" },
    commentEnd: { c: "*/", cpp: "//", Makefile: "##", Python: "##", Shell: "##", LaTeX: "%%", Java: "*/", "C#": "*/", ObjectiveC: "*/" }
};
const Days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const Months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const generate = {
    pre2017: generatePre2017Header,
    post2017: generatePost2017Header
};
function configureSettings(config, force = false) {
    return __awaiter(this, void 0, void 0, function* () {
        if (config.username === null || force) {
            let resp = yield vscode.window.showInputBox({ prompt: "Type EPITECH username: " });
            if (resp !== undefined)
                config.update("username", resp, true);
        }
        if (config.login === null || force) {
            let resp = yield vscode.window.showInputBox({ prompt: "Type EPITECH login: " });
            if (resp !== undefined)
                config.update("login", resp, true);
        }
        let resp = yield vscode.window.showQuickPick(["Pre 2017", "Post 2017"], { placeHolder: "Select the header format to use:" });
        config.update("headerType", resp.replace(/\s+/g, '').toLowerCase());
        vscode.window.showInformationMessage("EPITECH Headers have been successfully configured !");
    });
}
function generatePre2017Header(fileInfo, config, date) {
    let editContent = "";
    editContent = editContent.concat(syntax.commentStart[fileInfo.langId], fileInfo.eol);
    editContent = editContent.concat(syntax.commentMid[fileInfo.langId], " ", path.basename(fileInfo.fileName), syntax.pre2017.headerFor, fileInfo.projName, syntax.pre2017.headerIn, path.dirname(fileInfo.fileName), fileInfo.eol);
    editContent = editContent.concat(syntax.commentMid[fileInfo.langId], fileInfo.eol);
    editContent = editContent.concat(syntax.commentMid[fileInfo.langId], " ", syntax.pre2017.headerMadeBy, config.username, fileInfo.eol);
    editContent = editContent.concat(syntax.commentMid[fileInfo.langId], " ", syntax.pre2017.headerLogin, syntax.pre2017.headerLoginBeg, config.login, syntax.pre2017.headerLoginMid, syntax.pre2017.domaineName, syntax.pre2017.headerLoginEnd, fileInfo.eol);
    editContent = editContent.concat(syntax.commentMid[fileInfo.langId], fileInfo.eol);
    editContent = editContent.concat(syntax.commentMid[fileInfo.langId], " ", syntax.pre2017.headerStarted, Days[date.getDay()], " ", Months[date.getMonth()], " ", date.getDate().toString(), " ", date.toLocaleTimeString(), " ", date.getFullYear().toString(), " ", config.username, fileInfo.eol);
    editContent = editContent.concat(syntax.commentMid[fileInfo.langId], " ", syntax.pre2017.headerLast, Days[date.getDay()], " ", Months[date.getMonth()], " ", date.getDate().toString(), " ", date.toLocaleTimeString(), " ", date.getFullYear().toString(), " ", config.username, fileInfo.eol);
    editContent = editContent.concat(syntax.commentEnd[fileInfo.langId], fileInfo.eol, fileInfo.eol);
    return editContent;
}
function generatePost2017Header(fileInfo, config, date) {
    let editContent = "";
    editContent = editContent.concat(syntax.commentStart[fileInfo.langId], fileInfo.eol);
    editContent = editContent.concat(syntax.commentMid[fileInfo.langId], " ", "EPITECH PROJECT, ", date.getFullYear().toString(), fileInfo.eol);
    editContent = editContent.concat(syntax.commentMid[fileInfo.langId], " ", fileInfo.projName, fileInfo.eol);
    editContent = editContent.concat(syntax.commentMid[fileInfo.langId], " ", "File description:", fileInfo.eol);
    editContent = editContent.concat(syntax.commentMid[fileInfo.langId], " ", fileInfo.description, fileInfo.eol);
    editContent = editContent.concat(syntax.commentEnd[fileInfo.langId], fileInfo.eol, fileInfo.eol);
    return editContent;
}
function activate(context) {
    let extConfig = vscode.workspace.getConfiguration("epitech-c-cpp-headers");
    if (extConfig.prompt === true && (extConfig.username === null || extConfig.login === null || extConfig.headerType === null))
        vscode.window.showInformationMessage("Do you want to quickly set up EPITECH headers ?", "Yes", "No").then((resp) => {
            if (resp === "Yes")
                configureSettings(extConfig);
        });
    let disposables = [
        vscode.commands.registerCommand('epitech-c-cpp-headers.addHeader', () => __awaiter(this, void 0, void 0, function* () {
            let date = new Date();
            let fileInfo = {};
            let config = {};
            fileInfo.editor = vscode.window.activeTextEditor;
            fileInfo.document = fileInfo.editor.document;
            fileInfo.fileName = fileInfo.document.fileName;
            fileInfo.uri = fileInfo.document.uri;
            fileInfo.eol = eols[fileInfo.document.eol];
            fileInfo.ext = path.basename(fileInfo.fileName).split(".").reverse()[0];
            if (Object.keys(supported).indexOf(fileInfo.ext) == -1) {
                vscode.window.showErrorMessage("The currently opened file isn't a supported file.");
                return;
            }
            fileInfo.langId = supported[fileInfo.ext];
            fileInfo.projName = yield vscode.window.showInputBox({ prompt: "Type project name: " });
            if (fileInfo.projName === undefined)
                return;
            config.handle = vscode.workspace.getConfiguration("epitech-c-cpp-headers");
            config.username = (config.handle.username === null) ? os.userInfo().username : config.handle.username;
            config.login = (config.handle.login === null) ? "" : config.handle.login;
            config.headerType = config.handle.headerType;
            if (config.headerType == "post2017") {
                fileInfo.description = yield vscode.window.showInputBox({ prompt: "Type project description: " });
                if (fileInfo.description === undefined)
                    fileInfo.description = "";
            }
            let editContent = generate[config.headerType](fileInfo, config, date);
            let isEmptyHeaderFile = (fileInfo.document.getText() == '' && fileInfo.ext.match(/^h|hpp|H|hh$/));
            if (isEmptyHeaderFile) {
                let id = path.basename(fileInfo.fileName).replace('.', '_').concat("_").toLocaleUpperCase();
                editContent = editContent.concat("#ifndef ", id, fileInfo.eol, syntax[config.headerType].preProcessorStyle, "define ", id, fileInfo.eol, fileInfo.eol, fileInfo.eol, fileInfo.eol, "#endif /* !", id, " */", fileInfo.eol);
            }
            let edit = new vscode.WorkspaceEdit();
            edit.set(fileInfo.uri, [vscode.TextEdit.insert(new vscode.Position(0, 0), editContent)]);
            vscode.workspace.applyEdit(edit);
            if (isEmptyHeaderFile) {
                let pos = new vscode.Position(syntax[config.headerType].offsetHeaderFile, 0);
                fileInfo.editor.selection = new vscode.Selection(pos, pos);
            }
        })),
        vscode.commands.registerCommand('epitech-c-cpp-headers.setConfig', () => {
            configureSettings(vscode.workspace.getConfiguration("epitech-c-cpp-headers"), true);
        })
    ];
    context.subscriptions.push(...disposables);
    vscode.workspace.onWillSaveTextDocument((ev) => {
        ev.waitUntil(new Promise((resolve, reject) => {
            let config = vscode.workspace.getConfiguration("epitech-c-cpp-headers");
            if (config.headerType == "post2017")
                resolve();
            let langId = path.basename(ev.document.fileName).split(".").reverse()[0];
            if (Object.keys(supported).indexOf(langId) == -1)
                resolve();
            langId = supported[langId];
            let date = new Date();
            let username = vscode.workspace.getConfiguration("epitech-c-cpp-headers").username;
            username = (username === null) ? os.userInfo().username : username;
            let file = ev.document.getText();
            let regex = new RegExp(`(${escapeRegExpString(syntax.commentMid[langId])} ${escapeRegExpString(syntax.pre2017.headerLast)})(.*)(${eols[ev.document.eol]})`);
            let match = regex.exec(file);
            if (match.length == 0)
                resolve();
            let TextEdit = new vscode.TextEdit(new vscode.Range(ev.document.positionAt(match.index), ev.document.positionAt(match.index + match[0].length)), syntax.commentMid[langId].concat(" ", syntax.pre2017.headerLast, Days[date.getDay()], " ", Months[date.getMonth()], " ", date.getDate().toString(), " ", date.toLocaleTimeString(), " ", date.getFullYear().toString(), " ", username, eols[ev.document.eol]));
            resolve([TextEdit]);
        }));
    });
}
exports.activate = activate;
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map