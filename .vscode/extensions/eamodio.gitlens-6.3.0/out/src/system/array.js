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
const object_1 = require("./object");
var Arrays;
(function (Arrays) {
    function countUniques(source, accessor) {
        const uniqueCounts = Object.create(null);
        for (const item of source) {
            const value = accessor(item);
            uniqueCounts[value] = (uniqueCounts[value] || 0) + 1;
        }
        return uniqueCounts;
    }
    Arrays.countUniques = countUniques;
    function filterMap(source, predicateMapper) {
        return source.reduce((accumulator, current) => {
            const mapped = predicateMapper(current);
            if (mapped != null) {
                accumulator.push(mapped);
            }
            return accumulator;
        }, []);
    }
    Arrays.filterMap = filterMap;
    function filterMapAsync(source, predicateMapper) {
        return __awaiter(this, void 0, void 0, function* () {
            return source.reduce((accumulator, current) => __awaiter(this, void 0, void 0, function* () {
                const mapped = yield predicateMapper(current);
                if (mapped != null) {
                    accumulator.push(mapped);
                }
                return accumulator;
            }), []);
        });
    }
    Arrays.filterMapAsync = filterMapAsync;
    function groupBy(source, accessor) {
        return source.reduce((groupings, current) => {
            const value = accessor(current);
            groupings[value] = groupings[value] || [];
            groupings[value].push(current);
            return groupings;
        }, Object.create(null));
    }
    Arrays.groupBy = groupBy;
    function makeHierarchical(values, splitPath, joinPath, compact = false) {
        const seed = {
            name: '',
            relativePath: '',
            children: Object.create(null),
            descendants: []
        };
        const hierarchy = values.reduce((root, value) => {
            let folder = root;
            let relativePath = '';
            for (const folderName of splitPath(value)) {
                relativePath = joinPath(relativePath, folderName);
                if (folder.children === undefined) {
                    folder.children = Object.create(null);
                }
                let f = folder.children[folderName];
                if (f === undefined) {
                    folder.children[folderName] = f = {
                        name: folderName,
                        relativePath: relativePath,
                        children: undefined,
                        descendants: undefined
                    };
                }
                if (folder.descendants === undefined) {
                    folder.descendants = [];
                }
                folder.descendants.push(value);
                folder = f;
            }
            folder.value = value;
            return root;
        }, seed);
        if (compact)
            return compactHierarchy(hierarchy, joinPath, true);
        return hierarchy;
    }
    Arrays.makeHierarchical = makeHierarchical;
    function compactHierarchy(root, joinPath, isRoot = true) {
        if (root.children === undefined)
            return root;
        const children = [...object_1.Objects.values(root.children)];
        for (const child of children) {
            compactHierarchy(child, joinPath, false);
        }
        if (!isRoot && children.length === 1) {
            const child = children[0];
            if (child.value === undefined) {
                root.name = joinPath(root.name, child.name);
                root.relativePath = child.relativePath;
                root.children = child.children;
            }
        }
        return root;
    }
    Arrays.compactHierarchy = compactHierarchy;
    function uniqueBy(source, accessor, predicate) {
        const uniqueValues = Object.create(null);
        return source.filter(item => {
            const value = accessor(item);
            if (uniqueValues[value])
                return false;
            uniqueValues[value] = accessor;
            return predicate ? predicate(item) : true;
        });
    }
    Arrays.uniqueBy = uniqueBy;
})(Arrays = exports.Arrays || (exports.Arrays = {}));
//# sourceMappingURL=array.js.map