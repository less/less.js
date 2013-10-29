(function (tree) {

    var _visitArgs = { visitDeeper: true },
        _hasIndexed = false;

    function _noop(node) {
        return node;
    }

    function indexNodeTypes(parent, ticker) {
        // add .typeIndex to tree node types for lookup table
        var key, child;
        for (key in parent) {
            child = parent[key];
            switch (typeof child) {
                case "function":
                    if (child.prototype.type) {
                        child.prototype.typeIndex = ticker++;
                    }
                    break;
                case "object":
                    ticker = indexNodeTypes(child, ticker);
                    break;
            }
        }
        return ticker;
    }

    tree.visitor = function(implementation) {
        this._implementation = implementation;
        this._visitFnCache = [];

        if (!_hasIndexed) {
            indexNodeTypes(tree, 1);
            _hasIndexed = true;
        }
    };

    tree.visitor.prototype = {
        visit: function(node) {

            if (node instanceof Array) {
                return this.visitArray(node);
            }

            if (!node) {
                return node;
            }

            var nodeTypeIndex = node.typeIndex;
            if (!nodeTypeIndex) {
                return node;
            }

            var visitFnCache = this._visitFnCache,
                impl = this._implementation,
                aryIndx = nodeTypeIndex << 1,
                func = visitFnCache[aryIndx],
                funcOut = visitFnCache[aryIndx | 1],
                visitArgs = _visitArgs, noop = _noop,
                fnName;

            visitArgs.visitDeeper = true;

            if (!func) {
                fnName = "visit" + node.type;
                func = impl[fnName] || noop;
                funcOut = impl[fnName + "Out"] || noop;
                visitFnCache[aryIndx] = func;
                visitFnCache[aryIndx | 1] = funcOut;
            }

            if (func != noop) {
                var newNode = func.call(impl, node, visitArgs);
                if (impl.isReplacing) {
                    node = newNode;
                }
            }

            if (visitArgs.visitDeeper && node && node.accept) {
                node.accept(this);
            }

            if (funcOut != noop) {
                funcOut.call(impl, node);
            }

            return node;
        },
        visitArray: function(nodes) {
            var i, newNodes = [];
            for(i = 0; i < nodes.length; i++) {
                var evald = this.visit(nodes[i]);
                if (evald instanceof Array) {
                    evald = this.flatten(evald);
                    newNodes = newNodes.concat(evald);
                } else {
                    newNodes.push(evald);
                }
            }
            if (this._implementation.isReplacing) {
                return newNodes;
            }
            return nodes;
        },
        doAccept: function (node) {
            node.accept(this);
        },
        flatten: function(arr, master) {
            return arr.reduce(this.flattenReduce.bind(this), master || []);
        },
        flattenReduce: function(sum, element) {
            if (element instanceof Array) {
                sum = this.flatten(element, sum);
            } else {
                sum.push(element);
            }
            return sum;
        }
    };

})(require('./tree'));