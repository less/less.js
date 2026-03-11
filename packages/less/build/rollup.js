import { rollup } from 'rollup';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve as resolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import banner from './banner.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import minimist from 'minimist';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.join(__dirname, '..');
const pkg = require(path.join(rootPath, 'package.json'));

const args = minimist(process.argv.slice(2));

let outDir = args.dist ? './dist' : './tmp';

/** Virtual 'module' for CJS bundle - provides createRequire that returns CJS require */
function moduleShim() {
    return {
        name: 'module-shim',
        resolveId(id) {
            if (id === 'module') return '\0module';
            return null;
        },
        load(id) {
            if (id === '\0module') {
                return `export function createRequire() { return require; }`;
            }
            return null;
        }
    };
}

/** Inline package.json version - avoid runtime require of ../../package.json from wrong path */
function inlinePackageVersion() {
    const version = JSON.stringify(pkg.version);
    return {
        name: 'inline-package-version',
        transform(code, id) {
            if (id.includes('less-node/index.js')) {
                return {
                    code: code.replace(
                        /const\s*\{\s*version\s*\}\s*=\s*require\s*\(\s*['"]\.\.\/\.\.\/package\.json['"]\s*\)/,
                        `const version = ${version}`
                    ),
                    map: null
                };
            }
            return null;
        }
    };
}

async function buildLessNodeCjs() {
    const outFile = path.join(rootPath, outDir, 'less-node.cjs');
    console.log(`Writing ${outDir}/less-node.cjs...`);
    const bundle = await rollup({
        input: './lib/less-node/index.js',
        plugins: [
            moduleShim(),
            inlinePackageVersion(),
            resolve(),
            commonjs(),
            json()
        ]
    });
    await bundle.write({
        file: outFile,
        format: 'cjs',
        exports: 'default',
        banner
    });
}

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
    await buildLessNodeCjs();
    await buildBrowser();
}

build();
