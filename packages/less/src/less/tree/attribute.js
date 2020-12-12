import Node from './node';

const Attribute = function(key, op, value) {
    this.key = key;
    this.op = op;
    this.value = value;
}

Attribute.prototype = Object.assign(new Node(), {
    type: 'Attribute',

    eval(context) {
        return new Attribute(this.key.eval ? this.key.eval(context) : this.key,
            this.op, (this.value && this.value.eval) ? this.value.eval(context) : this.value);
    },

    genCSS(context, output) {
        output.add(this.toCSS(context));
    },

    toCSS(context) {
        let value = this.key.toCSS ? this.key.toCSS(context) : this.key;

        if (this.op) {
            value += this.op;
            value += (this.value.toCSS ? this.value.toCSS(context) : this.value);
        }

        return `[${value}]`;
    }
});

export default Attribute;
