'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const iterable_1 = require("../system/iterable");
class StringIterator {
    constructor() {
        this._value = '';
        this._pos = 0;
    }
    reset(key) {
        this._value = key;
        this._pos = 0;
        return this;
    }
    next() {
        this._pos += 1;
        return this;
    }
    join(parts) {
        return parts.join('');
    }
    hasNext() {
        return this._pos < this._value.length - 1;
    }
    cmp(a) {
        const aCode = a.charCodeAt(0);
        const thisCode = this._value.charCodeAt(this._pos);
        return aCode - thisCode;
    }
    value() {
        return this._value[this._pos];
    }
}
exports.StringIterator = StringIterator;
class PathIterator {
    reset(key) {
        this._value = key.replace(/\\$|\/$/, '');
        this._from = 0;
        this._to = 0;
        return this.next();
    }
    hasNext() {
        return this._to < this._value.length;
    }
    join(parts) {
        return parts.join('/');
    }
    next() {
        this._from = this._to;
        let justSeps = true;
        for (; this._to < this._value.length; this._to++) {
            const ch = this._value.charCodeAt(this._to);
            if (ch === PathIterator._fwd || ch === PathIterator._bwd) {
                if (justSeps) {
                    this._from++;
                }
                else {
                    break;
                }
            }
            else {
                justSeps = false;
            }
        }
        return this;
    }
    cmp(a) {
        let aPos = 0;
        const aLen = a.length;
        let thisPos = this._from;
        while (aPos < aLen && thisPos < this._to) {
            const cmp = a.charCodeAt(aPos) - this._value.charCodeAt(thisPos);
            if (cmp !== 0) {
                return cmp;
            }
            aPos += 1;
            thisPos += 1;
        }
        if (aLen === this._to - this._from) {
            return 0;
        }
        else if (aPos < aLen) {
            return -1;
        }
        else {
            return 1;
        }
    }
    value() {
        return this._value.substring(this._from, this._to);
    }
}
PathIterator._fwd = '/'.charCodeAt(0);
PathIterator._bwd = '\\'.charCodeAt(0);
exports.PathIterator = PathIterator;
class TernarySearchTreeNode {
    isEmpty() {
        return this.left === undefined && this.mid === undefined && this.right === undefined && this.element === undefined;
    }
}
class TernarySearchTree {
    constructor(segments) {
        this._iter = segments;
    }
    static forPaths() {
        return new TernarySearchTree(new PathIterator());
    }
    static forStrings() {
        return new TernarySearchTree(new StringIterator());
    }
    clear() {
        this._root = undefined;
    }
    set(key, element) {
        const iter = this._iter.reset(key);
        let node;
        if (!this._root) {
            this._root = new TernarySearchTreeNode();
            this._root.str = iter.value();
        }
        node = this._root;
        while (true) {
            const val = iter.cmp(node.str);
            if (val > 0) {
                if (!node.left) {
                    node.left = new TernarySearchTreeNode();
                    node.left.str = iter.value();
                }
                node = node.left;
            }
            else if (val < 0) {
                if (!node.right) {
                    node.right = new TernarySearchTreeNode();
                    node.right.str = iter.value();
                }
                node = node.right;
            }
            else if (iter.hasNext()) {
                iter.next();
                if (!node.mid) {
                    node.mid = new TernarySearchTreeNode();
                    node.mid.str = iter.value();
                }
                node = node.mid;
            }
            else {
                break;
            }
        }
        node.element = element;
    }
    get(key) {
        const iter = this._iter.reset(key);
        let node = this._root;
        while (node) {
            const val = iter.cmp(node.str);
            if (val > 0) {
                node = node.left;
            }
            else if (val < 0) {
                node = node.right;
            }
            else if (iter.hasNext()) {
                iter.next();
                node = node.mid;
            }
            else {
                break;
            }
        }
        return node ? node.element : undefined;
    }
    delete(key) {
        const iter = this._iter.reset(key);
        const stack = [];
        let node = this._root;
        while (node) {
            const val = iter.cmp(node.str);
            if (val > 0) {
                stack.push([1, node]);
                node = node.left;
            }
            else if (val < 0) {
                stack.push([-1, node]);
                node = node.right;
            }
            else if (iter.hasNext()) {
                iter.next();
                stack.push([0, node]);
                node = node.mid;
            }
            else {
                node.element = undefined;
                while (stack.length > 0 && node.isEmpty()) {
                    const [dir, parent] = stack.pop();
                    switch (dir) {
                        case 1:
                            parent.left = undefined;
                            break;
                        case 0:
                            parent.mid = undefined;
                            break;
                        case -1:
                            parent.right = undefined;
                            break;
                    }
                    node = parent;
                }
                break;
            }
        }
    }
    findSubstr(key) {
        const iter = this._iter.reset(key);
        let node = this._root;
        let candidate;
        while (node) {
            const val = iter.cmp(node.str);
            if (val > 0) {
                node = node.left;
            }
            else if (val < 0) {
                node = node.right;
            }
            else if (iter.hasNext()) {
                iter.next();
                candidate = node.element || candidate;
                node = node.mid;
            }
            else {
                break;
            }
        }
        return node && node.element || candidate;
    }
    findSuperstr(key) {
        const iter = this._iter.reset(key);
        let node = this._root;
        while (node) {
            const val = iter.cmp(node.str);
            if (val > 0) {
                node = node.left;
            }
            else if (val < 0) {
                node = node.right;
            }
            else if (iter.hasNext()) {
                iter.next();
                node = node.mid;
            }
            else {
                if (!node.mid) {
                    return undefined;
                }
                const ret = new TernarySearchTree(this._iter);
                ret._root = node.mid;
                return ret;
            }
        }
        return undefined;
    }
    forEach(callback) {
        this._forEach(this._root, [], callback);
    }
    _forEach(node, parts, callback) {
        if (node === undefined)
            return;
        this._forEach(node.left, parts, callback);
        parts.push(node.str);
        if (node.element) {
            callback(node.element, this._iter.join(parts));
        }
        this._forEach(node.mid, parts, callback);
        parts.pop();
        this._forEach(node.right, parts, callback);
    }
    any() {
        return this._root !== undefined && !this._root.isEmpty();
    }
    entries() {
        return this._iterator(this._root, []);
    }
    values() {
        return iterable_1.Iterables.map(this.entries(), e => e[0]);
    }
    highlander() {
        if (this._root === undefined || this._root.isEmpty())
            return undefined;
        const entries = this.entries();
        let count = 0;
        let next;
        let value;
        while (true) {
            next = entries.next();
            if (next.done)
                break;
            value = next.value;
            count++;
            if (count > 1)
                return undefined;
        }
        return value;
    }
    *_iterator(node, parts) {
        if (node !== undefined) {
            yield* this._iterator(node.left, parts);
            parts.push(node.str);
            if (node.element) {
                yield [node.element, this._iter.join(parts)];
            }
            yield* this._iterator(node.mid, parts);
            parts.pop();
            yield* this._iterator(node.right, parts);
        }
    }
}
exports.TernarySearchTree = TernarySearchTree;
//# sourceMappingURL=searchTree.js.map