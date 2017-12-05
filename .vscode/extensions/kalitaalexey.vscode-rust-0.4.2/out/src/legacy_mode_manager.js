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
const completion_manager_1 = require("./components/completion/completion_manager");
const formatting_manager_1 = require("./components/formatting/formatting_manager");
const document_symbol_provision_manager_1 = require("./components/symbol_provision/document_symbol_provision_manager");
const workspace_symbol_provision_manager_1 = require("./components/symbol_provision/workspace_symbol_provision_manager");
const installator_1 = require("./components/tools_installation/installator");
class LegacyModeManager {
    static create(context, configuration, cargoInvocationManager, rustSource, rustup, currentWorkingDirectoryManager, logger) {
        return __awaiter(this, void 0, void 0, function* () {
            const formattingManager = yield formatting_manager_1.FormattingManager.create(context, configuration);
            return new LegacyModeManager(context, configuration, cargoInvocationManager, rustSource, rustup, currentWorkingDirectoryManager, logger, formattingManager);
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            this.context.subscriptions.push(this.completionManager.disposable());
            yield this.configuration.updatePathToRacer();
            yield this.missingToolsInstallator.addStatusBarItemIfSomeToolsAreMissing();
            yield this.completionManager.initialStart();
        });
    }
    constructor(context, configuration, cargoInvocationManager, rustSource, rustup, currentWorkingDirectoryManager, logger, formattingManager) {
        this.context = context;
        this.configuration = configuration;
        this.completionManager = new completion_manager_1.CompletionManager(context, configuration, rustSource, rustup, logger.createChildLogger('CompletionManager: '));
        this.formattingManager = formattingManager;
        this.workspaceSymbolProvisionManager = new workspace_symbol_provision_manager_1.WorkspaceSymbolProvisionManager(context, configuration, currentWorkingDirectoryManager);
        this.documentSymbolProvisionManager = new document_symbol_provision_manager_1.DocumentSymbolProvisionManager(context, configuration);
        this.missingToolsInstallator = new installator_1.Installator(context, configuration, cargoInvocationManager, logger.createChildLogger('MissingToolsInstallator: '));
    }
}
exports.LegacyModeManager = LegacyModeManager;
//# sourceMappingURL=legacy_mode_manager.js.map