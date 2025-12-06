#!/usr/bin/env node

/**
 * Generates a line-by-line coverage report showing uncovered lines
 * Reads from LCOV format and displays in terminal
 * Also outputs JSON file with uncovered lines for programmatic access
 */

const fs = require('fs');
const path = require('path');

const lcovPath = path.join(__dirname, '..', 'coverage', 'lcov.info');
const jsonOutputPath = path.join(__dirname, '..', 'coverage', 'uncovered-lines.json');

if (!fs.existsSync(lcovPath)) {
    console.error('LCOV coverage file not found. Run pnpm test:coverage first.');
    process.exit(1);
}

const lcovContent = fs.readFileSync(lcovPath, 'utf8');

// Parse LCOV format
const files = [];
let currentFile = null;

const lines = lcovContent.split('\n');
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // SF: source file
    if (line.startsWith('SF:')) {
        if (currentFile) {
            files.push(currentFile);
        }
        const filePath = line.substring(3);
        // Only include src/ files (not less-browser) and bin/
        // Exclude abstract base classes (they're meant to be overridden)
        const normalized = filePath.replace(/\\/g, '/');
        const abstractClasses = ['abstract-file-manager', 'abstract-plugin-loader'];
        const isAbstract = abstractClasses.some(abstract => normalized.includes(abstract));
        
        if (!isAbstract && 
            ((normalized.includes('src/less/') && !normalized.includes('src/less-browser/')) ||
             normalized.includes('src/less-node/') ||
             normalized.includes('bin/'))) {
            // Extract relative path - match src/less/... or src/less-node/... or bin/...
            // Path format: src/less/tree/debug-info.js or src/less-node/file-manager.js
            // Match from src/ or bin/ to end of path
            const match = normalized.match(/(src\/[^/]+\/.+|bin\/.+)$/);
            const relativePath = match ? match[1] : (normalized.includes('/src/') || normalized.includes('/bin/') ? normalized.split('/').slice(-3).join('/') : path.basename(filePath));
            currentFile = {
                path: relativePath,
                fullPath: filePath,
                uncoveredLines: [],
                uncoveredLineCode: {}, // line number -> source code
                totalLines: 0,
                coveredLines: 0
            };
        } else {
            currentFile = null;
        }
    }
    
    // DA: line data (line number, execution count)
    if (currentFile && line.startsWith('DA:')) {
        const match = line.match(/^DA:(\d+),(\d+)$/);
        if (match) {
            const lineNum = parseInt(match[1], 10);
            const count = parseInt(match[2], 10);
            currentFile.totalLines++;
            if (count > 0) {
                currentFile.coveredLines++;
            } else {
                currentFile.uncoveredLines.push(lineNum);
            }
        }
    }
}

if (currentFile) {
    files.push(currentFile);
}

// Read source code for uncovered lines
files.forEach(file => {
    if (file.uncoveredLines.length > 0 && fs.existsSync(file.fullPath)) {
        try {
            const sourceCode = fs.readFileSync(file.fullPath, 'utf8');
            const sourceLines = sourceCode.split('\n');
            file.uncoveredLines.forEach(lineNum => {
                // LCOV uses 1-based line numbers
                if (lineNum > 0 && lineNum <= sourceLines.length) {
                    file.uncoveredLineCode[lineNum] = sourceLines[lineNum - 1].trim();
                }
            });
        } catch (err) {
            // If we can't read the source (e.g., it's in lib/ but we want src/), that's ok
            // We'll just skip the source code
        }
    }
});

// Filter to only files with uncovered lines and sort by coverage
const filesWithGaps = files
    .filter(f => f.uncoveredLines.length > 0)
    .sort((a, b) => {
        const aPct = a.totalLines > 0 ? a.coveredLines / a.totalLines : 1;
        const bPct = b.totalLines > 0 ? b.coveredLines / b.totalLines : 1;
        return aPct - bPct;
    });

if (filesWithGaps.length === 0) {
    if (files.length === 0) {
        console.log('\n⚠️  No source files found in coverage data. This may indicate an issue with the coverage report.\n');
    } else {
        console.log('\n✅ All analyzed files have 100% line coverage!\n');
        console.log(`(Analyzed ${files.length} files from src/less/, src/less-node/, and bin/)\n`);
    }
    process.exit(0);
}

console.log('\n' + '='.repeat(100));
console.log('Uncovered Lines Report');
console.log('='.repeat(100) + '\n');

filesWithGaps.forEach(file => {
    const coveragePct = file.totalLines > 0 
        ? ((file.coveredLines / file.totalLines) * 100).toFixed(1)
        : '0.0';
    
    console.log(`\n${file.path} (${coveragePct}% coverage)`);
    console.log('-'.repeat(100));
    
    // Group consecutive lines into ranges
    const ranges = [];
    let start = file.uncoveredLines[0];
    let end = file.uncoveredLines[0];
    
    for (let i = 1; i < file.uncoveredLines.length; i++) {
        if (file.uncoveredLines[i] === end + 1) {
            end = file.uncoveredLines[i];
        } else {
            ranges.push(start === end ? `${start}` : `${start}..${end}`);
            start = file.uncoveredLines[i];
            end = file.uncoveredLines[i];
        }
    }
    ranges.push(start === end ? `${start}` : `${start}..${end}`);
    
    // Display ranges (max 5 per line for readability)
    const linesPerRow = 5;
    for (let i = 0; i < ranges.length; i += linesPerRow) {
        const row = ranges.slice(i, i + linesPerRow);
        console.log(`  Lines: ${row.join(', ')}`);
    }
    
    console.log(`  Total uncovered: ${file.uncoveredLines.length} of ${file.totalLines} lines`);
});

console.log('\n' + '='.repeat(100) + '\n');

// Write JSON output for programmatic access
const jsonOutput = {
    generated: new Date().toISOString(),
    files: filesWithGaps.map(file => ({
        path: file.path,
        fullPath: file.fullPath,
        sourcePath: (() => {
            // Try to map lib/ path to src/ path
            const normalized = file.fullPath.replace(/\\/g, '/');
            if (normalized.includes('/lib/')) {
                return normalized.replace('/lib/', '/src/').replace(/\.js$/, '.ts');
            }
            return file.fullPath;
        })(),
        coveragePercent: file.totalLines > 0 
            ? parseFloat(((file.coveredLines / file.totalLines) * 100).toFixed(1))
            : 0,
        totalLines: file.totalLines,
        coveredLines: file.coveredLines,
        uncoveredLines: file.uncoveredLines,
        uncoveredLineCode: file.uncoveredLineCode || {},
        uncoveredRanges: (() => {
            const ranges = [];
            if (file.uncoveredLines.length === 0) return ranges;
            
            let start = file.uncoveredLines[0];
            let end = file.uncoveredLines[0];
            
            for (let i = 1; i < file.uncoveredLines.length; i++) {
                if (file.uncoveredLines[i] === end + 1) {
                    end = file.uncoveredLines[i];
                } else {
                    ranges.push({ start, end });
                    start = file.uncoveredLines[i];
                    end = file.uncoveredLines[i];
                }
            }
            ranges.push({ start, end });
            return ranges;
        })()
    }))
};

fs.writeFileSync(jsonOutputPath, JSON.stringify(jsonOutput, null, 2), 'utf8');
console.log('\n📄 Uncovered lines data written to: coverage/uncovered-lines.json\n');

