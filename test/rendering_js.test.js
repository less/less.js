
var assert = require('assert');
var carto = require('../lib/carto');
describe('RenderingJS', function() {
  var shader;
  var style = [
  '#world {', 
    'line-width: 2;', 
    'line-color: #f00;', 
    '[frame-offset = 1] {', 
      'line-width: 3;', 
    '}', 
    '[frame-offset = 2] {', 
      'line-width: 3;', 
    '}', 
  '}', 
  '', 
  '#worls[frame-offset = 10] {', 
      'line-width: 4;', 
  '}'
  ].join('\n');

  beforeEach(function() {
    shader = (new carto.RendererJS({ debug: true })).render(style);
  });

  it ("shold render layers", function() {
    assert(shader.getLayers().length === 2);
  });

  it ("shold report frames used in the layer", function() {
    var layer = shader.getLayers()[0];
    assert( layer.frames()[0] === 0);
    assert( layer.frames()[1] === 1);

    layer = shader.getLayers()[1];
    assert( layer.frames()[0] === 10);
  });

  it ("shold render with frames var", function() {
    var layer = shader.getLayers()[1];
    var props = layer.getStyle({}, { 'zoom': 0, 'frame-offset': 10 });
    assert( props['line-width'] === 4);
  });

  it ("shold render variables", function() {
    var style = '#test { marker-width: [testing]; }';
    shader = (new carto.RendererJS({ debug: true })).render(style);
    var layer = shader.getLayers()[0];
    var props = layer.getStyle({testing: 2}, { 'zoom': 0, 'frame-offset': 10 });
    assert( props['marker-width'] === 2);
  });

  it ("should allow filter based rendering", function() {
    var style = '#test { marker-width: 10; [zoom = 1] { marker-width: 1; } }';
    shader = (new carto.RendererJS({ debug: true })).render(style);
    var layer = shader.getLayers()[0];
    var props = layer.getStyle({}, { 'zoom': 0, 'frame-offset': 10 });
    assert( props['marker-width'] ===  10);
    props = layer.getStyle({}, { 'zoom': 1, 'frame-offset': 10 });
    assert( props['marker-width'] ===  1);
  });

  it ("symbolizers should be in rendering order", function() {
    var style = '#test { polygon-fill: red; line-color: red; }';
    style += '#test2 { line-color: red;polygon-fill: red; line-witdh: 10; }';
    var shader = (new carto.RendererJS({ debug: true })).render(style);
    var layer0 = shader.getLayers()[0];
    assert(layer0.getSymbolizers()[0] === 'polygon');
    assert(layer0.getSymbolizers()[1] === 'line');

    var layer1 = shader.getLayers()[1];
    assert(layer0.getSymbolizers()[0] === 'polygon');
    assert(layer0.getSymbolizers()[1] === 'line');
  });

  it ("should return variable for styles that change", function() {
    var style = '#test { marker-width: [prop]; }';
    var shader = (new carto.RendererJS({ debug: true })).render(style);
    var layer0 = shader.getLayers()[0];
    assert(layer0.isVariable());

    style = '#test { marker-width: 1; }';
    shader = (new carto.RendererJS({ debug: true })).render(style);
    layer0 = shader.getLayers()[0];
    assert(!layer0.isVariable());

    style = '#test { marker-width: [prop]; marker-fill: red;  }';
    shader = (new carto.RendererJS({ debug: true })).render(style);
    layer0 = shader.getLayers()[0];
    assert(layer0.isVariable());

  });

});
