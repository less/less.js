var path = require('path');
var resolve = require('resolve')
var { forceCovertToBrowserPath } = require('./utils');

/** Root of repo */
var testFolder = forceCovertToBrowserPath(path.dirname(resolve.sync('@less/test-data')));
var testsUnitFolder = forceCovertToBrowserPath(path.join(testFolder, 'tests-unit'));
var testsConfigFolder = forceCovertToBrowserPath(path.join(testFolder, 'tests-config'));
var localTests = forceCovertToBrowserPath(path.resolve(__dirname, '..'));

module.exports = {
    main: {
    // src is used to build list of less files to compile
        src: [
            `${testsUnitFolder}/*/*.less`,
            `!${testsUnitFolder}/plugin-preeval/plugin-preeval.less`, // uses ES6 syntax
            // Don't test NPM import, obviously
            `!${testsUnitFolder}/plugin-module/plugin-module.less`,
            `!${testsUnitFolder}/import/import-module.less`,
            `!${testsUnitFolder}/javascript/javascript.less`,
            `!${testsUnitFolder}/urls/urls.less`,
            `!${testsUnitFolder}/empty/empty.less`,
            `!${testsUnitFolder}/color-functions/operations.less`, // conflicts with operations/operations.less
            // Exclude debug line numbers tests - these are Node.js only (dumpLineNumbers is deprecated)
            `!${testsConfigFolder}/debug/**/*.less`
        ],
        options: {
            helpers: 'test/browser/runner-main-options.js',
            specs: 'test/browser/runner-main-spec.js',
            outfile: 'tmp/browser/test-runner-main.html'
        }
    },
    strictUnits: {
        src: [`${testsConfigFolder}/units/strict/*.less`],
        options: {
            helpers: 'test/browser/runner-strict-units-options.js',
            specs: 'test/browser/runner-strict-units-spec.js',
            outfile: 'tmp/browser/test-runner-strict-units.html'
        }
    },
    errors: {
        src: [
            `${testFolder}/tests-error/eval/*.less`,
            `${testFolder}/tests-error/parse/*.less`,
            `${localTests}/less/errors/*.less`
        ],
        options: {
            timeout: 20000,
            helpers: 'test/browser/runner-errors-options.js',
            specs: 'test/browser/runner-errors-spec.js',
            outfile: 'tmp/browser/test-runner-errors.html'
        }
    },
    noJsErrors: {
        src: [`${testsConfigFolder}/no-js-errors/*.less`],
        options: {
            helpers: 'test/browser/runner-no-js-errors-options.js',
            specs: 'test/browser/runner-no-js-errors-spec.js',
            outfile: 'tmp/browser/test-runner-no-js-errors.html'
        }
    },
    browser: {
        src: [
            `${localTests}/less/*.less`,
            `${localTests}/less/plugin/*.less`
        ],
        options: {
            helpers: 'test/browser/runner-browser-options.js',
            specs: 'test/browser/runner-browser-spec.js',
            outfile: 'tmp/browser/test-runner-browser.html'
        }
    },
    relativeUrls: {
        src: [`${localTests}/less/relative-urls/*.less`],
        options: {
            helpers: 'test/browser/runner-relative-urls-options.js',
            specs: 'test/browser/runner-relative-urls-spec.js',
            outfile: 'tmp/browser/test-runner-relative-urls.html'
        }
    },
    rewriteUrls: {
        src: [`${localTests}/less/rewrite-urls/*.less`],
        options: {
            helpers: 'test/browser/runner-rewrite-urls-options.js',
            specs: 'test/browser/runner-rewrite-urls-spec.js',
            outfile: 'tmp/browser/test-runner-rewrite-urls.html'
        }
    },
    rootpath: {
        src: [`${localTests}/less/rootpath/*.less`],
        options: {
            helpers: 'test/browser/runner-rootpath-options.js',
            specs: 'test/browser/runner-rootpath-spec.js',
            outfile: 'tmp/browser/test-runner-rootpath.html'
        }
    },
    rootpathRelative: {
        src: [`${localTests}/less/rootpath-relative/*.less`],
        options: {
            helpers: 'test/browser/runner-rootpath-relative-options.js',
            specs: 'test/browser/runner-rootpath-relative-spec.js',
            outfile: 'tmp/browser/test-runner-rootpath-relative.html'
        }
    },
    rootpathRewriteUrls: {
        src: [`${localTests}/less/rootpath-rewrite-urls/*.less`],
        options: {
            helpers:
            'test/browser/runner-rootpath-rewrite-urls-options.js',
            specs: 'test/browser/runner-rootpath-rewrite-urls-spec.js',
            outfile:
            'tmp/browser/test-runner-rootpath-rewrite-urls.html'
        }
    },
    production: {
        src: [`${localTests}/less/production/*.less`],
        options: {
            helpers: 'test/browser/runner-production-options.js',
            specs: 'test/browser/runner-production-spec.js',
            outfile: 'tmp/browser/test-runner-production.html'
        }
    },
    modifyVars: {
        src: [`${localTests}/less/modify-vars/*.less`],
        options: {
            helpers: 'test/browser/runner-modify-vars-options.js',
            specs: 'test/browser/runner-modify-vars-spec.js',
            outfile: 'tmp/browser/test-runner-modify-vars.html'
        }
    },
    globalVars: {
        src: [`${localTests}/less/global-vars/*.less`],
        options: {
            helpers: 'test/browser/runner-global-vars-options.js',
            specs: 'test/browser/runner-global-vars-spec.js',
            outfile: 'tmp/browser/test-runner-global-vars.html'
        }
    },
    postProcessorPlugin: {
        src: [`${testsConfigFolder}/postProcessorPlugin/*.less`],
        options: {
            helpers: [
                'test/plugins/postprocess/index.js',
                'test/browser/runner-postProcessorPlugin-options.js'
            ],
            specs: 'test/browser/runner-postProcessorPlugin.js',
            outfile:
            'tmp/browser/test-runner-post-processor-plugin.html'
        }
    },
    preProcessorPlugin: {
        src: [`${testsConfigFolder}/preProcessorPlugin/*.less`],
        options: {
            helpers: [
                'test/plugins/preprocess/index.js',
                'test/browser/runner-preProcessorPlugin-options.js'
            ],
            specs: 'test/browser/runner-preProcessorPlugin.js',
            outfile: 'tmp/browser/test-runner-pre-processor-plugin.html'
        }
    },
    visitorPlugin: {
        src: [`${testsConfigFolder}/visitorPlugin/*.less`],
        options: {
            helpers: [
                'test/plugins/visitor/index.js',
                'test/browser/runner-VisitorPlugin-options.js'
            ],
            specs: 'test/browser/runner-VisitorPlugin.js',
            outfile: 'tmp/browser/test-runner-visitor-plugin.html'
        }
    },
    filemanagerPlugin: {
        src: [`${testsConfigFolder}/filemanagerPlugin/*.less`],
        options: {
            helpers: [
                'test/plugins/filemanager/index.js',
                'test/browser/runner-filemanagerPlugin-options.js'
            ],
            specs: 'test/browser/runner-filemanagerPlugin.js',
            outfile: 'tmp/browser/test-runner-filemanager-plugin.html'
        }
    }
}
