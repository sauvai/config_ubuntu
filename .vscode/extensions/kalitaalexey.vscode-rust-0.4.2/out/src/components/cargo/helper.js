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
const vscode_1 = require("vscode");
const Configuration_1 = require("../configuration/Configuration");
var CommandStartHandleResult;
(function (CommandStartHandleResult) {
    CommandStartHandleResult[CommandStartHandleResult["StopRunningCommand"] = 0] = "StopRunningCommand";
    CommandStartHandleResult[CommandStartHandleResult["IgnoreNewCommand"] = 1] = "IgnoreNewCommand";
})(CommandStartHandleResult = exports.CommandStartHandleResult || (exports.CommandStartHandleResult = {}));
/**
 * The class stores functionality which can't be placed somewhere else.
 */
class Helper {
    constructor(configuration) {
        this.configuration = configuration;
    }
    handleCommandStartWhenThereIsRunningCommand() {
        const action = this.configuration.getActionOnStartingCommandIfThereIsRunningCommand();
        switch (action) {
            case Configuration_1.ActionOnStartingCommandIfThereIsRunningCommand.ShowDialogToLetUserDecide:
                return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                    const choice = yield vscode_1.window.showInformationMessage('You requested to start a command, but there is another running command', 'Terminate');
                    if (choice === 'Terminate') {
                        resolve(CommandStartHandleResult.StopRunningCommand);
                    }
                    else {
                        resolve(CommandStartHandleResult.IgnoreNewCommand);
                    }
                }));
            case Configuration_1.ActionOnStartingCommandIfThereIsRunningCommand.StopRunningCommand:
                return Promise.resolve(CommandStartHandleResult.StopRunningCommand);
            case Configuration_1.ActionOnStartingCommandIfThereIsRunningCommand.IgnoreNewCommand:
                return Promise.resolve(CommandStartHandleResult.IgnoreNewCommand);
        }
    }
}
exports.Helper = Helper;
//# sourceMappingURL=helper.js.map