'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const vscode = require('vscode');
const wrapper_1 = require('./wrapper');
const logging_1 = require('./logging');
const util_1 = require("./util");
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        logging_1.log.initialize(context);
        const cmake = new wrapper_1.CMakeToolsWrapper(context);
        context.subscriptions.push(cmake);
        function register(name, fn) {
            fn = fn.bind(cmake);
            return vscode.commands.registerCommand(name, _ => fn());
        }
        for (const key of [
            'configure',
            'build',
            'install',
            'jumpToCacheFile',
            'clean',
            'cleanConfigure',
            'cleanRebuild',
            'buildWithTarget',
            'setDefaultTarget',
            'setBuildType',
            'ctest',
            'stop',
            'quickStart',
            'launchTargetProgramPath',
            'debugTarget',
            'launchTarget',
            'selectLaunchTarget',
            'selectEnvironments',
            'toggleCoverageDecorations',
        ]) {
            context.subscriptions.push(register('cmake.' + key, cmake[key]));
        }
        yield cmake.start();
        return cmake;
    });
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {
    util_1.outputChannels.dispose();
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map