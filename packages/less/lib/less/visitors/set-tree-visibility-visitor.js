import Node from '../tree/node.js';

class SetTreeVisibilityVisitor {
    /** @param {boolean} visible */
    constructor(visible) {
        this.visible = visible;
    }

    /** @param {Node} root */
    run(root) {
        this.visit(root);
    }

    /**
     * @param {Node[]} nodes
     * @returns {Node[]}
     */
    visitArray(nodes) {
        if (!nodes) {
            return nodes;
        }

        const cnt = nodes.length;
        let i;
        for (i = 0; i < cnt; i++) {
            this.visit(nodes[i]);
        }
        return nodes;
    }

    /**
     * @param {*} node
     * @returns {*}
     */
    visit(node) {
        if (!node) {
            return node;
        }
        if (node.constructor === Array) {
            return this.visitArray(node);
        }

        if (!node.blocksVisibility || node.blocksVisibility()) {
            return node;
        }
        if (this.visible) {
            node.ensureVisibility();
        } else {
            node.ensureInvisibility();
        }

        node.accept(this);
        return node;
    }
}

export default SetTreeVisibilityVisitor;
