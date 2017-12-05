'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const constants_1 = require("./constants");
exports.ExtensionKey = constants_1.ExtensionKey;
const gitExplorer_1 = require("./views/gitExplorer");
const system_1 = require("./system");
var CodeLensCommand;
(function (CodeLensCommand) {
    CodeLensCommand["DiffWithPrevious"] = "gitlens.diffWithPrevious";
    CodeLensCommand["ShowQuickCommitDetails"] = "gitlens.showQuickCommitDetails";
    CodeLensCommand["ShowQuickCommitFileDetails"] = "gitlens.showQuickCommitFileDetails";
    CodeLensCommand["ShowQuickCurrentBranchHistory"] = "gitlens.showQuickRepoHistory";
    CodeLensCommand["ShowQuickFileHistory"] = "gitlens.showQuickFileHistory";
    CodeLensCommand["ToggleFileBlame"] = "gitlens.toggleFileBlame";
})(CodeLensCommand = exports.CodeLensCommand || (exports.CodeLensCommand = {}));
var CodeLensLocations;
(function (CodeLensLocations) {
    CodeLensLocations["Document"] = "document";
    CodeLensLocations["Containers"] = "containers";
    CodeLensLocations["Blocks"] = "blocks";
})(CodeLensLocations = exports.CodeLensLocations || (exports.CodeLensLocations = {}));
var LineHighlightLocations;
(function (LineHighlightLocations) {
    LineHighlightLocations["Gutter"] = "gutter";
    LineHighlightLocations["Line"] = "line";
    LineHighlightLocations["OverviewRuler"] = "overviewRuler";
})(LineHighlightLocations = exports.LineHighlightLocations || (exports.LineHighlightLocations = {}));
var CustomRemoteType;
(function (CustomRemoteType) {
    CustomRemoteType["Bitbucket"] = "Bitbucket";
    CustomRemoteType["BitbucketServer"] = "BitbucketServer";
    CustomRemoteType["Custom"] = "Custom";
    CustomRemoteType["GitHub"] = "GitHub";
    CustomRemoteType["GitLab"] = "GitLab";
})(CustomRemoteType = exports.CustomRemoteType || (exports.CustomRemoteType = {}));
var GitExplorerFilesLayout;
(function (GitExplorerFilesLayout) {
    GitExplorerFilesLayout["Auto"] = "auto";
    GitExplorerFilesLayout["List"] = "list";
    GitExplorerFilesLayout["Tree"] = "tree";
})(GitExplorerFilesLayout = exports.GitExplorerFilesLayout || (exports.GitExplorerFilesLayout = {}));
var StatusBarCommand;
(function (StatusBarCommand) {
    StatusBarCommand["DiffWithPrevious"] = "gitlens.diffWithPrevious";
    StatusBarCommand["DiffWithWorking"] = "gitlens.diffWithWorking";
    StatusBarCommand["ShowQuickCommitDetails"] = "gitlens.showQuickCommitDetails";
    StatusBarCommand["ShowQuickCommitFileDetails"] = "gitlens.showQuickCommitFileDetails";
    StatusBarCommand["ShowQuickCurrentBranchHistory"] = "gitlens.showQuickRepoHistory";
    StatusBarCommand["ShowQuickFileHistory"] = "gitlens.showQuickFileHistory";
    StatusBarCommand["ToggleCodeLens"] = "gitlens.toggleCodeLens";
    StatusBarCommand["ToggleFileBlame"] = "gitlens.toggleFileBlame";
})(StatusBarCommand = exports.StatusBarCommand || (exports.StatusBarCommand = {}));
const emptyConfig = {
    annotations: {
        file: {
            gutter: {
                format: '',
                dateFormat: null,
                compact: false,
                heatmap: {
                    enabled: false,
                    location: 'left'
                },
                hover: {
                    details: false,
                    changes: false,
                    wholeLine: false
                },
                separateLines: false
            },
            hover: {
                details: false,
                changes: false,
                heatmap: {
                    enabled: false
                }
            },
            recentChanges: {
                hover: {
                    details: false,
                    changes: false
                }
            }
        },
        line: {
            hover: {
                details: false,
                changes: false
            },
            trailing: {
                format: '',
                dateFormat: null,
                hover: {
                    details: false,
                    changes: false,
                    wholeLine: false
                }
            }
        }
    },
    blame: {
        ignoreWhitespace: false,
        file: {
            annotationType: 'gutter',
            lineHighlight: {
                enabled: false,
                locations: []
            }
        },
        line: {
            enabled: false,
            annotationType: 'trailing'
        }
    },
    recentChanges: {
        file: {
            lineHighlight: {
                locations: []
            }
        }
    },
    codeLens: {
        enabled: false,
        recentChange: {
            enabled: false,
            command: CodeLensCommand.DiffWithPrevious
        },
        authors: {
            enabled: false,
            command: CodeLensCommand.DiffWithPrevious
        },
        locations: [],
        customLocationSymbols: [],
        perLanguageLocations: [],
        debug: false
    },
    defaultDateFormat: null,
    gitExplorer: {
        enabled: false,
        autoRefresh: false,
        view: gitExplorer_1.GitExplorerView.Auto,
        files: {
            layout: GitExplorerFilesLayout.Auto,
            compact: false,
            threshold: 0
        },
        includeWorkingTree: false,
        showTrackingBranch: false,
        commitFormat: '',
        commitFileFormat: '',
        stashFormat: '',
        stashFileFormat: '',
        statusFileFormat: ''
    },
    remotes: [],
    statusBar: {
        enabled: false,
        alignment: 'left',
        command: StatusBarCommand.DiffWithPrevious,
        format: '',
        dateFormat: null
    },
    strings: {
        codeLens: {
            unsavedChanges: {
                recentChangeAndAuthors: '',
                recentChangeOnly: '',
                authorsOnly: ''
            }
        }
    },
    debug: false,
    insiders: false,
    outputLevel: 'verbose',
    advanced: {
        caching: {
            enabled: false,
            maxLines: 0
        },
        git: '',
        maxQuickHistory: 0,
        menus: {
            explorerContext: {
                fileDiff: false,
                history: false,
                remote: false
            },
            editorContext: {
                blame: false,
                copy: false,
                details: false,
                fileDiff: false,
                history: false,
                lineDiff: false,
                remote: false
            },
            editorTitle: {
                blame: false,
                fileDiff: false,
                history: false,
                status: false
            },
            editorTitleContext: {
                blame: false,
                fileDiff: false,
                history: false,
                remote: false
            }
        },
        messages: {
            suppressCommitHasNoPreviousCommitWarning: false,
            suppressCommitNotFoundWarning: false,
            suppressFileNotUnderSourceControlWarning: false,
            suppressGitVersionWarning: false,
            suppressLineUncommittedWarning: false,
            suppressNoRepositoryWarning: false,
            suppressUpdateNotice: false,
            suppressWelcomeNotice: false
        },
        quickPick: {
            closeOnFocusOut: false
        },
        repositorySearchDepth: 0,
        telemetry: {
            enabled: false
        }
    }
};
class Configuration {
    constructor() {
        this._onDidChange = new vscode_1.EventEmitter();
        this.initializingChangeEvent = {
            affectsConfiguration: (section, resource) => false
        };
    }
    static configure(context) {
        context.subscriptions.push(vscode_1.workspace.onDidChangeConfiguration(exports.configuration.onConfigurationChanged, exports.configuration));
    }
    get onDidChange() {
        return this._onDidChange.event;
    }
    onConfigurationChanged(e) {
        if (!e.affectsConfiguration(constants_1.ExtensionKey, null))
            return;
        this._onDidChange.fire(e);
    }
    get(section, resource) {
        return vscode_1.workspace.getConfiguration(section === undefined ? undefined : constants_1.ExtensionKey, resource).get(section === undefined ? constants_1.ExtensionKey : section);
    }
    changed(e, section, resource) {
        return e.affectsConfiguration(`${constants_1.ExtensionKey}.${section}`, resource);
    }
    initializing(e) {
        return e === this.initializingChangeEvent;
    }
    name(name) {
        return system_1.Functions.propOf(emptyConfig, name);
    }
    update(section, value, target) {
        return vscode_1.workspace.getConfiguration(constants_1.ExtensionKey).update(section, value, target);
    }
}
exports.Configuration = Configuration;
exports.configuration = new Configuration();
//# sourceMappingURL=configuration.js.map