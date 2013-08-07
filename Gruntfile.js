'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    build: grunt.file.readYAML('build/build.yml'),
    pkg: grunt.file.readJSON('package.json'),

    // Metadata
    meta: {
      license: '<%= _.pluck(pkg.licenses, "type").join(", ") %>',
      copyright: 'Copyright (c) 2009-<%= grunt.template.today("yyyy") %>',
      banner:
        '/* \n' +
        ' * LESS - <%= pkg.description %> v<%= pkg.version %> \n' +
        ' * http://lesscss.org \n' +
        ' * \n' +
        ' * <%= meta.copyright %>, <%= pkg.author.name %> <<%= pkg.author.email %>> \n' +
        ' * Licensed under the <%= meta.license %> License. \n' +
        ' * \n' +
        ' * @licence \n' +
        ' */ \n\n'
    },

    shell: {
      options: {stdout: 'log'},
      test: {
        command: 'node test/less-test.js'
      },
      benchmark: {
        command: 'node benchmark/less-benchmark.js'
      }
    },

    concat: {
      options: {
        stripBanners: true,
        banner: '<%= meta.banner %>\n\n(function (window, undefined) {',
        footer: '\n})(window);'
      },
      // Browser versions
      browser: {
        src: ['<%= build.browser %>'],
        dest: 'test/browser/less.js'
      },
      alpha: {
        src: ['<%= build.browser %>'],
        dest: 'dist/less-<%= pkg.version %>-alpha.js'
      },
      beta: {
        src: ['<%= build.browser %>'],
        dest: 'dist/less-<%= pkg.version %>-beta.js'
      },
      // Rhino
      rhino: {
        options: {
          banner: '/* LESS.js v<%= pkg.version %> RHINO | <%= meta.copyright %>, <%= pkg.author.name %> <<%= pkg.author.email %>> */\n\n',
          footer: '' // override task-level footer
        },
        src: ['<%= build.rhino %>'],
        dest: 'dist/less-rhino-<%= pkg.version %>.js'
      },
      // Generate readme
      readme: {
        options: {
          process: true,
          banner: '' // override task-level banner
        },
        src: ['build/README.md'],
        dest: 'README.md'
      }
    },

    uglify: {
      options: {
        banner: '<%= meta.banner %>',
        mangle: true
      },
      browser: {
        src: ['<%= concat.browser.src %>'],
        dest: 'dist/less-<%= pkg.version %>.min.js'
      },
      alpha: {
        src: ['<%= concat.alpha.src %>'],
        dest: 'dist/less-<%= pkg.version %>-alpha.min.js'
      },
      beta: {
        src: ['<%= concat.beta.src %>'],
        dest: 'dist/less-<%= pkg.version %>-beta.min.js'
      }
    },

    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      benchmark: {
        src: ['benchmark/**/*.js']
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      lib: {
        src: ['lib/**/*.js']
      },
      test: {
        src: ['test/*.js', 'test/browser/runner-*.js']
      }
    },

    connect: {
      server: {
        options: {
          port: 8081
        }
      }
    },

    jasmine: {
      options: {
        keepRunner: true,
        host: 'http://localhost:8081/',
        vendor: 'test/browser/common.js',
        template: 'test/browser/test-runner-template.tmpl'
      },
      main: {
        //src is used to build list of less files to compile
        src: ['test/less/*.less', '!test/less/javascript.less', '!test/less/urls.less'], 
        options: {
          helpers: 'test/browser/runner-main-options.js',
          specs: 'test/browser/runner-main-spec.js',
          outfile: 'test/browser/test-runner-main.html'
        }
      },
      legacy: {
        src: ['test/less/legacy/*.less'], 
        options: {
          helpers: 'test/browser/runner-legacy-options.js',
          specs: 'test/browser/runner-legacy-spec.js',
          outfile: 'test/browser/test-runner-legacy.html'
        }
      },
      errors: {
        src: ['test/less/errors/*.less', '!test/less/errors/javascript-error.less'], 
        options: {
          timeout: 20000,
          helpers: 'test/browser/runner-errors-options.js',
          specs: 'test/browser/runner-errors-spec.js',
          outfile: 'test/browser/test-runner-errors.html'
        }
      },
      noJsErrors: { 
        src: ['test/less/no-js-errors/*.less'], 
        options: {
          helpers: 'test/browser/runner-no-js-errors-options.js',
          specs: 'test/browser/runner-no-js-errors-spec.js',
          outfile: 'test/browser/test-runner-no-js-errors.html'
        }
      },
      browser: {
        src: ['test/browser/less/*.less'], 
        options: {
          helpers: 'test/browser/runner-browser-options.js',
          specs: 'test/browser/runner-browser-spec.js',
          outfile: 'test/browser/test-runner-browser.html'
        }
      },
      relativeUrls: {
        src: ['test/browser/less/relative-urls/*.less'], 
        options: {
          helpers: 'test/browser/runner-relative-urls-options.js',
          specs: 'test/browser/runner-relative-urls-spec.js',
          outfile: 'test/browser/test-runner-relative-urls.html'
        }
      },
      rootpath: {
        src: ['test/browser/less/rootpath/*.less'], 
        options: {
          helpers: 'test/browser/runner-rootpath-options.js',
          specs: 'test/browser/runner-rootpath-spec.js',
          outfile: 'test/browser/test-runner-rootpath.html'
        }
      },
      rootpathRelative: {
        src: ['test/browser/less/rootpath-relative/*.less'], 
        options: {
          helpers: 'test/browser/runner-rootpath-relative-options.js',
          specs: 'test/browser/runner-rootpath-relative-spec.js',
          outfile: 'test/browser/test-runner-rootpath-relative.html'
        }
      },
      production: {
        src: ['test/browser/less/production/*.less'], 
        options: {
          helpers: 'test/browser/runner-production-options.js',
          specs: 'test/browser/runner-production-spec.js',
          outfile: 'test/browser/test-runner-production.html'
        }
      },
      modifyVars: {
        src: ['test/browser/less/modify-vars/*.less'], 
        options: {
          helpers: 'test/browser/runner-modify-vars-options.js',
          specs: 'test/browser/runner-modify-vars-spec.js',
          outfile: 'test/browser/test-runner-modify-vars.html'
        }
      }
    },

    // Before running tests, clean out the results
    // of any previous tests. (this will need to be
    // setup based on configuration of browser tests.
    clean: {
      test: ['test/browser/test-runner-*.htm']
    }
  });

  // Load these plugins to provide the necessary tasks
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  // Actually load this plugin's task(s).
  grunt.loadTasks('build/tasks');

  // Default task to build Less.js
  grunt.registerTask('default', [
    'browser',
    'rhino'
  ]);

  // Browser
  grunt.registerTask('browser', [
    'concat:browser',
    'uglify:browser'
  ]);

  // Rhino
  grunt.registerTask('rhino', [
    'concat:rhino'
    // 'uglify:rhino'
  ]);
  // Minify
  grunt.registerTask('min', [
    'uglify'
  ]);

  // Alpha
  grunt.registerTask('alpha', [
    'concat:alpha',
    'uglify:alpha'
  ]);
  // Beta
  grunt.registerTask('beta', [
    'concat:beta',
    'uglify:beta'
  ]);

    // Run all tests
  grunt.registerTask('browserTest', [
    'connect:server',
    'jasmine'
  ]);

  // Run all tests
  grunt.registerTask('test', [
    'jshint:lib',
    'clean',
    'shell:test',
    'browserTest'
  ]);

  // Run benchmark
  grunt.registerTask('benchmark', [
    'shell:benchmark'
  ]);

  // Readme.
  grunt.registerTask('readme', [
    'concat:readme'
  ]);
};
