"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
class ChildLogger extends logger_1.Logger {
    constructor(loggingMessagePrefix, parent) {
        super(loggingMessagePrefix);
        this.parent = parent;
    }
    createChildLogger(loggingMessagePrefix) {
        return new ChildLogger(loggingMessagePrefix, this);
    }
    debugProtected(message) {
        this.parent.debug(this.getLoggingMessagePrefix().concat(message));
    }
    errorProtected(message) {
        this.parent.error(this.getLoggingMessagePrefix().concat(message));
    }
    warningProtected(message) {
        this.parent.warning(this.getLoggingMessagePrefix().concat(message));
    }
}
exports.ChildLogger = ChildLogger;
//# sourceMappingURL=child_logger.js.map