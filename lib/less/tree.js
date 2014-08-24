var tree = {};

tree.Alpha = require('./tree/alpha');
tree.Color = require('./tree/color');
tree.Directive = require('./tree/directive');
tree.DetachedRuleset = require('./tree/detached-ruleset');
tree.Operation = require('./tree/operation');
tree.Dimension = require('./tree/dimension');
tree.Unit = require('./tree/unit');
tree.Keyword = require('./tree/keyword');
tree.Variable = require('./tree/variable');
tree.Ruleset = require('./tree/ruleset');
tree.Element = require('./tree/element');
tree.Attribute = require('./tree/attribute');
tree.Combinator = require('./tree/combinator');
tree.Selector = require('./tree/selector');
tree.Quoted = require('./tree/quoted');
tree.Expression = require('./tree/expression');
tree.Rule = require('./tree/rule');
tree.Call = require('./tree/call');
tree.URL = require('./tree/url');
tree.Import = require('./tree/import');
tree.mixin = {
    Call: require('./tree/mixin-call'),
    Definition: require('./tree/mixin-definition')
};
tree.Comment = require('./tree/comment');
tree.Anonymous = require('./tree/anonymous');
tree.Value = require('./tree/value');
tree.JavaScript = require('./tree/javascript');
tree.Assignment = require('./tree/assignment');
tree.Condition = require('./tree/condition');
tree.Paren = require('./tree/paren');
tree.Media = require('./tree/media');
tree.UnicodeDescriptor = require('./tree/unicode-descriptor');
tree.Negative = require('./tree/negative');
tree.Extend = require('./tree/extend');
tree.RulesetCall = require('./tree/ruleset-call');

module.exports = tree;
