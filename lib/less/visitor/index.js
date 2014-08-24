var visitors = {
    Visitor: require("./visitor"),
    ImportVisitor: require('./import-visitor.js'),
    ExtendVisitor: require('./extend-visitor.js'),
    JoinSelectorVisitor: require('./join-selector-visitor.js'),
    ToCSSVisitor: require('./to-css-visitor.js')
};

module.exports = visitors;
