

class ToCssVisitor {
  
  visitDimension(unit: Node) {
      if ((context && context.strictUnits) && !this.unit.isSingular()) {
        throw new Error(`Multiple units in dimension. Correct the units or use the unit function. Bad unit: ${this.unit.toString()}`);
      }
  
      const value = fround(context, this.value[0])
      let strValue = String(value);
  
      if (value !== 0 && value < 0.000001 && value > -0.000001) {
          // would be output 1e-6 etc.
          strValue = value.toFixed(20).replace(/0+$/, '');
      }
  
      output.add(strValue);
      this.unit.genCSS(context, output);
    }
  }