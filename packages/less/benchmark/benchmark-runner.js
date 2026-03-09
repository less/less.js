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

function hrNow() {
  var hr = process.hrtime();
  return hr[0] * 1000 + hr[1] / 1e6;
}

function runOnce(callback) {
  var start = hrNow();
  less.render(data, {
    filename: filePath,
    paths: [fileDir]
  }, function (err, output) {
    var end = hrNow();
    if (err) {
      errors.push({ run: completed, error: err.message || String(err) });
      callback(err);
      return;
    }
    renderTimes.push(end - start);
    completed++;
    callback(null);
  });
}

function runAll(i) {
  if (i >= totalRuns) {
    reportResults();
    return;
  }
  runOnce(function (err) {
    if (err && errors.length > 3) {
      // Too many errors, bail
      reportResults();
      return;
    }
    runAll(i + 1);
  });
}

function analyze(times, skipWarmup) {
  var start = skipWarmup ? warmupRuns : 0;
  if (times.length <= start) return null;
  var effective = times.slice(start);
  var total = 0, min = Infinity, max = 0;
  for (var i = 0; i < effective.length; i++) {
    total += effective[i];
    min = Math.min(min, effective[i]);
    max = Math.max(max, effective[i]);
  }
  var avg = total / effective.length;

  // Median
  var sorted = effective.slice().sort(function (a, b) { return a - b; });
  var mid = Math.floor(sorted.length / 2);
  var median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  // Standard deviation and coefficient of variation
  var sumSqDiff = 0;
  for (var i = 0; i < effective.length; i++) {
    sumSqDiff += (effective[i] - avg) * (effective[i] - avg);
  }
  var stddev = Math.sqrt(sumSqDiff / effective.length);
  var variancePct = avg === 0 ? 0 : (stddev / avg) * 100;

  return {
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    avg: Math.round(avg * 100) / 100,
    median: Math.round(median * 100) / 100,
    stddev: Math.round(stddev * 100) / 100,
    variance_pct: Math.round(variancePct * 100) / 100,
    samples: effective.length,
    throughput_kbs: Math.round(1000 / avg * data.length / 1024)
  };
}

function reportResults() {
  var result = {
    version: version,
    lessPath: lessPath,
    file: path.basename(file),
    fileSize: data.length,
    fileSizeKB: Math.round(data.length / 1024 * 10) / 10,
    totalRuns: totalRuns,
    warmupRuns: warmupRuns,
    completedRuns: completed,
    errors: errors.length > 0 ? errors : undefined,
    render: analyze(renderTimes, true)
  };
  console.log(JSON.stringify(result));
}

runAll(0);
