'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("../common");
class PersistentState {
    constructor(key, defaultValue) {
        this.key = key;
        this.defaultvalue = defaultValue;
    }
    get Value() {
        return util.extensionContext.globalState.get(this.key, this.defaultvalue);
    }
    set Value(newValue) {
        util.extensionContext.globalState.update(this.key, newValue);
    }
}
exports.PersistentState = PersistentState;
class PersistentWorkspaceState {
    constructor(key, defaultValue) {
        this.key = key;
        this.defaultvalue = defaultValue;
    }
    get Value() {
        return util.extensionContext.workspaceState.get(this.key, this.defaultvalue);
    }
    set Value(newValue) {
        util.extensionContext.workspaceState.update(this.key, newValue);
    }
}
exports.PersistentWorkspaceState = PersistentWorkspaceState;
//# sourceMappingURL=persistentState.js.map