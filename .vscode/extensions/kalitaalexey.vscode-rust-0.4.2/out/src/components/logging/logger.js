"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const captured_message_1 = require("./captured_message");
class Logger {
    debug(message) {
        const log = this.debugProtected.bind(this);
        this.addMessageToCapturedMessagesOrLog(message, captured_message_1.CapturedMessageSeverity.Debug, log);
    }
    error(message) {
        const log = this.errorProtected.bind(this);
        this.addMessageToCapturedMessagesOrLog(message, captured_message_1.CapturedMessageSeverity.Error, log);
    }
    warning(message) {
        const log = this.warningProtected.bind(this);
        this.addMessageToCapturedMessagesOrLog(message, captured_message_1.CapturedMessageSeverity.Warning, log);
    }
    startMessageCapture() {
        this.messageCaptureEnabled = true;
    }
    takeCapturedMessages() {
        const messages = this.capturedMessages;
        this.capturedMessages = [];
        return messages;
    }
    stopMessageCaptureAndReleaseCapturedMessages() {
        this.messageCaptureEnabled = false;
        const messages = this.takeCapturedMessages();
        for (const message of messages) {
            switch (message.severity) {
                case captured_message_1.CapturedMessageSeverity.Debug:
                    this.debug(message.message);
                    break;
                case captured_message_1.CapturedMessageSeverity.Error:
                    this.error(message.message);
                    break;
                case captured_message_1.CapturedMessageSeverity.Warning:
                    this.warning(message.message);
                    break;
                default:
                    throw new Error(`Unhandled severity=${message.severity}`);
            }
        }
    }
    constructor(loggingMessagePrefix) {
        this.loggingMessagePrefix = loggingMessagePrefix;
        this.messageCaptureEnabled = false;
        this.capturedMessages = [];
    }
    getLoggingMessagePrefix() {
        if (typeof this.loggingMessagePrefix === 'string') {
            return this.loggingMessagePrefix;
        }
        return this.loggingMessagePrefix();
    }
    addMessageToCapturedMessagesOrLog(message, severity, log) {
        if (this.messageCaptureEnabled) {
            this.capturedMessages.push({
                severity: severity,
                message: message
            });
        }
        else {
            log(message);
        }
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map