"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Toolchain {
    constructor(channel, host, isDefault) {
        this.channel = channel;
        this.host = host;
        this.isDefault = isDefault;
    }
    /**
     * Tries to parse the text and if returns the toolchain parsed from the text
     * @param text The text to parse
     * @return the toolchain or undefined
     */
    static parse(text) {
        const sepIndex = text.indexOf('-');
        const channelEnd = sepIndex === -1 ? undefined : sepIndex;
        const channel = text.substring(0, channelEnd);
        if (channelEnd === undefined) {
            // The text represents the toolchain with the only channel.
            return new Toolchain(channel, undefined, false);
        }
        const spaceIndex = text.indexOf(' ', sepIndex);
        const hostEnd = spaceIndex === -1 ? undefined : spaceIndex;
        const host = text.substring(sepIndex + 1, hostEnd);
        const isDefault = text.endsWith(Toolchain.defaultToolchainPrefix);
        return new Toolchain(channel, host, isDefault);
    }
    equals(toolchain) {
        return this.channel === toolchain.channel && this.host === toolchain.host;
    }
    toString(includeHost, includeIsDefault) {
        let s = this.channel.concat();
        if (includeHost && this.host) {
            s += '-';
            s += this.host;
        }
        if (includeIsDefault && this.isDefault) {
            s += Toolchain.defaultToolchainPrefix;
        }
        return s;
    }
}
Toolchain.defaultToolchainPrefix = ' (default)';
exports.Toolchain = Toolchain;
//# sourceMappingURL=Toolchain.js.map