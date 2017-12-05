"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Possible reasons of a cargo command invocation
 */
var CommandInvocationReason;
(function (CommandInvocationReason) {
    /**
     * The command is invoked because the action on save is to execute the command
     */
    CommandInvocationReason[CommandInvocationReason["ActionOnSave"] = 0] = "ActionOnSave";
    /**
     * The command is invoked because the corresponding registered command is executed
     */
    CommandInvocationReason[CommandInvocationReason["CommandExecution"] = 1] = "CommandExecution";
})(CommandInvocationReason = exports.CommandInvocationReason || (exports.CommandInvocationReason = {}));
//# sourceMappingURL=CommandInvocationReason.js.map