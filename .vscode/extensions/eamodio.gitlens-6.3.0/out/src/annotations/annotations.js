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
const annotationController_1 = require("./annotationController");
const commands_1 = require("../commands");
const constants_1 = require("../constants");
const gitService_1 = require("../gitService");
exports.endOfLineIndex = 1000000;
const escapeMarkdownRegEx = /[`\>\#\*\_\-\+\.]/g;
class Annotations {
    static applyHeatmap(decoration, date, now) {
        const color = this.getHeatmapColor(now, date);
        decoration.renderOptions.before.borderColor = color;
    }
    static getHeatmapColor(now, date) {
        const days = system_1.Dates.dateDaysFromNow(date, now);
        if (days <= 2)
            return '#ffeca7';
        if (days <= 7)
            return '#ffdd8c';
        if (days <= 14)
            return '#ffdd7c';
        if (days <= 30)
            return '#fba447';
        if (days <= 60)
            return '#f68736';
        if (days <= 90)
            return '#f37636';
        if (days <= 180)
            return '#ca6632';
        if (days <= 365)
            return '#c0513f';
        if (days <= 730)
            return '#a2503a';
        return '#793738';
    }
    static getHoverCommandBar(commit, hasRemote, annotationType) {
        let commandBar = `[\`${constants_1.GlyphChars.DoubleArrowLeft}\`](${commands_1.DiffWithCommand.getMarkdownCommandArgs(commit)} "Open Changes") `;
        if (commit.previousSha !== undefined) {
            if (annotationType === annotationController_1.FileAnnotationType.RecentChanges) {
                annotationType = annotationController_1.FileAnnotationType.Gutter;
            }
            const uri = gitService_1.GitService.toGitContentUri(commit.previousSha, commit.previousUri.fsPath, commit.repoPath);
            const line = vscode_1.window.activeTextEditor.selection.active.line;
            commandBar += `[\`${constants_1.GlyphChars.SquareWithTopShadow}\`](${commands_1.OpenFileRevisionCommand.getMarkdownCommandArgs(uri, annotationType || annotationController_1.FileAnnotationType.Gutter, line)} "Blame Previous Revision") `;
        }
        if (hasRemote) {
            commandBar += `[\`${constants_1.GlyphChars.ArrowUpRight}\`](${commands_1.OpenCommitInRemoteCommand.getMarkdownCommandArgs(commit.sha)} "Open in Remote") `;
        }
        commandBar += `[\`${constants_1.GlyphChars.MiddleEllipsis}\`](${commands_1.ShowQuickCommitFileDetailsCommand.getMarkdownCommandArgs(commit.sha)} "Show More Actions")`;
        return commandBar;
    }
    static getHoverMessage(commit, dateFormat, hasRemote, annotationType) {
        if (dateFormat === null) {
            dateFormat = 'MMMM Do, YYYY h:MMa';
        }
        let message = '';
        let commandBar = '';
        let showCommitDetailsCommand = '';
        if (!commit.isUncommitted) {
            commandBar = `\n\n${this.getHoverCommandBar(commit, hasRemote, annotationType)}`;
            showCommitDetailsCommand = `[\`${commit.shortSha}\`](${commands_1.ShowQuickCommitDetailsCommand.getMarkdownCommandArgs(commit.sha)} "Show Commit Details")`;
            message = commit.message
                .replace(escapeMarkdownRegEx, '\\$&')
                .replace(/^===/gm, `${constants_1.GlyphChars.ZeroWidthSpace}===`)
                .replace(/\n/g, '  \n');
            message = `\n\n> ${message}`;
        }
        else {
            showCommitDetailsCommand = `\`${commit.shortSha}\``;
        }
        const markdown = new vscode_1.MarkdownString(`${showCommitDetailsCommand} &nbsp; __${commit.author}__, ${commit.fromNow()} &nbsp; _(${commit.formatDate(dateFormat)})_ ${message}${commandBar}`);
        markdown.isTrusted = true;
        return markdown;
    }
    static getHoverDiffMessage(commit, uri, chunkLine) {
        if (chunkLine === undefined || commit.previousSha === undefined)
            return undefined;
        const codeDiff = this.getCodeDiff(chunkLine);
        let message;
        if (commit.isUncommitted) {
            if (uri.sha !== undefined && gitService_1.GitService.isStagedUncommitted(uri.sha)) {
                message = `[\`Changes\`](${commands_1.DiffWithCommand.getMarkdownCommandArgs(commit)} "Open Changes") &nbsp; ${constants_1.GlyphChars.Dash} &nbsp; [\`${commit.previousShortSha}\`](${commands_1.ShowQuickCommitDetailsCommand.getMarkdownCommandArgs(commit.previousSha)} "Show Commit Details") ${constants_1.GlyphChars.ArrowLeftRight} _${uri.shortSha}_\n${codeDiff}`;
            }
            else {
                message = `[\`Changes\`](${commands_1.DiffWithCommand.getMarkdownCommandArgs(commit)} "Open Changes") &nbsp; ${constants_1.GlyphChars.Dash} &nbsp; _uncommitted_\n${codeDiff}`;
            }
        }
        else {
            message = `[\`Changes\`](${commands_1.DiffWithCommand.getMarkdownCommandArgs(commit)} "Open Changes") &nbsp; ${constants_1.GlyphChars.Dash} &nbsp; [\`${commit.previousShortSha}\`](${commands_1.ShowQuickCommitDetailsCommand.getMarkdownCommandArgs(commit.previousSha)} "Show Commit Details") ${constants_1.GlyphChars.ArrowLeftRight} [\`${commit.shortSha}\`](${commands_1.ShowQuickCommitDetailsCommand.getMarkdownCommandArgs(commit.sha)} "Show Commit Details")\n${codeDiff}`;
        }
        const markdown = new vscode_1.MarkdownString(message);
        markdown.isTrusted = true;
        return markdown;
    }
    static getCodeDiff(chunkLine) {
        const previous = chunkLine.previous === undefined ? undefined : chunkLine.previous[0];
        return `\`\`\`
-  ${previous === undefined || previous.line === undefined ? '' : previous.line.trim()}
+  ${chunkLine.line === undefined ? '' : chunkLine.line.trim()}
\`\`\``;
    }
    static changesHover(commit, line, uri, git) {
        return __awaiter(this, void 0, void 0, function* () {
            const sha = !commit.isUncommitted || (uri.sha !== undefined && gitService_1.GitService.isStagedUncommitted(uri.sha))
                ? commit.previousSha
                : undefined;
            const chunkLine = yield git.getDiffForLine(uri, line, sha);
            const message = this.getHoverDiffMessage(commit, uri, chunkLine);
            return {
                hoverMessage: message
            };
        });
    }
    static detailsHover(commit, dateFormat, hasRemote, annotationType) {
        const message = this.getHoverMessage(commit, dateFormat, hasRemote, annotationType);
        return {
            hoverMessage: message
        };
    }
    static gutter(commit, format, dateFormatOrFormatOptions, renderOptions) {
        const decoration = {
            renderOptions: {
                before: Object.assign({}, renderOptions)
            }
        };
        if (commit.isUncommitted) {
            decoration.renderOptions.before.color = renderOptions.uncommittedColor;
        }
        const message = gitService_1.CommitFormatter.fromTemplate(format, commit, dateFormatOrFormatOptions);
        decoration.renderOptions.before.contentText = system_1.Strings.pad(message.replace(/ /g, constants_1.GlyphChars.Space), 1, 1);
        return decoration;
    }
    static gutterRenderOptions(separateLines, heatmap, options) {
        let width = 4;
        for (const token of system_1.Objects.values(options.tokenOptions)) {
            if (token === undefined)
                continue;
            if (token.truncateTo == null) {
                width = 0;
                break;
            }
            width += token.truncateTo;
        }
        let borderStyle = undefined;
        let borderWidth = undefined;
        if (heatmap.enabled) {
            borderStyle = 'solid';
            borderWidth = heatmap.location === 'left' ? '0 0 0 2px' : '0 2px 0 0';
        }
        return {
            backgroundColor: new vscode_1.ThemeColor('gitlens.gutterBackgroundColor'),
            borderStyle: borderStyle,
            borderWidth: borderWidth,
            color: new vscode_1.ThemeColor('gitlens.gutterForegroundColor'),
            height: '100%',
            margin: '0 26px -1px 0',
            textDecoration: separateLines ? 'overline solid rgba(0, 0, 0, .2)' : 'none',
            width: (width > 4) ? `${width}ch` : undefined,
            uncommittedColor: new vscode_1.ThemeColor('gitlens.gutterUncommittedForegroundColor')
        };
    }
    static hover(commit, renderOptions, now) {
        const decoration = {
            renderOptions: { before: Object.assign({}, renderOptions) }
        };
        this.applyHeatmap(decoration, commit.date, now);
        return decoration;
    }
    static hoverRenderOptions(heatmap) {
        if (!heatmap.enabled)
            return { before: undefined };
        return {
            borderStyle: 'solid',
            borderWidth: '0 0 0 2px',
            contentText: constants_1.GlyphChars.ZeroWidthSpace,
            height: '100%',
            margin: '0 26px 0 0',
            textDecoration: 'none'
        };
    }
    static trailing(commit, format, dateFormat) {
        const message = gitService_1.CommitFormatter.fromTemplate(format, commit, {
            truncateMessageAtNewLine: true,
            dateFormat: dateFormat
        });
        return {
            renderOptions: {
                after: {
                    backgroundColor: new vscode_1.ThemeColor('gitlens.trailingLineBackgroundColor'),
                    color: new vscode_1.ThemeColor('gitlens.trailingLineForegroundColor'),
                    contentText: system_1.Strings.pad(message.replace(/ /g, constants_1.GlyphChars.Space), 1, 1)
                }
            }
        };
    }
    static withRange(decoration, start, end) {
        let range = decoration.range;
        if (start !== undefined) {
            range = range.with({
                start: range.start.with({ character: start })
            });
        }
        if (end !== undefined) {
            range = range.with({
                end: range.end.with({ character: end })
            });
        }
        return Object.assign({}, decoration, { range: range });
    }
}
exports.Annotations = Annotations;
//# sourceMappingURL=annotations.js.map