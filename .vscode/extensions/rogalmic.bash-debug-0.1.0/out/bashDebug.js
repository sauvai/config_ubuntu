/// <reference types="es6-collections" />
/// <reference types="node" />
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var vscode_debugadapter_1 = require('vscode-debugadapter');
var child_process_1 = require("child_process");
var path_1 = require('path');
var BashDebugSession = (function (_super) {
    __extends(BashDebugSession, _super);
    function BashDebugSession() {
        _super.call(this);
        this.currentBreakpointIds = new Map();
        this.fullDebugOutput = [""];
        this.fullDebugOutputIndex = 0;
        this.debuggerExecutableBusy = false;
        this.debuggerExecutableClosing = false;
        this.responsivityFactor = 5;
        this.debuggerProcessParentId = -1;
        // https://github.com/Microsoft/BashOnWindows/issues/1489
        this.debugPipeIndex = (process.platform == "win32") ? 2 : 3;
        this.setDebuggerLinesStartAt1(true);
        this.setDebuggerColumnsStartAt1(true);
    }
    BashDebugSession.prototype.initializeRequest = function (response, args) {
        response.body.supportsConditionalBreakpoints = false;
        response.body.supportsConfigurationDoneRequest = false;
        response.body.supportsEvaluateForHovers = true;
        response.body.supportsStepBack = false;
        response.body.supportsSetVariable = false;
        this.sendResponse(response);
    };
    BashDebugSession.prototype.disconnectRequest = function (response, args) {
        var _this = this;
        this.debuggerExecutableBusy = false;
        this.debuggerProcess.on("exit", function () {
            _this.debuggerExecutableClosing = true;
            _this.sendResponse(response);
        });
        child_process_1.spawn("bash", ["-c", ("pkill -KILL -P " + this.debuggerProcessParentId)]);
    };
    BashDebugSession.prototype.launchRequest = function (response, args) {
        var _this = this;
        if (!args.bashDbPath) {
            args.bashDbPath = "bashdb";
        }
        if (!args.bashPath) {
            args.bashPath = "bash";
        }
        var fifo_path = "/tmp/vscode-bash-debug-fifo-" + (Math.floor(Math.random() * 10000) + 10000);
        // use fifo, because --tty '&1' does not work properly for subshell (when bashdb spawns - $() )
        // when this is fixed in bashdb, use &1
        this.debuggerProcess = child_process_1.spawn(args.bashPath, ["-c", ("\n\n\t\t\t# http://tldp.org/LDP/abs/html/io-redirection.html\n\n\t\t\tfunction cleanup()\n\t\t\t{\n\t\t\t\texit_code=$?\n\t\t\t\texec 4>&-\n\t\t\t\trm \"" + fifo_path + "\";\n\t\t\t\texit $exit_code;\n\t\t\t}\n\t\t\ttrap 'cleanup' ERR SIGINT SIGTERM\n\n\t\t\tmkfifo \"" + fifo_path + "\"\n\t\t\tcat \"" + fifo_path + "\" >&" + this.debugPipeIndex + " &\n\t\t\texec 4>\"" + fifo_path + "\" \t\t# Keep open for writing, bashdb seems close after every write.\n\t\t\tcat | " + args.bashDbPath + " --quiet --tty \"" + fifo_path + "\" -- \"" + args.scriptPath + "\" " + args.commandLineArguments + "\n\n\t\t\tcleanup")
        ], { stdio: ["pipe", "pipe", "pipe", "pipe"] });
        this.debuggerProcess.on("error", function (error) {
            _this.sendEvent(new vscode_debugadapter_1.OutputEvent("" + error, 'stderr'));
        });
        this.processDebugTerminalOutput();
        this.debuggerProcess.stdin.write("print \"$PPID\"\nhandle INT stop\nprint \"" + BashDebugSession.END_MARKER + "\"\n");
        this.debuggerProcess.stdio[1].on("data", function (data) {
            _this.sendEvent(new vscode_debugadapter_1.OutputEvent("" + data, 'stdout'));
        });
        this.debuggerProcess.stdio[2].on("data", function (data) {
            _this.sendEvent(new vscode_debugadapter_1.OutputEvent("" + data, 'stderr'));
        });
        this.debuggerProcess.stdio[3].on("data", function (data) {
            if (args.showDebugOutput) {
                _this.sendEvent(new vscode_debugadapter_1.OutputEvent("" + data, 'console'));
            }
        });
        this.scheduleExecution(function () { return _this.launchRequestFinalize(response, args); });
    };
    BashDebugSession.prototype.launchRequestFinalize = function (response, args) {
        var _this = this;
        for (var i = 0; i < this.fullDebugOutput.length; i++) {
            if (this.fullDebugOutput[i] == BashDebugSession.END_MARKER) {
                this.debuggerProcessParentId = parseInt(this.fullDebugOutput[i - 1]);
                this.sendResponse(response);
                this.sendEvent(new vscode_debugadapter_1.OutputEvent("Sending InitializedEvent", 'telemetry'));
                this.sendEvent(new vscode_debugadapter_1.InitializedEvent());
                var interval = setInterval(function (data) {
                    for (; _this.fullDebugOutputIndex < _this.fullDebugOutput.length - 1; _this.fullDebugOutputIndex++) {
                        var line = _this.fullDebugOutput[_this.fullDebugOutputIndex];
                        if (line.indexOf("(/") == 0 && line.indexOf("):") == line.length - 2) {
                            _this.sendEvent(new vscode_debugadapter_1.OutputEvent("Sending StoppedEvent", 'telemetry'));
                            _this.sendEvent(new vscode_debugadapter_1.StoppedEvent("break", BashDebugSession.THREAD_ID));
                        }
                        else if (line.indexOf("terminated") > 0) {
                            clearInterval(interval);
                            _this.sendEvent(new vscode_debugadapter_1.OutputEvent("Sending TerminatedEvent", 'telemetry'));
                            _this.sendEvent(new vscode_debugadapter_1.TerminatedEvent());
                        }
                    }
                }, this.responsivityFactor);
                return;
            }
        }
        this.scheduleExecution(function () { return _this.launchRequestFinalize(response, args); });
    };
    BashDebugSession.prototype.setBreakPointsRequest = function (response, args) {
        var _this = this;
        if (this.debuggerExecutableBusy) {
            this.scheduleExecution(function () { return _this.setBreakPointsRequest(response, args); });
            return;
        }
        if (!this.currentBreakpointIds[args.source.path]) {
            this.currentBreakpointIds[args.source.path] = [];
        }
        var sourcePath = (process.platform == "win32") ? this.getLinuxPathFromWindows(args.source.path) : args.source.path;
        var setBreakpointsCommand = "print 'delete <" + this.currentBreakpointIds[args.source.path].join(" ") + ">'\ndelete " + this.currentBreakpointIds[args.source.path].join(" ") + "\nload " + sourcePath + "\n";
        args.breakpoints.forEach(function (b) { setBreakpointsCommand += "print ' <" + sourcePath + ":" + b.line + "> '\nbreak " + sourcePath + ":" + b.line + "\n"; });
        this.debuggerExecutableBusy = true;
        var currentLine = this.fullDebugOutput.length;
        this.debuggerProcess.stdin.write(setBreakpointsCommand + "print '" + BashDebugSession.END_MARKER + "'\n");
        this.scheduleExecution(function () { return _this.setBreakPointsRequestFinalize(response, args, currentLine); });
    };
    BashDebugSession.prototype.setBreakPointsRequestFinalize = function (response, args, currentOutputLength) {
        var _this = this;
        if (this.promptReached(currentOutputLength)) {
            this.currentBreakpointIds[args.source.path] = [];
            var breakpoints = new Array();
            for (var i = currentOutputLength; i < this.fullDebugOutput.length - 2; i++) {
                if (this.fullDebugOutput[i - 1].indexOf(" <") == 0 && this.fullDebugOutput[i - 1].indexOf("> ") > 0) {
                    var lineNodes = this.fullDebugOutput[i].split(" ");
                    var bp = new vscode_debugadapter_1.Breakpoint(true, this.convertDebuggerLineToClient(parseInt(lineNodes[lineNodes.length - 1].replace(".", ""))));
                    bp.id = parseInt(lineNodes[1]);
                    breakpoints.push(bp);
                    this.currentBreakpointIds[args.source.path].push(bp.id);
                }
            }
            response.body = { breakpoints: breakpoints };
            this.debuggerExecutableBusy = false;
            this.sendResponse(response);
            return;
        }
        this.scheduleExecution(function () { return _this.setBreakPointsRequestFinalize(response, args, currentOutputLength); });
    };
    BashDebugSession.prototype.threadsRequest = function (response) {
        response.body = { threads: [new vscode_debugadapter_1.Thread(BashDebugSession.THREAD_ID, "Bash thread")] };
        this.sendResponse(response);
    };
    BashDebugSession.prototype.stackTraceRequest = function (response, args) {
        var _this = this;
        if (this.debuggerExecutableBusy) {
            this.scheduleExecution(function () { return _this.stackTraceRequest(response, args); });
            return;
        }
        this.debuggerExecutableBusy = true;
        var currentLine = this.fullDebugOutput.length;
        this.debuggerProcess.stdin.write("print backtrace\nbacktrace\nprint '" + BashDebugSession.END_MARKER + "'\n");
        this.scheduleExecution(function () { return _this.stackTraceRequestFinalize(response, args, currentLine); });
    };
    BashDebugSession.prototype.stackTraceRequestFinalize = function (response, args, currentOutputLength) {
        var _this = this;
        if (this.promptReached(currentOutputLength)) {
            var lastStackLineIndex = this.fullDebugOutput.length - 3;
            var frames = new Array();
            for (var i = currentOutputLength; i <= lastStackLineIndex; i++) {
                var lineContent = this.fullDebugOutput[i];
                var frameIndex = parseInt(lineContent.substr(2, 2));
                var frameText = lineContent;
                var frameSourcePath = lineContent.substr(lineContent.lastIndexOf("`") + 1, lineContent.lastIndexOf("'") - lineContent.lastIndexOf("`") - 1);
                var frameLine = parseInt(lineContent.substr(lineContent.lastIndexOf(" ")));
                if ((process.platform == "win32")) {
                    frameSourcePath = this.getWindowsPathFromLinux(frameSourcePath);
                }
                frames.push(new vscode_debugadapter_1.StackFrame(frameIndex, frameText, new vscode_debugadapter_1.Source(path_1.basename(frameSourcePath), this.convertDebuggerPathToClient(frameSourcePath)), this.convertDebuggerLineToClient(frameLine)));
            }
            var totalFrames = this.fullDebugOutput.length - currentOutputLength - 1;
            var startFrame = typeof args.startFrame === 'number' ? args.startFrame : 0;
            var maxLevels = typeof args.levels === 'number' ? args.levels : 100;
            frames = frames.slice(startFrame, Math.min(startFrame + maxLevels, frames.length));
            response.body = { stackFrames: frames, totalFrames: totalFrames };
            this.debuggerExecutableBusy = false;
            this.sendResponse(response);
            return;
        }
        this.scheduleExecution(function () { return _this.stackTraceRequestFinalize(response, args, currentOutputLength); });
    };
    BashDebugSession.prototype.scopesRequest = function (response, args) {
        var scopes = [new vscode_debugadapter_1.Scope("Local", this.fullDebugOutputIndex, false)];
        response.body = { scopes: scopes };
        this.sendResponse(response);
    };
    BashDebugSession.prototype.variablesRequest = function (response, args) {
        var _this = this;
        if (this.debuggerExecutableBusy) {
            this.scheduleExecution(function () { return _this.variablesRequest(response, args); });
            return;
        }
        var getVariablesCommand = "info program\n";
        var count = typeof args.count === 'number' ? args.count : 100;
        var start = typeof args.start === 'number' ? args.start : 0;
        var variableDefinitions = ["PWD", "EUID", "#", "0", "-"];
        variableDefinitions = variableDefinitions.slice(start, Math.min(start + count, variableDefinitions.length));
        variableDefinitions.forEach(function (v) { getVariablesCommand += "print ' <$" + v + "> '\nexamine $" + v + "\n"; });
        this.debuggerExecutableBusy = true;
        var currentLine = this.fullDebugOutput.length;
        this.debuggerProcess.stdin.write(getVariablesCommand + "print '" + BashDebugSession.END_MARKER + "'\n");
        this.scheduleExecution(function () { return _this.variablesRequestFinalize(response, args, currentLine); });
    };
    BashDebugSession.prototype.variablesRequestFinalize = function (response, args, currentOutputLength) {
        var _this = this;
        if (this.promptReached(currentOutputLength)) {
            var variables = [];
            for (var i = currentOutputLength; i < this.fullDebugOutput.length - 2; i++) {
                if (this.fullDebugOutput[i - 1].indexOf(" <") == 0 && this.fullDebugOutput[i - 1].indexOf("> ") > 0) {
                    var lineNodes = this.fullDebugOutput[i].split(" ");
                    variables.push({
                        name: "" + this.fullDebugOutput[i - 1].replace(" <", "").replace("> ", ""),
                        type: "string",
                        value: this.fullDebugOutput[i],
                        variablesReference: 0
                    });
                }
            }
            response.body = { variables: variables };
            this.debuggerExecutableBusy = false;
            this.sendResponse(response);
            return;
        }
        this.scheduleExecution(function () { return _this.variablesRequestFinalize(response, args, currentOutputLength); });
    };
    BashDebugSession.prototype.continueRequest = function (response, args) {
        var _this = this;
        if (this.debuggerExecutableBusy) {
            this.scheduleExecution(function () { return _this.continueRequest(response, args); });
            return;
        }
        this.debuggerExecutableBusy = true;
        var currentLine = this.fullDebugOutput.length;
        this.debuggerProcess.stdin.write("print continue\ncontinue\nprint '" + BashDebugSession.END_MARKER + "'\n");
        this.scheduleExecution(function () { return _this.continueRequestFinalize(response, args, currentLine); });
        // NOTE: do not wait for step to finish
        this.sendResponse(response);
    };
    BashDebugSession.prototype.continueRequestFinalize = function (response, args, currentOutputLength) {
        var _this = this;
        if (this.promptReached(currentOutputLength)) {
            this.debuggerExecutableBusy = false;
            return;
        }
        this.scheduleExecution(function () { return _this.continueRequestFinalize(response, args, currentOutputLength); });
    };
    BashDebugSession.prototype.nextRequest = function (response, args) {
        var _this = this;
        if (this.debuggerExecutableBusy) {
            this.scheduleExecution(function () { return _this.nextRequest(response, args); });
            return;
        }
        this.debuggerExecutableBusy = true;
        var currentLine = this.fullDebugOutput.length;
        this.debuggerProcess.stdin.write("print next\nnext\nprint '" + BashDebugSession.END_MARKER + "'\n");
        this.scheduleExecution(function () { return _this.nextRequestFinalize(response, args, currentLine); });
        // NOTE: do not wait for step to finish
        this.sendResponse(response);
    };
    BashDebugSession.prototype.nextRequestFinalize = function (response, args, currentOutputLength) {
        var _this = this;
        if (this.promptReached(currentOutputLength)) {
            this.debuggerExecutableBusy = false;
            return;
        }
        this.scheduleExecution(function () { return _this.nextRequestFinalize(response, args, currentOutputLength); });
    };
    BashDebugSession.prototype.stepInRequest = function (response, args) {
        var _this = this;
        if (this.debuggerExecutableBusy) {
            this.scheduleExecution(function () { return _this.stepInRequest(response, args); });
            return;
        }
        this.debuggerExecutableBusy = true;
        var currentLine = this.fullDebugOutput.length;
        this.debuggerProcess.stdin.write("print step\nstep\nprint '" + BashDebugSession.END_MARKER + "'\n");
        this.scheduleExecution(function () { return _this.stepInRequestFinalize(response, args, currentLine); });
        // NOTE: do not wait for step to finish
        this.sendResponse(response);
    };
    BashDebugSession.prototype.stepInRequestFinalize = function (response, args, currentOutputLength) {
        var _this = this;
        if (this.promptReached(currentOutputLength)) {
            this.debuggerExecutableBusy = false;
            return;
        }
        this.scheduleExecution(function () { return _this.stepInRequestFinalize(response, args, currentOutputLength); });
    };
    BashDebugSession.prototype.stepOutRequest = function (response, args) {
        var _this = this;
        if (this.debuggerExecutableBusy) {
            this.scheduleExecution(function () { return _this.stepOutRequest(response, args); });
            return;
        }
        this.debuggerExecutableBusy = true;
        var currentLine = this.fullDebugOutput.length;
        this.debuggerProcess.stdin.write("print finish\nfinish\nprint '" + BashDebugSession.END_MARKER + "'\n");
        this.scheduleExecution(function () { return _this.stepOutRequestFinalize(response, args, currentLine); });
        // NOTE: do not wait for step to finish
        this.sendResponse(response);
    };
    BashDebugSession.prototype.stepOutRequestFinalize = function (response, args, currentOutputLength) {
        var _this = this;
        if (this.promptReached(currentOutputLength)) {
            this.debuggerExecutableBusy = false;
            return;
        }
        this.scheduleExecution(function () { return _this.stepOutRequestFinalize(response, args, currentOutputLength); });
    };
    BashDebugSession.prototype.evaluateRequest = function (response, args) {
        var _this = this;
        if (this.debuggerProcess == null) {
            response.body = { result: args.expression + " = ''", variablesReference: 0 };
            this.debuggerExecutableBusy = false;
            this.sendResponse(response);
            return;
        }
        if (this.debuggerExecutableBusy) {
            this.scheduleExecution(function () { return _this.evaluateRequest(response, args); });
            return;
        }
        this.debuggerExecutableBusy = true;
        var currentLine = this.fullDebugOutput.length;
        this.debuggerProcess.stdin.write("print 'examine <" + args.expression + ">'\nexamine " + args.expression.replace("\"", "") + "\nprint '" + BashDebugSession.END_MARKER + "'\n");
        this.scheduleExecution(function () { return _this.evaluateRequestFinalize(response, args, currentLine); });
    };
    BashDebugSession.prototype.evaluateRequestFinalize = function (response, args, currentOutputLength) {
        var _this = this;
        if (this.promptReached(currentOutputLength)) {
            response.body = { result: "'" + this.fullDebugOutput[currentOutputLength] + "'", variablesReference: 0 };
            this.debuggerExecutableBusy = false;
            this.sendResponse(response);
            return;
        }
        this.scheduleExecution(function () { return _this.evaluateRequestFinalize(response, args, currentOutputLength); });
    };
    BashDebugSession.prototype.pauseRequest = function (response, args) {
        var _this = this;
        if (args.threadId == BashDebugSession.THREAD_ID) {
            child_process_1.spawn("bash", ["-c", ("pkill -INT -P " + this.debuggerProcessParentId + " -f bashdb")]).on("exit", function () { return _this.sendResponse(response); });
            return;
        }
        response.success = false;
        this.sendResponse(response);
    };
    BashDebugSession.prototype.removePrompt = function (line) {
        if (line.indexOf("bashdb<") == 0) {
            return line.substr(line.indexOf("> ") + 2);
        }
        return line;
    };
    BashDebugSession.prototype.promptReached = function (currentOutputLength) {
        return this.fullDebugOutput.length > currentOutputLength && this.fullDebugOutput[this.fullDebugOutput.length - 2] == BashDebugSession.END_MARKER;
    };
    BashDebugSession.prototype.processDebugTerminalOutput = function () {
        var _this = this;
        this.debuggerProcess.stdio[this.debugPipeIndex].on('data', function (data) {
            if (_this.fullDebugOutput.length == 1 && data.indexOf("Reading ") == 0) {
                // Before debug run, there is no newline
                return;
            }
            var list = data.toString().split("\n", -1);
            var fullLine = "" + _this.fullDebugOutput.pop() + list.shift();
            _this.fullDebugOutput.push(_this.removePrompt(fullLine));
            list.forEach(function (l) { return _this.fullDebugOutput.push(_this.removePrompt(l)); });
        });
    };
    BashDebugSession.prototype.scheduleExecution = function (callback) {
        if (!this.debuggerExecutableClosing) {
            setTimeout(function () { return callback(); }, this.responsivityFactor);
        }
    };
    BashDebugSession.prototype.getWindowsPathFromLinux = function (linuxPath) {
        return linuxPath.substr("/mnt/".length, 1).toUpperCase() + ":" + linuxPath.substr("/mnt/".length + 1).split("/").join("\\");
    };
    BashDebugSession.prototype.getLinuxPathFromWindows = function (windowsPath) {
        return "/mnt/" + windowsPath.substr(0, 1).toLowerCase() + windowsPath.substr("X:".length).split("\\").join("/");
    };
    BashDebugSession.THREAD_ID = 42;
    BashDebugSession.END_MARKER = "############################################################";
    return BashDebugSession;
}(vscode_debugadapter_1.DebugSession));
vscode_debugadapter_1.DebugSession.run(BashDebugSession);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzaERlYnVnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2Jhc2hEZWJ1Zy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSx5Q0FBeUM7QUFDekMsOEJBQThCOzs7Ozs7O0FBRTlCLG9DQUF5SyxxQkFBcUIsQ0FBQyxDQUFBO0FBRS9MLDhCQUFrQyxlQUFlLENBQUMsQ0FBQTtBQUNsRCxxQkFBdUIsTUFBTSxDQUFDLENBQUE7QUFXOUI7SUFBK0Isb0NBQVk7SUFzQjFDO1FBQ0MsaUJBQU8sQ0FBQztRQWhCRCx5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBeUIsQ0FBQztRQUV4RCxvQkFBZSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdkIseUJBQW9CLEdBQUcsQ0FBQyxDQUFDO1FBRXpCLDJCQUFzQixHQUFHLEtBQUssQ0FBQztRQUMvQiw4QkFBeUIsR0FBRyxLQUFLLENBQUM7UUFFbEMsdUJBQWtCLEdBQUcsQ0FBQyxDQUFDO1FBRXZCLDRCQUF1QixHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRXJDLHlEQUF5RDtRQUNoRCxtQkFBYyxHQUFHLENBQUMsT0FBTyxDQUFDLFFBQVEsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBSS9ELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVTLDRDQUFpQixHQUEzQixVQUE0QixRQUEwQyxFQUFFLElBQThDO1FBRXJILFFBQVEsQ0FBQyxJQUFJLENBQUMsOEJBQThCLEdBQUcsS0FBSyxDQUFDO1FBQ3JELFFBQVEsQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLEdBQUcsS0FBSyxDQUFDO1FBQ3ZELFFBQVEsQ0FBQyxJQUFJLENBQUMseUJBQXlCLEdBQUcsSUFBSSxDQUFDO1FBQy9DLFFBQVEsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsS0FB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