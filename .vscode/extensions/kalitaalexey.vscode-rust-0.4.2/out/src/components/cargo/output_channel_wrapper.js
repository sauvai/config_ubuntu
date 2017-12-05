"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class OutputChannelWrapper {
    constructor(channel) {
        this.channel = channel;
    }
    append(message) {
        this.channel.append(message);
    }
    clear() {
        this.channel.clear();
    }
    show() {
        this.channel.show(true);
    }
}
exports.OutputChannelWrapper = OutputChannelWrapper;
//# sourceMappingURL=output_channel_wrapper.js.map