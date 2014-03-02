module.exports = function(less, tree) {
    var visitor = require("./visitor")(tree),
        visitors = {
        visitor: visitor
    };
 
    visitors.importVisitor = require('./import-visitor.js')(visitor, tree);
    visitors.extendVisitor = require('./extend-visitor.js')(visitor, tree);
    visitors.joinSelectorVisitor = require('./join-selector-visitor.js')(visitor);
    visitors.toCSSVisitor = require('./to-css-visitor.js')(visitor, tree);
    return visitors;

};