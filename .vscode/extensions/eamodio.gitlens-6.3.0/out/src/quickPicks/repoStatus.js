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
const system_1 = require("../system");
const vscode_1 = require("vscode");
const commands_1 = require("../commands");
const common_1 = require("./common");
const constants_1 = require("../constants");
const gitService_1 = require("../gitService");
const keyboard_1 = require("../keyboard");
const path = require("path");
class OpenStatusFileCommandQuickPickItem extends common_1.OpenFileCommandQuickPickItem {
    constructor(status, item) {
        const octicon = status.getOcticon();
        const description = status.getFormattedDirectory(true);
        super(status.Uri, item || {
            label: `${status.staged ? '$(check)' : constants_1.GlyphChars.Space.repeat(3)}${system_1.Strings.pad(octicon, 2, 2)} ${path.basename(status.fileName)}`,
            description: description
        });
    }
    onDidPressKey(key) {
        return vscode_1.commands.executeCommand(commands_1.Commands.DiffWithWorking, this.uri, {
            showOptions: {
                preserveFocus: true,
                preview: false
            }
        });
    }
}
exports.OpenStatusFileCommandQuickPickItem = OpenStatusFileCommandQuickPickItem;
class OpenStatusFilesCommandQuickPickItem extends common_1.CommandQuickPickItem {
    constructor(statuses, item) {
        const uris = statuses.map(f => f.Uri);
        super(item || {
            label: `$(file-symlink-file) Open Changed Files`,
            description: ''
        }, commands_1.Commands.OpenChangedFiles, [
            undefined,
            {
                uris
            }
        ]);
    }
}
exports.OpenStatusFilesCommandQuickPickItem = OpenStatusFilesCommandQuickPickItem;
class RepoStatusQuickPick {
    static computeStatus(files) {
        let stagedAdds = 0;
        let unstagedAdds = 0;
        let stagedChanges = 0;
        let unstagedChanges = 0;
        let stagedDeletes = 0;
        let unstagedDeletes = 0;
        const stagedAddsAndChanges = [];
        const unstagedAddsAndChanges = [];
        for (const f of files) {
            switch (f.status) {
                case 'A':
                case '?':
                    if (f.staged) {
                        stagedAdds++;
                        stagedAddsAndChanges.push(f);
                    }
                    else {
                        unstagedAdds++;
                        unstagedAddsAndChanges.push(f);
                    }
                    break;
                case 'D':
                    if (f.staged) {
                        stagedDeletes++;
                    }
                    else {
                        unstagedDeletes++;
                    }
                    break;
                default:
                    if (f.staged) {
                        stagedChanges++;
                        stagedAddsAndChanges.push(f);
                    }
                    else {
                        unstagedChanges++;
                        unstagedAddsAndChanges.push(f);
                    }
                    break;
            }
        }
        const staged = stagedAdds + stagedChanges + stagedDeletes;
        const unstaged = unstagedAdds + unstagedChanges + unstagedDeletes;
        return {
            staged: staged,
            stagedStatus: staged > 0 ? `+${stagedAdds} ~${stagedChanges} -${stagedDeletes}` : '',
            stagedAddsAndChanges: stagedAddsAndChanges,
            unstaged: unstaged,
            unstagedStatus: unstaged > 0 ? `+${unstagedAdds} ~${unstagedChanges} -${unstagedDeletes}` : '',
            unstagedAddsAndChanges: unstagedAddsAndChanges
        };
    }
    static show(status, goBackCommand) {
        return __awaiter(this, void 0, void 0, function* () {
            const files = status.files;
            files.sort((a, b) => (a.staged ? -1 : 1) - (b.staged ? -1 : 1) || a.fileName.localeCompare(b.fileName));
            const items = [...system_1.Iterables.map(files, s => new OpenStatusFileCommandQuickPickItem(s))];
            const currentCommand = new common_1.CommandQuickPickItem({
                label: `go back ${constants_1.GlyphChars.ArrowBack}`,
                description: `${system_1.Strings.pad(constants_1.GlyphChars.Dash, 2, 3)} to ${constants_1.GlyphChars.Space}$(git-branch) ${status.branch} status`
            }, commands_1.Commands.ShowQuickRepoStatus, [
                undefined,
                {
                    goBackCommand
                }
            ]);
            const computed = this.computeStatus(files);
            if (computed.staged > 0) {
                let index = 0;
                const unstagedIndex = computed.unstaged > 0 ? files.findIndex(f => !f.staged) : -1;
                if (unstagedIndex > -1) {
                    items.splice(unstagedIndex, 0, new common_1.CommandQuickPickItem({
                        label: `Unstaged Files`,
                        description: computed.unstagedStatus
                    }, commands_1.Commands.ShowQuickRepoStatus, [
                        undefined,
                        {
                            goBackCommand
                        }
                    ]));
                    items.splice(unstagedIndex, 0, new OpenStatusFilesCommandQuickPickItem(computed.stagedAddsAndChanges, {
                        label: `${constants_1.GlyphChars.Space.repeat(4)} $(file-symlink-file) Open Staged Files`,
                        description: ''
                    }));
                    items.push(new OpenStatusFilesCommandQuickPickItem(computed.unstagedAddsAndChanges, {
                        label: `${constants_1.GlyphChars.Space.repeat(4)} $(file-symlink-file) Open Unstaged Files`,
                        description: ''
                    }));
                }
                items.splice(index++, 0, new common_1.CommandQuickPickItem({
                    label: `Staged Files`,
                    description: computed.stagedStatus
                }, commands_1.Commands.ShowQuickRepoStatus, [
                    undefined,
                    {
                        goBackCommand
                    }
                ]));
            }
            else if (files.some(f => !f.staged)) {
                items.splice(0, 0, new common_1.CommandQuickPickItem({
                    label: `Unstaged Files`,
                    description: computed.unstagedStatus
                }, commands_1.Commands.ShowQuickRepoStatus, [
                    undefined,
                    {
                        goBackCommand
                    }
                ]));
            }
            if (files.length) {
                items.push(new OpenStatusFilesCommandQuickPickItem(computed.stagedAddsAndChanges.concat(computed.unstagedAddsAndChanges)));
                items.push(new common_1.CommandQuickPickItem({
                    label: '$(x) Close Unchanged Files',
                    description: ''
                }, commands_1.Commands.CloseUnchangedFiles));
            }
            else {
                items.push(new common_1.CommandQuickPickItem({
                    label: `No changes in the working tree`,
                    description: ''
                }, commands_1.Commands.ShowQuickRepoStatus, [
                    undefined,
                    {
                        goBackCommand
                    }
                ]));
            }
            items.splice(0, 0, new common_1.CommandQuickPickItem({
                label: `$(inbox) Show Stashed Changes`,
                description: `${system_1.Strings.pad(constants_1.GlyphChars.Dash, 2, 3)} shows stashed changes in the repository`
            }, commands_1.Commands.ShowQuickStashList, [
                new gitService_1.GitUri(vscode_1.Uri.file(status.repoPath), { fileName: '', repoPath: status.repoPath }),
                {
                    goBackCommand: currentCommand
                }
            ]));
            if (status.upstream && status.state.ahead) {
                items.splice(0, 0, new common_1.CommandQuickPickItem({
                    label: `$(cloud-upload)${constants_1.GlyphChars.Space} ${status.state.ahead} Commit${status.state.ahead > 1 ? 's' : ''} ahead of ${constants_1.GlyphChars.Space}$(git-branch) ${status.upstream}`,
                    description: `${system_1.Strings.pad(constants_1.GlyphChars.Dash, 2, 3)} shows commits in ${constants_1.GlyphChars.Space}$(git-branch) ${status.branch} but not ${constants_1.GlyphChars.Space}$(git-branch) ${status.upstream}`
                }, commands_1.Commands.ShowQuickBranchHistory, [
                    new gitService_1.GitUri(vscode_1.Uri.file(status.repoPath), { fileName: '', repoPath: status.repoPath, sha: `${status.upstream}..${status.branch}` }),
                    {
                        branch: status.branch,
                        maxCount: 0,
                        goBackCommand: currentCommand
                    }
                ]));
            }
            if (status.upstream && status.state.behind) {
                items.splice(0, 0, new common_1.CommandQuickPickItem({
                    label: `$(cloud-download)${constants_1.GlyphChars.Space} ${status.state.behind} Commit${status.state.behind > 1 ? 's' : ''} behind ${constants_1.GlyphChars.Space}$(git-branch) ${status.upstream}`,
                    description: `${system_1.Strings.pad(constants_1.GlyphChars.Dash, 2, 3)} shows commits in ${constants_1.GlyphChars.Space}$(git-branch) ${status.upstream} but not ${constants_1.GlyphChars.Space}$(git-branch) ${status.branch}${status.sha ? ` (since ${constants_1.GlyphChars.Space}$(git-commit) ${gitService_1.GitService.shortenSha(status.sha)})` : ''}`
                }, commands_1.Commands.ShowQuickBranchHistory, [
                    new gitService_1.GitUri(vscode_1.Uri.file(status.repoPath), { fileName: '', repoPath: status.repoPath, sha: `${status.branch}..${status.upstream}` }),
                    {
                        branch: status.upstream,
                        maxCount: 0,
                        goBackCommand: currentCommand
                    }
                ]));
            }
            if (status.upstream && !status.state.ahead && !status.state.behind) {
                items.splice(0, 0, new common_1.CommandQuickPickItem({
                    label: `$(git-branch) ${status.branch} is up-to-date with ${constants_1.GlyphChars.Space}$(git-branch) ${status.upstream}`,
                    description: ''
                }, commands_1.Commands.ShowQuickRepoStatus, [
                    undefined,
                    {
                        goBackCommand
                    }
                ]));
            }
            if (goBackCommand) {
                items.splice(0, 0, goBackCommand);
            }
            const scope = yield keyboard_1.Keyboard.instance.beginScope({ left: goBackCommand });
            const pick = yield vscode_1.window.showQuickPick(items, {
                matchOnDescription: true,
                placeHolder: `status of ${status.branch}${status.upstream ? ` ${system_1.Strings.pad(constants_1.GlyphChars.ArrowLeftRight, 1, 1)} ${status.upstream}` : ''}`,
                ignoreFocusOut: common_1.getQuickPickIgnoreFocusOut(),
                onDidSelectItem: (item) => {
                    scope.setKeyCommand('right', item);
                }
            });
            yield scope.dispose();
            return pick;
        });
    }
}
exports.RepoStatusQuickPick = RepoStatusQuickPick;
//# sourceMappingURL=repoStatus.js.map