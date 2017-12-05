"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Configuration of Rust installed not via Rustup, but via other variant
 */
class NotRustup {
    constructor(rustcSysRoot) {
        this.rustcSysRoot = rustcSysRoot;
    }
    /**
     * Returns Rust's installation root
     */
    getRustcSysRoot() {
        return this.rustcSysRoot;
    }
}
exports.NotRustup = NotRustup;
//# sourceMappingURL=NotRustup.js.map