(function (tree) {

//
// A number with a unit
//
tree.Dimension = function (value, unit) {
    this.value = parseFloat(value);
    this.unit = (unit && unit instanceof tree.Unit) ? unit :
      new(tree.Unit)(unit ? [unit] : undefined);
};

tree.Dimension.prototype = {
    eval: function () { return this },
    toColor: function () {
        return new(tree.Color)([this.value, this.value, this.value]);
    },
    toCSS: function () {
        return this.unit.isEmpty() ? this.value :
          (String(this.value) + this.unit.toCSS());
    },

    // In an operation between two Dimensions,
    // we default to the first Dimension's unit,
    // so `1px + 2` will yield `3px`.
    operate: function (op, other) {
        var value = tree.operate(op, this.value, other.value),
            unit = this.unit.clone();

        if (op === '+' || op === '-') {
          if (unit.numerator.length === 0 && unit.denominator.length === 0) {
            unit.numerator = other.unit.numerator.slice(0);
            unit.denominator = other.unit.denominator.slice(0);
          } else if (other.unit.numerator.length == 0 && unit.denominator.length == 0) {
            // do nothing
          } else {
            other = other.convertTo(this.unit.usedUnits());

            if(other.unit.toCSS() !== unit.toCSS()) {
              throw new Error("Incompatible units: '" + unit.toCSS() +
                "' and '" + other.unit.toCSS() + "'.");
            }

            value = tree.operate(op, this.value, other.value);
          }
        } else if (op === '*') {
          unit.numerator = unit.numerator.concat(other.unit.numerator).sort();
          unit.denominator = unit.denominator.concat(other.unit.denominator).sort();
          unit.cancel();
        } else if (op === '/') {
          unit.numerator = unit.numerator.concat(other.unit.denominator).sort();
          unit.denominator = unit.denominator.concat(other.unit.numerator).sort();
          unit.cancel();
        }
        return new(tree.Dimension)(value, unit);
    },

    compare: function (other) {
        if (other instanceof tree.Dimension) {
            var a = this.unify(), b = other.unify(),
                aValue = a.value, bValue = b.value;

            if (bValue > aValue) {
                return -1;
            } else if (bValue < aValue) {
                return 1;
            } else {
                if (!b.unit.isEmpty() && a.unit.compare(b) !== 0) {
                    return -1;
                }
                return 0;
            }
        } else {
            return -1;
        }
    },

    unify: function () {
      return this.convertTo({ length: 'm', duration: 's' });
    },

    convertTo: function (conversions) {
      var value = this.value, unit = this.unit.clone(),
          i, groupName, group, conversion, targetUnit;

      for (groupName in conversions) {
        if (conversions.hasOwnProperty(groupName)) {
          targetUnit = conversions[groupName];
          group = tree.UnitConversions[groupName];

          unit.map(function (atomicUnit, denominator) {
            if (group.hasOwnProperty(atomicUnit)) {
              if (denominator) {
                value = value / (group[atomicUnit] / group[targetUnit]);
              } else {
                value = value * (group[atomicUnit] / group[targetUnit]);
              }

              return targetUnit;
            }

            return atomicUnit;
          });
        }
      }

      unit.cancel();

      return new(tree.Dimension)(value, unit);
    }
};

// http://www.w3.org/TR/css3-values/#absolute-lengths
tree.UnitConversions = {
  length: {
     'm': 1,
    'cm': 0.01,
    'mm': 0.001,
    'in': 0.0254,
    'pt': 0.0254 / 72,
    'pc': 0.0254 / 72 * 12
  },
  duration: {
     's': 1,
    'ms': 0.001
  }
};

tree.Unit = function (numerator, denominator) {
  this.numerator = numerator ? numerator.slice(0).sort() : [];
  this.denominator = denominator ? denominator.slice(0).sort() : [];
};

tree.Unit.prototype = {
  clone: function () {
    return new tree.Unit(this.numerator.slice(0), this.denominator.slice(0));
  },

  toCSS: function () {
    var i, css = this.numerator.join("*");
    for (i = 0; i < this.denominator.length; i++) {
      css += "/" + this.denominator[i];
    }
    return css;
  },
  
  compare: function (other) {
    return this.is(other.toCSS()) ? 0 : -1;
  },

  is: function (unitString) {
    return this.toCSS() === unitString;
  },

  isEmpty: function () {
    return this.numerator.length == 0 && this.denominator.length == 0;
  },

  map: function(callback) {
    var i;

    for (i = 0; i < this.numerator.length; i++) {
      this.numerator[i] = callback(this.numerator[i], false);
    }

    for (i = 0; i < this.denominator.length; i++) {
      this.denominator[i] = callback(this.denominator[i], true);
    }
  },

  usedUnits: function() {
    var group, groupName, result = {};

    for (groupName in tree.UnitConversions) {
      if (tree.UnitConversions.hasOwnProperty(groupName)) {
        group = tree.UnitConversions[groupName];

        this.map(function (atomicUnit) {
          if (group.hasOwnProperty(atomicUnit) && !result[groupName]) {
            result[groupName] = atomicUnit;
          }

          return atomicUnit;
        });
      }
    }

    return result;
  },

  cancel: function () {
    var counter = {}, atomicUnit, i;

    for (i = 0; i < this.numerator.length; i++) {
      atomicUnit = this.numerator[i];
      counter[atomicUnit] = (counter[atomicUnit] || 0) + 1;
    }

    for (i = 0; i < this.denominator.length; i++) {
      atomicUnit = this.denominator[i];
      counter[atomicUnit] = (counter[atomicUnit] || 0) - 1;
    }

    this.numerator = [];
    this.denominator = [];

    for (atomicUnit in counter) {
      if (counter.hasOwnProperty(atomicUnit)) {
        var count = counter[atomicUnit];

        if (count > 0) {
          for (i = 0; i < count; i++) {
            this.numerator.push(atomicUnit);
          }
        } else if (count < 0) {
          for (i = 0; i < -count; i++) {
            this.denominator.push(atomicUnit);
          }
        }
      }
    }

    this.numerator.sort();
    this.denominator.sort();
  }
};

})(require('../tree'));
