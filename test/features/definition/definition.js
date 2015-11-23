'use strict';

// mocha defines to avoid JSHint breakage
/* global describe, it, before, beforeEach, after, afterEach */

var assert = require('../../utils/assert.js');
var preq   = require('preq');
var server = require('../../utils/server.js');
var headers = require('../../utils/headers.js');

describe('definition', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', function() {
        return headers.checkHeaders(server.config.uri + 'en.wiktionary.org/v1/definition/cat',
            'application/json');
    });
    it('en \'cat\' request should have expected structure and content', function() {
        return preq.get({ uri: server.config.uri + 'en.wiktionary.org/v1/definition/cat' })
            .then(function(res) {
                var usages = res.body.usages;
                assert.deepEqual(res.status, 200);
                assert.notDeepEqual(usages, undefined);
                assert.ok(usages.length == 8)
                for (var i = 0; i < usages.length; i++) {
                    assert.notDeepEqual(usages[i].partOfSpeech, undefined);
                    assert.notDeepEqual(usages[i].definitions, undefined);
                    for (var j = 0; j < usages[i].definitions.length; j++) {
                        assert.notDeepEqual(usages[i].definitions[j].definition, undefined);
                        if (usages[i].definitions[j].examples) {
                            usages[i].definitions[j].examples.length != 0;
                        }
                    }
                }
                assert.deepEqual(usages[0].partOfSpeech, 'Noun');
                assert.ok(usages[0].definitions[0].definition.indexOf('An animal of the family <a href=\"/wiki/Felidae\">') === 0, 'Expected different start of definition');
                assert.deepEqual(usages[1].partOfSpeech, 'Verb');
                assert.ok(usages[1].definitions[0].definition.indexOf('To <a href=\"/wiki/hoist\">hoist</a>') === 0, 'Expected different start of definition');
            });
    });


});
