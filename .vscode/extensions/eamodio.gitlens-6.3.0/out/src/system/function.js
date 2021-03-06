'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const _debounce = require('lodash.debounce');
const _once = require('lodash.once');
var Functions;
(function (Functions) {
    function debounce(fn, wait, options) {
        return _debounce(fn, wait, options);
    }
    Functions.debounce = debounce;
    function once(fn) {
        return _once(fn);
    }
    Functions.once = once;
    function propOf(o, key) {
        const propOfCore = (o, key) => {
            const value = propOfCore.value === undefined
                ? key
                : `${propOfCore.value}.${key}`;
            propOfCore.value = value;
            const fn = (k) => propOfCore(o[key], k);
            return Object.assign(fn, { value: value });
        };
        return propOfCore(o, key);
    }
    Functions.propOf = propOf;
    function wait(ms) {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise(resolve => setTimeout(resolve, ms));
        });
    }
    Functions.wait = wait;
})(Functions = exports.Functions || (exports.Functions = {}));
//# sourceMappingURL=function.js.map