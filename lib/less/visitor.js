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
        visitArray: function(nodes, nonReplacing) {
            if (!nodes) {
                return nodes;
            }

            var cnt = nodes.length, i;

            // Non-replacing
            if (nonReplacing || !this._implementation.isReplacing) {
                for (i = 0; i < cnt; i++) {
                    this.visit(nodes[i]);
                }
                return nodes;
            }

            // Replacing
            var out = [];
            for (i = 0; i < cnt; i++) {
                var evald = this.visit(nodes[i]);
                if (!evald.splice) {
                    out.push(evald);
                } else if (evald.length) {
                    this.flatten(evald, out);
                }
            }
            return out;
        },
        flatten: function(arr, out) {
            if (!out)
                out = [];

            var cnt = arr.length, i, item,
                nestedCnt, j, nestedItem;

            for (i = 0; i < cnt; i++) {
                item = arr[i];
                if (!item.splice) {
                    out.push(item);
                    continue;
                }

                nestedCnt = item.length;
                for (j = 0; j < nestedCnt; j++) {
                    nestedItem = item[j];
                    if (!nestedItem.splice) {
                        out.push(nestedItem);
                    } else if (nestedItem.length) {
                        this.flatten(nestedItem, out);
                    }
                }
            }

            return out;
        }
    };

})(require('./tree'));