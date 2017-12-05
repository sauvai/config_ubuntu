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
const FileSystem_1 = require("../file_system/FileSystem");
const Configuration_1 = require("./Configuration");
/**
 * This class provides functionality related to Rust's source
 */
class RustSource {
    /**
     * Creates a new instance of the class
     * @param rustup The rustup object
     */
    static create(rustup) {
        return __awaiter(this, void 0, void 0, function* () {
            const path = yield getPath(rustup);
            return new RustSource(path);
        });
    }
    /**
     * Returns the path
     */
    getPath() {
        return this._path;
    }
    constructor(path) {
        this._path = path;
    }
}
exports.RustSource = RustSource;
function getPath(rustup) {
    return __awaiter(this, void 0, void 0, function* () {
        const userPath = yield getUserPath();
        if (userPath) {
            return userPath;
        }
        if (rustup) {
            return rustup.getPathToRustSourceCode();
        }
        else {
            return undefined;
        }
    });
}
function getUserPath() {
    return __awaiter(this, void 0, void 0, function* () {
        const configurationPath = yield getConfigurationPath();
        if (configurationPath) {
            return configurationPath;
        }
        return yield getEnvPath();
    });
}
function checkPath(path) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!path) {
            return undefined;
        }
        if (yield FileSystem_1.FileSystem.doesPathExist(path)) {
            return path;
        }
        else {
            return undefined;
        }
    });
}
function getConfigurationPath() {
    return __awaiter(this, void 0, void 0, function* () {
        const path = Configuration_1.Configuration.getPathConfigParameter('rustLangSrcPath');
        return yield checkPath(path);
    });
}
function getEnvPath() {
    return __awaiter(this, void 0, void 0, function* () {
        const path = Configuration_1.Configuration.getPathEnvParameter('RUST_SRC_PATH');
        return yield checkPath(path);
    });
}
//# sourceMappingURL=RustSource.js.map