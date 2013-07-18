'use strict';

module.exports = function(grunt) {

  function log( stdout ) {
    console.log( 'Directory listing:\n' + stdout );
  }

  // Project configuration.
  grunt.initConfig({
    build: grunt.file.readYAML('build/build.yml'),
    pkg: grunt.file.readJSON('package.json'),

    // Metadata
    meta: {
      version: '1.4.1',
      license: '<%= _.pluck(pkg.licenses, "type").join(", ") %>',
      copyright: 'Copyright (c) 2009-<%= grunt.template.today("yyyy") %>',
      banner:
        '/* \n' +
        ' * LESS - <%= pkg.description %> v<%= meta.version %> \n' +
        ' * http://lesscss.org \n' +
        ' * \n' +
        ' * <%= meta.copyright %>, <%= pkg.author %> \n' +
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
      },
      // Alpha release
      alpha_add: {
        command: 'git add dist/*.js'
      },
      alpha_commit: {
        command: 'git commit -m "Update alpha <%= meta.version %>"'
      },
      add: {
        command: 'git add dist/*'
      },
      commit: {
        command: 'git commit -a -m "(dist) build <%= meta.version %>"'
      },
      // Create .tar.gz archive
      archive: {
        command: 'git archive master --prefix=less/ -o ../archives/less-<%= meta.version %>.tar.gz'
      },
      // npm
      npm: {
        command: 'npm publish less-<%= meta.version %>.tar.gz'
      },
      npm_tag: {
        command: 'npm tag less@<%= meta.version %> stable'
      }
    },

    concat: {
      options: {
        stripBanner: true,
        banner: '<%= meta.banner %>',
        separator: '\n\n'
      },
      // Browser tests
      readme: {
        options: { process: true, banner: '' },
        src: ['build/README.md'],
        dest: 'README.md'
      },
      // Browser tests
      browser: {
        src: ['<%= build.browser %>'],
        dest: 'test/browser/less.js'
      },
      // Rhino
      rhino: {
        src: ['<%= build.rhino %>'],
        dest: 'tmp/less-rhino-<%= meta.version %>.js'
      },
      alpha: {
        src: ['<%= build.browser %>'],
        dest: 'tmp/less-<%= meta.version %>-alpha.js'
      },
      beta: {
        src: ['<%= build.browser %>'],
        dest: 'tmp/less-<%= meta.version %>-beta.js'
      }
    },

    // Must run "concat" first
    uglify: {
      options: {
        banner: '/* LESS.js v<%= meta.version %> RHINO | <%= copyright %>, <%= pkg.author.name %> */\n\n',
        mangle: true
      },
      browser: {
        src:  '<%= concat.browser.dest %>',
        dest: 'tmp/less-<%= meta.version %>.min.js'
      },
      alpha: {
        src:  '<%= concat.alpha.dest %>',
        dest: 'tmp/less-<%= meta.version %>-alpha.min.js'
      },
      beta: {
        src:  '<%= concat.beta.dest %>',
        dest: 'tmp/less-<%= meta.version %>-beta.min.js'
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
        src: ['test/*.js', 'test/browser/runner-*.js']
      }
    },

    // Before running tests, clean out the results
    // of any previous tests. (this will need to be
    // setup based on configuration of browser tests.
    clean: {
      test: ['test/browser/test-runner-*.htm']
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

  // Load these plugins to provide the necessary tasks
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);


  // Default task to build Less.js
  grunt.registerTask('default', [
    'concat:browser',
    'uglify:browser'
  ]);
  // Rhino
  grunt.registerTask('rhino', [
    'concat:rhino'
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

  // All tests
  grunt.registerTask('test', [
    'jshint:lib',
    'nodeunit',
    // 'jasmine',
    'clean',
    'shell:test',
    // 'shell:browser'
  ]);
  // Browser tests
  // grunt.registerTask('browser', [
  //   'clean',
  //   'shell:browser',
  //   'shell:phantom'
  // ]);

  // Benchmarks
  grunt.registerTask('bench', [
    'shell:benchmark'
  ]);

  // Readme.
  grunt.registerTask('readme', [
    'concat:readme'
  ]);


};
