// setup Jasmine
const Jasmine = require('jasmine');
const J = new Jasmine();
J.loadConfig({
    spec_dir: 'test',
    spec_files: ['**/*.ts'],
    // helpers: ['helpers/**/*.js'],
    random: false,
    seed: null,
    stopSpecOnExpectationFailure: true
});
J.jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;
 
// setup console reporter
const JasmineConsoleReporter = require('jasmine-console-reporter');
const reporter = new JasmineConsoleReporter({
    colors: 1,           // (0|false)|(1|true)|2
    cleanStack: 1,       // (0|false)|(1|true)|2|3
    verbosity: 4,        // (0|false)|1|2|(3|true)|4|Object
    listStyle: 'indent', // "flat"|"indent"
    timeUnit: 'ms',      // "ms"|"ns"|"s"
    timeThreshold: { ok: 500, warn: 1000, ouch: 3000 }, // Object|Number
    activity: true,
    emoji: true         // boolean or emoji-map object
});
 
// initialize and execute
J.env.clearReporters();
J.addReporter(reporter);
J.execute();