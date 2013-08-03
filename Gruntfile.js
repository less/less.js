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
      browser: {
        command: 'node test/browser-test-prepare.js'
      },
      phantom: {
        command: 'phantomjs test/browser/phantom-runner.js'
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
	  // grunt-contrib-jasmine assumes that web-server runs in root directory
	  // it 's outfile is relativized against root
	  //base: 'test' 
        }
      }
    },

    jasmine: {
      options: {
        keepRunner: true, //TODO meri: remove after it is done
	host: 'http://localhost:8081/',
	helpers: 'test/browser/common.js',
	template: 'test/browser/test-runner-template.tmpl'
      },
      main: {
        //TODO meri: find better location for less.js - reference can go to template and compiled browser to dist
	//src is used to build list of less files to compile
        src: ['test/less/*.less', '!test/less/javascript.less', '!test/less/urls.less'], 
	options: {
          specs: 'test/browser/runner-main.js',
          outfile: 'test/browser/test-runner-main.html',
	  templateOptions: {
	    originalLess: '',
	    expectedCss: ''
	  }
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
  ]);

  // Run all tests
  grunt.registerTask('test', [
    'jshint:lib',
    'clean',
    'shell:test',
    'browserTest'
  //   'shell:browser',
  //   'shell:phantom'
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
