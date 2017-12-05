"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ajv = require("ajv");
const yaml = require("js-yaml");
const path = require("path");
const vscode = require("vscode");
const async = require("./async");
const config_1 = require("./config");
const util = require("./util");
exports.DEFAULT_VARIANTS = {
    buildType: {
        default$: 'debug',
        description$: 'The build type to use',
        debug: {
            oneWordSummary$: 'Debug',
            description$: 'Emit debug information without performing optimizations',
            buildType: 'Debug',
        },
        release: {
            oneWordSummary$: 'Release',
            description$: 'Enable optimizations, omit debug info',
            buildType: 'Release',
        },
        minsize: {
            oneWordSummary$: 'MinSizeRel',
            description$: 'Optimize for smallest binary size',
            buildType: 'MinSizeRel',
        },
        reldeb: {
            oneWordSummary$: 'RelWithDebInfo',
            description$: 'Perform optimizations AND include debugging information',
            buildType: 'RelWithDebInfo',
        }
    },
};
class VariantManager {
    constructor(_context) {
        this._context = _context;
        this._disposables = [];
        this._activeVariantCombinationEmitter = new vscode.EventEmitter();
        this.onActiveVariantCombinationChanged = this._activeVariantCombinationEmitter.event;
        const workdir = vscode.workspace.rootPath;
        const variants_watchers = [
            vscode.workspace.createFileSystemWatcher(path.join(workdir, 'cmake-variants.*')),
            vscode.workspace.createFileSystemWatcher(path.join(workdir, '.vscode', 'cmake-variants.*'))
        ];
        for (const variants_watcher of variants_watchers) {
            this._disposables.push(variants_watcher);
            variants_watcher.onDidChange(this._reloadVariants.bind(this));
            variants_watcher.onDidCreate(this._reloadVariants.bind(this));
            variants_watcher.onDidDelete(this._reloadVariants.bind(this));
        }
        this._reloadVariants();
    }
    dispose() {
        this._disposables.map(e => e.dispose());
    }
    get availableVariants() {
        return this._availableVariants;
    }
    get activeVariantCombination() {
        return this._activeVariantCombination;
    }
    set activeVariantCombination(v) {
        this._activeVariantCombination = v;
        this._activeVariantCombinationEmitter.fire(v);
    }
    /**
     * Get the configuration options associated with the active build variant
     */
    get activeConfigurationOptions() {
        const vari = this.activeVariantCombination;
        if (!vari) {
            return {};
        }
        const kws = vari.keywordSettings;
        if (!kws) {
            return {};
        }
        const vars = this.availableVariants;
        if (!vars) {
            return {};
        }
        const data = Array.from(kws.entries()).map(([param, setting]) => {
            if (!vars.has(param)) {
                debugger;
                throw 12;
            }
            const choices = vars.get(param).choices;
            if (!choices.has(setting)) {
                debugger;
                throw 12;
            }
            return choices.get(setting);
        });
        const result = data.reduce((acc, el) => ({
            buildType: el.buildType || acc.buildType,
            generator: el.generator || acc.generator,
            linkage: el.linkage || acc.linkage,
            toolset: el.toolset || acc.toolset,
            settings: Object.assign(acc.settings || {}, el.settings || {})
        }), {});
        return result;
    }
    /**
     * Called to reload the contents of cmake-variants.json
     *
     * This function is called once when the extension first starts up, and is
     * called whenever a change is detected in the cmake variants file. This
     * function will also show any error messages related to a malformed variants
     * file if there is a problem therein.
     */
    async _reloadVariants() {
        const schema_path = this._context.asAbsolutePath('schemas/variants-schema.json');
        const schema = JSON.parse((await async.readFile(schema_path)).toString());
        const validate = new ajv({
            allErrors: true,
            format: 'full',
        }).compile(schema);
        const workdir = vscode.workspace.rootPath;
        const yaml_file = path.join(workdir, 'cmake-variants.yaml');
        const json_files = [
            path.join(workdir, 'cmake-variants.json'),
            path.join(workdir, '.vscode', 'cmake-variants.json')
        ];
        let variants;
        if (await async.exists(yaml_file)) {
            const content = (await async.readFile(yaml_file)).toString();
            try {
                variants = yaml.load(content);
            }
            catch (e) {
                vscode.window.showErrorMessage(`${yaml_file} is syntactically invalid.`);
                variants = config_1.config.defaultVariants;
            }
        }
        else {
            // iterate on the json files
            for (const json_file of json_files) {
                if (await async.exists(json_file)) {
                    const content = (await async.readFile(json_file)).toString();
                    try {
                        variants = JSON.parse(content);
                        break;
                    }
                    catch (e) {
                        vscode.window.showErrorMessage(`${json_file} is syntactically invalid.`);
                        variants = config_1.config.defaultVariants;
                    }
                }
            }
            // check if it was loaded
            if (variants === undefined) {
                variants = config_1.config.defaultVariants;
            }
        }
        const validated = validate(variants);
        if (!validated) {
            const errors = validate.errors;
            const error_strings = errors.map(err => `${err.dataPath}: ${err.message}`);
            vscode.window.showErrorMessage(`Invalid cmake-variants: ${error_strings.join('; ')}`);
            variants = config_1.config.defaultVariants;
        }
        const sets = new Map();
        for (const key in variants) {
            const sub = variants[key];
            const def = sub['default$'];
            const desc = sub['description$'];
            const choices = new Map();
            for (const name in sub) {
                if (!name || ['default$', 'description$'].indexOf(name) !== -1) {
                    continue;
                }
                const settings = sub[name];
                choices.set(name, settings);
            }
            sets.set(key, { description: desc, default: def, choices });
        }
        this._availableVariants = sets;
    }
    _generateVariantLabel(settings) {
        return Array.from(this.availableVariants.entries())
            .map(([key, values]) => values.choices.get(settings[key]).oneWordSummary$)
            .join('+');
    }
    _generateVariantDescription(settings) {
        return Array.from(this.availableVariants.entries())
            .map(([key, values]) => values.choices.get(settings[key]).description$)
            .join(' + ');
    }
    async setActiveVariantCombination(settings) {
        this.activeVariantCombination = {
            label: this._generateVariantLabel(settings),
            description: this._generateVariantDescription(settings),
            keywordSettings: Object.keys(settings).reduce((acc, key) => {
                acc.set(key, settings[key]);
                return acc;
            }, new Map()),
        };
    }
    async showVariantSelector() {
        const variants = Array.from(this.availableVariants.entries())
            .map(([key, variant]) => Array.from(variant.choices.entries())
            .map(([value_name, value]) => ({
            settingKey: key,
            settingValue: value_name,
            settings: value
        })));
        const product = util.product(variants);
        const items = product.map(optionset => ({
            label: optionset
                .map(o => o.settings['oneWordSummary$'] ?
                o.settings['oneWordSummary$'] :
                `${o.settingKey}=${o.settingValue}`)
                .join('+'),
            keywordSettings: new Map(optionset.map(param => [param.settingKey, param.settingValue])),
            description: optionset.map(o => o.settings['description$']).join(' + '),
        }));
        const chosen = await vscode.window.showQuickPick(items);
        if (!chosen)
            return false; // User cancelled
        this.activeVariantCombination = chosen;
        return true;
    }
}
exports.VariantManager = VariantManager;
//# sourceMappingURL=variants.js.map