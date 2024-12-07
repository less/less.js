/* eslint-disable no-prototype-builtins */
import Node from './node';

const CustomProperty = function (name, index, currentFileInfo) {
    this.name = name;
    this._index = index;
    this._fileInfo = currentFileInfo;
};

CustomProperty.prototype = Object.assign(new Node(), {
    type: 'CustomProperty',

    genCSS: function (context, output) {
        output.add('var(' + this.name + ')');
    }
});

export default CustomProperty;
