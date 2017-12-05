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
const system_1 = require("./system");
const vscode_1 = require("vscode");
const commands_1 = require("./commands");
const configuration_1 = require("./configuration");
const constants_1 = require("./constants");
const gitService_1 = require("./gitService");
const logger_1 = require("./logger");
class GitRecentChangeCodeLens extends vscode_1.CodeLens {
    constructor(symbolKind, uri, blame, blameRange, isFullRange, range, desiredCommand, command) {
        super(range, command);
        this.symbolKind = symbolKind;
        this.uri = uri;
        this.blame = blame;
        this.blameRange = blameRange;
        this.isFullRange = isFullRange;
        this.desiredCommand = desiredCommand;
    }
    getBlame() {
        return this.blame && this.blame();
    }
}
exports.GitRecentChangeCodeLens = GitRecentChangeCodeLens;
class GitAuthorsCodeLens extends vscode_1.CodeLens {
    constructor(symbolKind, uri, blame, blameRange, isFullRange, range, desiredCommand) {
        super(range);
        this.symbolKind = symbolKind;
        this.uri = uri;
        this.blame = blame;
        this.blameRange = blameRange;
        this.isFullRange = isFullRange;
        this.desiredCommand = desiredCommand;
    }
    getBlame() {
        return this.blame();
    }
}
exports.GitAuthorsCodeLens = GitAuthorsCodeLens;
class GitCodeLensProvider {
    constructor(context, git) {
        this.git = git;
        this._onDidChangeCodeLenses = new vscode_1.EventEmitter();
    }
    get onDidChangeCodeLenses() {
        return this._onDidChangeCodeLenses.event;
    }
    reset() {
        this._onDidChangeCodeLenses.fire();
    }
    provideCodeLenses(document, token) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield this.git.isTracked(document.uri.fsPath)))
                return [];
            const dirty = document.isDirty;
            const cfg = configuration_1.configuration.get(configuration_1.configuration.name('codeLens').value, document.uri);
            this._debug = cfg.debug;
            let languageLocations = cfg.perLanguageLocations && cfg.perLanguageLocations.find(ll => ll.language !== undefined && ll.language.toLowerCase() === document.languageId);
            if (languageLocations == null) {
                languageLocations = {
                    language: undefined,
                    locations: cfg.locations,
                    customSymbols: cfg.customLocationSymbols
                };
            }
            languageLocations.customSymbols = languageLocations.customSymbols != null
                ? languageLocations.customSymbols = languageLocations.customSymbols.map(s => s.toLowerCase())
                : [];
            const lenses = [];
            let gitUri;
            let blame;
            let symbols;
            if (!dirty) {
                gitUri = yield gitService_1.GitUri.fromUri(document.uri, this.git);
                if (token.isCancellationRequested)
                    return lenses;
                if (languageLocations.locations.length === 1 && languageLocations.locations.includes(configuration_1.CodeLensLocations.Document)) {
                    blame = yield this.git.getBlameForFile(gitUri);
                }
                else {
                    [blame, symbols] = yield Promise.all([
                        this.git.getBlameForFile(gitUri),
                        vscode_1.commands.executeCommand(constants_1.BuiltInCommands.ExecuteDocumentSymbolProvider, document.uri)
                    ]);
                }
                if (blame === undefined || blame.lines.length === 0)
                    return lenses;
            }
            else {
                if (languageLocations.locations.length !== 1 || !languageLocations.locations.includes(configuration_1.CodeLensLocations.Document)) {
                    symbols = (yield vscode_1.commands.executeCommand(constants_1.BuiltInCommands.ExecuteDocumentSymbolProvider, document.uri));
                }
            }
            if (token.isCancellationRequested)
                return lenses;
            const documentRangeFn = system_1.Functions.once(() => document.validateRange(new vscode_1.Range(0, 1000000, 1000000, 1000000)));
            const dirtyCommand = dirty ? { title: this.getDirtyTitle(cfg) } : undefined;
            if (symbols !== undefined) {
                logger_1.Logger.log('GitCodeLensProvider.provideCodeLenses:', `${symbols.length} symbol(s) found`);
                symbols.forEach(sym => this.provideCodeLens(lenses, document, sym, languageLocations, documentRangeFn, blame, gitUri, cfg, dirty, dirtyCommand));
            }
            if ((languageLocations.locations.includes(configuration_1.CodeLensLocations.Document) || languageLocations.customSymbols.includes('file')) && !languageLocations.customSymbols.includes('!file')) {
                if (!lenses.find(l => l.range.start.line === 0 && l.range.end.line === 0)) {
                    const blameRange = documentRangeFn();
                    let blameForRangeFn = undefined;
                    if (dirty || cfg.recentChange.enabled) {
                        if (!dirty) {
                            blameForRangeFn = system_1.Functions.once(() => this.git.getBlameForRangeSync(blame, gitUri, blameRange));
                        }
                        lenses.push(new GitRecentChangeCodeLens(vscode_1.SymbolKind.File, gitUri, blameForRangeFn, blameRange, true, new vscode_1.Range(0, 0, 0, blameRange.start.character), cfg.recentChange.command, dirtyCommand));
                    }
                    if (!dirty && cfg.authors.enabled) {
                        if (blameForRangeFn === undefined) {
                            blameForRangeFn = system_1.Functions.once(() => this.git.getBlameForRangeSync(blame, gitUri, blameRange));
                        }
                        lenses.push(new GitAuthorsCodeLens(vscode_1.SymbolKind.File, gitUri, blameForRangeFn, blameRange, true, new vscode_1.Range(0, 1, 0, blameRange.start.character), cfg.authors.command));
                    }
                }
            }
            return lenses;
        });
    }
    validateSymbolAndGetBlameRange(symbol, languageLocation, documentRangeFn) {
        let valid = false;
        let range;
        const symbolName = vscode_1.SymbolKind[symbol.kind].toLowerCase();
        switch (symbol.kind) {
            case vscode_1.SymbolKind.File:
                if (languageLocation.locations.includes(configuration_1.CodeLensLocations.Containers) || languageLocation.customSymbols.includes(symbolName)) {
                    valid = !languageLocation.customSymbols.includes(`!${symbolName}`);
                }
                if (valid) {
                    range = documentRangeFn();
                }
                break;
            case vscode_1.SymbolKind.Package:
                if (languageLocation.locations.includes(configuration_1.CodeLensLocations.Containers) || languageLocation.customSymbols.includes(symbolName)) {
                    valid = !languageLocation.customSymbols.includes(`!${symbolName}`);
                }
                if (valid) {
                    if (symbol.location.range.start.line === 0 && symbol.location.range.end.line === 0) {
                        range = documentRangeFn();
                    }
                }
                break;
            case vscode_1.SymbolKind.Class:
            case vscode_1.SymbolKind.Interface:
            case vscode_1.SymbolKind.Module:
            case vscode_1.SymbolKind.Namespace:
            case vscode_1.SymbolKind.Struct:
                if (languageLocation.locations.includes(configuration_1.CodeLensLocations.Containers) || languageLocation.customSymbols.includes(symbolName)) {
                    valid = !languageLocation.customSymbols.includes(`!${symbolName}`);
                }
                break;
            case vscode_1.SymbolKind.Constructor:
            case vscode_1.SymbolKind.Enum:
            case vscode_1.SymbolKind.Function:
            case vscode_1.SymbolKind.Method:
                if (languageLocation.locations.includes(configuration_1.CodeLensLocations.Blocks) || languageLocation.customSymbols.includes(symbolName)) {
                    valid = !languageLocation.customSymbols.includes(`!${symbolName}`);
                }
                break;
            default:
                if (languageLocation.customSymbols.includes(symbolName)) {
                    valid = !languageLocation.customSymbols.includes(`!${symbolName}`);
                }
                break;
        }
        return valid ? range || symbol.location.range : undefined;
    }
    provideCodeLens(lenses, document, symbol, languageLocation, documentRangeFn, blame, gitUri, cfg, dirty, dirtyCommand) {
        const blameRange = this.validateSymbolAndGetBlameRange(symbol, languageLocation, documentRangeFn);
        if (blameRange === undefined)
            return;
        const line = document.lineAt(symbol.location.range.start);
        if (lenses.length && lenses[lenses.length - 1].range.start.line === line.lineNumber)
            return;
        let startChar = 0;
        let blameForRangeFn;
        if (dirty || cfg.recentChange.enabled) {
            if (!dirty) {
                blameForRangeFn = system_1.Functions.once(() => this.git.getBlameForRangeSync(blame, gitUri, blameRange));
            }
            lenses.push(new GitRecentChangeCodeLens(symbol.kind, gitUri, blameForRangeFn, blameRange, false, line.range.with(new vscode_1.Position(line.range.start.line, startChar)), cfg.recentChange.command, dirtyCommand));
            startChar++;
        }
        if (cfg.authors.enabled) {
            let multiline = !blameRange.isSingleLine;
            if (!multiline && document.languageId === 'csharp') {
                switch (symbol.kind) {
                    case vscode_1.SymbolKind.File:
                        break;
                    case vscode_1.SymbolKind.Package:
                    case vscode_1.SymbolKind.Module:
                    case vscode_1.SymbolKind.Namespace:
                    case vscode_1.SymbolKind.Class:
                    case vscode_1.SymbolKind.Interface:
                    case vscode_1.SymbolKind.Constructor:
                    case vscode_1.SymbolKind.Method:
                    case vscode_1.SymbolKind.Function:
                    case vscode_1.SymbolKind.Enum:
                        multiline = true;
                        break;
                }
            }
            if (multiline && !dirty) {
                if (blameForRangeFn === undefined) {
                    blameForRangeFn = system_1.Functions.once(() => this.git.getBlameForRangeSync(blame, gitUri, blameRange));
                }
                lenses.push(new GitAuthorsCodeLens(symbol.kind, gitUri, blameForRangeFn, blameRange, false, line.range.with(new vscode_1.Position(line.range.start.line, startChar)), cfg.authors.command));
            }
        }
    }
    resolveCodeLens(lens, token) {
        if (lens instanceof GitRecentChangeCodeLens)
            return this.resolveGitRecentChangeCodeLens(lens, token);
        if (lens instanceof GitAuthorsCodeLens)
            return this.resolveGitAuthorsCodeLens(lens, token);
        return Promise.reject(undefined);
    }
    resolveGitRecentChangeCodeLens(lens, token) {
        const blame = lens.getBlame();
        if (blame === undefined)
            return lens;
        const recentCommit = system_1.Iterables.first(blame.commits.values());
        let title = `${recentCommit.author}, ${recentCommit.fromNow()}`;
        if (this._debug) {
            title += ` [${vscode_1.SymbolKind[lens.symbolKind]}(${lens.range.start.character}-${lens.range.end.character}), Lines (${lens.blameRange.start.line + 1}-${lens.blameRange.end.line + 1}), Commit (${recentCommit.shortSha})]`;
        }
        switch (lens.desiredCommand) {
            case configuration_1.CodeLensCommand.DiffWithPrevious: return this.applyDiffWithPreviousCommand(title, lens, blame, recentCommit);
            case configuration_1.CodeLensCommand.ShowQuickCommitDetails: return this.applyShowQuickCommitDetailsCommand(title, lens, blame, recentCommit);
            case configuration_1.CodeLensCommand.ShowQuickCommitFileDetails: return this.applyShowQuickCommitFileDetailsCommand(title, lens, blame, recentCommit);
            case configuration_1.CodeLensCommand.ShowQuickCurrentBranchHistory: return this.applyShowQuickCurrentBranchHistoryCommand(title, lens, blame, recentCommit);
            case configuration_1.CodeLensCommand.ShowQuickFileHistory: return this.applyShowQuickFileHistoryCommand(title, lens, blame, recentCommit);
            case configuration_1.CodeLensCommand.ToggleFileBlame: return this.applyToggleFileBlameCommand(title, lens, blame);
            default: return lens;
        }
    }
    resolveGitAuthorsCodeLens(lens, token) {
        const blame = lens.getBlame();
        if (blame === undefined)
            return lens;
        const count = blame.authors.size;
        let title = `${count} ${count > 1 ? 'authors' : 'author'} (${system_1.Iterables.first(blame.authors.values()).name}${count > 1 ? ' and others' : ''})`;
        if (this._debug) {
            title += ` [${vscode_1.SymbolKind[lens.symbolKind]}(${lens.range.start.character}-${lens.range.end.character}), Lines (${lens.blameRange.start.line + 1}-${lens.blameRange.end.line + 1}), Authors (${system_1.Iterables.join(system_1.Iterables.map(blame.authors.values(), a => a.name), ', ')})]`;
        }
        switch (lens.desiredCommand) {
            case configuration_1.CodeLensCommand.DiffWithPrevious: return this.applyDiffWithPreviousCommand(title, lens, blame);
            case configuration_1.CodeLensCommand.ShowQuickCommitDetails: return this.applyShowQuickCommitDetailsCommand(title, lens, blame);
            case configuration_1.CodeLensCommand.ShowQuickCommitFileDetails: return this.applyShowQuickCommitFileDetailsCommand(title, lens, blame);
            case configuration_1.CodeLensCommand.ShowQuickCurrentBranchHistory: return this.applyShowQuickCurrentBranchHistoryCommand(title, lens, blame);
            case configuration_1.CodeLensCommand.ShowQuickFileHistory: return this.applyShowQuickFileHistoryCommand(title, lens, blame);
            case configuration_1.CodeLensCommand.ToggleFileBlame: return this.applyToggleFileBlameCommand(title, lens, blame);
            default: return lens;
        }
    }
    applyDiffWithPreviousCommand(title, lens, blame, commit) {
        if (commit === undefined) {
            const blameLine = blame.allLines[lens.range.start.line];
            commit = blame.commits.get(blameLine.sha);
        }
        lens.command = {
            title: title,
            command: commands_1.Commands.DiffWithPrevious,
            arguments: [
                vscode_1.Uri.file(lens.uri.fsPath),
                {
                    commit: commit,
                    range: lens.isFullRange ? undefined : lens.blameRange
                }
            ]
        };
        return lens;
    }
    applyShowQuickCommitDetailsCommand(title, lens, blame, commit) {
        lens.command = {
            title: title,
            command: commit !== undefined && commit.isUncommitted ? '' : configuration_1.CodeLensCommand.ShowQuickCommitDetails,
            arguments: [
                vscode_1.Uri.file(lens.uri.fsPath),
                {
                    commit,
                    sha: commit === undefined ? undefined : commit.sha
                }
            ]
        };
        return lens;
    }
    applyShowQuickCommitFileDetailsCommand(title, lens, blame, commit) {
        lens.command = {
            title: title,
            command: commit !== undefined && commit.isUncommitted ? '' : configuration_1.CodeLensCommand.ShowQuickCommitFileDetails,
            arguments: [
                vscode_1.Uri.file(lens.uri.fsPath),
                {
                    commit,
                    sha: commit === undefined ? undefined : commit.sha
                }
            ]
        };
        return lens;
    }
    applyShowQuickCurrentBranchHistoryCommand(title, lens, blame, commit) {
        lens.command = {
            title: title,
            command: configuration_1.CodeLensCommand.ShowQuickCurrentBranchHistory,
            arguments: [vscode_1.Uri.file(lens.uri.fsPath)]
        };
        return lens;
    }
    applyShowQuickFileHistoryCommand(title, lens, blame, commit) {
        lens.command = {
            title: title,
            command: configuration_1.CodeLensCommand.ShowQuickFileHistory,
            arguments: [
                vscode_1.Uri.file(lens.uri.fsPath),
                {
                    range: lens.isFullRange ? undefined : lens.blameRange
                }
            ]
        };
        return lens;
    }
    applyToggleFileBlameCommand(title, lens, blame) {
        lens.command = {
            title: title,
            command: commands_1.Commands.ToggleFileBlame,
            arguments: [vscode_1.Uri.file(lens.uri.fsPath)]
        };
        return lens;
    }
    getDirtyTitle(cfg) {
        if (cfg.recentChange.enabled && cfg.authors.enabled) {
            return configuration_1.configuration.get(configuration_1.configuration.name('strings')('codeLens')('unsavedChanges')('recentChangeAndAuthors').value);
        }
        else if (cfg.recentChange.enabled) {
            return configuration_1.configuration.get(configuration_1.configuration.name('strings')('codeLens')('unsavedChanges')('recentChangeOnly').value);
        }
        else {
            return configuration_1.configuration.get(configuration_1.configuration.name('strings')('codeLens')('unsavedChanges')('authorsOnly').value);
        }
    }
}
GitCodeLensProvider.selector = [{ scheme: constants_1.DocumentSchemes.File }, { scheme: constants_1.DocumentSchemes.Git }, { scheme: constants_1.DocumentSchemes.GitLensGit }];
exports.GitCodeLensProvider = GitCodeLensProvider;
//# sourceMappingURL=gitCodeLensProvider.js.map