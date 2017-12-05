"use strict";
/**
 * This module defines important directories and paths to the extension
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
/**
 * Directory class.
 */
class Dirs {
    /**
     * The current user's home directory
     */
    get userHome() { return process.env['HOME'] || process.env['PROFILE']; }
    /**
     * The user-local data directory. This is where user-specific persistent
     * application data should be stored.
     */
    get userLocalDir() {
        if (process.platform == 'win32') {
            return process.env['AppData'];
        }
        else {
            const xdg_dir = process.env["XDG_DATA_HOME"];
            if (xdg_dir) {
                return xdg_dir;
            }
            const home = this.userHome;
            return path.join(home, '.local/share');
        }
    }
    /**
     * The directory where CMake Tools should store user-specific persistent
     * data.
     */
    get dataDir() { return path.join(this.userLocalDir, 'CMakeTools'); }
    /**
     * Get the platform-specific temporary directory
     */
    get tmpDir() {
        if (process.platform == 'win32') {
            return process.env['TEMP'];
        }
        else {
            return '/tmp';
        }
    }
}
const dirs = new Dirs();
exports.default = dirs;
//# sourceMappingURL=dirs.js.map