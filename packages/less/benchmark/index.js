var path = require('path'),
    fs = require('fs'),
    now = require("performance-now");

var less = require('../test/less');
var file = path.join(__dirname, 'benchmark.less');

if (process.argv[2]) { file = path.join(process.cwd(), process.argv[2]) }

fs.readFile(file, 'utf8', function (e, data) {
    var start, total;

    console.log("Benchmarking...\n", path.basename(file) + " (" +
             parseInt(data.length / 1024) + " KB)", "");

    var renderBenchmark = []
      , parserBenchmark = []
      , evalBenchmark = [];

    var totalruns = 30;
    var ignoreruns = 5;

    var i = 0;

    nextRun();

    function nextRun() {
        var start, renderEnd, parserEnd;

        start = now();

        less.parse(data, {}, function(err, root, imports, options) {
            if (err) {
                less.writeError(err);
                process.exit(3);
            }
            parserEnd = now();

            var tree, result;
            tree = new less.ParseTree(root, imports);
            result = tree.toCSS(options);

            renderEnd = now();

            renderBenchmark.push(renderEnd - start);
            parserBenchmark.push(parserEnd - start);
            evalBenchmark.push(renderEnd - parserEnd);

            i += 1;
            //console.log('Less Run #: ' + i);
            if(i < totalruns) {
                nextRun();
            }
            else {
                finish();
            }
        });
    }

    function finish() {
        function analyze(benchmark, benchMarkData) {
            console.log('----------------------');
            console.log(benchmark);
            console.log('----------------------');
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

            console.log("Min. Time: " + Math.round(mintime) + " ms");
            console.log("Max. Time: " + Math.round(maxtime) + " ms");
            console.log("Total Average Time: " + Math.round(avgtime) + " ms (" +
                parseInt(1000 / avgtime *
                data.length / 1024) + " KB\/s)");
            console.log("+/- " + Math.round(variationperc) + "%");
            console.log("");
        }
       
        analyze('Parsing', parserBenchmark);
        analyze('Evaluation', evalBenchmark);
        analyze('Render Time', renderBenchmark);

    }

});

