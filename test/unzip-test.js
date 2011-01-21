var path = require('path')
var assert = require('assert')
var mess = require('mess');
var external = require('mess/external')

exports['test_unzip_remote'] = function(){
    var e = external();
    var remote = 'http://cascadenik-sampledata.s3.amazonaws.com/world_borders.zip';
    e.process(remote,function(err, result) {
        if (err) throw err;
        assert.equal(result[0],remote);
        assert.ok(result[1]);
        assert.equal(path.dirname(result[1]),e.pos(remote));
      }
    )
};