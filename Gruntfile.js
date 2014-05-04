module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        src: 'src/<%= pkg.name %>.js',
        dest: 'build/<%= pkg.name %>.min.js'
      }
    },
    ngconstant: {
      options: {
        space: '  '
      },

      // targets
      dist: {
        dest: 'js/config.js',
        wrap: '"use strict";\n\n <%= __ngModule %>',
        name: 'config',
        constants: {
          BASE_URL: "https://www.piiko.com"
        }
      }
    },
    prompt: {
      ngconstant: {
        options: {
          questions: [
            {
              config: 'ngconstant.dist.constants.API_KEY',
              type: 'input',
              message: 'Enter API key (email lets@spend-a-bit.com to request one)',
              validate: function(value) {
                if (value.length == 32) return true;
                else return "Entered value doesn't look like our API key"
              }
            }
          ]
        }
      }
    },
    forever: {
      options: {
        index: 'app.js',
        logDir: 'logs'
      }
    },
    compress: {
      main: {
        options: {
          archive: 'mobile-recharge.hiveapp',
          mode: 'zip',
          pretty: true
        },
        files: [
          {src: ['css/**', 'fonts/**', 'img/**', 'js/controllers.js', 'js/config.js',
            'lib/**', 'icon.png', 'index.html', 'manifest.json']}
        ]
      }
    }

  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-ng-constant');
  grunt.loadNpmTasks('grunt-prompt');
  grunt.loadNpmTasks('grunt-forever');
  grunt.loadNpmTasks('grunt-contrib-compress');

  grunt.registerTask('init', function () {
    grunt.task.run([
      'prompt:ngconstant',
      'ngconstant:dist'
    ]);
  });
  grunt.registerTask('run', function () {
    if(!grunt.file.isFile('js/config.js')) {
      grunt.task.run(['init']);
    }
    grunt.task.run([
      'forever:start'
    ]);
  });
  grunt.registerTask('release', function () {
    if(!grunt.file.isFile('js/config.js')) {
      grunt.task.run(['init']);
    }
    grunt.task.run([
      'compress'
    ]);
  });

};
