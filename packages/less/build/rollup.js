import { rollup } from 'rollup';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve as resolve } from '@rollup/plugin-node-resolve';
import banner from './banner.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { builtinModules, createRequire } from 'module';
import minimist from 'minimist';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.join(__dirname, '..');
const pkg = require(path.join(rootPath, 'package.json'));
const builtinExternals = new Set([
    ...builtinModules,
    ...builtinModules.map((name) => `node:${name}`)
]);
const packageExternals = new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.optionalDependencies || {})
]);

const args = minimist(process.argv.slice(2));

let outDir = args.dist ? './dist' : './tmp';

function isExternalDependency(id) {
    if (!id || id.startsWith('\0')) {
        return false;
    }

    if (builtinExternals.has(id)) {
        return true;
    }

    if (id.startsWith('.') || path.isAbsolute(id)) {
        return false;
    }

    if (id.startsWith('@')) {
        const [scope, name] = id.split('/');
        return packageExternals.has(`${scope}/${name}`);
    }

    return packageExternals.has(id.split('/')[0]);
}

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
                return 'export function createRequire() { return require; }';
            }
            return null;
        }
    };
}

/** Inline package.json version - avoid runtime require of package.json from wrong path */
function inlinePackageVersion() {
    const version = JSON.stringify(pkg.version || '5.0.0-alpha.0');
    return {
        name: 'inline-package-version',
        transform(code, id) {
            const normalized = id.replace(/\\/g, '/');
            if (normalized.includes('lib/version.js')) {
                return {
                    code: code
                        .replace(/import\s+\{\s*createRequire\s*\}\s+from\s+['"]module['"];\s*/, '')
                        .replace(/const require = createRequire\([^)]+\);\s*const pkg = require\([^)]+\);\s*/, '')
                        .replace(/const semver = pkg\.version \|\| '[^']*';/, `const semver = ${version};`)
                        .replace(/semver: pkg\.version \|\| '[^']*'/, `semver: ${version}`),
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
        input: './lib/index.js',
        external: isExternalDependency,
        plugins: [
            moduleShim(),
            inlinePackageVersion(),
            resolve({ preferBuiltins: true }),
            commonjs(),
            json()
        ]
    });
    await bundle.write({
        file: outFile,
        format: 'cjs',
        exports: 'named',
        inlineDynamicImports: true,
        banner
    });
}

async function build() {
    await buildLessNodeCjs();
}

build();
