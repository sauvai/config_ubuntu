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
const constants_1 = require("./constants");
const logger_1 = require("./logger");
const configuration_1 = require("./configuration");
var SuppressedMessages;
(function (SuppressedMessages) {
    SuppressedMessages["CommitHasNoPreviousCommitWarning"] = "suppressCommitHasNoPreviousCommitWarning";
    SuppressedMessages["CommitNotFoundWarning"] = "suppressCommitNotFoundWarning";
    SuppressedMessages["FileNotUnderSourceControlWarning"] = "suppressFileNotUnderSourceControlWarning";
    SuppressedMessages["GitVersionWarning"] = "suppressGitVersionWarning";
    SuppressedMessages["LineUncommittedWarning"] = "suppressLineUncommittedWarning";
    SuppressedMessages["NoRepositoryWarning"] = "suppressNoRepositoryWarning";
    SuppressedMessages["UpdateNotice"] = "suppressUpdateNotice";
    SuppressedMessages["WelcomeNotice"] = "suppressWelcomeNotice";
})(SuppressedMessages = exports.SuppressedMessages || (exports.SuppressedMessages = {}));
class Messages {
    static showCommitHasNoPreviousCommitWarningMessage(commit) {
        if (commit === undefined)
            return Messages.showMessage('info', `Commit has no previous commit`, SuppressedMessages.CommitHasNoPreviousCommitWarning);
        return Messages.showMessage('info', `Commit ${commit.shortSha} (${commit.author}, ${commit.fromNow()}) has no previous commit`, SuppressedMessages.CommitHasNoPreviousCommitWarning);
    }
    static showCommitNotFoundWarningMessage(message) {
        return Messages.showMessage('warn', `${message}. The commit could not be found`, SuppressedMessages.CommitNotFoundWarning);
    }
    static showFileNotUnderSourceControlWarningMessage(message) {
        return Messages.showMessage('warn', `${message}. The file is probably not under source control`, SuppressedMessages.FileNotUnderSourceControlWarning);
    }
    static showLineUncommittedWarningMessage(message) {
        return Messages.showMessage('warn', `${message}. The line has uncommitted changes`, SuppressedMessages.LineUncommittedWarning);
    }
    static showNoRepositoryWarningMessage(message) {
        return Messages.showMessage('warn', `${message}. No repository could be found`, SuppressedMessages.NoRepositoryWarning);
    }
    static showUnsupportedGitVersionErrorMessage(version) {
        return Messages.showMessage('error', `GitLens requires a newer version of Git (>= 2.2.0) than is currently installed (${version}). Please install a more recent version of Git.`, SuppressedMessages.GitVersionWarning);
    }
    static showUpdateMessage(version) {
        return __awaiter(this, void 0, void 0, function* () {
            const viewReleaseNotes = 'View Release Notes';
            const result = yield Messages.showMessage('info', `GitLens has been updated to v${version}`, SuppressedMessages.UpdateNotice, undefined, viewReleaseNotes);
            if (result === viewReleaseNotes) {
                vscode_1.commands.executeCommand(constants_1.BuiltInCommands.Open, vscode_1.Uri.parse('https://marketplace.visualstudio.com/items/eamodio.gitlens/changelog'));
            }
            return result;
        });
    }
    static showWelcomeMessage() {
        return __awaiter(this, void 0, void 0, function* () {
            const viewDocs = 'View Docs';
            const result = yield Messages.showMessage('info', `Thank you for choosing GitLens! GitLens is powerful, feature rich, and highly configurable, so please be sure to view the docs and tailor it to suit your needs.`, SuppressedMessages.WelcomeNotice, null, viewDocs);
            if (result === viewDocs) {
                vscode_1.commands.executeCommand(constants_1.BuiltInCommands.Open, vscode_1.Uri.parse('https://marketplace.visualstudio.com/items/eamodio.gitlens'));
            }
            return result;
        });
    }
    static showMessage(type, message, suppressionKey, dontShowAgain = 'Don\'t Show Again', ...actions) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.Logger.log(`ShowMessage(${type}, '${message}', ${suppressionKey}, ${dontShowAgain})`);
            if (configuration_1.configuration.get(configuration_1.configuration.name('advanced')('messages')(suppressionKey).value)) {
                logger_1.Logger.log(`ShowMessage(${type}, ${message}, ${suppressionKey}, ${dontShowAgain}) skipped`);
                return undefined;
            }
            if (dontShowAgain !== null) {
                actions.push(dontShowAgain);
            }
            let result = undefined;
            switch (type) {
                case 'info':
                    result = yield vscode_1.window.showInformationMessage(message, ...actions);
                    break;
                case 'warn':
                    result = yield vscode_1.window.showWarningMessage(message, ...actions);
                    break;
                case 'error':
                    result = yield vscode_1.window.showErrorMessage(message, ...actions);
                    break;
            }
            if (dontShowAgain === null || result === dontShowAgain) {
                logger_1.Logger.log(`ShowMessage(${type}, '${message}', ${suppressionKey}, ${dontShowAgain}) don't show again requested`);
                const section = configuration_1.configuration.name('advanced')('messages').value;
                const messages = configuration_1.configuration.get(section);
                messages[suppressionKey] = true;
                yield configuration_1.configuration.update(section, messages, vscode_1.ConfigurationTarget.Global);
                if (result === dontShowAgain)
                    return undefined;
            }
            logger_1.Logger.log(`ShowMessage(${type}, '${message}', ${suppressionKey}, ${dontShowAgain}) returned ${result}`);
            return result;
        });
    }
}
exports.Messages = Messages;
//# sourceMappingURL=messages.js.map