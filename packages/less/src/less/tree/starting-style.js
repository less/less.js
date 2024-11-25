import Value from './value';
import Selector from './selector';
import AtRule from './atrule';
import NestableAtRulePrototype from './nested-at-rule';
import Anonymous from './anonymous';
import Expression from './expression';
import Ruleset from './ruleset';

const StartingStyle = function(value, features, index, currentFileInfo, visibilityInfo) {
    this._index = index;
    this._fileInfo = currentFileInfo;
    var selectors = (new Selector([], null, null, this._index, this._fileInfo)).createEmptySelectors();
    this.simpleBlock = features && features[0] instanceof Expression === false;
   
    if (this.simpleBlock) {
        this.features = new Value(features);
        this.declarations = value;
        this.allowRoot = true;
     
        this.setParent(selectors, this);
        this.setParent(this.features, this);
        this.setParent(this.declarations, this);
    } else {
        this.features = new Value([]);
        this.rules = [new Ruleset(selectors, value)];//value;
        this.rules[0].allowImports = true;
        this.allowRoot = true;
      
        this.setParent(selectors, this);
        this.setParent(this.features, this);
        this.setParent(this.rules, this);
    }

    this.copyVisibilityInfo(visibilityInfo);

};

StartingStyle.prototype = Object.assign(new AtRule(), {
    type: 'StartingStyle',

    ...NestableAtRulePrototype,

    genCSS(context, output) {
        output.add('@starting-style', this._fileInfo, this._index);
        context.firstSelector = true;
        
        this.features.genCSS(context, output);
       
        if (this.simpleBlock) {
            this.outputRuleset(context, output, this.declarations);
        } else {
            this.outputRuleset(context, output, this.rules);  
        }
    },

    eval(context) {
        if (!context.mediaBlocks) {
            context.mediaBlocks = [];
            context.mediaPath = [];
        }

        const media = new StartingStyle(null, [], this._index, this._fileInfo, this.visibilityInfo());

        if (this.simpleBlock) {
            if (this.debugInfo) {
                this.declarations[0].debugInfo = this.debugInfo;
                media.debugInfo = this.debugInfo;
            }

            media.features = this.features.eval(context);

            this.declarations[0].functionRegistry = context.frames[0].functionRegistry.inherit();
            context.frames.unshift(this.declarations[0]);
            media.declarations = this.declarations.map(rule => rule.eval(context));
          
            context.frames.shift();

            return context.mediaPath.length == 0 ? media.evalTop(context) :
                media.evalNestedBlock(context);
        } else {
            media.simpleBlock = false;

            if (this.debugInfo) {
                this.rules[0].debugInfo = this.debugInfo;
                media.debugInfo = this.debugInfo;
            }

            media.features = this.features.eval(context);
          
            context.mediaPath.push(media);
            context.mediaBlocks.push(media);
          
            this.rules[0].functionRegistry = context.frames[0].functionRegistry.inherit();
            context.frames.unshift(this.rules[0]);
            media.rules = [this.rules[0].eval(context)];

            context.frames.shift();
            context.mediaPath.pop();
           
            return context.mediaPath.length === 0 ? media.evalTop(context) :
                media.evalNested(context);
        }
    },

    evalNestedBlock: function (context) {
        let i;
        let value;
        let path = context.mediaPath.concat([this]);
       
        for (i = 0; i < path.length; i++) {
            value = path[i].features instanceof Value ?
                path[i].features.value : path[i].features;
            path[i] = Array.isArray(value) ? value : [value];
        }

        this.features = new Value(this.permute(path).map(function (path) {
            path = path.map(function (fragment) { return fragment.toCSS ? fragment : new Anonymous(fragment); });
            for (i = path.length - 1; i > 0; i--) {
                path.splice(i, 0, new Anonymous('and'));
            }
            return new Expression(path);
        }));
        
        this.setParent(this.features, this);

        return new StartingStyle(this.declarations, this.features, this._index, this._fileInfo, this.visibilityInfo());
    },
});

export default StartingStyle;
