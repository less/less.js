// Simple test runner for verifying line comment fix
// This can be run directly without building the project

const fs = require('fs');
const path = require('path');

console.log('=== Line Comment Fix Verification ===\n');

// Test 1: Create a simple Less file with line comments
const testLessContent = `
// This is a top-level comment
.test {
  color: red; // inline comment
  // Another comment
  background: blue;
}

/* Block comment - should remain */
.block {
  width: 100%; // trailing comment
}

// Test with custom properties
.custom {
  --color: red; // comment after custom prop
  --size: 10px;
}
`;

const testFilePath = path.join(__dirname, 'test-line-comments.less');
const outputFilePath = path.join(__dirname, 'test-line-comments.css');

// Write test file
fs.writeFileSync(testFilePath, testLessContent, 'utf8');
console.log('✓ Created test file:', testFilePath);

// Try to compile with lessc
const { execSync } = require('child_process');

try {
  // Try using the local lessc
  const lesscPath = path.join(__dirname, 'packages', 'less', 'bin', 'lessc');
  
  console.log('\n📝 Attempting to compile with lessc...');
  console.log('Command:', `node "${lesscPath}" "${testFilePath}" "${outputFilePath}"`);
  
  execSync(`node "${lesscPath}" "${testFilePath}" "${outputFilePath}"`, {
    stdio: 'pipe',
    encoding: 'utf8'
  });
  
  console.log('✓ Compilation successful!');
  
  // Read and display output
  const output = fs.readFileSync(outputFilePath, 'utf8');
  console.log('\n=== Generated CSS ===');
  console.log(output);
  
  // Check for line comments in output
  const hasLineComments = output.includes('//');
  
  console.log('\n=== Verification Results ===');
  if (hasLineComments) {
    console.log('❌ FAILED: Line comments found in output!');
    console.log('The fix may not be working correctly.');
    process.exit(1);
  } else {
    console.log('✅ PASSED: No line comments in output!');
    console.log('The fix is working correctly.');
  }
  
  // Check that block comments remain
  const hasBlockComments = output.includes('/*');
  if (hasBlockComments) {
    console.log('✅ PASSED: Block comments preserved as expected.');
  } else {
    console.log('⚠️  WARNING: Block comments were removed (may be intentional based on settings).');
  }
  
  // Cleanup
  console.log('\n🧹 Cleaning up test files...');
  fs.unlinkSync(testFilePath);
  fs.unlinkSync(outputFilePath);
  console.log('✓ Cleanup complete');
  
} catch (error) {
  console.error('\n❌ Error during compilation:');
  console.error(error.message);
  console.log('\n⚠️  Note: You may need to build the project first:');
  console.log('  cd packages/less');
  console.log('  npm install');
  console.log('  npm run build');
  
  // Cleanup test file
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
  }
  
  process.exit(1);
}
