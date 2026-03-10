import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import less from '../lib/less-node/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let file = path.join(__dirname, 'benchmark.less');

if (process.argv[2]) { file = path.join(process.cwd(), process.argv[2]); }

fs.readFile(file, 'utf8', function (e, data) {
    console.log('Benchmarking...\n', path.basename(file) + ' (' +
             parseInt(data.length / 1024) + ' KB)', '');

    const renderBenchmark = [];
    const parserBenchmark = [];
    const evalBenchmark = [];

    const totalruns = 30;
    const ignoreruns = 5;

    let i = 0;

    nextRun();

    function nextRun() {
        const start = performance.now();

        less.parse(data, { filename: file, paths: [path.dirname(file)] }, function(err, root, imports, options) {
            if (err) {
                console.log(err);
                process.exit(3);
            }
            const parserEnd = performance.now();

            const tree = new less.ParseTree(root, imports);
            tree.toCSS(options);

            const renderEnd = performance.now();

            renderBenchmark.push(renderEnd - start);
            parserBenchmark.push(parserEnd - start);
            evalBenchmark.push(renderEnd - parserEnd);

            i += 1;
            if (i < totalruns) {
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
            let totalTime = 0;
            let mintime = Infinity;
            let maxtime = 0;
            for (let i = ignoreruns; i < totalruns; i++) {
                totalTime += benchMarkData[i];
                mintime = Math.min(mintime, benchMarkData[i]);
                maxtime = Math.max(maxtime, benchMarkData[i]);
            }
            const avgtime = totalTime / (totalruns - ignoreruns);
            const variation = maxtime - mintime;
            const variationperc = (variation / avgtime) * 100;

            console.log('Min. Time: ' + Math.round(mintime) + ' ms');
            console.log('Max. Time: ' + Math.round(maxtime) + ' ms');
            console.log('Total Average Time: ' + Math.round(avgtime) + ' ms (' +
                parseInt(1000 / avgtime *
                data.length / 1024) + ' KB\/s)');
            console.log('+/- ' + Math.round(variationperc) + '%');
            console.log('');
        }

        analyze('Parsing', parserBenchmark);
        analyze('Evaluation', evalBenchmark);
        analyze('Render Time', renderBenchmark);
    }
});
