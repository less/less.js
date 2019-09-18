"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var constants_1 = require("./constants");
var node_1 = require("./tree/node");
function isPathRelative(path) {
    return !/^(?:[a-z-]+:|\/|#)/i.test(path);
}
function isPathLocalRelative(path) {
    return path.charAt(0) === '.';
}
/** Rethink this class, was called contexts.Eval */
var EvalContext = /** @class */ (function () {
    function EvalContext(options) {
        this.options = options;
        this.frames = new node_1.NodeArray();
        this.importantScope = [];
        this.inCalc = false;
        this.mathOn = true;
    }
    EvalContext.prototype.enterCalc = function () {
        if (!this.calcStack) {
            this.calcStack = [];
        }
        this.calcStack.push(true);
        this.inCalc = true;
    };
    EvalContext.prototype.exitCalc = function () {
        this.calcStack.pop();
        if (this.calcStack.length === 0) {
            this.inCalc = false;
        }
    };
    EvalContext.prototype.enterBlock = function () {
        if (!this.blockStack) {
            this.blockStack = [];
        }
        this.blockStack.push(true);
    };
    EvalContext.prototype.exitBlock = function () {
        this.blockStack.pop();
    };
    EvalContext.prototype.isMathOn = function (op) {
        if (!this.mathOn) {
            return false;
        }
        var mathMode = this.options.math;
        if (op === '/' && mathMode !== constants_1.MathMode.ALWAYS && (!this.blockStack || !this.blockStack.length)) {
            return false;
        }
        if (mathMode > constants_1.MathMode.PARENS_DIVISION) {
            return this.blockStack && this.blockStack.length;
        }
        return true;
    };
    EvalContext.prototype.pathRequiresRewrite = function (path) {
        var isRelative = this.options.rewriteUrls === constants_1.RewriteUrlMode.LOCAL ? isPathLocalRelative : isPathRelative;
        return isRelative(path);
    };
    /** @todo - break into environment */
    EvalContext.prototype.rewritePath = function (path, rootpath) {
        var newPath;
        rootpath = rootpath || '';
        newPath = this.normalizePath(rootpath + path);
        // If a path was explicit relative and the rootpath was not an absolute path
        // we must ensure that the new path is also explicit relative.
        if (isPathLocalRelative(path) &&
            isPathRelative(rootpath) &&
            isPathLocalRelative(newPath) === false) {
            newPath = "./" + newPath;
        }
        return newPath;
    };
    /** @todo - break into environment */
    EvalContext.prototype.normalizePath = function (path) {
        var segments = path.split('/').reverse();
        var segment;
        path = [];
        while (segments.length !== 0) {
            segment = segments.pop();
            switch (segment) {
                case '.':
                    break;
                case '..':
                    if ((path.length === 0) || (path[path.length - 1] === '..')) {
                        path.push(segment);
                    }
                    else {
                        path.pop();
                    }
                    break;
                default:
                    path.push(segment);
                    break;
            }
        }
        return path.join('/');
    };
    return EvalContext;
}());
exports.EvalContext = EvalContext;
//# sourceMappingURL=contexts.js.map