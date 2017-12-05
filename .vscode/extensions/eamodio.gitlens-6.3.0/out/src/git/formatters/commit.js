'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const formatter_1 = require("./formatter");
const constants_1 = require("../../constants");
class CommitFormatter extends formatter_1.Formatter {
    get ago() {
        const ago = this._item.fromNow();
        return this._padOrTruncate(ago, this._options.tokenOptions.ago);
    }
    get author() {
        const author = this._item.author;
        return this._padOrTruncate(author, this._options.tokenOptions.author);
    }
    get authorAgo() {
        const authorAgo = `${this._item.author}, ${this._item.fromNow()}`;
        return this._padOrTruncate(authorAgo, this._options.tokenOptions.authorAgo);
    }
    get date() {
        const date = this._item.formatDate(this._options.dateFormat);
        return this._padOrTruncate(date, this._options.tokenOptions.date);
    }
    get id() {
        if (this._item.isUncommitted && !this._item.isStagedUncommitted)
            return '00000000';
        return this._item.shortSha;
    }
    get message() {
        let message = this._item.isUncommitted ? 'Uncommitted change' : this._item.message;
        if (this._options.truncateMessageAtNewLine) {
            const index = message.indexOf('\n');
            if (index !== -1) {
                message = `${message.substring(0, index)}${constants_1.GlyphChars.Space}${constants_1.GlyphChars.Ellipsis}`;
            }
        }
        return this._padOrTruncate(message, this._options.tokenOptions.message);
    }
    get sha() {
        return this.id;
    }
    static fromTemplate(template, commit, dateFormatOrOptions) {
        return super.fromTemplateCore(this, template, commit, dateFormatOrOptions);
    }
}
exports.CommitFormatter = CommitFormatter;
//# sourceMappingURL=commit.js.map