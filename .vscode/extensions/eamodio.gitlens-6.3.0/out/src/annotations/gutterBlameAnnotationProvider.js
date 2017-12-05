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
const annotationController_1 = require("./annotationController");
const annotations_1 = require("./annotations");
const blameAnnotationProvider_1 = require("./blameAnnotationProvider");
const constants_1 = require("../constants");
const logger_1 = require("../logger");
class GutterBlameAnnotationProvider extends blameAnnotationProvider_1.BlameAnnotationProviderBase {
    provideAnnotation(shaOrLine, type) {
        return __awaiter(this, void 0, void 0, function* () {
            this.annotationType = annotationController_1.FileAnnotationType.Gutter;
            const blame = yield this.getBlame();
            if (blame === undefined)
                return false;
            const start = process.hrtime();
            const cfg = this._config.annotations.file.gutter;
            const tokenOptions = system_1.Strings.getTokensFromTemplate(cfg.format)
                .reduce((map, token) => {
                map[token.key] = token.options;
                return map;
            }, {});
            const options = {
                dateFormat: cfg.dateFormat === null ? this._config.defaultDateFormat : cfg.dateFormat,
                tokenOptions: tokenOptions
            };
            const now = Date.now();
            const separateLines = this._config.annotations.file.gutter.separateLines;
            const renderOptions = annotations_1.Annotations.gutterRenderOptions(separateLines, cfg.heatmap, options);
            this._decorations = [];
            const decorationsMap = Object.create(null);
            let commit;
            let compacted = false;
            let gutter;
            let previousSha;
            for (const l of blame.lines) {
                const line = l.line;
                if (previousSha === l.sha) {
                    gutter = Object.assign({}, gutter);
                    if (cfg.compact && !compacted) {
                        gutter.renderOptions = {
                            before: Object.assign({}, gutter.renderOptions.before, { contentText: constants_1.GlyphChars.Space.repeat(system_1.Strings.width(gutter.renderOptions.before.contentText)) })
                        };
                        if (separateLines) {
                            gutter.renderOptions.before.textDecoration = 'none';
                        }
                        compacted = true;
                    }
                    gutter.range = new vscode_1.Range(line, 0, line, 0);
                    this._decorations.push(gutter);
                    continue;
                }
                compacted = false;
                previousSha = l.sha;
                gutter = decorationsMap[l.sha];
                if (gutter !== undefined) {
                    gutter = Object.assign({}, gutter, { range: new vscode_1.Range(line, 0, line, 0) });
                    this._decorations.push(gutter);
                    continue;
                }
                commit = blame.commits.get(l.sha);
                if (commit === undefined)
                    continue;
                gutter = annotations_1.Annotations.gutter(commit, cfg.format, options, renderOptions);
                if (cfg.heatmap.enabled) {
                    annotations_1.Annotations.applyHeatmap(gutter, commit.date, now);
                }
                gutter.range = new vscode_1.Range(line, 0, line, 0);
                this._decorations.push(gutter);
                decorationsMap[l.sha] = gutter;
            }
            if (this._decorations.length) {
                this.editor.setDecorations(this.decoration, this._decorations);
            }
            const duration = process.hrtime(start);
            logger_1.Logger.log(`${(duration[0] * 1000) + Math.floor(duration[1] / 1000000)} ms to compute gutter blame annotations`);
            this.registerHoverProviders(cfg.hover);
            this.selection(shaOrLine, blame);
            return true;
        });
    }
}
exports.GutterBlameAnnotationProvider = GutterBlameAnnotationProvider;
//# sourceMappingURL=gutterBlameAnnotationProvider.js.map