'use strict';

module.exports = function(grunt) {

  function log( stdout ) {
    console.log( 'Directory listing:\n' + stdout );
  }

  // Project configuration.
  grunt.initConfig({
    build: grunt.file.readYAML('build/build.yml'),
    pkg  : grunt.file.readJSON('package.json'),

    // Metadata
    license: '<%= _.pluck(pkg.licenses, "type").join(", ") %>',
    copyright: 'Copyright (c) 2009-<%= grunt.template.today("yyyy") %>',
    version: '1.4.1',
    meta: {
      banner:
        '/* \n' +
        ' * LESS - <%= pkg.description %> v<%= version %> \n' +
        ' * http://lesscss.org \n' +
        ' * \n' +
        ' * <%= copyright %>, <%= pkg.author %> \n' +
        ' * Licensed under the <%= license %> License. \n' +
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
      benchmark: {
        command: 'node benchmark/less-benchmark.js'
      },
      // Alpha release
      alpha_add: {
        command: 'git add dist/*.js'
      },
      alpha_commit: {
        command: 'git commit -m "Update alpha <%= version %>"'
      },
      add: {
        command: 'git add dist/*'
      },
      commit: {
        command: 'git commit -a -m "(dist) build <%= version %>"'
      },
      // Create .tar.gz archive
      archive: {
        command: 'git archive master --prefix=less/ -o ../archives/less-<%= version %>.tar.gz'
      },
      // npm
      npm: {
        command: 'npm publish less-<%= version %>.tar.gz'
      },
      npm_tag: {
        command: 'npm tag less@<%= version %> stable'
      }
    },

    concat: {
      options: {
        stripBanner: true,
        banner: '<%= meta.banner %>',
        separator: '\n\n'
      },
      // Browser tests
      browser: {
        src: ['<%= build.browser %>'],
        dest: 'test/browser/less.js'
      },
      // Rhino
      rhino: {
        src: ['<%= build.rhino %>'],
        dest: 'tmp/less-rhino-<%= version %>.js'
      },

      alpha: {
        src: ['<%= build.node %>'],
        dest: 'tmp/less-<%= version %>-alpha.js'
      },
      beta: {
        src: ['<%= build.node %>'],
        dest: 'tmp/less-<%= version %>-beta.js'
      }
    },

    uglify: {
      options: {
        banner: '/* LESS.js v<%= version %> RHINO | <%= copyright %>, <%= pkg.author.name %> */\n\n',
        mangle: true
      },
      browser: {
        src:  '<%= concat.browser.dest %>',
        dest: 'tmp/less-<%= version %>.min.js'
      },
      alpha: {
        src:  '<%= concat.alpha.dest %>',
        dest: 'tmp/less-<%= version %>-alpha.min.js'
      },
      beta: {
        src:  '<%= concat.beta.dest %>',
        dest: 'tmp/less-<%= version %>-beta.min.js'
      }
    },

    // Browser tests
    // I just threw some values in here as placeholders,
    // so I doubt any of it is correct.
    jasmine: {
      browser: {
        src: './test/browser-test-prepare.js',
        options: {
          // version: '1.2.0',
          template: './test/browser/template.htm',
          // specs: './test/browser/spec/*Spec.js',
          // helpers: './test/browser/spec/*Helper.js',
          // junit: {
          //   path: './test/browser/junit/customTemplate',
          //   consolidate: true
          // }
        }
      }
    },
    // This may or may not be useful, but it hasn't been
    // set up yet any
    nodeunit: {
      files: ['test/**/*_test.js'],
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
        src: ['test/*.js']
      }
    },

    watch: {
      benchmark: {
        files: '<%= jshint.benchmark.src %>',
        tasks: ['jshint:benchmark']
      },
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      lib: {
        files: '<%= jshint.lib.src %>',
        tasks: ['jshint:lib', 'nodeunit']
      },
      test: {
        files: '<%= jshint.test.src %>',
        tasks: ['jshint:test', 'nodeunit']
      }
    }
  });

  // Load the necessary plugins.
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  // Default task.
  grunt.registerTask('default', [
    'concat:browser',
    'uglify:browser'
  ]);

  // Alpha.
  grunt.registerTask('rhino', [
    'concat:rhino'
  ]);

  // Alpha.
  grunt.registerTask('alpha', [
    'concat:alpha',
    'uglify:alpha'
  ]);

  // Beta.
  grunt.registerTask('beta', [
    'concat:beta',
    'uglify:beta'
  ]);

  // Tests to be run.
  grunt.registerTask('test', [
    // 'jshint:lib',
    // 'nodeunit',
    // 'jasmine',
    'shell:test'
  ]);

  // Benchmarks.
  grunt.registerTask('bench', [
    'shell:benchmark'
  ]);
};
