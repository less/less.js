"use strict";

var resolve = require('resolve');
var path = require('path');

var testFolder = path.relative(process.cwd(), path.dirname(resolve.sync('@less/test-data')));
var lessFolder = path.join(testFolder, 'less');

module.exports = function(grunt) {
    grunt.option("stack", true);

    // Report the elapsed execution time of tasks.
    require("time-grunt")(grunt);

    var git = require("git-rev");

    // Sauce Labs browser
    var browsers = [
        // Desktop browsers
        {
            browserName: "chrome",
            version: "latest",
            platform: "Windows 7"
        },
        {
            browserName: "firefox",
            version: "latest",
            platform: "Linux"
        },
        {
            browserName: "safari",
            version: "9",
            platform: "OS X 10.11"
        },
        {
            browserName: "internet explorer",
            version: "8",
            platform: "Windows XP"
        },
        {
            browserName: "internet explorer",
            version: "11",
            platform: "Windows 8.1"
        },
        {
            browserName: "edge",
            version: "13",
            platform: "Windows 10"
        },
        // Mobile browsers
        {
            browserName: "ipad",
            deviceName: "iPad Air Simulator",
            deviceOrientation: "portrait",
            version: "8.4",
            platform: "OS X 10.9"
        },
        {
            browserName: "iphone",
            deviceName: "iPhone 5 Simulator",
            deviceOrientation: "portrait",
            version: "9.3",
            platform: "OS X 10.11"
        },
        {
            browserName: "android",
            deviceName: "Google Nexus 7 HD Emulator",
            deviceOrientation: "portrait",
            version: "4.4",
            platform: "Linux"
        }
    ];

    var sauceJobs = {};

    var browserTests = [
        "filemanager-plugin",
        "visitor-plugin",
        "global-vars",
        "modify-vars",
        "production",
        "rootpath-relative",
        "rootpath-rewrite-urls",
        "rootpath",
        "relative-urls",
        "rewrite-urls",
        "browser",
        "no-js-errors",
        "legacy"
    ];

    function makeJob(testName) {
        sauceJobs[testName] = {
            options: {
                urls:
                    testName === "all"
                        ? browserTests.map(function(name) {
                            return (
                                "http://localhost:8081/tmp/browser/test-runner-" +
                                  name +
                                  ".html"
                            );
                        })
                        : [
                            "http://localhost:8081/tmp/browser/test-runner-" +
                                  testName +
                                  ".html"
                        ],
                testname:
                    testName === "all" ? "Unit Tests for Less.js" : testName,
                browsers: browsers,
                public: "public",
                recordVideo: false,
                videoUploadOnPass: false,
                recordScreenshots: process.env.TRAVIS_BRANCH !== "master",
                build:
                    process.env.TRAVIS_BRANCH === "master"
                        ? process.env.TRAVIS_JOB_ID
                        : undefined,
                tags: [
                    process.env.TRAVIS_BUILD_NUMBER,
                    process.env.TRAVIS_PULL_REQUEST,
                    process.env.TRAVIS_BRANCH
                ],
                statusCheckAttempts: -1,
                sauceConfig: {
                    "idle-timeout": 100
                },
                throttled: 5,
                onTestComplete: function(result, callback) {
                    // Called after a unit test is done, per page, per browser
                    // 'result' param is the object returned by the test framework's reporter
                    // 'callback' is a Node.js style callback function. You must invoke it after you
                    // finish your work.
                    // Pass a non-null value as the callback's first parameter if you want to throw an
                    // exception. If your function is synchronous you can also throw exceptions
                    // directly.
                    // Passing true or false as the callback's second parameter passes or fails the
                    // test. Passing undefined does not alter the test result. Please note that this
                    // only affects the grunt task's result. You have to explicitly update the Sauce
                    // Labs job's status via its REST API, if you want so.

                    // This should be the encrypted value in Travis
                    var user = process.env.SAUCE_USERNAME;
                    var pass = process.env.SAUCE_ACCESS_KEY;

                    git.short(function(hash) {
                        require("phin")(
                            {
                                method: "PUT",
                                url: [
                                    "https://saucelabs.com/rest/v1",
                                    user,
                                    "jobs",
                                    result.job_id
                                ].join("/"),
                                auth: { user: user, pass: pass },
                                data: {
                                    passed: result.passed,
                                    build: "build-" + hash
                                }
                            },
                            function(error, response) {
                                if (error) {
                                    console.log(error);
                                    callback(error);
                                } else if (response.statusCode !== 200) {
                                    console.log(response);
                                    callback(
                                        new Error("Unexpected response status")
                                    );
                                } else {
                                    callback(null, result.passed);
                                }
                            }
                        );
                    });
                }
            }
        };
    }

    // Make the SauceLabs jobs
    ["all"].concat(browserTests).map(makeJob);

    // Project configuration.
    grunt.initConfig({
        shell: {
            options: {
                stdout: true,
                failOnError: true,
                execOptions: {
                    maxBuffer: Infinity
                }
            },
            build: {
                command: [
                    /** Browser runtime */
                    "node build/rollup.js --dist",
                    /** Copy to repo root */
                    "npm run copy:root",
                    /** Node.js runtime */
                    "npm run build"
                ].join(" && ")
            },
            testbuild: {
                command: [
                    "npm run build",
                    "node build/rollup.js --browser --out=./tmp/browser/less.min.js"
                ].join(" && ")
            },
            testcjs: {
                command: "npm run build"
            },
            testbrowser: {
                command: "node build/rollup.js --browser --out=./tmp/browser/less.min.js"
            },
            test: {
                command: 'ts-node test/test-es6.ts && node test/index.js'
            },
            generatebrowser: {
                command: 'node test/browser/generator/generate.js'
            },
            runbrowser: {
                command: 'node test/browser/generator/runner.js'
            },
            benchmark: {
                command: "node benchmark/index.js"
            },
            opts: {
                // test running with all current options (using `opts` since `options` means something already)
                command: [
                    // @TODO: make this more thorough
                    // CURRENT OPTIONS
                    `node bin/lessc --ie-compat ${lessFolder}/_main/lazy-eval.less tmp/lazy-eval.css`,
                    // --math
                    `node bin/lessc --math=always ${lessFolder}/_main/lazy-eval.less tmp/lazy-eval.css`,
                    `node bin/lessc --math=parens-division ${lessFolder}/_main/lazy-eval.less tmp/lazy-eval.css`,
                    `node bin/lessc --math=parens ${lessFolder}/_main/lazy-eval.less tmp/lazy-eval.css`,
                    `node bin/lessc --math=strict ${lessFolder}/_main/lazy-eval.less tmp/lazy-eval.css`,
                    `node bin/lessc --math=strict-legacy ${lessFolder}/_main/lazy-eval.less tmp/lazy-eval.css`,

                    // DEPRECATED OPTIONS
                    // --strict-math
                    `node bin/lessc --strict-math=on ${lessFolder}/_main/lazy-eval.less tmp/lazy-eval.css`
                ].join(" && ")
            },
            plugin: {
                command: [
                    `node bin/lessc --clean-css="--s1 --advanced" ${lessFolder}/_main/lazy-eval.less tmp/lazy-eval.css`,
                    "cd lib",
                    `node ../bin/lessc --clean-css="--s1 --advanced" ../${lessFolder}/_main/lazy-eval.less ../tmp/lazy-eval.css`,
                    `node ../bin/lessc --source-map=lazy-eval.css.map --autoprefix ../${lessFolder}/_main/lazy-eval.less ../tmp/lazy-eval.css`,
                    "cd ..",
                    // Test multiple plugins
                    `node bin/lessc --plugin=clean-css="--s1 --advanced" --plugin=autoprefix="ie 11,Edge >= 13,Chrome >= 47,Firefox >= 45,iOS >= 9.2,Safari >= 9" ${lessFolder}/_main/lazy-eval.less tmp/lazy-eval.css`
                ].join(" && ")
            },
            "sourcemap-test": {
                // quoted value doesn't seem to get picked up by time-grunt, or isn't output, at least; maybe just "sourcemap" is fine?
                command: [
                    `node bin/lessc --source-map=test/sourcemaps/maps/import-map.map ${lessFolder}/_main/import.less test/sourcemaps/import.css`,
                    `node bin/lessc --source-map ${lessFolder}/sourcemaps/basic.less test/sourcemaps/basic.css`
                ].join(" && ")
            }
        },

        eslint: {
            target: [
                "test/**/*.js",
                "src/less*/**/*.js",
                "!test/less/errors/plugin/plugin-error.js"
            ],
            options: {
                configFile: ".eslintrc.js",
                fix: true
            }
        },

        connect: {
            server: {
                options: {
                    port: 8081,
                    base: '../..'
                }
            }
        },

        "saucelabs-mocha": sauceJobs,

        // Clean the version of less built for the tests
        clean: {
            test: ["test/browser/less.js", "tmp", "test/less-bom"],
            "sourcemap-test": [
                "test/sourcemaps/*.css",
                "test/sourcemaps/*.map"
            ],
            sauce_log: ["sc_*.log"]
        }
    });

    // Load these plugins to provide the necessary tasks
    grunt.loadNpmTasks("grunt-saucelabs");

    require("jit-grunt")(grunt);

    // by default, run tests
    grunt.registerTask("default", ["test"]);

    // Release
    grunt.registerTask("dist", [
        "shell:build"
    ]);

    // Create the browser version of less.js
    grunt.registerTask("browsertest-lessjs", [
        "shell:testbrowser"
    ]);

    // Run all browser tests
    grunt.registerTask("browsertest", [
        "browsertest-lessjs",
        "connect",
        "shell:runbrowser"
    ]);

    // setup a web server to run the browser tests in a browser rather than phantom
    grunt.registerTask("browsertest-server", [
        "browsertest-lessjs",
        "shell:generatebrowser",
        "connect::keepalive"
    ]);

    var previous_force_state = grunt.option("force");

    grunt.registerTask("force", function(set) {
        if (set === "on") {
            grunt.option("force", true);
        } else if (set === "off") {
            grunt.option("force", false);
        } else if (set === "restore") {
            grunt.option("force", previous_force_state);
        }
    });

    grunt.registerTask("sauce", [
        "browsertest-lessjs",
        "shell:generatebrowser",
        "connect",
        "sauce-after-setup"
    ]);

    grunt.registerTask("sauce-after-setup", [
        "saucelabs-mocha:all",
        "clean:sauce_log"
    ]);

    var testTasks = [
        "clean",
        "eslint",
        "shell:testbuild",
        "shell:test",
        "shell:opts",
        "shell:plugin",
        "connect",
        "shell:runbrowser"
    ];

    if (
        isNaN(Number(process.env.TRAVIS_PULL_REQUEST, 10)) &&
        (process.env.TRAVIS_BRANCH === "master")
    ) {
        testTasks.push("force:on");
        testTasks.push("sauce-after-setup");
        testTasks.push("force:off");
    }

    // Run all tests
    grunt.registerTask("test", testTasks);

    // Run shell option tests (includes deprecated options)
    grunt.registerTask("shell-options", ["shell:opts"]);

    // Run shell plugin test
    grunt.registerTask("shell-plugin", ["shell:plugin"]);

    // Quickly build and run Node tests
    grunt.registerTask("quicktest", [
        "shell:testcjs",
        "shell:test"
    ]);

    // generate a good test environment for testing sourcemaps
    grunt.registerTask("sourcemap-test", [
        "clean:sourcemap-test",
        "shell:build:lessc",
        "shell:sourcemap-test",
        "connect::keepalive"
    ]);

    // Run benchmark
    grunt.registerTask("benchmark", [
        "shell:testcjs",
        "shell:benchmark"
    ]);
};
