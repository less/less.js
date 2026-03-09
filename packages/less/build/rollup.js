import { rollup } from 'rollup';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve as resolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import banner from './banner.js';
import path from 'path';
import { fileURLToPath } from 'url';
import minimist from 'minimist';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.join(__dirname, '..');

const args = minimist(process.argv.slice(2));

let outDir = args.dist ? './dist' : './tmp';

async function buildBrowser() {
    let bundle = await rollup({
        input: './lib/less-browser/bootstrap.js',
        output: [
            {
                file: 'less.js',
                format: 'umd'
            },
            {
                file: 'less.min.js',
                format: 'umd'
            }
        ],
        plugins: [
            resolve(),
            commonjs(),
            json(),
            terser({
                compress: true,
                include: [/^.+\.min\.js$/],
                output: {
                    comments: function(node, comment) {
                        if (comment.type == 'comment2') {
                            // preserve banner
                            return /@license/i.test(comment.value);
                        }
                    }
                }
            })
        ]
    });

    if (!args.out || args.out.indexOf('less.js') > -1) {
        const file = args.out || `${outDir}/less.js`;
        console.log(`Writing ${file}...`);
        await bundle.write({
            file: path.join(rootPath, file),
            format: 'umd',
            name: 'less',
            banner
        });
    }

    if (!args.out || args.out.indexOf('less.min.js') > -1) {
        const file = args.out || `${outDir}/less.min.js`;
        console.log(`Writing ${file}...`);
        await bundle.write({
            file: path.join(rootPath, file),
            format: 'umd',
            name: 'less',
            sourcemap: true,
            banner
        });
    }
}

async function build() {
    await buildBrowser();
}

build();
