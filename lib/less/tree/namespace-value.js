var Node = require('./node'),
    Variable = require('./variable');


var NamespaceValue = function (ruleCall, lookups, important, index, fileInfo) {
    this.ruleCall = ruleCall;
    this.lookups = lookups;
    this.important = important;
    this._index = index;
    this._fileInfo = fileInfo;
};
NamespaceValue.prototype = new Node();
NamespaceValue.prototype.type = 'NamespaceValue';
NamespaceValue.prototype.eval = function (context) {
    var i, j, name, found,
        rules = this.ruleCall.eval(context);
    
    for (i = 0; i < this.lookups.length; i++) {
        name = this.lookups[i];

        // Eval'd mixins return rules
        if (Array.isArray(rules)) {
            name = name.charAt(0) === '$' ? name.substr(1) : name;
            // Find the last declaration match
            for (j = rules.length - 1; j >= 0; j--) {
                if (rules[j].name === name) {
                    found = true;
                    rules = rules[j];
                    break;
                }
            }
            if (!found) {
                var message = name.charAt(0) === '@' ?
                    'variable ' + name + ' not found' :
                    'property "' + name + ' not found';

                throw { type: 'Name',
                    message: message,
                    filename: this.fileInfo().filename,
                    index: this.getIndex() };
            }
        }
        // Eval'd DRs return rulesets
        else {
            if (name.charAt(0) === '@') {
                if (name.charAt(1) === '@') {
                    name = '@' + new Variable(name.substr(1)).eval(context).value;
                }
                if (rules.variables) {
                    rules = rules.variables()[name];
                }
                
                if (!rules) {
                    throw { type: 'Name',
                        message: 'variable ' + name + ' not found',
                        filename: this.fileInfo().filename,
                        index: this.getIndex() };
                }
            }
            else {
                if (rules.properties) {
                    rules = rules.properties()[name.charAt(0) === '$' ? name : '$' + name];
                }
            
                if (!rules) {
                    throw { type: 'Name',
                        message: 'property "' + name + '" not found',
                        filename: this.fileInfo().filename,
                        index: this.getIndex() };
                }
                // Properties are an array of values, since a ruleset can have multiple props.
                // We pick the last one (the "cascaded" value)
                rules = rules[rules.length - 1];
            }
        }
        if (rules.value) {
            rules = rules.eval(context).value;
        }
        if (rules.ruleset) {
            rules = rules.ruleset.eval(context);
        }
    }
    return rules;
};
module.exports = NamespaceValue;
