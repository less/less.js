import Variable from '../tree/variable';
import Anonymous from '../tree/variable';

const styleExpression = function (args) {
    args = Array.prototype.slice.call(args);
    switch (args.length) {
        case 0: throw { type: 'Argument', message: 'one or more arguments required' };
    }
    
    const entityList = [new Variable(args[0].value, this.index, this.currentFileInfo).eval(this.context)];
       
    args = entityList.map(a => { return a.toCSS(this.context); }).join(this.context.compress ? ',' : ', ');
    
    return new Anonymous(`style(${args})`);
};

export default {
    style: function(...args) {
        try {
            return styleExpression.call(this, args);
        } catch (e) {}
    },
};
