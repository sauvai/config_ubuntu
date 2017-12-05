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
const configuration_1 = require("../configuration");
class ResetSuppressedWarningsCommand extends common_1.Command {
    constructor() {
        super(common_1.Commands.ResetSuppressedWarnings);
    }
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            yield configuration_1.configuration.update(configuration_1.configuration.name('advanced')('messages').value, undefined, vscode_1.ConfigurationTarget.Global);
        });
    }
}
exports.ResetSuppressedWarningsCommand = ResetSuppressedWarningsCommand;
//# sourceMappingURL=resetSuppressedWarnings.js.map