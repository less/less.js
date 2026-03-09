#!/usr/bin/env bash
set -euo pipefail

# Historical Less Benchmark Runner
# Benchmarks every major/minor Less release from v2.0.0 through v4.4.x
# Uses git worktrees for isolation, fnm for Node version management.
#
# Usage: ./run-historical.sh [--versions "v2.0.0 v3.0.0 ..."] [--runs 30] [--warmup 5]
#
# Results are saved to benchmark/results/

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
RESULTS_DIR="$SCRIPT_DIR/results"
RUNS_DIR="$RESULTS_DIR/runs"
LATEST_DIR="$RESULTS_DIR/latest"
WORKTREE_BASE="/tmp/less-bench-worktrees"
BENCHMARK_DIR="$SCRIPT_DIR"

RUNS=30
WARMUP=5
NODE_FOR_OLD="v18.20.8"  # v2.x/v3.x
NODE_FOR_NEW="v20.19.6"  # v4.x
NODE_DEFAULT=""           # will be set to current

# All major/minor releases (no patches, no betas/RCs)
ALL_VERSIONS=(
  v2.0.0 v2.1.0 v2.2.0 v2.3.0 v2.4.0 v2.5.0 v2.6.0 v2.7.0
  v3.0.0 v3.5.0 v3.6.0 v3.7.0 v3.8.0 v3.9.0 v3.10.0 v3.11.0 v3.12.0 v3.13.0
  v4.0.0 v4.1.0 v4.2.0 v4.3.0 v4.4.0
)

VERSIONS=("${ALL_VERSIONS[@]}")

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --versions) IFS=' ' read -ra VERSIONS <<< "$2"; shift 2 ;;
    --runs) RUNS="$2"; shift 2 ;;
    --warmup) WARMUP="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Benchmark files and their minimum required versions (parallel arrays)
BENCH_FILE_NAMES=(benchmark.less benchmark-v3.less benchmark-v37.less benchmark-v39.less)
BENCH_FILE_MINVS=(2.0.0      3.6.0            3.7.0             3.9.0)

# ----- Helpers -----

log() { echo "$(date '+%H:%M:%S') | $*"; }
err() { echo "$(date '+%H:%M:%S') | ERROR: $*" >&2; }

version_ge() {
  # Returns 0 if $1 >= $2 (semantic version comparison)
  printf '%s\n%s' "$2" "$1" | sort -V -C
}

strip_v() { echo "${1#v}"; }

pick_node_version() {
  local ver="$1"
  local major="${ver%%.*}"
  if [[ "$major" -ge 4 ]]; then
    echo "$NODE_FOR_NEW"
  else
    echo "$NODE_FOR_OLD"
  fi
}

use_node() {
  local nv="$1"
  if command -v fnm &>/dev/null; then
    fnm install "$nv" &>/dev/null || true
    eval "$(fnm env --shell bash)"
    fnm use "$nv" &>/dev/null
  fi
}

restore_node() {
  if [[ -n "$NODE_DEFAULT" ]] && command -v fnm &>/dev/null; then
    eval "$(fnm env --shell bash)"
    fnm use "$NODE_DEFAULT" &>/dev/null
  fi
}

is_monorepo() {
  local tag="$1"
  git -C "$REPO_ROOT" show "$tag:packages/less/package.json" &>/dev/null 2>&1
}

get_system_info() {
  python3 -c "
import json, platform, subprocess, datetime, re

def run(cmd):
    try:
        return subprocess.check_output(cmd, shell=True, stderr=subprocess.DEVNULL).decode().strip()
    except:
        return 'unknown'

hostname = platform.node()
arch = platform.machine()

# Generate a stable, filesystem-safe system ID
system_id = re.sub(r'[^a-zA-Z0-9_-]', '-', hostname.split('.')[0].lower()) + '_' + arch

info = {
    'system_id': system_id,
    'hostname': hostname,
    'platform': platform.system(),
    'arch': arch,
    'os_version': platform.release(),
    'cpus': run('sysctl -n hw.ncpu') if platform.system() == 'Darwin' else run('nproc'),
    'cpu_model': run('sysctl -n machdep.cpu.brand_string') if platform.system() == 'Darwin' else run(\"grep 'model name' /proc/cpuinfo | head -1 | cut -d: -f2\").strip(),
    'total_memory_gb': round(int(run('sysctl -n hw.memsize') or '0') / 1073741824, 1) if platform.system() == 'Darwin' else 'unknown',
    'node_version': run('node -v'),
    'date': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
}
print(json.dumps(info, indent=2))
"
}

# ----- Setup -----

mkdir -p "$RUNS_DIR" "$LATEST_DIR" "$WORKTREE_BASE"
NODE_DEFAULT="$(node -v)"

# Record system info and derive system ID + run filename
log "Recording system info..."
SYSTEM_INFO_JSON="$(get_system_info)"
echo "$SYSTEM_INFO_JSON"

SYSTEM_ID="$(echo "$SYSTEM_INFO_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['system_id'])")"
RUN_DATE="$(date -u +%Y-%m-%d)"
RUN_FILE="$RUNS_DIR/${RUN_DATE}_${SYSTEM_ID}.json"
LATEST_FILE="$LATEST_DIR/${SYSTEM_ID}.json"

log "System ID: $SYSTEM_ID"
log "Run file:  $RUN_FILE"

# Initialize the run file (system info + empty results array)
python3 -c "
import json, sys
system_info = json.loads(sys.argv[1])
run_data = {'system': system_info, 'versions': []}
print(json.dumps(run_data, indent=2))
" "$SYSTEM_INFO_JSON" > "$RUN_FILE"

# ----- Main Loop -----

total=${#VERSIONS[@]}
idx=0

for tag in "${VERSIONS[@]}"; do
  idx=$((idx + 1))
  ver="$(strip_v "$tag")"
  log "===== [$idx/$total] Benchmarking $tag ====="

  WORKTREE="$WORKTREE_BASE/$tag"

  # Verify tag exists
  if ! git -C "$REPO_ROOT" rev-parse "$tag" &>/dev/null; then
    err "Tag $tag not found, skipping"
    continue
  fi

  # Select Node version
  node_ver="$(pick_node_version "$ver")"
  log "Using Node $node_ver for $tag"
  use_node "$node_ver"
  log "Active Node: $(node -v)"

  # Create worktree
  if [[ -d "$WORKTREE" ]]; then
    log "Cleaning existing worktree $WORKTREE"
    git -C "$REPO_ROOT" worktree remove --force "$WORKTREE" 2>/dev/null || rm -rf "$WORKTREE"
  fi

  log "Creating worktree for $tag..."
  git -C "$REPO_ROOT" worktree add --detach "$WORKTREE" "$tag" 2>/dev/null

  # Install dependencies
  log "Installing dependencies..."
  pushd "$WORKTREE" > /dev/null

  LESS_DIR=""
  BENCH_TARGET=""

  if is_monorepo "$tag"; then
    # Monorepo era (v4.x)
    LESS_DIR="$WORKTREE/packages/less"
    BENCH_TARGET="$LESS_DIR/benchmark"

    # Try npm install at root first (for lerna bootstrap)
    npm install --ignore-scripts --legacy-peer-deps 2>/dev/null || true

    # Install in packages/less specifically
    pushd "$LESS_DIR" > /dev/null
    npm install --ignore-scripts --legacy-peer-deps 2>/dev/null || true

    # Build TypeScript
    log "Building TypeScript..."
    if [[ -f "tsconfig.json" ]] || [[ -f "tsconfig.build.json" ]]; then
      # Install typescript directly (npx tsc is intercepted by a placeholder package)
      npm install typescript --no-save 2>/dev/null || true
      TSC="./node_modules/.bin/tsc"
      if [[ ! -x "$TSC" ]]; then
        # Try parent node_modules
        TSC="$WORKTREE/node_modules/.bin/tsc"
      fi
      $TSC -p tsconfig.build.json 2>/dev/null || $TSC -p tsconfig.json 2>/dev/null || {
        err "TypeScript build failed for $tag, trying with skipLibCheck"
        $TSC --skipLibCheck -p tsconfig.build.json 2>/dev/null || $TSC --skipLibCheck -p tsconfig.json 2>/dev/null || {
          err "Build failed completely for $tag, skipping"
          popd > /dev/null
          popd > /dev/null
          git -C "$REPO_ROOT" worktree remove --force "$WORKTREE" 2>/dev/null || true
          continue
        }
      }
    fi
    popd > /dev/null
  else
    # Pre-monorepo (v2.x, v3.x) - lib/ is already in git
    LESS_DIR="$WORKTREE"
    BENCH_TARGET="$WORKTREE/benchmark"
    npm install --ignore-scripts --legacy-peer-deps 2>/dev/null || true
  fi
  popd > /dev/null

  # Copy benchmark files and runner into the worktree
  mkdir -p "$BENCH_TARGET"
  cp "$BENCHMARK_DIR/benchmark-runner.js" "$BENCH_TARGET/"
  cp "$BENCHMARK_DIR/benchmark.less" "$BENCH_TARGET/"
  cp "$BENCHMARK_DIR/benchmark-import-target.less" "$BENCH_TARGET/"
  cp "$BENCHMARK_DIR/benchmark-import-reference-target.less" "$BENCH_TARGET/"
  cp "$BENCHMARK_DIR/benchmark-v3.less" "$BENCH_TARGET/" 2>/dev/null || true
  cp "$BENCHMARK_DIR/benchmark-v37.less" "$BENCH_TARGET/" 2>/dev/null || true
  cp "$BENCHMARK_DIR/benchmark-v39.less" "$BENCH_TARGET/" 2>/dev/null || true

  # Run benchmarks for applicable files
  CURRENT_NODE="$(node -v)"
  CURRENT_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  # Initialize tag JSON via python for safety
  tag_json=$(python3 -c "
import json
print(json.dumps({
    'tag': '$tag',
    'version': '$ver',
    'node_version': '$CURRENT_NODE',
    'date': '$CURRENT_DATE',
    'benchmarks': {}
}))
")

  bench_count=${#BENCH_FILE_NAMES[@]}
  for (( bi=0; bi<bench_count; bi++ )); do
    bench_file="${BENCH_FILE_NAMES[$bi]}"
    min_ver="${BENCH_FILE_MINVS[$bi]}"

    if ! version_ge "$ver" "$min_ver"; then
      log "  Skipping $bench_file (requires >= $min_ver)"
      continue
    fi

    bench_path="$BENCH_TARGET/$bench_file"
    if [[ ! -f "$bench_path" ]]; then
      log "  Skipping $bench_file (file not found)"
      continue
    fi

    log "  Running $bench_file ($RUNS runs, $WARMUP warmup)..."

    # Run from the Less package directory so require() finds the compiler
    # Save result to temp file to avoid shell quoting issues
    result_file=$(mktemp)
    (cd "$LESS_DIR" && node "$BENCH_TARGET/benchmark-runner.js" "$bench_path" "$RUNS" "$WARMUP" > "$result_file" 2>&1) || true

    # Use python to safely merge results
    tag_json=$(python3 -c "
import sys, json

tag_data = json.loads(sys.stdin.read())
bench_file = sys.argv[1]
result_file = sys.argv[2]

try:
    with open(result_file) as f:
        result_str = f.read().strip()
    result_data = json.loads(result_str)
    tag_data['benchmarks'][bench_file] = result_data
    print(json.dumps(tag_data))
except (json.JSONDecodeError, Exception) as e:
    tag_data['benchmarks'][bench_file] = {'error': str(e)[:500]}
    print(json.dumps(tag_data))
" "$bench_file" "$result_file" <<< "$tag_json")

    if python3 -c "import json; json.load(open('$result_file'))" 2>/dev/null; then
      log "  Done $bench_file"
    else
      err "  $bench_file failed: $(head -5 "$result_file")"
    fi
    rm -f "$result_file"
  done

  # Append version results to run file
  python3 -c "
import json, sys

tag_data = json.loads(sys.stdin.read())
run_file = sys.argv[1]
with open(run_file) as f:
    run_data = json.load(f)
run_data['versions'].append(tag_data)
with open(run_file, 'w') as f:
    json.dump(run_data, f, indent=2)
" "$RUN_FILE" <<< "$tag_json"
  log "Results appended to $RUN_FILE"

  # Clean up worktree
  log "Cleaning up worktree..."
  git -C "$REPO_ROOT" worktree remove --force "$WORKTREE" 2>/dev/null || rm -rf "$WORKTREE"

  log "===== Done $tag ====="
  echo ""
done

# Restore original Node version
restore_node

# Copy to latest
cp "$RUN_FILE" "$LATEST_FILE"
log "Latest results: $LATEST_FILE"

# Generate summary
log "Generating summary..."
python3 - "$RUN_FILE" << 'PYEOF'
import json, sys

with open(sys.argv[1]) as f:
    run_data = json.load(f)

system = run_data.get('system', {})
print("\n" + "=" * 80)
print("LESS HISTORICAL BENCHMARK SUMMARY")
print(f"System: {system.get('cpu_model', '?')} | {system.get('arch', '?')} | {system.get('total_memory_gb', '?')} GB")
print(f"Date:   {system.get('date', '?')}")
print("=" * 80)
print(f"\n{'Version':<12} {'Node':<12} {'File':<25} {'Avg (ms)':<12} {'Median':<12} {'Min':<10} {'Max':<10} {'+-pct':<8} {'KB/s':<8}")
print("-" * 110)

for entry in run_data.get('versions', []):
    tag = entry.get('tag', '?')
    node = entry.get('node_version', '?')
    for bench_name, bench_data in entry.get('benchmarks', {}).items():
        if 'error' in bench_data:
            print(f"{tag:<12} {node:<12} {bench_name:<25} {'ERROR':>10}")
            continue
        render = bench_data.get('render')
        if not render:
            print(f"{tag:<12} {node:<12} {bench_name:<25} {'NO DATA':>10}")
            continue
        print(f"{tag:<12} {node:<12} {bench_name:<25} {render['avg']:>10.1f} {render['median']:>10.1f} {render['min']:>8.1f} {render['max']:>8.1f} {render['variance_pct']:>6.1f}% {render.get('throughput_kbs', 0):>6}")

print("\n" + "=" * 80)
PYEOF

log "All benchmarks complete! Results in $RESULTS_DIR/"
log "  - This run:    $RUN_FILE"
log "  - Latest:      $LATEST_FILE"
log "  - All runs:    $RUNS_DIR/"
