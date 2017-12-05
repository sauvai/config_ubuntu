'use strict';
var vscode = require('vscode');
var initialConfigurations = {
    configuration1: {
        "version": "0.2.0",
        "configurations": [
            {
                name: 'Bash-Debug (select script from list of sh files)',
                type: 'bashdb',
                request: 'launch',
                scriptPath: '${command.SelectScriptName}',
                commandLineArguments: '',
                windows: {
                    bashPath: "C:\\Windows\\sysnative\\bash.exe"
                },
                linux: {
                    bashPath: "bash"
                },
                osx: {
                    bashPath: "bash"
                }
            }]
    },
    configuration2: {
        "version": "0.2.0",
        "configurations": [
            {
                name: 'Bash-Debug (hardcoded script name)',
                type: 'bashdb',
                request: 'launch',
                scriptPath: '${workspaceRoot}/path/to/script.sh',
                commandLineArguments: '',
                windows: {
                    bashPath: "C:\\Windows\\sysnative\\bash.exe"
                },
                linux: {
                    bashPath: "bash"
                },
                osx: {
                    bashPath: "bash"
                }
            }]
    },
    configuration3: {
        "version": "0.2.0",
        "configurations": [
            {
                name: 'Bash-Debug (type in script name)',
                type: 'bashdb',
                request: 'launch',
                scriptPath: '${workspaceRoot}/${command.AskForScriptName}',
                commandLineArguments: '',
                windows: {
                    bashPath: "C:\\Windows\\sysnative\\bash.exe"
                },
                linux: {
                    bashPath: "bash"
                },
                osx: {
                    bashPath: "bash"
                }
            }
        ]
    }
};
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('extension.getProgramName', function () {
        return vscode.window.showInputBox({
            placeHolder: "Please enter the relative path to bash script.",
            value: (process.platform == "win32") ? "{workspaceRoot}\\path\\to\\script.sh" : "{workspaceRoot}/path/to/script.sh"
        }).then(function (result) {
            return result.replace("{workspaceRoot}", vscode.workspace.rootPath);
        }).then(function (result) {
            return (process.platform == "win32") ? "/mnt/" + result.substr(0, 1).toLowerCase() + result.substr("X:".length).split("\\").join("/") : result;
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand('extension.selectProgramName', function () {
        return vscode.workspace.findFiles("**/*.sh", "").then(function (uris) {
            var list = new Array();
            for (var i = 0; i < uris.length; i++) {
                list.push(uris[i].fsPath);
            }
            return vscode.window.showQuickPick(list).then(function (result) {
                return (process.platform == "win32") ? "/mnt/" + result.substr(0, 1).toLowerCase() + result.substr("X:".length).split("\\").join("/") : result;
            });
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand('extension.bash-debug.provideInitialConfigurations', function () {
        return vscode.window.showQuickPick(["1. Script path should be selected from drop-down list of shell scripts in workspace",
            "2. Script path should be hardcoded in launch task",
            "3. Script path should be typed in by developer when launching"
        ]).then(function (result) {
            switch (parseInt(result.substr(0, 1))) {
                case 1:
                    return JSON.stringify(initialConfigurations.configuration1, null, "\t");
                case 2:
                    return JSON.stringify(initialConfigurations.configuration2, null, "\t");
                default:
                    return JSON.stringify(initialConfigurations.configuration3, null, "\t");
            }
        });
    }));
}
exports.activate = activate;
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2V4dGVuc2lvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFZLENBQUM7QUFFYixJQUFZLE1BQU0sV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUVqQyxJQUFNLHFCQUFxQixHQUFHO0lBQzdCLGNBQWMsRUFBRTtRQUNmLFNBQVMsRUFBRSxPQUFPO1FBQ2xCLGdCQUFnQixFQUFFO1lBQ2pCO2dCQUNDLElBQUksRUFBRSxrREFBa0Q7Z0JBQ3hELElBQUksRUFBRSxRQUFRO2dCQUNkLE9BQU8sRUFBRSxRQUFRO2dCQUNqQixVQUFVLEVBQUUsNkJBQTZCO2dCQUN6QyxvQkFBb0IsRUFBRSxFQUFFO2dCQUN4QixPQUFPLEVBQUU7b0JBQ1IsUUFBUSxFQUFFLGtDQUFrQztpQkFDNUM7Z0JBQ0QsS0FBSyxFQUFFO29CQUNOLFFBQVEsRUFBRSxNQUFNO2lCQUNoQjtnQkFDRCxHQUFHLEVBQUU7b0JBQ0osUUFBUSxFQUFFLE1BQU07aUJBQ2hCO2FBQ0QsQ0FBQztLQUNIO0lBQ0QsY0FBYyxFQUFFO1FBQ2YsU0FBUyxFQUFFLE9BQU87UUFDbEIsZ0JBQWdCLEVBQUU7WUFDakI7Z0JBQ0MsSUFBSSxFQUFFLG9DQUFvQztnQkFDMUMsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsT0FBTyxFQUFFLFFBQVE7Z0JBQ2pCLFVBQVUsRUFBRSxvQ0FBb0M7Z0JBQ2hELG9CQUFvQixFQUFFLEVBQUU7Z0JBQ3hCLE9BQU8sRUFBRTtvQkFDUixRQUFRLEVBQUUsa0NBQWtDO2lCQUM1QztnQkFDRCxLQUFLLEVBQUU7b0JBQ04sUUFBUSxFQUFFLE1BQU07aUJBQ2hCO2dCQUNELEdBQUcsRUFBRTtvQkFDSixRQUFRLEVBQUUsTUFBTTtpQkFDaEI7YUFDRCxDQUFDO0tBQ0g7SUFDRCxjQUFjLEVBQUU7UUFDZixTQUFTLEVBQUUsT0FBTztRQUNsQixnQkFBZ0IsRUFBRTtZQUNqQjtnQkFDQyxJQUFJLEVB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