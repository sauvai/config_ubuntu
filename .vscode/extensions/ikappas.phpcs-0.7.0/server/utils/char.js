/* --------------------------------------------------------------------------------------------
 * Copyright (c) Ioannis Kappas. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
function whitespace(charCode) {
    return (charCode >= 9 && charCode <= 13) ||
        charCode === 32; // space
}
exports.whitespace = whitespace;
function alphaNumeric(charCode) {
    if (!(charCode > 47 && charCode < 58) &&
        !(charCode > 64 && charCode < 91) &&
        !(charCode > 96 && charCode < 123)) {
        return false;
    }
    return true;
}
exports.alphaNumeric = alphaNumeric;
function symbol(charCode) {
    return charCode === 36 ||
        charCode === 64; // @
}
exports.symbol = symbol;
//# sourceMappingURL=char.js.map