(function (tree) {

    tree.visitor = function(implementation) {
        this._implementation = implementation;
    };

    tree.visitor.prototype = {
        visit: function(node) {

            if (node instanceof Array) {
                return this.visitArray(node);
            }

            if (!node || !node.type) {
                return node;
            }

            var funcName = "visit" + node.type,
                func = this._implementation[funcName],
                visitArgs, newNode;
            if (func) {
                visitArgs = {visitDeeper: true};
                newNode = func.call(this._implementation, node, visitArgs);
                if (this._implementation.isReplacing) {
                    node = newNode;
                }
            }
            if ((!visitArgs || visitArgs.visitDeeper) && node && node.accept) {
                node.accept(this);
            }
            funcName = funcName + "Out";
            if (this._implementation[funcName]) {
                this._implementation[funcName](node);
            }
            return node;
        },
        visitArray: function(nodes) {
            var i, newNodes = [];
            for(i = 0; i < nodes.length; i++) {
                var evald = this.visit(nodes[i]);
                if (evald instanceof Array) {
                    newNodes = newNodes.concat(this.flatten(evald));
                } else {
                    newNodes.push(evald);
                }
            }
            if (this._implementation.isReplacing) {
                return newNodes;
            }
            return nodes;
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