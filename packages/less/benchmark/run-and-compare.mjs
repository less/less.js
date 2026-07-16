#!/usr/bin/env node
/**
 * Run benchmarks and compare against historical data.
 */

import { execSync, spawn } from 'child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BENCH_DIR = __dirname;
const RESULTS_DIR = path.join(BENCH_DIR, 'results');
const LATEST_FILE = path.join(RESULTS_DIR, 'latest', 'macbook-pro_arm64.json');
const ALPHA_RUNS_DIR = path.join(RESULTS_DIR, 'alpha-runs');
const ALPHA_LATEST_DIR = path.join(RESULTS_DIR, 'alpha-latest');
const ALPHA_LATEST_FILE = path.join(ALPHA_LATEST_DIR, 'jess-alpha.json');

const DEFAULT_FILES = ['benchmark.less', 'benchmark-v3.less', 'benchmark-v37.less', 'benchmark-v39.less'];
const FILES = (process.env.BENCH_FILES || '')
    .split(',')
    .map(file => file.trim())
    .filter(Boolean);
if (FILES.length === 0) {
    FILES.push(...DEFAULT_FILES);
}
const RUNS = parseInt(process.env.BENCH_RUNS || '30');
const WARMUP = parseInt(process.env.BENCH_WARMUP || '5');
const TIMEOUT_MS = parseInt(process.env.BENCH_TIMEOUT_MS || '0');

function gitValue(cwd, args) {
    try {
        return execSync(`git ${args}`, {
            cwd,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        }).trim();
    } catch {
        return null;
    }
}

function createAlphaSnapshot(results, historical) {
    const timestamp = new Date().toISOString();
    return {
        type: 'jess-alpha-benchmark-snapshot',
        timestamp,
        system: {
            platform: process.platform,
            arch: process.arch,
            node: process.version
        },
        benchmark: {
            files: FILES,
            runs: RUNS,
            warmup: WARMUP,
            timeoutMs: TIMEOUT_MS || null,
            math: 'parens-division'
        },
        repos: {
            less: {
                cwd: path.resolve(BENCH_DIR, '..', '..', '..'),
                branch: gitValue(path.resolve(BENCH_DIR, '..', '..', '..'), 'branch --show-current'),
                commit: gitValue(path.resolve(BENCH_DIR, '..', '..', '..'), 'rev-parse HEAD'),
                dirty: gitValue(path.resolve(BENCH_DIR, '..', '..', '..'), 'status --short') ? true : false
            },
            jess: {
                cwd: path.resolve(BENCH_DIR, '..', '..', '..', '..', 'jess'),
                branch: gitValue(path.resolve(BENCH_DIR, '..', '..', '..', '..', 'jess'), 'branch --show-current'),
                commit: gitValue(path.resolve(BENCH_DIR, '..', '..', '..', '..', 'jess'), 'rev-parse HEAD'),
                dirty: gitValue(path.resolve(BENCH_DIR, '..', '..', '..', '..', 'jess'), 'status --short') ? true : false
            }
        },
        results,
        historicalLess45: historical
    };
}

function saveAlphaSnapshot(snapshot) {
    mkdirSync(ALPHA_RUNS_DIR, { recursive: true });
    mkdirSync(ALPHA_LATEST_DIR, { recursive: true });
    const stamp = snapshot.timestamp.replace(/[:.]/g, '-');
    const runFile = path.join(ALPHA_RUNS_DIR, `${stamp}_jess-alpha.json`);
    const json = `${JSON.stringify(snapshot, null, 2)}\n`;
    writeFileSync(runFile, json);
    writeFileSync(ALPHA_LATEST_FILE, json);
    return { runFile, latestFile: ALPHA_LATEST_FILE };
}

function runBenchmark(file) {
    return new Promise((resolve, reject) => {
        const proc = spawn('node', [
            path.join(BENCH_DIR, 'benchmark-runner.cjs'),
            path.join(BENCH_DIR, file),
            String(RUNS),
            String(WARMUP),
            '--math=parens-division'
        ], {
            cwd: path.join(BENCH_DIR, '..'),
            stdio: ['ignore', 'pipe', 'pipe']
        });
        let timer;
        if (TIMEOUT_MS > 0) {
            timer = setTimeout(() => {
                proc.kill('SIGTERM');
                reject(new Error(`benchmark timed out after ${TIMEOUT_MS}ms`));
            }, TIMEOUT_MS);
        }
        let out = '';
        let err = '';
        proc.stdout.on('data', d => { out += d; });
        proc.stderr.on('data', d => { err += d; });
        proc.on('close', code => {
            if (timer) clearTimeout(timer);
            if (code !== 0) {
                reject(new Error(`benchmark-runner exited ${code}: ${err || out}`));
                return;
            }
            try {
                resolve(JSON.parse(out.trim()));
            } catch {
                reject(new Error(`Failed to parse output: ${out}`));
            }
        });
    });
}

function loadHistorical() {
    if (!existsSync(LATEST_FILE)) return null;
    const data = JSON.parse(readFileSync(LATEST_FILE, 'utf8'));
    const v4 = data.versions?.find(v => v.version?.startsWith('4.5'))
    || data.versions?.filter(v => v.version?.startsWith('4.')).pop();
    return v4?.benchmarks || null;
}

async function main() {
    console.log('Running benchmarks (Jess wrapper)...\n');
    const results = {};
    for (const file of FILES) {
        process.stderr.write(`  ${file}... `);
        try {
            const result = await runBenchmark(file);
            results[file] = result;
            if (result.render?.avg != null) {
                process.stderr.write(`avg ${result.render.avg.toFixed(1)}ms\n`);
            } else {
                process.stderr.write('ERROR\n');
            }
        } catch (error) {
            results[file] = { error: error.message };
            process.stderr.write('ERROR\n');
        }
    }

    const historical = loadHistorical();
    const snapshot = createAlphaSnapshot(results, historical);
    const snapshotFiles = saveAlphaSnapshot(snapshot);
    console.log('\n--- Comparison vs Less v4.5.x (historical) ---\n');
    const rows = FILES.map(file => {
        const jess = results[file];
        const hist = historical?.[file];
        const jessAvg = jess?.render?.avg;
        const histAvg = hist?.render?.avg;
        const ratio = jessAvg && histAvg ? (jessAvg / histAvg).toFixed(1) : '-';
        const jessLabel = jessAvg != null
            ? `${jessAvg.toFixed(1)}ms`
            : (jess?.error || (Array.isArray(jess?.errors) && jess.errors.length > 0
                ? jess.errors[0]?.error || 'ERROR'
                : '-'));
        return {
            file,
            jess: jessLabel,
            less: histAvg != null ? `${histAvg.toFixed(1)}ms` : '-',
            ratio: histAvg ? `${ratio}x` : '-'
        };
    });

    const col = (s, w) => String(s).padEnd(w);
    console.log(`${col('File', 22)} ${col('Jess (avg)', 12)} ${col('Less 4.5', 12)} ${col('Ratio', 8)}`);
    console.log('-'.repeat(58));
    for (const row of rows) {
        console.log(`${col(row.file, 22)} ${col(row.jess, 12)} ${col(row.less, 12)} ${col(row.ratio, 8)}`);
    }

    console.log('\n(Historical data from benchmark/results/latest/macbook-pro_arm64.json)');
    console.log(`Alpha snapshot: ${snapshotFiles.runFile}`);
    console.log(`Alpha latest:   ${snapshotFiles.latestFile}`);
    console.log('Same machine (M4 Pro) for fair comparison. Jess is a new compiler; Less has years of optimization.');
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
