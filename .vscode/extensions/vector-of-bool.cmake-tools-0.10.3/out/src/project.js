"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rollbar_1 = require("./rollbar");
const kit_1 = require("./kit");
const state_1 = require("./state");
const legacy_driver_1 = require("./legacy-driver");
class CMakeTools {
    constructor(extensionContext) {
        this.extensionContext = extensionContext;
        // Let's us submit rollbar messages
        this._stateManager = new state_1.StateManager(this.extensionContext);
        /**
         * It's up to the kit manager to do all things related to kits. We only listen
         * to it for kit changes.
         */
        this._kitManager = new kit_1.KitManager(this._stateManager);
        /// We store the active kit here
        this._activeKit = null;
        // Handle the active kit changing. We want to do some updates and teardown
        this._kitManager.onActiveKitChanged(kit => {
            rollbar_1.default.invokeAsync('Changing CMake kit', async () => {
                this._activeKit = kit;
                if (kit) {
                    await this._cmakeDriver.setKit(kit);
                }
            });
        });
    }
    // Teardown
    dispose() {
        rollbar_1.default.invoke('Root dispose', () => {
            this._kitManager.dispose();
            if (this._cmakeDriver) {
                this._cmakeDriver.dispose();
            }
        });
    }
    /**
     * Reload/restarts the CMake Driver
     */
    async _reloadCMakeDriver() {
        if (this._cmakeDriver) {
            await this._cmakeDriver.asyncDispose();
        }
        this._cmakeDriver = await legacy_driver_1.LegacyCMakeDriver.create();
        if (this._activeKit) {
            await this._cmakeDriver.setKit(this._activeKit);
        }
    }
    // Two-phase initialize
    async _init() {
        await rollbar_1.default.invokeAsync('Root init', async () => {
            // First, start up Rollbar
            await rollbar_1.default.requestPermissions(this.extensionContext);
            // Now start the CMake driver
            await this._reloadCMakeDriver();
            // Start up the kit manager. This will also inject the current kit into
            // the CMake driver
            await this._kitManager.initialize();
        });
    }
    // Static creation, because we never want to hand-out an uninitialized
    // instance
    static async create(ctx) {
        const inst = new CMakeTools(ctx);
        await inst._init();
        return inst;
    }
    // Extension command implementations
    editKits() {
        return rollbar_1.default.invokeAsync('editKits', () => this._kitManager.openKitsEditor());
    }
    scanForKits() {
        return rollbar_1.default.invokeAsync('scanForKits', () => this._kitManager.rescanForKits());
    }
    selectKit() { return rollbar_1.default.invokeAsync('selectKit', () => this._kitManager.selectKit()); }
    async configure() {
        while (!this._activeKit) {
            await this.selectKit();
        }
        return rollbar_1.default.invokeAsync('configure', () => this._cmakeDriver.configure());
    }
}
exports.CMakeTools = CMakeTools;
//# sourceMappingURL=project.js.map