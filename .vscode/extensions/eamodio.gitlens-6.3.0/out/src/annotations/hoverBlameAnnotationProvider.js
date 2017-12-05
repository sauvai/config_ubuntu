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
const vscode_1 = require("vscode");
const annotationController_1 = require("./annotationController");
const annotations_1 = require("./annotations");
const blameAnnotationProvider_1 = require("./blameAnnotationProvider");
const logger_1 = require("../logger");
class HoverBlameAnnotationProvider extends blameAnnotationProvider_1.BlameAnnotationProviderBase {
    provideAnnotation(shaOrLine) {
        return __awaiter(this, void 0, void 0, function* () {
            this.annotationType = annotationController_1.FileAnnotationType.Hover;
            const cfg = this._config.annotations.file.hover;
            const blame = yield this.getBlame();
            if (blame === undefined)
                return false;
            if (cfg.heatmap.enabled) {
                const start = process.hrtime();
                const now = Date.now();
                const renderOptions = annotations_1.Annotations.hoverRenderOptions(cfg.heatmap);
                this._decorations = [];
                const decorationsMap = Object.create(null);
                let commit;
                let hover;
                for (const l of blame.lines) {
                    const line = l.line;
                    hover = decorationsMap[l.sha];
                    if (hover !== undefined) {
                        hover = Object.assign({}, hover, { range: new vscode_1.Range(line, 0, line, 0) });
                        this._decorations.push(hover);
                        continue;
                    }
                    commit = blame.commits.get(l.sha);
                    if (commit === undefined)
                        continue;
                    hover = annotations_1.Annotations.hover(commit, renderOptions, now);
                    hover.range = new vscode_1.Range(line, 0, line, 0);
                    this._decorations.push(hover);
                    decorationsMap[l.sha] = hover;
                }
                if (this._decorations.length) {
                    this.editor.setDecorations(this.decoration, this._decorations);
                }
                const duration = process.hrtime(start);
                logger_1.Logger.log(`${(duration[0] * 1000) + Math.floor(duration[1] / 1000000)} ms to compute hover blame annotations`);
            }
            this.registerHoverProviders(cfg);
            this.selection(shaOrLine, blame);
            return true;
        });
    }
}
exports.HoverBlameAnnotationProvider = HoverBlameAnnotationProvider;
//# sourceMappingURL=hoverBlameAnnotationProvider.js.map