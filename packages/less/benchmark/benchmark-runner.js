#!/usr/bin/env node
// Portable benchmark runner - dropped into each version's worktree
// Finds the Less compiler, compiles the given file N times, reports JSON results.
//
// Usage: node benchmark-runner.js <benchmark-file> [runs=30] [warmup=5]

var fs = require('fs');
var path = require('path');

var file = process.argv[2];
var totalRuns = parseInt(process.argv[3]) || 30;
var warmupRuns = parseInt(process.argv[4]) || 5;
var extraOpts = {};

// Parse --key=value options from remaining args
for (var ai = 5; ai < process.argv.length; ai++) {
    var optMatch = process.argv[ai].match(/^--([a-z-]+)=(.*)$/);
    if (optMatch) { extraOpts[optMatch[1]] = optMatch[2]; }
}

if (!file) {
    console.error('Usage: node benchmark-runner.js <file.less> [runs] [warmup]');
    process.exit(1);
}

// Find Less compiler - try multiple paths for different version eras
var less;
var lessPath = '';
var tryPaths = [
    // v4.x monorepo (after build)
    './packages/less',
    // v3.x / v2.x (lib in repo)
    '.',
    './lib/less-node',
    // Fallback
    'less'
];

for (var i = 0; i < tryPaths.length; i++) {
    try {
        var p = tryPaths[i];
        // Use path.resolve for relative paths, but keep bare package names for Node resolution
        var mod = require(p.startsWith('.') ? path.resolve(p) : p);
        // Handle both direct export and .default (ESM interop)
        less = mod && mod.default ? mod.default : mod;
        if (less && (less.render || less.parse)) {
            lessPath = p;
            break;
        }
        less = null;
    } catch (e) {
    // try next
    }
}

if (!less) {
    console.error(JSON.stringify({ error: 'Could not find Less compiler', tried: tryPaths }));
    process.exit(2);
}

// Determine version
var version = 'unknown';
if (less.version) {
    if (Array.isArray(less.version)) {
        version = less.version.join('.');
    } else {
        version = String(less.version);
    }
}

var filePath = path.resolve(file);
var data = fs.readFileSync(filePath, 'utf8');
var fileDir = path.dirname(filePath);

// Use less.render() - stable across all versions
var renderTimes = [];
var parseTimes = [];
var completed = 0;
var errors = [];

/**
 * Returns the current high-resolution time in milliseconds.
 * @returns {number} Current time in ms, with sub-ms precision.
 */
function hrNow() {
    var hr = process.hrtime();
    return hr[0] * 1000 + hr[1] / 1e6;
}

/**
 * Runs the Less compiler against the input file exactly once, recording
 * the elapsed time. Pushes to renderTimes on success; records errors.
 * @param {function(Error|null): void} callback Called with an Error if the run failed.
 * @returns {void}
 */
function runOnce(callback) {

/**
 * Invokes runOnce repeatedly until totalRuns has been reached, then
 * reports results. Bails early after 4 errors to avoid hanging on a broken Less.
 * @param {number} i Current iteration counter.
 * @returns {void}
 */
function runAll(i) {

/**
 * Computes summary statistics for a list of timing samples, optionally
 * skipping the warmup window.
 * @param {number[]} times Elapsed-time samples in milliseconds.
 * @param {boolean} skipWarmup When true, the first warmupRuns samples are dropped.
 * @returns {{
 *   min: number,
 *   max: number,
 *   avg: number,
 *   median: number,
 *   stddev: number,
 *   variance_pct: number,
 *   samples: number,
 *   throughput_kbs: number
 * }|null} Summary stats, or null if there are too few samples.
 */
function analyze(times, skipWarmup) {

/**
 * Emits the final benchmark result as JSON to stdout. Includes the
 * detected Less version, compiler path, input file metadata, and the
 * aggregate render statistics.
 * @returns {void}
 */
function reportResults() {
}

runAll(0);
