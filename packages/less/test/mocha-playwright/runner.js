'use strict';

const path = require('path');
const util = require('util');
const { chromium } = require('playwright');
const TIMEOUT_MILLISECONDS = 60000;

function initMocha(reporter) {

    console.log = (console => {
        const log = console.log.bind(console);
        return (...args) => args.length ? log(...args) : log('');
    })(console);

    function shimMochaInstance(m) {

        const originalReporter = m.reporter.bind(m);
        let reporterIsChanged = false;

        m.reporter = (...args) => {
            reporterIsChanged = true;
            originalReporter(...args);
        };

        const run = m.run.bind(m);

        m.run = () => {
            const all = [], pending = [], failures = [], passes = [];

            function error(err) {
                if (!err) return {};

                let res = {};
                Object.getOwnPropertyNames(err).forEach(key => res[key] = err[key]);
                return res;
            }

            function clean(test) {
                return {
                    title: test.title,
                    fullTitle: test.fullTitle(),
                    duration: test.duration,
                    err: error(test.err)
                };
            }

            function result(stats) {
                return {
                    result: {
                        stats: {
                            tests: all.length,
                            passes: passes.length,
                            pending: pending.length,
                            failures: failures.length,
                            start: stats.start.toISOString(),
                            end: stats.end.toISOString(),
                            duration: stats.duration
                        },
                        tests: all.map(clean),
                        pending: pending.map(clean),
                        failures: failures.map(clean),
                        passes: passes.map(clean)
                    },
                    coverage: window.__coverage__
                };
            }

            function setResult() {
                !window.__mochaResult__ && (window.__mochaResult__ = result(this.stats));
            }

            !reporterIsChanged && m.setup({ 
                reporter: Mocha.reporters[reporter] || Mocha.reporters.spec 
            });

            const runner = run(() => setTimeout(() => setResult.call(runner), 0))
                .on('pass', test => { passes.push(test); all.push(test); })
                .on('fail', test => { failures.push(test); all.push(test); })
                .on('pending', test => { pending.push(test); all.push(test); })
                .on('end', setResult);

            return runner;
        };
    }

    function shimMochaProcess(M) {
        // Mocha needs a process.stdout.write in order to change the cursor position.
        !M.process && (M.process = {});
        !M.process.stdout && (M.process.stdout = {});

        M.process.stdout.write = data => console.log('stdout:', data);
        M.reporters.Base.useColors = true;
        M.reporters.none = function None(runner) {
            M.reporters.Base.call(this, runner);
        };
    }

    Object.defineProperty(window, 'mocha', {
        get: function() { return undefined },
        set: function(m) {
            shimMochaInstance(m);
            delete window.mocha;
            window.mocha = m
        },
        configurable: true
    })

    Object.defineProperty(window, 'Mocha', {
        get: function() { return undefined },
        set: function(m) {
            shimMochaProcess(m);
            delete window.Mocha;
            window.Mocha = m;
        },
        configurable: true
    });
}

function configureViewport(width, height, page) {
    if (!width && !height) return page;

    let viewport = page.viewport();
    width && (viewport.width = width);
    height && (viewport.height = height);

    return page.setViewport(viewport).then(() => page);
}

function handleConsole(msg) {
    const args = msg.args() || [];

    Promise.all(args.map(a => a.jsonValue().catch(error => {
        console.warn('Failed to retrieve JSON value from argument:', error);
        return '';
    })))
        .then(args => {
            // process stdout stub
            let isStdout = args[0] === 'stdout:';
            isStdout && (args = args.slice(1));

            let msg = util.format(...args);
            !isStdout && msg && (msg += '\n');
            process.stdout.write(msg);
        });
}

function prepareUrl(filePath) {
    if (/^[a-zA-Z]+:\/\//.test(filePath)) {
        // path is URL
        return filePath;
    }

    // local path
    let resolvedPath = path.resolve(filePath);
    return `file://${resolvedPath}`;
}

exports.runner = function ({ file, reporter, timeout, width, height, args, executablePath, visible, polling }) {
    return new Promise(resolve => {

        // validate options
        if (!file) {
            throw new Error('Test page path is required.');
        }

        args = [].concat(args || []).map(arg => '--' + arg);
        !timeout && (timeout = TIMEOUT_MILLISECONDS);
        /^\d+$/.test(polling) && (polling = parseInt(polling));

        const url = prepareUrl(file);

        const options = {
            ignoreHTTPSErrors: true,
            headless: !visible,
            executablePath,
            args
        };

        const result = chromium.launch(options)
            .then(browser => browser.newContext()
                .then(context => context.newPage()
                    .then(page => {
                        if (width || height) {
                            return page.setViewportSize({ width: width || 800, height: height || 600 }).then(() => page);
                        }
                        return page;
                    })
                    .then(page => {
                        page.on('console', handleConsole);
                        page.on('dialog', dialog => dialog.dismiss());
                        page.on('pageerror', err => console.error(err));

                        return page.addInitScript(initMocha, reporter)
                            .then(() => page.goto(url))
                            .then(() => page.waitForFunction(() => window.__mochaResult__, { timeout, polling }))
                            .then(() => page.evaluate(() => window.__mochaResult__))
                            .then(result => {
                                if (!result) {
                                    throw new Error('Mocha results not found after waiting. The tests may not have run correctly.');
                                }
                                // Close browser before resolving result
                                return browser.close().then(() => result);
                            });
                    })
                )
            );

        resolve(result);
    });
};
