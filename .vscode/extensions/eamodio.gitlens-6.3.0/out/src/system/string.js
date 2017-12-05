'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const _escapeRegExp = require('lodash.escaperegexp');
var Strings;
(function (Strings) {
    function escapeRegExp(s) {
        return _escapeRegExp(s);
    }
    Strings.escapeRegExp = escapeRegExp;
    const TokenRegex = /\$\{([^|]*?)(?:\|(\d+)(\-|\?)?)?\}/g;
    const TokenSanitizeRegex = /\$\{(\w*?)(?:\W|\d)*?\}/g;
    function getTokensFromTemplate(template) {
        const tokens = [];
        let match = TokenRegex.exec(template);
        while (match != null) {
            const truncateTo = match[2];
            const option = match[3];
            tokens.push({
                key: match[1],
                options: {
                    truncateTo: truncateTo == null ? undefined : parseInt(truncateTo, 10),
                    padDirection: option === '-' ? 'left' : 'right',
                    collapseWhitespace: option === '?'
                }
            });
            match = TokenRegex.exec(template);
        }
        return tokens;
    }
    Strings.getTokensFromTemplate = getTokensFromTemplate;
    function interpolate(template, context) {
        if (!template)
            return template;
        template = template.replace(TokenSanitizeRegex, '$${this.$1}');
        return new Function(`return \`${template}\`;`).call(context);
    }
    Strings.interpolate = interpolate;
    function* lines(s) {
        let i = 0;
        while (i < s.length) {
            let j = s.indexOf('\n', i);
            if (j === -1) {
                j = s.length;
            }
            yield s.substring(i, j);
            i = j + 1;
        }
    }
    Strings.lines = lines;
    function pad(s, before = 0, after = 0, padding = `\u00a0`) {
        if (before === 0 && after === 0)
            return s;
        return `${before === 0 ? '' : padding.repeat(before)}${s}${after === 0 ? '' : padding.repeat(after)}`;
    }
    Strings.pad = pad;
    function padLeft(s, padTo, padding = '\u00a0') {
        const diff = padTo - width(s);
        return (diff <= 0) ? s : padding.repeat(diff) + s;
    }
    Strings.padLeft = padLeft;
    function padLeftOrTruncate(s, max, padding) {
        const len = width(s);
        if (len < max)
            return padLeft(s, max, padding);
        if (len > max)
            return truncate(s, max);
        return s;
    }
    Strings.padLeftOrTruncate = padLeftOrTruncate;
    function padRight(s, padTo, padding = '\u00a0') {
        const diff = padTo - width(s);
        return (diff <= 0) ? s : s + padding.repeat(diff);
    }
    Strings.padRight = padRight;
    function padOrTruncate(s, max, padding) {
        const left = max < 0;
        max = Math.abs(max);
        const len = width(s);
        if (len < max)
            return left ? padLeft(s, max, padding) : padRight(s, max, padding);
        if (len > max)
            return truncate(s, max);
        return s;
    }
    Strings.padOrTruncate = padOrTruncate;
    function padRightOrTruncate(s, max, padding) {
        const len = width(s);
        if (len < max)
            return padRight(s, max, padding);
        if (len > max)
            return truncate(s, max);
        return s;
    }
    Strings.padRightOrTruncate = padRightOrTruncate;
    const illegalCharsForFSRegEx = /[\\/:*?"<>|\x00-\x1f\x80-\x9f]/g;
    function sanitizeForFileSystem(s, replacement = '_') {
        if (!s)
            return s;
        return s.replace(illegalCharsForFSRegEx, replacement);
    }
    Strings.sanitizeForFileSystem = sanitizeForFileSystem;
    function truncate(s, truncateTo, ellipsis = '\u2026') {
        if (!s)
            return s;
        const len = width(s);
        if (len <= truncateTo)
            return s;
        if (len === s.length)
            return `${s.substring(0, truncateTo - 1)}${ellipsis}`;
        let chars = Math.floor(truncateTo / (len / s.length));
        let count = width(s.substring(0, chars));
        while (count < truncateTo) {
            count += width(s[chars++]);
        }
        if (count >= truncateTo) {
            chars--;
        }
        return `${s.substring(0, chars)}${ellipsis}`;
    }
    Strings.truncate = truncate;
    const ansiRegex = /[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[a-zA-Z\\d]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))/g;
    function width(s) {
        if (!s || s.length === 0)
            return 0;
        s = s.replace(ansiRegex, '');
        let count = 0;
        let emoji = 0;
        let joiners = 0;
        const graphemes = [...s];
        for (let i = 0; i < graphemes.length; i++) {
            const code = graphemes[i].codePointAt(0);
            if (code <= 0x1F || (code >= 0x7F && code <= 0x9F))
                continue;
            if (code >= 0x300 && code <= 0x36F)
                continue;
            if ((code >= 0x1F600 && code <= 0x1F64F) ||
                (code >= 0x1F300 && code <= 0x1F5FF) ||
                (code >= 0x1F680 && code <= 0x1F6FF) ||
                (code >= 0x2600 && code <= 0x26FF) ||
                (code >= 0x2700 && code <= 0x27BF) ||
                (code >= 0xFE00 && code <= 0xFE0F) ||
                (code >= 0x1F900 && code <= 0x1F9FF) ||
                (code >= 65024 && code <= 65039) ||
                (code >= 8400 && code <= 8447)) {
                if (code >= 0x1F3FB && code <= 0x1F3FF)
                    continue;
                emoji++;
                count += 2;
                continue;
            }
            if (code === 8205) {
                joiners++;
                count -= 2;
                continue;
            }
            if (code > 0xFFFF) {
                i++;
            }
            count += isFullwidthCodePoint(code) ? 2 : 1;
        }
        const offset = emoji - joiners;
        if (offset > 1) {
            count += offset - 1;
        }
        return count;
    }
    Strings.width = width;
    function isFullwidthCodePoint(cp) {
        if (cp >= 0x1100 && (cp <= 0x115f ||
            cp === 0x2329 ||
            cp === 0x232a ||
            (0x2e80 <= cp && cp <= 0x3247 && cp !== 0x303f) ||
            (0x3250 <= cp && cp <= 0x4dbf) ||
            (0x4e00 <= cp && cp <= 0xa4c6) ||
            (0xa960 <= cp && cp <= 0xa97c) ||
            (0xac00 <= cp && cp <= 0xd7a3) ||
            (0xf900 <= cp && cp <= 0xfaff) ||
            (0xfe10 <= cp && cp <= 0xfe19) ||
            (0xfe30 <= cp && cp <= 0xfe6b) ||
            (0xff01 <= cp && cp <= 0xff60) ||
            (0xffe0 <= cp && cp <= 0xffe6) ||
            (0x1b000 <= cp && cp <= 0x1b001) ||
            (0x1f200 <= cp && cp <= 0x1f251) ||
            (0x20000 <= cp && cp <= 0x3fffd))) {
            return true;
        }
        return false;
    }
})(Strings = exports.Strings || (exports.Strings = {}));
//# sourceMappingURL=string.js.map