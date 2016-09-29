"use strict";

module.exports = function ( grunt ) {
  grunt.loadNpmTasks("grunt-jscs");

  grunt.initConfig( {
    jscs: {
        src: ['lib/**/*.js', 'routes/*.js', 'test/**/*.js' ],
        options: {
            config: ".jscsrc",
            fix: true, // Autofix code style violations when possible.
            requireCurlyBraces: [ "if" ]
        }
    }
  } );

  grunt.registerTask( 'test', [ 'jscs' ] );

  grunt.registerTask( 'default', [ 'test' ] );
};
