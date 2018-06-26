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
    var i, node, name, args, rules = this.ruleCall.eval(context);
    
    for (i = 0; i < this.lookups.length; i++) {
        node = this.lookups[i];
        name = node[0];
        args = node[1];

        if (name.charAt(0) === '@') {
            if (name.charAt(1) === '@') {
                name = '@' + new Variable(name.substr(1)).eval(context).value;
            }
            rules = rules.variables && rules.variables()[name];
            if (!rules) {
                throw { type: 'Name',
                    message: 'variable ' + name + ' is undefined',
                    filename: this.fileInfo().filename,
                    index: this.getIndex() };
            }
        }
        else {
            rules = rules.properties && rules.properties()[name.charAt(0) === '$' ? name : '$' + name];
            if (!rules) {
                throw { type: 'Name',
                    message: 'property "' + name + '" is undefined',
                    filename: this.fileInfo().filename,
                    index: this.getIndex() };
            }
        }
        // if (rules.ruleset) {
        //     rules = rules.eval(context);
        // }
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
