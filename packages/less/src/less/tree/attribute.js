import Node from './node';

const Attribute = function(key, op, value, cif) {
    this.key = key;
    this.op = op;
    this.value = value;
    this.cif = cif;
}

Attribute.prototype = Object.assign(new Node(), {
    type: 'Attribute',

    eval(context) {
        let key = [];
        for(let i=0;i<this.key.length;++i){
            key.push(this.key[i].eval?this.key[i].eval(context):this.key[i]);
        }
        return new Attribute(
            key,
            this.op,
            (this.value && this.value.eval) ? this.value.eval(context) : this.value,
            this.cif
        );
    },

    genCSS(context, output) {
        output.add(this.toCSS(context));
    },

    toCSS(context) {
        let value = '';
        for(let i=0;i<this.key.length;++i){
            value += this.key[i].toCSS ? this.key[i].toCSS(context) : this.key[i];
        }

        if (this.op) {
            value += this.op;
            value += (this.value.toCSS ? this.value.toCSS(context) : this.value);
        }

        if (this.cif) {
            value = value + ' ' + this.cif;
        }

        return `[${value}]`;
    }
});

export default Attribute;
