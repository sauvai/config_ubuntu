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
const std = require("./std-headers");
const fs = require("fs");
const path_1 = require("path");
const vscode = require("vscode");
function activate(context) {
    const provider = new IncludeCompletionProvider();
    context.subscriptions.push(provider);
    for (const lang of ["c", "cpp"]) {
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(lang, provider, "<", '"', "/", "\\"));
    }
}
exports.activate = activate;
/**
 * Provides completion suggestions for C++ includes.
 */
class IncludeCompletionProvider {
    constructor() {
        this.dirs = [];
        this.updateDirs();
        this.watcher = vscode.workspace.createFileSystemWatcher("**/c_cpp_properties.json");
        this.watcher.onDidCreate(() => this.updateDirs());
        this.watcher.onDidChange(() => this.updateDirs());
        this.watcher.onDidDelete(() => this.updateDirs());
    }
    dispose() {
        this.watcher.dispose();
    }
    provideCompletionItems(document, position, token) {
        // Check if we are currently inside an include statement.
        const text = document.lineAt(position.line).text.substr(0, position.character);
        const match = text.match(/^\s*#\s*include\s*(<[^>]*|"[^"]*)$/);
        if (!match) {
            return [];
        }
        const delimiter = match[1].substr(0, 1);
        const contents = match[1].substr(1);
        // TODO Get the directories and extensions to search.
        let dirs = this.dirs.slice();
        let exts = vscode.workspace.getConfiguration("include-autocomplete").get("extensions", []);
        // Add includes relative to the file.
        if (delimiter === "<") {
            dirs.push(path_1.dirname(document.uri.fsPath));
        }
        else {
            dirs.unshift(path_1.dirname(document.uri.fsPath));
        }
        // Append already typed path parts. If no path parts are typed, include the standard headers.
        let headers = [];
        let separator = Math.max(contents.lastIndexOf("/"), contents.lastIndexOf("\\"));
        if (separator !== -1) {
            dirs = dirs.map(dir => path_1.join(dir, contents.substr(0, separator)));
        }
        else {
            if (vscode.languages.match("c", document)) {
                headers = std.C.map(header => new vscode.CompletionItem(header, vscode.CompletionItemKind.File));
            }
            else if (vscode.languages.match("cpp", document)) {
                headers = std.CPP.map(header => new vscode.CompletionItem(header, vscode.CompletionItemKind.File));
            }
        }
        // Scan each directory and return the completion items.
        const seen = new Set();
        const promises = dirs.map((dir) => __awaiter(this, void 0, void 0, function* () {
            if (!(yield exists(dir))) {
                return [];
            }
            const entries = yield readdirAndStat(dir);
            const unseen = Object.keys(entries).filter(k => !seen.has(k));
            unseen.forEach(val => seen.add(val));
            return unseen.reduce((items, entry) => {
                if (entries[entry].isDirectory()) {
                    items.push(new vscode.CompletionItem(entry, vscode.CompletionItemKind.Module));
                }
                else if (exts.indexOf(path_1.extname(entry)) !== -1) {
                    items.push(new vscode.CompletionItem(entry, vscode.CompletionItemKind.File));
                }
                return items;
            }, []);
        }));
        return Promise.all(promises).then(items => items.reduce((a, b) => a.concat(b), headers));
    }
    /**
     * Reads the C++ properties and updates the include dirs to search.
     */
    updateDirs() {
        return __awaiter(this, void 0, void 0, function* () {
            const platform = this.getPlatform();
            const filename = path_1.join(vscode.workspace.rootPath, ".vscode/c_cpp_properties.json");
            let properties = undefined;
            let dirs = undefined;
            if (yield exists(filename)) {
                try {
                    properties = JSON.parse(yield readFile(filename, "utf-8"));
                }
                catch (err) { }
            }
            if (typeof properties !== "undefined") {
                const config = properties.configurations.find(c => c.name === platform);
                if (typeof config !== "undefined") {
                    dirs = config.includePath;
                }
            }
            // If we couldn't read a properties file, use default paths.
            if (typeof dirs === "undefined") {
                if (platform === "Win32") {
                    dirs = ["C:/Program Files (x86)/Microsoft Visual Studio 14.0/VC/include"];
                }
                else {
                    dirs = ["/usr/include"];
                }
            }
            // Support ${workspaceRoot}.
            dirs = dirs.map(dir => {
                return dir.replace("${workspaceRoot}", vscode.workspace.rootPath);
            });
            this.dirs = dirs;
        });
    }
    getPlatform() {
        switch (process.platform) {
            case "linux": return "Linux";
            case "darwin": return "Mac";
            case "win32": return "Win32";
            default: return process.platform;
        }
    }
}
function exists(path) {
    return new Promise(c => fs.exists(path, c));
}
function readdir(path) {
    return new Promise((c, e) => fs.readdir(path, (err, files) => err ? e(err) : c(files)));
}
function readFile(filename, encoding) {
    return new Promise((c, e) => fs.readFile(filename, encoding, (err, data) => err ? e(err) : c(data)));
}
function stat(path) {
    return new Promise((c, e) => fs.stat(path, (err, stats) => err ? e(err) : c(stats)));
}
function readdirAndStat(path) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = {};
        const files = yield readdir(path);
        yield Promise.all(files.map((file) => __awaiter(this, void 0, void 0, function* () {
            try {
                result[file] = yield stat(`${path}/${file}`);
            }
            catch (err) { }
        })));
        return result;
    });
}
//# sourceMappingURL=extension.js.map