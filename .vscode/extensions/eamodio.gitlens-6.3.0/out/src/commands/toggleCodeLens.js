'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("./common");
class ToggleCodeLensCommand extends common_1.EditorCommand {
    constructor(codeLensController) {
        super(common_1.Commands.ToggleCodeLens);
        this.codeLensController = codeLensController;
    }
    execute(editor, edit) {
        return this.codeLensController.toggleCodeLens(editor);
    }
}
exports.ToggleCodeLensCommand = ToggleCodeLensCommand;
//# sourceMappingURL=toggleCodeLens.js.map