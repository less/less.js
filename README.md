# CartoCSS

[![Build Status](https://secure.travis-ci.org/mapbox/carto.png)](http://travis-ci.org/mapbox/carto)

Is as stylesheet renderer for javascript, It's an evolution of the Mapnik renderer from Mapbox.
Please, see original [Mapbox repo](http://github.com/mapbox/carto) for more information and credits

## Quick Start

```javascript
// shader is a CartoCSS object

var cartocss = [
    '#layer {',
    ' marker-width: [property]',
    ' marker-fill: red',
    '}'
].join('')
var shader = new carto.RendererJS().render(cartocss);
var layers = shader.getLayers()
for (var i = 0; i < layers.length; ++i) {
    var layer = layers[i];
    console.log("layer name: ", layer.fullName())
    console.log("- frames: ", layer.frames())
    console.log("- attachment: ", layer.attachment())

    var layerShader = layer.getStyle('canvas-2d', { property: 1 }, { zoom: 10 })
    console.log(layerShader['marker-width']) // 1
    console.log(layerShader['marker-fill']) // #FF0000
}

```

# API

## RendererJS

### render(cartocss)

## CartoCSS

compiled cartocss object

### getLayers

return the layers, an array of ``CartoCSS.Layer`` object

### getDefault

return the default layer (``CartoCSS.Layer``), usually the Map layer


### findLayer(where)

find a layer using where object.

```
shader.findLayer({ name: 'test' })
```

## CartoCSS.Layer

### getStyle(target, props, context)

return the evaluated style
    - target: 'canvas-2d'
    - props: object containing properties needed to render the style. If the cartocss style uses
      some variables they should be passed in this object
    - context: rendering context variables like ``zoom`` or animation ``frame``









## Reference Documentation

* [mapbox.com/carto](http://mapbox.com/carto/)


