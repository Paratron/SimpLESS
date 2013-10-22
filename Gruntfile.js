module.exports = function (grunt){
    'use strict';

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-compress');

    grunt.initConfig({
        compress: {
            main: {
                options: {
                    archive: './dist/app.nw',
                    mode: 'zip'
                },
                files: [
                    {
                        cwd: './nwData/',
                        expand: true,
                        src: '**'
                    }
                ]
            }
        },

        watch: {
            main: {
                files: ['./nwData/**'],
                tasks: ['compress']
            }
        }
    });

    grunt.registerTask('default', 'compress');
};