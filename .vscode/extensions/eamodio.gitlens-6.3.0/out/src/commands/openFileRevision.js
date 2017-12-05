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
const common_1 = require("./common");
const logger_1 = require("../logger");
class OpenFileRevisionCommand extends common_1.ActiveEditorCommand {
    constructor(annotationController) {
        super(common_1.Commands.OpenFileRevision);
        this.annotationController = annotationController;
    }
    static getMarkdownCommandArgs(argsOrUri, annotationType, line) {
        let args;
        if (argsOrUri instanceof vscode_1.Uri) {
            const uri = argsOrUri;
            args = {
                uri: uri,
                line: line,
                annotationType: annotationType
            };
        }
        else {
            args = argsOrUri;
        }
        return super.getMarkdownCommandArgsCore(common_1.Commands.OpenFileRevision, args);
    }
    execute(editor, uri, args = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            args = Object.assign({}, args);
            if (args.line === undefined) {
                args.line = editor === undefined ? 0 : editor.selection.active.line;
            }
            try {
                if (args.line !== undefined && args.line !== 0) {
                    if (args.showOptions === undefined) {
                        args.showOptions = {};
                    }
                    args.showOptions.selection = new vscode_1.Range(args.line, 0, args.line, 0);
                }
                const e = yield common_1.openEditor(args.uri, args.showOptions);
                if (args.annotationType === undefined)
                    return e;
                return this.annotationController.showAnnotations(e, args.annotationType, args.line);
            }
            catch (ex) {
                logger_1.Logger.error(ex, 'OpenFileRevisionCommand');
                return vscode_1.window.showErrorMessage(`Unable to open in file revision. See output channel for more details`);
            }
        });
    }
}
exports.OpenFileRevisionCommand = OpenFileRevisionCommand;
//# sourceMappingURL=openFileRevision.js.map