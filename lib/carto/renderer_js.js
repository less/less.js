(function() {
var tree = require('../tree');

// monkey patch less classes
tree.Value.prototype.toJS = function() {
  var v = this.value[0].value[0];
  val = v.toString();
  if(v.is === "color") {
    val = "'" + val + "'";
  }
  return "_value = " + val + ";";
};

Object.defineProperty(tree.Filterset.prototype, 'toJS', {
  enumerable: false,
  value: function(env) {
    var opMap = {
      '=': '==='
    };
    return _.map(this, function(filter) {
      var op = filter.op;
      if(op in opMap) {
        op = opMap[op];
      }
      var val = filter.val;
      if(filter._val !== undefined) {
        val = filter._val.toString(true);
      }

      var attrs = "data";
      return attrs + "." + filter.key  + " " + op + " " + val;
    }).join(' && ');
  }
});

tree.Definition.prototype.toJS = function() {
  var shaderAttrs = {};

  // merge conditions from filters with zoom condition of the
  // definition
  var zoom = "(" + this.zoom + " & (1 << ctx.zoom))";
  var _if = this.filters.toJS() 
  if(_if && _if.length > 0) {
     _if += " && " + zoom;
  } else {
    _if = zoom;
  }
  _.each(this.rules, function(rule) {
      if(rule instanceof tree.Rule) {
        shaderAttrs[rule.name] = shaderAttrs[rule.name] || [];
        if (_if) {
        shaderAttrs[rule.name].push(
          "if(" + _if + "){" + rule.value.toJS() + "}"
        );
        } else {
          shaderAttrs[rule.name].push(rule.value.toJS());
        }
      } else {
        if (rule instanceof tree.Ruleset) {
          var sh = rule.toJS();
          for(var v in sh) {
            shaderAttrs[v] = shaderAttrs[v] || [];
            for(var attr in sh[v]) {
              shaderAttrs[v].push(sh[v][attr]);
            }
          }
        }
      }
  });
  return shaderAttrs;
};


function CartoCSS(style) {
  if(style) {
    this.setStyle(style);
  }
}

CartoCSS.Layer = function(shader, options) {
  this.options = options;
  this.shader = shader;
};

CartoCSS.renderers = {};

CartoCSS.renderers['svg'] = {

  maps: {},

  transform: function(src) {
    var target = {};
    for(var i in src) {
      var t = this.maps[i];
      if(t) {
        target[t] = src[i];
      } else {
        console.log("unknow property: " + i);
      }
    }
    return target;
  }

};

CartoCSS.renderers['canvas-2d'] = {

  maps: {
    // marker
    'marker-width': 'point-radius',
    'marker-line-color': 'strokeStyle',
    'marker-line-width': 'lineWidth',
    'marker-line-opacity': 'strokeOpacity',
    'marker-fill-opacity': 'fillOpacity',
    'marker-fill': 'fillStyle',
    'marker-file': function(attr) {
      var img = new Image();
      img.src = attr;
      return img;
    },
    // point
    'point-color': 'fillStyle',
    'point-file': function(attr) {
      var img = new Image();
      img.src = attr;
      return img;
    },
    // line
    'line-color': 'strokeStyle',
    'line-width': 'lineWidth',
    'line-opacity': 'globalAlpha',
    // polygon
    'polygon-fill': 'fillStyle',
    'polygon-opacity': 'globalAlpha'
  },

  transform: function(src) {
    var target = {};
    for(var i in src) {
      var t = this.maps[i];
      if(t) {
        if(typeof(t) === 'function') {
          target[i] = t(src[i]);
        } else {
          target[t] = src[i];
        }
      } else {
        console.log("unknow property: " + i);
      }
    }
    return target;
  }
}

var renderer = CartoCSS.renderers['svg'];
var ref = window.carto['mapnik-reference'].version.latest;
var to_load = ['polygon', 'line', 'point', 'markers'];
for(var ss in to_load) {
  var s = to_load[ss];
  for(var i in ref.symbolizers[s]) {
    renderer.maps[ref.symbolizers[s][i].css] = i;
  }
}


CartoCSS.Layer.prototype = {

  name: function() {
    return this.shader.attachment;
  },

  /*
   * `target`: style, 'svg', 'canvas-2d'...
   * `props`: feature properties
   * `context`: rendering properties, i.e zoom
   */
  getStyle: function(target, props, context) {
    var style = {};
    for(var i in this.shader) {
      if(i !== 'attachment') {
        style[i] = this.shader[i](props, context);
      }
    }
    return CartoCSS.renderers[target].transform(style);
  },

  /**
   * returns true if a feature needs to be rendered
   */
  filter: function(featureType, props, context) {
    for(var i in this.shader) {
     var s = this.shader[i](props, context);
     if(s) {
       return true;
     }
    }
    return false;
  },

  //
  // given a geoemtry type returns the transformed one acording the CartoCSS
  // For points there are two kind of types: point and sprite, the first one 
  // is a circle, second one is an image sprite
  //
  // the other geometry types are the same than geojson (polygon, linestring...)
  //
  transformGeometry: function(type) {
    return type;
  },

  transformGeometries: function(geojson) {
    return geojson;
  }

};

CartoCSS.prototype = {

  setStyle: function(style) {
    var layers = this.parse(style);
    this.layers = layers.map(function(shader) {
        return new CartoCSS.Layer(shader);
    });
  },

  getLayers: function() {
    return this.layers;
  },

  _createFn: function(ops) {
    var body = ops.join('\n');
    return Function("data","ctx", "var _value = null; " +  body + "; return _value; ");
  },

  _compile: function(shader) {
    if(typeof shader === 'string') {
        shader = eval("(function() { return " + shader +"; })()");
    }
    this.shader_src = shader;
    for(var attr in shader) {
        var c = mapper[attr];
        if(c) {
            this.compiled[c] = eval("(function() { return shader[attr]; })();");
        }
    }
  },

  parse: function(cartocss) {
    var parse_env = {
      frames: [],
      errors: [],
      error: function(obj) {
        this.errors.push(obj);
      }
    };
    this.parse_env = parse_env;

    var ruleset = null;
    try {
      ruleset = (new carto.Parser(parse_env)).parse(cartocss);
    } catch(e) {
      // add the style.mss string to match the response from the server
      parse_env.errors.push(e.message);
      return;
    }
    if(ruleset) {
      var defs = ruleset.toList(parse_env);
      defs.reverse();
      // group by elements[0].value::attachment
      var layers = {};
      for(var i = 0; i < defs.length; ++i) {
        var def = defs[i];
        var key = def.elements[0] + "::" + def.attachment;
        var layer = layers[key] = (layers[key] || {});
        var props = def.toJS();
        for(var v in props) {
          (layer[v] = (layer[v] || [])).push(props[v].join('\n'))
        }
      }

      var ordered_layers = [];

      var done = {};
      for(var i = 0; i < defs.length; ++i) {
        var def = defs[i];
        var k = def.elements[0] + "::" + def.attachment;
        if(!done[k]) {
          var layer = layers[k];
          for(var prop in layer) {
            layer[prop] = this._createFn(layer[prop]);
          }
          layer.attachment = k;
          ordered_layers.push(layer);
          done[k] = true;
        }
      }

      return ordered_layers;

    }
    return null;
  }
};

carto.RendererJS = function (options) {
    this.options = options || {};
    this.options.mapnik_version = this.options.mapnik_version || 'latest';
};

// Prepare a javascript object which contains the layers
carto.RendererJS.prototype.render = function render(cartocss, callback) {
    tree.Reference.setVersion(this.options.mapnik_version);
    return new CartoCSS(cartocss);
}

})();
