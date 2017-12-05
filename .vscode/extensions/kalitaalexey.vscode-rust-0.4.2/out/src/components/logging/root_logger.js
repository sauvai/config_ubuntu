"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_logger_1 = require("./child_logger");
const logger_1 = require("./logger");
exports.DEBUG_MESSAGE_PREFIX = 'DEBUG: ';
exports.ERROR_MESSAGE_PREFIX = 'ERROR: ';
exports.WARNING_MESSAGE_PREFIX = 'WARNING: ';
class RootLogger extends logger_1.Logger {
    constructor(loggingMessagePrefix) {
        super(loggingMessagePrefix);
        this.logFunction = undefined;
    }
    createChildLogger(loggingMessagePrefix) {
        return new child_logger_1.ChildLogger(loggingMessagePrefix, this);
    }
    setLogFunction(logFunction) {
        this.logFunction = logFunction;
    }
    debugProtected(message) {
        this.log(message, exports.DEBUG_MESSAGE_PREFIX);
    }
    errorProtected(message) {
        this.log(message, exports.ERROR_MESSAGE_PREFIX);
    }
    warningProtected(message) {
        this.log(message, exports.WARNING_MESSAGE_PREFIX);
    }
    log(message, severityAsString) {
        if (!this.logFunction) {
            return;
        }
        const fullMessage = severityAsString.concat(this.getLoggingMessagePrefix(), message);
        this.logFunction(fullMessage);
    }
}
exports.RootLogger = RootLogger;
//# sourceMappingURL=root_logger.js.map