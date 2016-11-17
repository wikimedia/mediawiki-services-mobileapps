"use strict";

module.exports = function ( grunt ) {
  grunt.loadNpmTasks("grunt-jscs");

  grunt.initConfig( {
    jscs: {
        src: ['lib/**/*.js', 'routes/*.js', 'test/**/*.js' ],
        options: {
            config: ".jscsrc",
            requireCurlyBraces: [ "if" ]
        }
    }
  } );

  grunt.registerTask( 'test', [ 'jscs' ] );

  grunt.registerTask( 'default', [ 'test' ] );
};
