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
const system_1 = require("../system");
const vscode_1 = require("vscode");
const constants_1 = require("../constants");
const gitExplorer_1 = require("../views/gitExplorer");
const configuration_1 = require("../configuration");
const explorerNodes_1 = require("./explorerNodes");
const commands_1 = require("../commands");
const gitService_1 = require("../gitService");
class ExplorerCommands extends vscode_1.Disposable {
    constructor(explorer) {
        super(() => this.dispose());
        this.explorer = explorer;
        vscode_1.commands.registerCommand('gitlens.gitExplorer.setAutoRefreshToOn', () => this.explorer.setAutoRefresh(configuration_1.configuration.get(configuration_1.configuration.name('gitExplorer')('autoRefresh').value), true), this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.setAutoRefreshToOff', () => this.explorer.setAutoRefresh(configuration_1.configuration.get(configuration_1.configuration.name('gitExplorer')('autoRefresh').value), false), this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.setFilesLayoutToAuto', () => this.setFilesLayout(configuration_1.GitExplorerFilesLayout.Auto), this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.setFilesLayoutToList', () => this.setFilesLayout(configuration_1.GitExplorerFilesLayout.List), this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.setFilesLayoutToTree', () => this.setFilesLayout(configuration_1.GitExplorerFilesLayout.Tree), this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.switchToHistoryView', () => this.explorer.switchTo(gitExplorer_1.GitExplorerView.History), this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.switchToRepositoryView', () => this.explorer.switchTo(gitExplorer_1.GitExplorerView.Repository), this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.refresh', this.explorer.refresh, this.explorer);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.refreshNode', this.explorer.refreshNode, this.explorer);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.openChanges', this.openChanges, this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.openChangesWithWorking', this.openChangesWithWorking, this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.openFile', this.openFile, this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.openFileRevision', this.openFileRevision, this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.openFileRevisionInRemote', this.openFileRevisionInRemote, this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.openChangedFiles', this.openChangedFiles, this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.openChangedFileChanges', this.openChangedFileChanges, this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.openChangedFileChangesWithWorking', this.openChangedFileChangesWithWorking, this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.openChangedFileRevisions', this.openChangedFileRevisions, this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.applyChanges', this.applyChanges, this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.terminalCheckoutBranch', this.terminalCheckoutBranch, this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.terminalCreateBranch', this.terminalCreateBranch, this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.terminalDeleteBranch', this.terminalDeleteBranch, this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.terminalRebaseBranchToRemote', this.terminalRebaseBranchToRemote, this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.terminalSquashBranchIntoCommit', this.terminalSquashBranchIntoCommit, this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.terminalRebaseCommit', this.terminalRebaseCommit, this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.terminalResetCommit', this.terminalResetCommit, this);
        vscode_1.commands.registerCommand('gitlens.gitExplorer.terminalRemoveRemote', this.terminalRemoveRemote, this);
    }
    dispose() {
        this._disposable && this._disposable.dispose();
    }
    applyChanges(node) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.explorer.git.checkoutFile(node.uri);
            return this.openFile(node);
        });
    }
    openChanges(node) {
        const command = node.getCommand();
        if (command === undefined || command.arguments === undefined)
            return;
        const [uri, args] = command.arguments;
        args.showOptions.preview = false;
        return vscode_1.commands.executeCommand(command.command, uri, args);
    }
    openChangesWithWorking(node) {
        const args = {
            commit: node.commit,
            showOptions: {
                preserveFocus: true,
                preview: false
            }
        };
        return vscode_1.commands.executeCommand(commands_1.Commands.DiffWithWorking, new gitService_1.GitUri(node.commit.uri, node.commit), args);
    }
    openFile(node) {
        return commands_1.openEditor(node.uri, { preserveFocus: true, preview: false });
    }
    openFileRevision(node, options = { showOptions: { preserveFocus: true, preview: false } }) {
        return commands_1.openEditor(options.uri || gitService_1.GitService.toGitContentUri(node.uri), options.showOptions || { preserveFocus: true, preview: false });
    }
    openChangedFileChanges(node, options = { preserveFocus: false, preview: false }) {
        return __awaiter(this, void 0, void 0, function* () {
            const repoPath = node.commit.repoPath;
            const uris = node.commit.fileStatuses
                .map(s => gitService_1.GitUri.fromFileStatus(s, repoPath));
            for (const uri of uris) {
                yield this.openDiffWith(repoPath, { uri: uri, sha: node.commit.previousSha !== undefined ? node.commit.previousSha : gitService_1.GitService.deletedSha }, { uri: uri, sha: node.commit.sha }, options);
            }
        });
    }
    openChangedFileChangesWithWorking(node, options = { preserveFocus: false, preview: false }) {
        return __awaiter(this, void 0, void 0, function* () {
            const repoPath = node.commit.repoPath;
            const uris = system_1.Arrays.filterMap(node.commit.fileStatuses, f => f.status !== 'D' ? gitService_1.GitUri.fromFileStatus(f, repoPath) : undefined);
            for (const uri of uris) {
                yield this.openDiffWith(repoPath, { uri: uri, sha: node.commit.sha }, { uri: uri, sha: '' }, options);
            }
        });
    }
    openChangedFiles(node, options = { preserveFocus: false, preview: false }) {
        return __awaiter(this, void 0, void 0, function* () {
            const repoPath = node.commit.repoPath;
            const uris = system_1.Arrays.filterMap(node.commit.fileStatuses, f => f.status !== 'D' ? gitService_1.GitUri.fromFileStatus(f, repoPath) : undefined);
            for (const uri of uris) {
                yield commands_1.openEditor(uri, options);
            }
        });
    }
    openChangedFileRevisions(node, options = { preserveFocus: false, preview: false }) {
        return __awaiter(this, void 0, void 0, function* () {
            const uris = system_1.Arrays.filterMap(node.commit.fileStatuses, f => f.status !== 'D' ? gitService_1.GitService.toGitContentUri(node.commit.sha, f.fileName, node.commit.repoPath, f.originalFileName) : undefined);
            for (const uri of uris) {
                yield commands_1.openEditor(uri, options);
            }
        });
    }
    openDiffWith(repoPath, lhs, rhs, options = { preserveFocus: false, preview: false }) {
        return __awaiter(this, void 0, void 0, function* () {
            const diffArgs = {
                repoPath: repoPath,
                lhs: lhs,
                rhs: rhs,
                showOptions: options
            };
            return vscode_1.commands.executeCommand(commands_1.Commands.DiffWith, diffArgs);
        });
    }
    openFileRevisionInRemote(node) {
        return __awaiter(this, void 0, void 0, function* () {
            return vscode_1.commands.executeCommand(commands_1.Commands.OpenFileInRemote, new gitService_1.GitUri(node.commit.uri, node.commit), { range: false });
        });
    }
    setFilesLayout(layout) {
        return __awaiter(this, void 0, void 0, function* () {
            return configuration_1.configuration.update(configuration_1.configuration.name('gitExplorer')('files')('layout').value, layout, vscode_1.ConfigurationTarget.Global);
        });
    }
    terminalCheckoutBranch(node) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(node instanceof gitExplorer_1.BranchHistoryNode))
                return;
            const command = `checkout ${node.branch.name}`;
            this.sendTerminalCommand(command, node.branch.repoPath);
        });
    }
    terminalCreateBranch(node) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(node instanceof gitExplorer_1.BranchHistoryNode))
                return;
            const name = yield vscode_1.window.showInputBox({
                prompt: `Please provide a branch name (Press 'Enter' to confirm or 'Escape' to cancel)`,
                placeHolder: `Branch name`,
                value: node.branch.remote ? node.branch.getName() : undefined
            });
            if (name === undefined || name === '')
                return;
            const command = `branch ${node.branch.remote ? '-t ' : ''}${name} ${node.branch.name}`;
            this.sendTerminalCommand(command, node.branch.repoPath);
        });
    }
    terminalDeleteBranch(node) {
        if (!(node instanceof gitExplorer_1.BranchHistoryNode))
            return;
        const command = node.branch.remote
            ? `push ${node.branch.remote} :${node.branch.name}`
            : `branch -d ${node.branch.name}`;
        this.sendTerminalCommand(command, node.branch.repoPath);
    }
    terminalRebaseBranchToRemote(node) {
        if (node instanceof gitExplorer_1.BranchHistoryNode) {
            if (!node.branch.current || !node.branch.tracking)
                return;
            const command = `rebase -i ${node.branch.tracking}`;
            this.sendTerminalCommand(command, node.branch.repoPath);
        }
        else if (node instanceof explorerNodes_1.StatusUpstreamNode) {
            const command = `rebase -i ${node.status.upstream}`;
            this.sendTerminalCommand(command, node.status.repoPath);
        }
    }
    terminalSquashBranchIntoCommit(node) {
        if (!(node instanceof gitExplorer_1.BranchHistoryNode))
            return;
        const command = `merge --squash ${node.branch.name}`;
        this.sendTerminalCommand(command, node.branch.repoPath);
    }
    terminalRebaseCommit(node) {
        if (!(node instanceof explorerNodes_1.CommitNode))
            return;
        const command = `rebase -i ${node.commit.sha}^`;
        this.sendTerminalCommand(command, node.commit.repoPath);
    }
    terminalResetCommit(node) {
        if (!(node instanceof explorerNodes_1.CommitNode))
            return;
        const command = `reset --soft ${node.commit.sha}^`;
        this.sendTerminalCommand(command, node.commit.repoPath);
    }
    terminalRemoveRemote(node) {
        if (!(node instanceof explorerNodes_1.RemoteNode))
            return;
        const command = `remote remove ${node.remote.name}`;
        this.sendTerminalCommand(command, node.remote.repoPath);
    }
    ensureTerminal() {
        if (this._terminal === undefined) {
            this._terminal = vscode_1.window.createTerminal(constants_1.ExtensionTerminalName);
            this._disposable = vscode_1.window.onDidCloseTerminal((e) => {
                if (e.name === constants_1.ExtensionTerminalName) {
                    this._terminal = undefined;
                    this._disposable.dispose();
                    this._disposable = undefined;
                }
            }, this);
            this.explorer.context.subscriptions.push(this._disposable);
        }
        return this._terminal;
    }
    sendTerminalCommand(command, cwd) {
        const terminal = this.ensureTerminal();
        terminal.show(false);
        terminal.sendText(`git -C ${cwd} ${command}`, false);
    }
}
exports.ExplorerCommands = ExplorerCommands;
//# sourceMappingURL=explorerCommands.js.map