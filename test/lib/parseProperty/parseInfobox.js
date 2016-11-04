'use strict';

var fs = require('fs');
var domino = require('domino');
var assert = require('../../utils/assert.js');
var parseProp = require('../../../lib/parseProperty');
var html = fs.readFileSync(__dirname + '/../bill-clinton.html', 'utf-8');

describe('lib:parseInfobox', function() {
    it('Parsed infobox should have correct number of rows', function() {
        var doc = domino.createDocument(html);
        var infobox = parseProp.parseInfobox(doc);
        assert.deepEqual(infobox.length, 31);
    });
});