// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');
var axios = require('axios');
var fs = require('fs');
var path = require('path')

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    var disposable = vscode.commands.registerCommand('extension.getTemplates', function () {
        // The code you place here will be executed every time your command is executed
        vscode.window
            .showQuickPick(new Promise((resolve, reject) => {
                axios.get('https://api.github.com/gitignore/templates')
                    .then((response) => resolve(response.data))
                    .catch((err) => reject(err))
            }))
            .then(selection => {
                if (!selection) return;

                if (!vscode.workspace.rootPath) {
                    vscode.window.showErrorMessage('Open a folder first');
                    return;
                }

                var templatePath = path.join(vscode.workspace.rootPath, '.gitignore');

                axios.get(`https://api.github.com/gitignore/templates/${selection}`, {
                    headers: {
                        Accept: 'application/vnd.github.raw'
                    }
                })
                    .then((response) => {
                        fs.writeFile(templatePath, response.data, (err) => {
                            if (err) vscode.window.showErrorMessage(err)
                            else vscode.window.showInformationMessage('Successfully generated template')
                        })
                    })

            }, (err) => vscode.window.showErrorMessage(err))
    });

    context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;