"use strict";
(function (EntryType) {
    EntryType[EntryType["Bool"] = 0] = "Bool";
    EntryType[EntryType["String"] = 1] = "String";
    EntryType[EntryType["Path"] = 2] = "Path";
    EntryType[EntryType["FilePath"] = 3] = "FilePath";
    EntryType[EntryType["Internal"] = 4] = "Internal";
    EntryType[EntryType["Uninitialized"] = 5] = "Uninitialized";
    EntryType[EntryType["Static"] = 6] = "Static";
})(exports.EntryType || (exports.EntryType = {}));
var EntryType = exports.EntryType;
//# sourceMappingURL=api.js.map