"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const vscode_1 = require("vscode");
const findUp = require("find-up");
class CurrentWorkingDirectoryManager {
    cwd() {
        // Internal description of the method:
        // Issue: https://github.com/KalitaAlexey/vscode-rust/issues/36
        // The algorithm:
        // * Try finding cwd out of an active text editor
        // * If it succeeds:
        //   * Remember the cwd for later use when for some reasons
        //     a cwd wouldn't be find out of an active text editor
        // * Otherwise:
        //   * Try using a previous cwd
        //   * If there is previous cwd:
        //     * Use it
        //   * Otherwise:
        //     * Try using workspace as cwd
        return this.getCwdFromActiveTextEditor()
            .then(newCwd => {
            this.rememberedCwd = newCwd;
            return newCwd;
        })
            .catch((error) => {
            return this.getPreviousCwd(error);
        })
            .catch((error) => {
            return this.checkWorkspaceCanBeUsedAsCwd().then(canBeUsed => {
                if (canBeUsed) {
                    return Promise.resolve(vscode_1.workspace.rootPath);
                }
                else {
                    return Promise.reject(error);
                }
            });
        });
    }
    checkWorkspaceCanBeUsedAsCwd() {
        if (!vscode_1.workspace.rootPath) {
            return Promise.resolve(false);
        }
        const filePath = path_1.join(vscode_1.workspace.rootPath, 'Cargo.toml');
        return this.checkPathExists(filePath);
    }
    getCwdFromActiveTextEditor() {
        if (!vscode_1.window.activeTextEditor) {
            return Promise.reject(new Error('No active document'));
        }
        const fileName = vscode_1.window.activeTextEditor.document.fileName;
        if (!vscode_1.workspace.rootPath || !fileName.startsWith(vscode_1.workspace.rootPath)) {
            return Promise.reject(new Error('Current document not in the workspace'));
        }
        return this.findCargoTomlUpToWorkspace(path_1.dirname(fileName));
    }
    findCargoTomlUpToWorkspace(cwd) {
        const opts = { cwd: cwd };
        return findUp('Cargo.toml', opts).then((cargoTomlDirPath) => {
            if (!cargoTomlDirPath) {
                return Promise.reject(new Error('Cargo.toml hasn\'t been found'));
            }
            if (!vscode_1.workspace.rootPath || !cargoTomlDirPath.startsWith(vscode_1.workspace.rootPath)) {
                return Promise.reject(new Error('Cargo.toml hasn\'t been found within the workspace'));
            }
            return Promise.resolve(path_1.dirname(cargoTomlDirPath));
        });
    }
    getPreviousCwd(error) {
        if (!this.rememberedCwd) {
            return Promise.reject(error);
        }
        const pathToCargoTomlInPreviousCwd = path_1.join(this.rememberedCwd, 'Cargo.toml');
        return this.checkPathExists(pathToCargoTomlInPreviousCwd).then(exists => {
            if (exists) {
                return Promise.resolve(this.rememberedCwd);
            }
            else {
                return Promise.reject(error);
            }
        });
    }
    checkPathExists(path) {
        return new Promise(resolve => {
            fs_1.access(path, e => {
                // A path exists if there is no error
                const pathExists = !e;
                resolve(pathExists);
            });
        });
    }
}
exports.CurrentWorkingDirectoryManager = CurrentWorkingDirectoryManager;
//# sourceMappingURL=current_working_directory_manager.js.map