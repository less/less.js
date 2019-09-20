const tree = Object.create(null);

import Node from '../node'
import Color from './color'
import AtRule from './at-rule'
import DetachedRules from './detached-rules'
import Operation from './operation'
import Dimension from './dimension'
import VariableRef from './variable-ref'
import PropertyRef from './property-ref'
import Rules from './rules';
import Element from './element';
import Attribute from './attribute';
import Selector from './selector';
import Quoted from './quoted';
import Expression from './expression';
import Declaration from './declaration';
import Call from './function-call';
import URL from './url';
import Import from './import';
import Comment from './comment';
import Value from './value';
import List from './list';
import JavaScript from './javascript';
import Assignment from './assignment';
import Condition from './condition';
import Paren from './block';
import Media from './media';
import Negative from './negative';
import Extend from './extend';
import VariableCall from './variable-call';
import NamespaceValue from './namespace-value';

// mixins
import MixinCall from './mixin-call';
import MixinDefinition from './mixin-definition';

export default {
    Node, Color, AtRule, DetachedRules, Operation,
    Dimension, Unit, Keyword, Variable, Property,
    Rules, Element, Attribute, Combinator, Selector,
    Quoted, Expression, Declaration, Call, URL, Import,
    Comment, Anonymous, Value, JavaScript, Assignment,
    Condition, Paren, Media, UnicodeDescriptor, Negative,
    Extend, VariableCall, NamespaceValue,
    mixin: {
        Call: MixinCall,
        Definition: MixinDefinition
    }
};