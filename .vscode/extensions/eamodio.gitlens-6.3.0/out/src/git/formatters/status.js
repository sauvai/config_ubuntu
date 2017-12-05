'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../constants");
const formatter_1 = require("./formatter");
const status_1 = require("../models/status");
const path = require("path");
class StatusFileFormatter extends formatter_1.Formatter {
    get directory() {
        const directory = status_1.GitStatusFile.getFormattedDirectory(this._item, false, this._options.relativePath);
        return this._padOrTruncate(directory, this._options.tokenOptions.file);
    }
    get file() {
        const file = path.basename(this._item.fileName);
        return this._padOrTruncate(file, this._options.tokenOptions.file);
    }
    get filePath() {
        const filePath = status_1.GitStatusFile.getFormattedPath(this._item, undefined, this._options.relativePath);
        return this._padOrTruncate(filePath, this._options.tokenOptions.filePath);
    }
    get path() {
        const directory = status_1.GitStatusFile.getRelativePath(this._item, this._options.relativePath);
        return this._padOrTruncate(directory, this._options.tokenOptions.file);
    }
    get working() {
        const commit = this._item.commit;
        return (commit !== undefined && commit.isUncommitted) ? `${constants_1.GlyphChars.Pensil} ${constants_1.GlyphChars.Space}` : '';
    }
    static fromTemplate(template, status, dateFormatOrOptions) {
        return super.fromTemplateCore(this, template, status, dateFormatOrOptions);
    }
}
exports.StatusFileFormatter = StatusFileFormatter;
//# sourceMappingURL=status.js.map