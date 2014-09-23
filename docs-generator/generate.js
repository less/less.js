var fs = require('fs'),
    path = require('path'),
    refs = require('mapnik-reference'),
    _ = require('underscore');

function tmpl(x) {
  return _.template(fs.readFileSync(path.join(__dirname, x), 'utf-8'));
}

var index = tmpl('index._');
var table = tmpl('symbolizers._');
var versions = Object.keys(refs.version);

for (var v in refs.version) {
    var ref = refs.version[v];
    fs.writeFileSync(path.join(__dirname, '../docs/' + v + '.md'), index({
      symbolizers: ref.symbolizers,
      table: table,
      version: v,
      versions: versions,
      _: _
    }));
}
