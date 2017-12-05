"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const Configuration_1 = require("../configuration/Configuration");
class CustomConfigurationQuickPickItem {
    constructor(cfg) {
        this.label = cfg.title;
        this.description = '';
        this.args = cfg.args;
    }
}
class CustomConfigurationChooser {
    constructor(configuration) {
        this.configuration = configuration;
    }
    choose(propertyName) {
        const configuration = Configuration_1.Configuration.getConfiguration();
        const customConfigurations = configuration.get(propertyName);
        if (!customConfigurations) {
            throw new Error(`No custom configurations for property=${propertyName}`);
        }
        if (customConfigurations.length === 0) {
            vscode_1.window.showErrorMessage('There are no defined custom configurations');
            return Promise.reject(null);
        }
        if (customConfigurations.length === 1) {
            const customConfiguration = customConfigurations[0];
            const args = customConfiguration.args;
            return Promise.resolve(args);
        }
        const quickPickItems = customConfigurations.map(c => new CustomConfigurationQuickPickItem(c));
        return vscode_1.window.showQuickPick(quickPickItems).then(item => {
            if (!item) {
                return Promise.reject(null);
            }
            return Promise.resolve(item.args);
        });
    }
}
exports.CustomConfigurationChooser = CustomConfigurationChooser;
//# sourceMappingURL=custom_configuration_chooser.js.map