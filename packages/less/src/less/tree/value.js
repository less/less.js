import Node from './node';

const Value = function(value) {
    if (!value) {
        throw new Error('Value requires an array argument');
    }
    if (!Array.isArray(value)) {
        this.value = [ value ];
    }
    else {
        this.value = value;
    }
};

Value.prototype = new Node();

Value.prototype.accept = function(visitor) {
    if (this.value) {
        this.value = visitor.visitArray(this.value);
    }
};

Value.prototype.eval = function(context) {
    if (this.value.length === 1) {
        return this.value[0].eval(context);
    } else {
        return new Value(this.value.map(v => v.eval(context)));
    }
};

Value.prototype.genCSS = function(context, output) {
    let i;
    for (i = 0; i < this.value.length; i++) {
        this.value[i].genCSS(context, output);
        if (i + 1 < this.value.length) {
            output.add((context && context.compress) ? ',' : ', ');
        }
    }
};

Value.prototype.type = 'Value';
export default Value;
