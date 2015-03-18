var path = require('path'),
    fs = require('fs');

var less = require('../lib/less-node');
var file = path.join(__dirname, 'benchmark.less');

if (process.argv[2]) { file = path.join(process.cwd(), process.argv[2]) }

fs.readFile(file, 'utf8', function (e, data) {
    var start, end, total;

    console.log("Benchmarking...\n", path.basename(file) + " (" +
             parseInt(data.length / 1024) + " KB)", "");

    var benchMarkData = [];

    var totalruns = 100;
    var ignoreruns = 30;

    for(var i = 0; i < totalruns; i++) {
        start = new Date();

        less.render(data, function (err) {
            end = new Date();

            benchMarkData.push(end - start);

            if (err) {
                less.writeError(err);
                process.exit(3);
            }
        });
    }

    var totalTime = 0;
    var mintime = Infinity;
    var maxtime = 0;
    for(var i = ignoreruns; i < totalruns; i++) {
        totalTime += benchMarkData[i];
        mintime = Math.min(mintime, benchMarkData[i]);
        maxtime = Math.max(maxtime, benchMarkData[i]);
    }
    var avgtime = totalTime / (totalruns - ignoreruns);
    var variation = maxtime - mintime;
    var variationperc = (variation / avgtime) * 100;

    console.log("Min. Time: "+mintime + " ms");
    console.log("Max. Time: "+maxtime + " ms");
    console.log("Total Average Time: " + avgtime + " ms (" +
        parseInt(1000 / avgtime *
        data.length / 1024) + " KB\/s)");
    console.log("+/- " + variationperc + "%");

});

