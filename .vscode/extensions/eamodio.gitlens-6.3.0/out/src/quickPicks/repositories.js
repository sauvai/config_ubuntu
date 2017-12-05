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
const quickPicks_1 = require("../quickPicks");
class RepositoryQuickPickItem {
    constructor(repository) {
        this.repository = repository;
        this.label = repository.name;
        this.description = repository.path;
    }
    get repoPath() {
        return this.repository.path;
    }
}
exports.RepositoryQuickPickItem = RepositoryQuickPickItem;
class RepositoriesQuickPick {
    static show(git, placeHolder, goBackCommand) {
        return __awaiter(this, void 0, void 0, function* () {
            const items = ([...system_1.Iterables.map(yield git.getRepositories(), r => new RepositoryQuickPickItem(r))]);
            if (goBackCommand !== undefined) {
                items.splice(0, 0, goBackCommand);
            }
            const pick = yield vscode_1.window.showQuickPick(items, {
                placeHolder: placeHolder,
                ignoreFocusOut: quickPicks_1.getQuickPickIgnoreFocusOut()
            });
            return pick;
        });
    }
}
exports.RepositoriesQuickPick = RepositoriesQuickPick;
//# sourceMappingURL=repositories.js.map