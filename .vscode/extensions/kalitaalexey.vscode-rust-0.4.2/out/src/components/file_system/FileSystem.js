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
const fs_1 = require("fs");
const which = require("which");
/**
 * Code related to file system
 */
class FileSystem {
    /**
     * Checks if there is a file or a directory at a specified path
     * @param path a path to check
     * @return true if there is a file or a directory otherwise false
     */
    static doesPathExist(path) {
        return new Promise(resolve => {
            fs_1.access(path, err => {
                const pathExists = !err;
                resolve(pathExists);
            });
        });
    }
    /**
     * Looks for a specified executable at paths specified in the environment variable PATH
     * @param executable an executable to look for
     * @return A path to the executable if it has been found otherwise undefined
     */
    static findExecutablePath(executable) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                which(executable, (err, path) => {
                    if (err) {
                        resolve(undefined);
                    }
                    else {
                        resolve(path);
                    }
                });
            });
        });
    }
}
exports.FileSystem = FileSystem;
//# sourceMappingURL=FileSystem.js.map