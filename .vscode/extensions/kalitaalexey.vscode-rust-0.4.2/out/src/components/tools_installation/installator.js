"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path = require("path");
const vscode_1 = require("vscode");
const CommandLine_1 = require("../../CommandLine");
const missing_tools_status_bar_item_1 = require("./missing_tools_status_bar_item");
class Installator {
    constructor(context, configuration, cargoInvocationManager, logger) {
        this._configuration = configuration;
        this._cargoInvocationManager = cargoInvocationManager;
        this._logger = logger;
        const installToolsCommandName = 'rust.install_missing_tools';
        this._missingToolsStatusBarItem = new missing_tools_status_bar_item_1.MissingToolsStatusBarItem(context, installToolsCommandName);
        this._missingTools = [];
        vscode_1.commands.registerCommand(installToolsCommandName, () => {
            this.offerToInstallMissingTools();
        });
    }
    addStatusBarItemIfSomeToolsAreMissing() {
        this.getMissingTools();
        if (this._missingTools.length === 0) {
            return;
        }
        this._missingToolsStatusBarItem.show();
    }
    offerToInstallMissingTools() {
        // Plurality is important. :')
        const group = this._missingTools.length > 1 ? 'them' : 'it';
        const message = `You are missing ${this._missingTools.join(', ')}. Would you like to install ${group}?`;
        const option = { title: 'Install' };
        vscode_1.window.showInformationMessage(message, option).then(selection => {
            if (selection !== option) {
                return;
            }
            this.installMissingTools();
        });
    }
    installMissingTools() {
        const terminal = vscode_1.window.createTerminal('Rust tools installation');
        // cargo install tool && cargo install another_tool
        const { executable: cargoExecutable, args: cargoArgs } = this._cargoInvocationManager.getExecutableAndArgs();
        const shell = CommandLine_1.parseShell(vscode_1.workspace.getConfiguration('terminal')['integrated']['shell']['windows']);
        const statements = this._missingTools.map(tool => {
            const args = [cargoExecutable, ...cargoArgs, 'install', tool];
            return CommandLine_1.getCommandForArgs(shell, args);
        });
        const command = CommandLine_1.getCommandToExecuteStatementsOneByOneIfPreviousIsSucceed(shell, statements);
        terminal.sendText(command);
        terminal.show();
        this._missingToolsStatusBarItem.hide();
    }
    getMissingTools() {
        const logger = this._logger.createChildLogger('getMissingTools(): ');
        const pathDirectories = (process.env.PATH || '').split(path.delimiter);
        logger.debug(`pathDirectories=${JSON.stringify(pathDirectories)}`);
        const tools = {
            'racer': this._configuration.getPathToRacer(),
            'rustfmt': this._configuration.getRustfmtPath(),
            'rustsym': this._configuration.getRustsymPath()
        };
        logger.debug(`tools=${JSON.stringify(tools)}`);
        const keys = Object.keys(tools);
        const missingTools = keys.map(tool => {
            // Check if the path exists as-is.
            let userPath = tools[tool];
            if (!userPath) {
                // A path is undefined, so a tool is missing
                return tool;
            }
            if (fs_1.existsSync(userPath)) {
                logger.debug(`${tool}'s path=${userPath}`);
                return undefined;
            }
            // If the extension is running on Windows and no extension was
            // specified (likely because the user didn't configure a custom path),
            // then prefix one for them.
            if (process.platform === 'win32' && path.extname(userPath).length === 0) {
                userPath += '.exe';
            }
            // Check if the tool exists on the PATH
            for (const part of pathDirectories) {
                const binPath = path.join(part, userPath);
                if (fs_1.existsSync(binPath)) {
                    return undefined;
                }
            }
            // The tool wasn't found, we should install it
            return tool;
        }).filter(tool => tool !== undefined);
        this._missingTools = missingTools;
        logger.debug(`this.missingTools = ${JSON.stringify(this._missingTools)}`);
    }
}
exports.Installator = Installator;
//# sourceMappingURL=installator.js.map