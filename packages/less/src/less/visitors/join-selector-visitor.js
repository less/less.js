import Visitor from './visitor';

class JoinSelectorVisitor {
    constructor() {
        this.contexts = [[]];
        this._visitor = new Visitor(this);
    }

    run(root) {
        return this._visitor.visit(root);
    }

    visitDeclaration(_declNode, visitArgs) {
        visitArgs.visitDeeper = false;
    }

    visitMixinDefinition(_mixinDefinitionNode, visitArgs) {
        visitArgs.visitDeeper = false;
    }

    visitRuleset(rulesetNode, _visitArgs) {
        const context = this.contexts[this.contexts.length - 1];
        const paths = [];
        let selectors;

        this.contexts.push(paths);

        if (!rulesetNode.root) {
            selectors = rulesetNode.selectors;
            if (selectors) {
                selectors = selectors.filter(function(selector) { return selector.getIsOutput(); });
                rulesetNode.selectors = selectors.length ? selectors : (selectors = null);
                if (selectors) { rulesetNode.joinSelectors(paths, context, selectors); }
            }
            if (!selectors) { rulesetNode.rules = null; }
            rulesetNode.paths = paths;
        }
    }

    visitRulesetOut(_rulesetNode) {
        this.contexts.length = this.contexts.length - 1;
    }

    visitMedia(mediaNode, _visitArgs) {
        const context = this.contexts[this.contexts.length - 1];
        mediaNode.rules[0].root = (context.length === 0 || context[0].multiMedia);
    }

    visitAtRule(atRuleNode, _visitArgs) {
        const context = this.contexts[this.contexts.length - 1];
        if (atRuleNode.rules && atRuleNode.rules.length) {
            atRuleNode.rules[0].root = (atRuleNode.isRooted || context.length === 0 || null);
        }
    }
}

export default JoinSelectorVisitor;
