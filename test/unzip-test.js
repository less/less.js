var path = require('path'),
    assert = require('assert'),
    mess = require('mess'),
    External = require('mess/external');

exports['test_unzip_remote'] = function() {
    var e = new External({
        data_dir: '.'
    });
    var remote = 'http://cascadenik-sampledata.s3.amazonaws.com/world_borders.zip';
    e.process(remote, function(err, result) {
        assert.eql(err, null);
        assert.eql(result[0], remote);
        assert.ok(result[1]);
        assert.eql(path.dirname(result[1]), e.pos(remote));
      }
    );
};
