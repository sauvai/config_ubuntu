"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Configuration_1 = require("../configuration/Configuration");
class UserDefinedArgs {
    static getBuildArgs() {
        return UserDefinedArgs.getArgs('buildArgs');
    }
    static getCheckArgs() {
        return UserDefinedArgs.getArgs('checkArgs');
    }
    static getClippyArgs() {
        return UserDefinedArgs.getArgs('clippyArgs');
    }
    static getDocArgs() {
        return UserDefinedArgs.getArgs('docArgs');
    }
    static getRunArgs() {
        return UserDefinedArgs.getArgs('runArgs');
    }
    static getTestArgs() {
        return UserDefinedArgs.getArgs('testArgs');
    }
    static getArgs(property) {
        const configuration = Configuration_1.Configuration.getConfiguration();
        return configuration.get(property, []);
    }
}
exports.UserDefinedArgs = UserDefinedArgs;
//# sourceMappingURL=UserDefinedArgs.js.map