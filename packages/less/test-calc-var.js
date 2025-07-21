const less = require('less');

// Test variable with division in calc
const input = `
@var: 50vh/2;
.test {
  width: calc(50% + (@var - 20px));
}`;

less.render(input, { math: 'always' }, (err, result) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('With math: always');
    console.log(result.css);
  }
});

// Also test with different math modes
less.render(input, { math: 'parens-division' }, (err, result) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('\nWith math: parens-division');
    console.log(result.css);
  }
});

// Test direct usage outside calc
const input2 = `
@var: 50vh/2;
.test {
  width: @var;
}`;

less.render(input2, { math: 'always' }, (err, result) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('\nDirect usage with math: always');
    console.log(result.css);
  }
});