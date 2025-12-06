#!/usr/bin/env node

/**
 * Generates a per-file coverage report table for src/ directories
 */

const fs = require('fs');
const path = require('path');

const coverageSummaryPath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');

if (!fs.existsSync(coverageSummaryPath)) {
    console.error('Coverage summary not found. Run pnpm test:coverage first.');
    process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));

// Filter to only src/ files (less, less-node) and bin/ files
// Note: src/less-browser/ is excluded because browser tests aren't included in coverage
// Abstract base classes are excluded as they're meant to be overridden by implementations
const abstractClasses = [
    'abstract-file-manager',
    'abstract-plugin-loader'
];

const srcFiles = Object.entries(coverage)
    .filter(([filePath]) => {
        const normalized = filePath.replace(/\\/g, '/');
        // Exclude abstract classes
        if (abstractClasses.some(abstract => normalized.includes(abstract))) {
            return false;
        }
        return (normalized.includes('/src/less/') && !normalized.includes('/src/less-browser/')) || 
               normalized.includes('/src/less-node/') ||
               normalized.includes('/bin/');
    })
    .map(([filePath, data]) => {
        // Extract relative path from absolute path
        const normalized = filePath.replace(/\\/g, '/');
        // Match src/ paths or bin/ paths
        const match = normalized.match(/((?:src\/[^/]+\/[^/]+\/|bin\/).+)$/);
        const relativePath = match ? match[1] : path.basename(filePath);
        
        return {
            path: relativePath,
            statements: data.statements,
            branches: data.branches,
            functions: data.functions,
            lines: data.lines
        };
    })
    .sort((a, b) => {
        // Sort by directory first, then by coverage percentage
        const pathCompare = a.path.localeCompare(b.path);
        if (pathCompare !== 0) return pathCompare;
        return a.statements.pct - b.statements.pct;
    });

if (srcFiles.length === 0) {
    console.log('No src/ files found in coverage report.');
    process.exit(0);
}

// Group by directory
const grouped = {
    'src/less/': [],
    'src/less-node/': [],
    'bin/': []
};

srcFiles.forEach(file => {
    if (file.path.startsWith('src/less/')) {
        grouped['src/less/'].push(file);
    } else if (file.path.startsWith('src/less-node/')) {
        grouped['src/less-node/'].push(file);
    } else if (file.path.startsWith('bin/')) {
        grouped['bin/'].push(file);
    }
});

// Print table
console.log('\n' + '='.repeat(100));
console.log('Per-File Coverage Report (src/less/, src/less-node/, and bin/)');
console.log('='.repeat(100));
console.log('For line-by-line coverage details, open coverage/index.html in your browser.');
console.log('='.repeat(100) + '\n');

Object.entries(grouped).forEach(([dir, files]) => {
    if (files.length === 0) return;
    
    console.log(`\n${dir.toUpperCase()}`);
    console.log('-'.repeat(100));
    console.log(
        'File'.padEnd(50) + 
        'Statements'.padStart(12) + 
        'Branches'.padStart(12) + 
        'Functions'.padStart(12) + 
        'Lines'.padStart(12)
    );
    console.log('-'.repeat(100));
    
    files.forEach(file => {
        const filename = file.path.replace(dir, '');
        const truncated = filename.length > 48 ? '...' + filename.slice(-45) : filename;
        
        console.log(
            truncated.padEnd(50) +
            `${file.statements.pct.toFixed(1)}%`.padStart(12) +
            `${file.branches.pct.toFixed(1)}%`.padStart(12) +
            `${file.functions.pct.toFixed(1)}%`.padStart(12) +
            `${file.lines.pct.toFixed(1)}%`.padStart(12)
        );
    });
    
    // Summary for this directory
    const totals = files.reduce((acc, file) => {
        acc.statements.total += file.statements.total;
        acc.statements.covered += file.statements.covered;
        acc.branches.total += file.branches.total;
        acc.branches.covered += file.branches.covered;
        acc.functions.total += file.functions.total;
        acc.functions.covered += file.functions.covered;
        acc.lines.total += file.lines.total;
        acc.lines.covered += file.lines.covered;
        return acc;
    }, {
        statements: { total: 0, covered: 0 },
        branches: { total: 0, covered: 0 },
        functions: { total: 0, covered: 0 },
        lines: { total: 0, covered: 0 }
    });
    
    const stmtPct = totals.statements.total > 0 
        ? (totals.statements.covered / totals.statements.total * 100).toFixed(1)
        : '0.0';
    const branchPct = totals.branches.total > 0
        ? (totals.branches.covered / totals.branches.total * 100).toFixed(1)
        : '0.0';
    const funcPct = totals.functions.total > 0
        ? (totals.functions.covered / totals.functions.total * 100).toFixed(1)
        : '0.0';
    const linePct = totals.lines.total > 0
        ? (totals.lines.covered / totals.lines.total * 100).toFixed(1)
        : '0.0';
    
    console.log('-'.repeat(100));
    console.log(
        'TOTAL'.padEnd(50) +
        `${stmtPct}%`.padStart(12) +
        `${branchPct}%`.padStart(12) +
        `${funcPct}%`.padStart(12) +
        `${linePct}%`.padStart(12)
    );
});

console.log('\n' + '='.repeat(100) + '\n');

