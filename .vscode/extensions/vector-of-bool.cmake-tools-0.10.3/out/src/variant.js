"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const yaml = require("js-yaml");
const ajv = require("ajv");
const logging = require("./logging");
const rollbar_1 = require("./rollbar");
const pr_1 = require("./pr");
const util = require("./util");
const log = logging.createLogger('variant');
exports.DEFAULT_VARIANTS = {
    buildType: {
        default: 'debug',
        description: 'The build type',
        choices: {
            debug: {
                oneWordSummary: 'Debug',
                description: 'Emit debug information without performing optimizations',
                buildType: 'Debug',
            },
            release: {
                oneWordSummary: 'Release',
                description: 'Enable optimizations, omit debug info',
                buildType: 'Release',
            },
            minsize: {
                oneWordSummary: 'MinSizeRel',
                description: 'Optimize for smallest binary size',
                buildType: 'MinSizeRel',
            },
            reldeb: {
                oneWordSummary: 'RelWithDebInfo',
                description: 'Perform optimizations AND include debugging information',
                buildType: 'RelWithDebInfo',
            }
        }
    }
};
class VariantManager {
    /**
     * Create a new VariantManager
     * @param stateManager The state manager for this instance
     */
    constructor(_context, stateManager) {
        this._context = _context;
        this.stateManager = stateManager;
        /**
         * The variants available for this project
         */
        this._variants = new Map();
        this._activeVariantChanged = new vscode.EventEmitter();
        /**
         * Watches for changes to the variants file on the filesystem
         */
        this._variantFileWatcher = vscode.workspace.createFileSystemWatcher(path.join(vscode.workspace.rootPath || '/', 'cmake-variants.*'));
        log.debug('Constructing VariantManager');
        this._variantFileWatcher.onDidChange(() => {
            rollbar_1.default.invokeAsync('Reloading variants file', () => this._reloadVariantsFile());
        });
        this._variantFileWatcher.onDidCreate(() => {
            rollbar_1.default.invokeAsync('Reloading variants file', () => this._reloadVariantsFile());
        });
        this._variantFileWatcher.onDidDelete(() => {
            rollbar_1.default.invokeAsync('Reloading variants file', () => this._reloadVariantsFile());
        });
        rollbar_1.default.invokeAsync('Initial load of variants file', () => this._reloadVariantsFile());
    }
    get onActiveVariantChanged() { return this._activeVariantChanged.event; }
    dispose() {
        this._variantFileWatcher.dispose();
        this._activeVariantChanged.dispose();
    }
    async _reloadVariantsFile() {
        const schema_path = this._context.asAbsolutePath('schemas/variants-schema.json');
        const schema = JSON.parse((await pr_1.fs.readFile(schema_path)).toString());
        const validate = new ajv({ allErrors: true, format: 'full' }).compile(schema);
        const workdir = vscode.workspace.rootPath;
        if (!workdir) {
            // Can't read, we don't have a dir open
            return;
        }
        const files = [
            path.join(workdir, 'cmake-variants.json'),
            path.join(workdir, 'cmake-variants.yaml'),
        ];
        let new_variants = exports.DEFAULT_VARIANTS;
        for (const cand of files) {
            if (await pr_1.fs.exists(cand)) {
                const content = (await pr_1.fs.readFile(cand)).toString();
                try {
                    new_variants = yaml.load(content);
                    break;
                }
                catch (e) {
                    log.error(`Error parsing ${cand}: ${e}`);
                }
            }
        }
        const is_valid = validate(new_variants);
        if (!is_valid) {
            const errors = validate.errors;
            log.error('Invalid variants specified:');
            for (const err of errors) {
                log.error(` >> ${err.dataPath}: ${err.message}`);
            }
            new_variants = exports.DEFAULT_VARIANTS;
        }
        else {
            log.info("Loaded new set of variants");
        }
        const sets = new Map();
        for (const setting_name in new_variants) {
            const setting = new_variants[setting_name];
            const def = setting.default;
            const desc = setting.description;
            const choices = new Map();
            for (const choice_name in setting.choices) {
                const choice = setting.choices[choice_name];
                choices.set(choice_name, choice);
            }
            sets.set(setting_name, {
                default_: def,
                description: desc,
                choices: choices,
            });
        }
        this._variants = sets;
    }
    get haveVariant() {
        return !!this.stateManager.activeVariantSettings;
    }
    get activeVariantOptions() {
        const invalid_variant = {
            oneWordSummary: 'Unknown',
            description: 'Unknwon',
        };
        const kws = this.stateManager.activeVariantSettings;
        if (!kws) {
            return invalid_variant;
        }
        const vars = this._variants;
        if (!vars) {
            return invalid_variant;
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
        const init = {
            oneWordSummary: '',
            description: '',
            settings: []
        };
        const result = data.reduce((acc, el) => ({
            buildType: el.buildType || acc.buildType,
            generator: el.generator || acc.generator,
            linkage: el.linkage || acc.linkage,
            toolset: el.toolset || acc.toolset,
            settings: acc.settings.concat(el.settings || []),
            oneWordSummary: [acc.oneWordSummary, el.oneWordSummary].join(' ').trim(),
            description: [acc.description, el.description].join(', '),
        }), init);
        return result;
    }
    async selectVariant() {
        const variants = Array.from(this._variants.entries())
            .map(([key, variant]) => Array.from(variant.choices.entries())
            .map(([value_name, value]) => ({
            settingKey: key,
            settingValue: value_name,
            settings: value
        })));
        const product = util.product(variants);
        const items = product.map(optionset => ({
            label: optionset.map(o => o.settings.oneWordSummary).join('+'),
            keywordSettings: new Map(optionset.map(param => [param.settingKey, param.settingValue])),
            description: optionset.map(o => o.settings.description).join(' + '),
        }));
        const chosen = await vscode.window.showQuickPick(items);
        if (!chosen) {
            return false;
        }
        this.stateManager.activeVariantSettings = chosen.keywordSettings;
        this._activeVariantChanged.fire();
        return true;
    }
    async initialize() { await this._reloadVariantsFile(); }
}
exports.VariantManager = VariantManager;
//# sourceMappingURL=variant.js.map