'use strict';


// Run jshint as part of normal testing
require('mocha-jshint')();
require('mocha-eslint')([
    'etc',
    'lib',
    'routes',
    'test/features',
    'test/lib'
], {
    timeout: 10000
});
