module.exports = {
    install({ tree: { Quoted }, visitors }, manager) {
        global.TRACK = false
        class Visitor {
            constructor() {
                this.native = new visitors.Visitor(this);

                this.isPreEvalVisitor = true;
                this.isReplacing = true;
            }

            run(root) {
                return this.native.visit(root);
            }

            visitDeclaration(node) {
                if (node.name === '@stop') {
                    global.TRACK = false;
                }
                console.log(node.name, node.value.type);
                return node;
            }

            visitRuleset(node) {
                if (global.TRACK) {
                    // console.log(node.rules[0]);
                }
                return node;
            }

            visitMixinCall(node) {
                console.log('mixin call');  // , node.arguments[0].value.ruleset.rules[0].value.value[0]
                global.TRACK = true;
                return node;
            }

            visitVariable(node) {
                // console.log(node.name);
                if (node.name === '@foo') {
                    console.log('visited var');
                    return new Quoted(`'`, 'bar', true);
                }
                return node;
            }
        }

        manager.addVisitor(new Visitor());
        // console.log(manager);
    }
};
