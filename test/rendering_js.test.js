
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
    var props = layer.getStyle('canvas-2d', {}, { 'zoom': 0, 'frame-offset': 10 });
    assert( props['lineWidth'] === 4);
  });
});
