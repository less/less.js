#!/usr/bin/env node
// Portable benchmark runner - dropped into each version's worktree
// Finds the Less compiler, compiles the given file N times, reports JSON results.
//
// Usage:
//   node benchmark-runner.js [benchmark-file] [runs=30] [warmup=5]
//   node benchmark-runner.js [benchmark-file] --runs=30 --warmup=5 --math=parens-division

var fs = require('fs');
var path = require('path');
var url = require('url');

var args = process.argv.slice(2);
var extraOpts = {};
var positionals = [];
var namedRuns;
var namedWarmup;

function readValue(currentIndex) {
  if (currentIndex + 1 >= args.length) {
    return undefined;
  }
  return args[currentIndex + 1];
}

for (var ai = 0; ai < args.length; ai++) {
  var arg = args[ai];
  if (arg === '--runs') {
    var runsValue = readValue(ai);
    if (runsValue !== undefined) {
      namedRuns = parseInt(runsValue);
      ai++;
    }
    continue;
  }
  if (arg.indexOf('--runs=') === 0) {
    namedRuns = parseInt(arg.slice('--runs='.length));
    continue;
  }
  if (arg === '--warmup') {
    var warmupValue = readValue(ai);
    if (warmupValue !== undefined) {
      namedWarmup = parseInt(warmupValue);
      ai++;
    }
    continue;
  }
  if (arg.indexOf('--warmup=') === 0) {
    namedWarmup = parseInt(arg.slice('--warmup='.length));
    continue;
  }
  var optMatch = arg.match(/^--([a-z-]+)=(.*)$/);
  if (optMatch) {
    extraOpts[optMatch[1]] = optMatch[2];
    continue;
  }
  if (arg.indexOf('--') === 0) {
    var optionName = arg.slice(2);
    var optionValue = readValue(ai);
    if (optionValue !== undefined && optionValue.indexOf('--') !== 0) {
      extraOpts[optionName] = optionValue;
      ai++;
    } else {
      extraOpts[optionName] = true;
    }
    continue;
  }
  positionals.push(arg);
}

var file = positionals[0] || 'benchmark/benchmark.less';
var totalRuns = Number.isFinite(namedRuns) ? namedRuns : (parseInt(positionals[1]) || 30);
var warmupRuns = Number.isFinite(namedWarmup) ? namedWarmup : (parseInt(positionals[2]) || 5);

// Find Less compiler - prefer local source entries, then fall back to package roots
var less;
var lessPath = '';
var tryPaths = [
  { path: './lib/index.js', mode: 'import' },
  { path: './packages/less/lib/index.js', mode: 'import' },
  { path: './packages/less', mode: 'require' },
  { path: '.', mode: 'require' },
  { path: './lib/less-node', mode: 'require' },
  { path: 'less', mode: 'require' }
];

async function loadLessCompiler() {
  for (var i = 0; i < tryPaths.length; i++) {
    var entry = tryPaths[i];
    try {
      var mod;
      if (entry.mode === 'import') {
        var resolvedPath = path.resolve(entry.path);
        if (!fs.existsSync(resolvedPath)) {
          continue;
        }
        mod = await import(url.pathToFileURL(resolvedPath).href);
      } else {
        mod = require(entry.path.startsWith('.') ? path.resolve(entry.path) : entry.path);
      }
      var candidate = mod && mod.default ? mod.default : mod;
      if (candidate && (candidate.render || candidate.parse)) {
        less = candidate;
        lessPath = entry.path;
        return true;
      }
    } catch (e) {
      // try next
    }
  }
  return false;
}

// Determine version after the compiler is loaded
var version = 'unknown';

var filePath = path.resolve(file);
if (!fs.existsSync(filePath)) {
  console.error('Usage: node benchmark-runner.js [file.less] [runs] [warmup]');
  console.error('Could not find benchmark file: ' + file);
  process.exit(1);
}
var data = fs.readFileSync(filePath, 'utf8');
var fileDir = path.dirname(filePath);

function resolveImportCandidate(importPath, fromDir) {
  var base = path.isAbsolute(importPath) ? importPath : path.resolve(fromDir, importPath);
  var candidates = [
    base,
    base + '.less'
  ];
  var parsed = path.parse(base);
  if (parsed.base.charAt(0) !== '_') {
    candidates.push(path.join(parsed.dir, '_' + parsed.base));
    candidates.push(path.join(parsed.dir, '_' + parsed.base + '.less'));
  }
  for (var i = 0; i < candidates.length; i++) {
    if (fs.existsSync(candidates[i])) {
      return candidates[i];
    }
  }
  return null;
}

function literalImports(source, fromDir) {
  var imports = [];
  var re = /@import\s+(?:\([^)]*\)\s*)?(?:"([^"]+)"|'([^']+)')\s*;/g;
  var match;
  while ((match = re.exec(source))) {
    var importPath = match[1] || match[2];
    if (!importPath || /^[a-z]+:/i.test(importPath) || importPath.endsWith('.css')) {
      return null;
    }
    var resolved = resolveImportCandidate(importPath, fromDir);
    if (!resolved) {
      return null;
    }
    imports.push(resolved);
  }
  return imports;
}

function sourceGraphIsPluginFree(entryFile) {
  var pending = [entryFile];
  var seen = Object.create(null);
  while (pending.length) {
    var current = pending.pop();
    if (seen[current]) {
      continue;
    }
    seen[current] = true;
    var source;
    try {
      source = fs.readFileSync(current, 'utf8');
    } catch (e) {
      return false;
    }
    if (source.indexOf('@plugin') !== -1) {
      return false;
    }
    var imports = literalImports(source, path.dirname(current));
    if (!imports) {
      return false;
    }
    for (var i = 0; i < imports.length; i++) {
      pending.push(imports[i]);
    }
  }
  return true;
}

var benchmarkSourceGraphIsPluginFree = sourceGraphIsPluginFree(filePath);

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
  var opts = {
    filename: filePath,
    paths: [fileDir]
  };
  if (benchmarkSourceGraphIsPluginFree) {
    opts.__jessSkipLessCompatWhenPluginFree = true;
  }
  // Forward extra options (e.g. --math=always)
  for (var key in extraOpts) { opts[key] = extraOpts[key]; }
  less.render(data, opts, function (err, output) {
    var end = hrNow();
    if (err) {
      errors.push({ run: completed, error: err.message || String(err) });
      callback(err);
      return;
    }
    if (!output || typeof output.css !== 'string') {
      var invalidOutputError = new Error('Render completed without a CSS result');
      errors.push({ run: completed, error: invalidOutputError.message });
      callback(invalidOutputError);
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

async function main() {
  var loaded = await loadLessCompiler();
  if (!loaded) {
    console.error(JSON.stringify({
      error: 'Could not find Less compiler',
      tried: tryPaths.map(function (entry) { return entry.path; })
    }));
    process.exit(2);
  }

  // Determine version
  if (less.version) {
    if (Array.isArray(less.version)) {
      version = less.version.join('.');
    } else {
      version = String(less.version);
    }
  }

  runAll(0);
}

main().catch(function (error) {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
