import Node from '../node'
import Declaration from './declaration'
import { EvalContext } from '../../contexts'

/**
 * @todo - This is actually a `$foo` property reference
 *         It can be improved a lot in how it's merged with other props
 * 
 * e.g. 
 *   nodes: $foo = <Value 'foo'>
 *   nodes: $@bar = <VariableRef '@bar'>
*/
class PropertyRef extends Node {
  evaluating: boolean
  eval(context: EvalContext) {
    super.eval(context)
    let property: Node
    const name = this.toString()

    /** @todo - property merging should be moved to the rules */
    const mergeRules = context.pluginManager.less.visitors.ToCSSVisitor.prototype._mergeRules;

    if (this.evaluating) {
      throw {
        type: 'Name',
        message: `Recursive property reference for ${name}`,
        filename: this.getFileInfo().filename,
        location: this.location
      }
    }

    this.evaluating = true

    property = this.find(context.frames, frame => {
        let v;
        const vArr = frame.property(name);
        if (vArr) {
            for (let i = 0; i < vArr.length; i++) {
                v = vArr[i];

                vArr[i] = new Declaration(v.name,
                    v.value,
                    v.important,
                    v.merge,
                    v.index,
                    v.currentFileInfo,
                    v.inline,
                    v.variable
                );
            }
            mergeRules(vArr);

            v = vArr[vArr.length - 1];
            if (v.important) {
                const importantScope = context.importantScope[context.importantScope.length - 1];
                importantScope.important = v.important;
            }
            v = v.value.eval(context);
            return v;
        }
    });
    if (property) {
      this.evaluating = false
      return property
    } else {
      throw {
        type: 'Name',
        message: `Property '${name}' is undefined`,
        filename: this.getFileInfo().filename,
        location: this.location
      }
    }
  }

    // find(obj, fun) {
    //     for (let i = 0, r; i < obj.length; i++) {
    //         r = fun.call(obj, obj[i]);
    //         if (r) { return r; }
    //     }
    //     return null;
    // }
}

PropertyRef.prototype.type = 'PropertyRef';
export default PropertyRef
