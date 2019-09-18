"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var Node = /** @class */ (function () {
    function Node(props, opts, location) {
        if (opts === void 0) { opts = {}; }
        if (Array.isArray(props)) {
            var values = props;
            this.children = { values: values };
            this.values = values;
            this.childKeys = ['values'];
        }
        else {
            var value = props.value, text = props.text, children = __rest(props, ["value", "text"]);
            this.children = children;
            if (!children.values) {
                this.children.values = [];
            }
            this.values = this.children.values;
            this.childKeys = Object.keys(children);
            this.value = value;
            this.text = text;
        }
        this.setParent();
        this.location = location;
        var fileInfo = opts.fileInfo, options = opts.options, rest = __rest(opts, ["fileInfo", "options"]);
        this.options = rest;
        if (options) {
            this.root = this;
            this.evalOptions = options;
        }
        if (fileInfo) {
            this.fileRoot = this;
            this.fileInfo = fileInfo;
        }
        this.evaluated = false;
        this.visibilityBlocks = 0;
    }
    Node.prototype.setParent = function () {
        var _this = this;
        this.childKeys.forEach(function (key) {
            var nodes = _this.children[key];
            nodes.forEach(function (node) {
                node.parent = _this;
                if (!node.fileRoot) {
                    node.fileRoot = _this.fileRoot;
                }
                if (!node.root) {
                    node.root = _this.root;
                }
            });
        });
    };
    Node.prototype.normalizeValues = function (values) {
        if (!Array.isArray(values)) {
            if (values === undefined) {
                return [];
            }
            return [values];
        }
        return values;
    };
    Node.prototype.accept = function (visitor) {
        this.processChildren(this, function (node) { return visitor.visit(node); });
    };
    Node.prototype.valueOf = function () {
        if (this.value !== undefined) {
            return this.value;
        }
        if (this.text !== undefined) {
            return this.text;
        }
        return this.values.join('');
    };
    Node.prototype.toString = function () {
        if (this.text !== undefined) {
            return this.text;
        }
        if (this.value !== undefined) {
            return this.value.toString();
        }
        return this.values.join('');
    };
    /**
     * Derived nodes can pass in context to eval and clone at the same time
     */
    Node.prototype.clone = function (context) {
        var Clazz = Object.getPrototypeOf(this);
        var newNode = new Clazz({
            value: this.value,
            text: this.text
            /** For now, there's no reason to mutate this.location, so its reference is just copied */
        }, __assign({}, this.options), this.location);
        newNode.childKeys = __spreadArrays(this.childKeys);
        this.processChildren(newNode, function (node) { return node.clone(context); });
        newNode.values = newNode.children.values;
        if (context) {
            newNode.evaluated = true;
        }
        else {
            newNode.evaluated = this.evaluated;
        }
        /** Copy basic node props */
        newNode.parent = this.parent;
        newNode.root = this.root;
        newNode.fileRoot = this.fileRoot;
        newNode.fileInfo = this.fileInfo;
        newNode.evalOptions = this.evalOptions;
        newNode.visibilityBlocks = this.visibilityBlocks;
        newNode.isVisible = this.isVisible;
        newNode.type = this.type;
        return newNode;
    };
    Node.prototype.getFileInfo = function () {
        return this.fileRoot.fileInfo;
    };
    /**
     * This is an in-place mutation of a node array
     *
     * Unresolved Q: would a new array be more performant than array mutation?
     * The reason we do this is because the array may not mutate at all depending
     * on the result of processing
     *
     * This also allows `this.value` to retain a pointer to `this.children.value`
     */
    Node.prototype.processNodeArray = function (nodeArray, processFunc) {
        var thisLength = nodeArray.length;
        for (var i = 0; i < thisLength; i++) {
            var item = nodeArray[i];
            var node = processFunc(item);
            if (Array.isArray(node)) {
                var nodeLength = node.length;
                if (node.length === 0) {
                    nodeArray.splice(i, 1);
                    i--;
                    continue;
                }
                else {
                    nodeArray.splice.apply(nodeArray, __spreadArrays([i, 1], node));
                    thisLength += nodeLength;
                    i += nodeLength;
                    continue;
                }
            }
            if (node === undefined || node === null || node === false) {
                nodeArray.splice(i, 1);
                i--;
                continue;
            }
            nodeArray[i] = node;
        }
        return nodeArray;
    };
    Node.prototype.processChildren = function (node, processFunc) {
        var _this = this;
        this.childKeys.forEach(function (key) {
            var nodes = _this.children[key];
            if (nodes) {
                if (node !== _this) {
                    nodes = __spreadArrays(nodes);
                    node.children[key] = _this.processNodeArray(nodes, processFunc);
                }
                else {
                    _this.processNodeArray(nodes, processFunc);
                }
            }
        });
    };
    /**
     * By default, nodes will just evaluate nested values
     * However, some nodes after evaluating will of course override
     * this to produce different node types or primitive values
     */
    Node.prototype.eval = function (context) {
        if (!this.evaluated) {
            this.processChildren(this, function (node) { return node.eval(context); });
        }
        this.evaluated = true;
        return this;
    };
    /**
     * Output is a kind of string builder?
     * @todo - All genCSS and toCSS will get moved out of the AST and
     *         into visitor processing.
    */
    Node.prototype.genCSS = function (output, context) {
        output.add(this.toString());
    };
    // Returns true if this node represents root of ast imported by reference
    // blocksVisibility() {
    //     if (this.visibilityBlocks == null) {
    //         this.visibilityBlocks = 0;
    //     }
    //     return this.visibilityBlocks !== 0;
    // }
    // addVisibilityBlock() {
    //     if (this.visibilityBlocks == null) {
    //         this.visibilityBlocks = 0;
    //     }
    //     this.visibilityBlocks = this.visibilityBlocks + 1;
    // }
    // removeVisibilityBlock() {
    //     if (this.visibilityBlocks == null) {
    //         this.visibilityBlocks = 0;
    //     }
    //     this.visibilityBlocks = this.visibilityBlocks - 1;
    // }
    // Turns on node visibility - if called node will be shown in output regardless
    // of whether it comes from import by reference or not
    // ensureVisibility() {
    //     this.nodeVisible = true;
    // }
    // Turns off node visibility - if called node will NOT be shown in output regardless
    // of whether it comes from import by reference or not
    // ensureInvisibility() {
    //     this.nodeVisible = false;
    // }
    // return values:
    // isVisible() {
    //     return this.nodeVisible;
    // }
    // visibilityInfo() {
    //     return {
    //         visibilityBlocks: this.visibilityBlocks,
    //         nodeVisible: this.nodeVisible
    //     };
    // }
    Node.prototype.copyVisibilityInfo = function (info) {
        if (!info) {
            return;
        }
        this.visibilityBlocks = info.visibilityBlocks;
        this.isVisible = info.isVisible;
    };
    return Node;
}());
exports.Node = Node;
exports.default = Node;
//# sourceMappingURL=node.js.map