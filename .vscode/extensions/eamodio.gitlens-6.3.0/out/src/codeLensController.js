'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const configuration_1 = require("./configuration");
const constants_1 = require("./constants");
const gitCodeLensProvider_1 = require("./gitCodeLensProvider");
const gitService_1 = require("./gitService");
const logger_1 = require("./logger");
class CodeLensController extends vscode_1.Disposable {
    constructor(context, git, gitContextTracker) {
        super(() => this.dispose());
        this.context = context;
        this.git = git;
        this.gitContextTracker = gitContextTracker;
        this._disposable = vscode_1.Disposable.from(configuration_1.configuration.onDidChange(this.onConfigurationChanged, this), this.gitContextTracker.onDidChangeBlameability(this.onBlameabilityChanged, this));
        this.onConfigurationChanged(configuration_1.configuration.initializingChangeEvent);
    }
    dispose() {
        this._providerDisposable && this._providerDisposable.dispose();
        this._disposable && this._disposable.dispose();
    }
    onConfigurationChanged(e) {
        const initializing = configuration_1.configuration.initializing(e);
        const section = configuration_1.configuration.name('codeLens').value;
        if (initializing || configuration_1.configuration.changed(e, section, null)) {
            if (!initializing) {
                logger_1.Logger.log('CodeLens config changed; resetting CodeLens provider');
            }
            const cfg = configuration_1.configuration.get(section);
            if (cfg.enabled && (cfg.recentChange.enabled || cfg.authors.enabled)) {
                if (this._provider !== undefined) {
                    this._provider.reset();
                }
                else {
                    this._provider = new gitCodeLensProvider_1.GitCodeLensProvider(this.context, this.git);
                    this._providerDisposable = vscode_1.languages.registerCodeLensProvider(gitCodeLensProvider_1.GitCodeLensProvider.selector, this._provider);
                }
            }
            else {
                if (this._providerDisposable !== undefined) {
                    this._providerDisposable.dispose();
                    this._providerDisposable = undefined;
                }
                this._provider = undefined;
            }
            this._canToggle = cfg.recentChange.enabled || cfg.authors.enabled;
            constants_1.setCommandContext(constants_1.CommandContext.CanToggleCodeLens, this._canToggle);
        }
    }
    onBlameabilityChanged(e) {
        if (this._provider === undefined)
            return;
        if (e.blameable && e.reason !== gitService_1.BlameabilityChangeReason.EditorChanged) {
            logger_1.Logger.log('Blameability changed; resetting CodeLens provider');
            this._provider.reset();
        }
    }
    toggleCodeLens(editor) {
        if (!this._canToggle)
            return;
        logger_1.Logger.log(`toggleCodeLens()`);
        if (this._providerDisposable !== undefined) {
            this._providerDisposable.dispose();
            this._providerDisposable = undefined;
            return;
        }
        this._providerDisposable = vscode_1.languages.registerCodeLensProvider(gitCodeLensProvider_1.GitCodeLensProvider.selector, new gitCodeLensProvider_1.GitCodeLensProvider(this.context, this.git));
    }
}
exports.CodeLensController = CodeLensController;
//# sourceMappingURL=codeLensController.js.map