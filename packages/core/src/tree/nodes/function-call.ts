import {
  Node,
  IProps,
  INodeOptions,
  ILocationInfo,
  Value,
  FunctionCaller
} from '.'

export type IFunctionCallProps = {
  name: string
  args: Node[]
} & IProps
//
// A function call node.
//
export class FunctionCall extends Node {
  name: string
  isCalc: boolean
  args: Node[]

  constructor(props: IFunctionCallProps, options: INodeOptions, location: ILocationInfo) {
    const { name, ...rest } = props
    super(<IProps>rest, options, location)

    this.name = name
    this.isCalc = name === 'calc('
  }

  //
  // When evaluating a function call,
  // we either find the function in the functionRegistry,
  // in which case we call it, passing the  evaluated arguments,
  // if this returns null or we cannot find the function, we
  // simply print it out as it appeared originally [2].
  //
  // The reason why we evaluate the arguments, is in the case where
  // we try to pass a variable to a function, like: `saturate(@color)`.
  // The function should receive the value, not the variable.
  //
  eval(context) {
    /**
     * Turn off math for calc(), and switch back on for evaluating nested functions
     */
    const currentMathContext = context.mathOn
    context.mathOn = !this.isCalc
    if (this.isCalc || context.inCalc) {
        context.enterCalc()
    }
    const args = this.args.map(a => a.eval(context));
    if (this.calc || context.inCalc) {
        context.exitCalc();
    }
    context.mathOn = currentMathContext;

    let result;
    const funcCaller = new FunctionCaller(this.name, context, this.getIndex(), this.fileInfo());

    if (funcCaller.isValid()) {
        try {
            result = funcCaller.call(args);
        } catch (e) {
            throw { 
                type: e.type || 'Runtime',
                message: `error evaluating function \`${this.name}\`${e.message ? `: ${e.message}` : ''}`,
                index: this.getIndex(), 
                filename: this.fileInfo().filename,
                line: e.lineNumber,
                column: e.columnNumber
            };
        }

        if (result !== null && result !== undefined) {
            // Results that that are not nodes are cast as Value nodes
            // Falsy values or booleans are returned as empty nodes
            if (!(result instanceof Node)) {
                if (!result || result === true) {
                    result = new Value(null)
                }
                else {
                    result = new Value(result.toString())
                }
                
            }
            result._index = this._index;
            result._fileInfo = this._fileInfo;
            return result;
        }

    }

    return new Call(this.name, args, this.getIndex(), this.fileInfo());
  }

    genCSS(context, output) {
        output.add(`${this.name}(`, this.fileInfo(), this.getIndex());

        for (let i = 0; i < this.args.length; i++) {
            this.args[i].genCSS(context, output);
            if (i + 1 < this.args.length) {
                output.add(', ');
            }
        }

        output.add(')');
    }
}

FunctionCall.prototype.type = 'FunctionCall'
