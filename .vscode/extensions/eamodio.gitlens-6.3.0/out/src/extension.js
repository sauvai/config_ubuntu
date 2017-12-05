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
const system_1 = require("./system");
const vscode_1 = require("vscode");
const annotationController_1 = require("./annotations/annotationController");
const configuration_1 = require("./configuration");
const constants_1 = require("./constants");
const codeLensController_1 = require("./codeLensController");
const commands_1 = require("./commands");
const currentLineController_1 = require("./currentLineController");
const gitContentProvider_1 = require("./gitContentProvider");
const gitExplorer_1 = require("./views/gitExplorer");
const gitRevisionCodeLensProvider_1 = require("./gitRevisionCodeLensProvider");
const gitService_1 = require("./gitService");
const keyboard_1 = require("./keyboard");
const logger_1 = require("./logger");
const messages_1 = require("./messages");
const telemetry_1 = require("./telemetry");
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        configuration_1.Configuration.configure(context);
        logger_1.Logger.configure(context);
        telemetry_1.Telemetry.configure(constants_1.ApplicationInsightsKey);
        const gitlens = vscode_1.extensions.getExtension(constants_1.QualifiedExtensionId);
        const gitlensVersion = gitlens.packageJSON.version;
        logger_1.Logger.log(`GitLens(v${gitlensVersion}) active`);
        const cfg = vscode_1.workspace.getConfiguration().get(constants_1.ExtensionKey);
        try {
            yield gitService_1.GitService.initialize(cfg.advanced.git);
        }
        catch (ex) {
            logger_1.Logger.error(ex, 'Extension.activate');
            if (ex.message.includes('Unable to find git')) {
                yield vscode_1.window.showErrorMessage(`GitLens was unable to find Git. Please make sure Git is installed. Also ensure that Git is either in the PATH, or that 'gitlens.advanced.git' is pointed to its installed location.`);
            }
            constants_1.setCommandContext(constants_1.CommandContext.Enabled, false);
            return;
        }
        const gitVersion = gitService_1.GitService.getGitVersion();
        logger_1.Logger.log(`Git version: ${gitVersion}`);
        const telemetryContext = Object.create(null);
        telemetryContext.version = gitlensVersion;
        telemetryContext['git.version'] = gitVersion;
        telemetry_1.Telemetry.setContext(telemetryContext);
        const previousVersion = context.globalState.get(constants_1.GlobalState.GitLensVersion);
        yield migrateSettings(context, previousVersion);
        notifyOnUnsupportedGitVersion(context, gitVersion);
        notifyOnNewGitLensVersion(context, gitlensVersion, previousVersion);
        yield context.globalState.update(constants_1.GlobalState.GitLensVersion, gitlensVersion);
        const git = new gitService_1.GitService();
        context.subscriptions.push(git);
        const gitContextTracker = new gitService_1.GitContextTracker(git);
        context.subscriptions.push(gitContextTracker);
        const annotationController = new annotationController_1.AnnotationController(context, git, gitContextTracker);
        context.subscriptions.push(annotationController);
        const currentLineController = new currentLineController_1.CurrentLineController(context, git, gitContextTracker, annotationController);
        context.subscriptions.push(currentLineController);
        const codeLensController = new codeLensController_1.CodeLensController(context, git, gitContextTracker);
        context.subscriptions.push(codeLensController);
        context.subscriptions.push(vscode_1.workspace.registerTextDocumentContentProvider(gitContentProvider_1.GitContentProvider.scheme, new gitContentProvider_1.GitContentProvider(context, git)));
        context.subscriptions.push(vscode_1.languages.registerCodeLensProvider(gitRevisionCodeLensProvider_1.GitRevisionCodeLensProvider.selector, new gitRevisionCodeLensProvider_1.GitRevisionCodeLensProvider(context, git)));
        context.subscriptions.push(vscode_1.window.registerTreeDataProvider('gitlens.gitExplorer', new gitExplorer_1.GitExplorer(context, git, gitContextTracker)));
        context.subscriptions.push(new keyboard_1.Keyboard());
        commands_1.configureCommands(context, git, annotationController, currentLineController, codeLensController);
        setTimeout(() => constants_1.setCommandContext(constants_1.CommandContext.GitExplorer, true), 1000);
    });
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
const migration = {
    major: 6,
    minor: 1,
    patch: 2
};
function migrateSettings(context, previousVersion) {
    return __awaiter(this, void 0, void 0, function* () {
        if (previousVersion === undefined)
            return;
        const [major, minor, patch] = previousVersion.split('.');
        if (parseInt(major, 10) >= migration.major && parseInt(minor, 10) >= migration.minor && parseInt(patch, 10) >= migration.patch)
            return;
        try {
            const section = configuration_1.configuration.name('advanced')('messages').value;
            const messages = configuration_1.configuration.get(section);
            let migrated = false;
            for (const m of system_1.Objects.values(messages_1.SuppressedMessages)) {
                const suppressed = context.globalState.get(m);
                if (suppressed === undefined)
                    continue;
                migrated = true;
                messages[m] = suppressed;
                context.globalState.update(m, undefined);
            }
            if (!migrated)
                return;
            yield configuration_1.configuration.update(section, messages, vscode_1.ConfigurationTarget.Global);
        }
        catch (ex) {
            logger_1.Logger.error(ex, 'migrateSettings');
        }
    });
}
function notifyOnNewGitLensVersion(context, version, previousVersion) {
    return __awaiter(this, void 0, void 0, function* () {
        if (configuration_1.configuration.get(configuration_1.configuration.name('advanced')('messages')(messages_1.SuppressedMessages.UpdateNotice).value))
            return;
        if (previousVersion === undefined) {
            logger_1.Logger.log(`GitLens first-time install`);
            yield messages_1.Messages.showWelcomeMessage();
            return;
        }
        if (previousVersion !== version) {
            logger_1.Logger.log(`GitLens upgraded from v${previousVersion} to v${version}`);
        }
        const [major, minor] = version.split('.');
        const [prevMajor, prevMinor] = previousVersion.split('.');
        if (major === prevMajor && minor === prevMinor)
            return;
        if (major < prevMajor || (major === prevMajor && minor < prevMinor))
            return;
        yield messages_1.Messages.showUpdateMessage(version);
    });
}
function notifyOnUnsupportedGitVersion(context, version) {
    return __awaiter(this, void 0, void 0, function* () {
        if (gitService_1.GitService.validateGitVersion(2, 2))
            return;
        yield messages_1.Messages.showUnsupportedGitVersionErrorMessage(version);
    });
}
//# sourceMappingURL=extension.js.map