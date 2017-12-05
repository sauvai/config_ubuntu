"use strict";
var vscode = require('vscode');

function GUID() {
    this.date = new Date();


    if (typeof this.newGUID != 'function') {


        GUID.prototype.newGUID = function () {
            this.date = new Date();
            var guidStr = '';
            var sexadecimalDate = this.hexadecimal(this.getGUIDDate(), 16);
            var sexadecimalTime = this.hexadecimal(this.getGUIDTime(), 16);
            for (var i = 0; i < 9; i++) {
                guidStr += Math.floor(Math.random() * 16).toString(16);
            }
            guidStr += sexadecimalDate;
            guidStr += sexadecimalTime;
            while (guidStr.length < 32) {
                guidStr += Math.floor(Math.random() * 16).toString(16);
            }
            return this.formatGUID(guidStr);
        }


        GUID.prototype.getGUIDDate = function () {
            return this.date.getFullYear() + this.addZero(this.date.getMonth() + 1) + this.addZero(this.date.getDay());
        }


        GUID.prototype.getGUIDTime = function () {
            return this.addZero(this.date.getHours()) + this.addZero(this.date.getMinutes()) + this.addZero(this.date.getSeconds()) + this.addZero(parseInt(this.date.getMilliseconds() / 10));
        }


        GUID.prototype.addZero = function (num) {
            if (Number(num).toString() != 'NaN' && num >= 0 && num < 10) {
                return '0' + Math.floor(num);
            } else {
                return num.toString();
            }
        }


        GUID.prototype.hexadecimal = function (num, x, y) {
            if (y != undefined) {
                return parseInt(num.toString(), y).toString(x);
            } else {
                return parseInt(num.toString()).toString(x);
            }
        }


        GUID.prototype.formatGUID = function (guidStr) {
            var str1 = guidStr.slice(0, 8) + '_',
                str2 = guidStr.slice(8, 12) + '_',
                str3 = guidStr.slice(12, 16) + '_',
                str4 = guidStr.slice(16, 20) + '_',
                str5 = guidStr.slice(20);
            return str1 + str2 + str3 + str4 + str5;
        }
    }
}

var format = function (src, args) {
    var result = src;
    if (arguments.length > 0) {
        if (arguments.length == 2 && typeof (args) == "object") {
            for (var key in args) {
                if (args[key] != undefined) {
                    var reg = new RegExp("({" + key + "})", "g");
                    result = result.replace(reg, args[key]);
                }
            }
        }
        else {
            for (var i = 0; i < arguments.length; i++) {
                if (arguments[i] != undefined) {
                    var reg = new RegExp("({[" + i + "]})", "g");
                    result = result.replace(reg, arguments[i]);
                }
            }
        }
    }
    return result;
}

function insertFileHeaderGuard() {
    var _workspace = vscode.workspace;
    var _window = vscode.window;
    var _editor = _window.activeTextEditor;
    var _root = _workspace.rootPath;
    var guardType = _workspace.getConfiguration("headFileGuard").get("type","filename");
    var guardName = "";
    if (guardType === "filename") {
        console.log(_editor.document.fileName);
        var separator = "/";
        if (process.platform === "win32") {
            separator = "\\";
        }
        var currentFileName = _editor.document.fileName.substr(_editor.document.fileName.lastIndexOf(separator) + 1);
        guardName = currentFileName.replace(".", "_").toUpperCase();
    } else {
        guardName = new GUID().newGUID().toUpperCase();
    }

    var guardStartFormat = "#ifndef {guard}\n#define {guard}\n";
    var guardEndFormat = "\n#endif /* {guard} */\n";
    var formatArguments = new Object();
    formatArguments["guard"] = guardName;
    if (_editor !== undefined) {
        _editor.edit(function (edit) {
            edit.insert(new vscode.Position(0, 0), format(guardStartFormat, formatArguments));
            edit.insert(new vscode.Position(_editor.document.lineCount, 0), format(guardEndFormat, formatArguments));
        });
    }
}
exports.insertFileHeaderGuard = insertFileHeaderGuard;