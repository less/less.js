const visitors = {
    Visitor: require('./visitor'),
    ImportVisitor: require('./import-visitor'),
    MarkVisibleSelectorsVisitor: require('./set-tree-visibility-visitor'),
    ExtendVisitor: require('./extend-visitor'),
    JoinSelectorVisitor: require('./join-selector-visitor'),
    ToCSSVisitor: require('./to-css-visitor')
};

export default visitors;
