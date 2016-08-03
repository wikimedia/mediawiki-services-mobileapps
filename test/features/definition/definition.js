'use strict';

var assert = require('../../utils/assert.js');
var preq   = require('preq');
var server = require('../../utils/server.js');
var headers = require('../../utils/headers.js');

describe('definition', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', function() {
        return headers.checkHeaders(server.config.uri + 'en.wiktionary.org/v1/page/definition/cat');
    });

    it('en \'cat\' request should have expected structure and content', function() {
        return preq.get({ uri: server.config.uri + 'en.wiktionary.org/v1/page/definition/cat' })
            .then(function(res) {
                var en = res.body.en;
                var bodytext = JSON.stringify(res.body);
                assert.ok(bodytext.indexOf('ib-brac') === -1);
                assert.ok(bodytext.indexOf('ib-content') === -1);
                assert.ok(bodytext.indexOf('defdate') === -1);
                assert.deepEqual(res.status, 200);
                assert.notDeepEqual(en, undefined);
                assert.ok(en.length == 8)
                for (var i = 0; i < en.length; i++) {
                    assert.notDeepEqual(en[i].partOfSpeech, undefined);
                    assert.notDeepEqual(en[i].definitions, undefined);
                    for (var j = 0; j < en[i].definitions.length; j++) {
                        assert.notDeepEqual(en[i].definitions[j].definition, undefined);
                        if (en[i].definitions[j].examples) {
                            en[i].definitions[j].examples.length != 0;
                        }
                    }
                }
                assert.deepEqual(en[0].partOfSpeech, 'Noun');
                assert.ok(en[0].definitions[0].definition.indexOf('An animal of the family <i><a href="/wiki/Felidae">Felidae</a></i>') === 0, 'Expected different start of definition');
                assert.deepEqual(en[1].partOfSpeech, 'Verb');
                assert.ok(en[1].definitions[0].definition.indexOf('To <a href=\"/wiki/hoist\">hoist</a>') === 0, 'Expected different start of definition');
            });
    });

    it('missing definitions', function() {
        return preq.get({ uri: server.config.uri + 'en.wiktionary.org/v1/page/definition/Dssjbkrt' })
        .then(function(res) {
            throw new Error('Expected an error, but got status: ' + res.status);
        }, function(err) {
            assert.status(err, 404);
        });
    });

    it('non-term page', function() {
        return preq.get({ uri: server.config.uri + 'en.wiktionary.org/v1/page/definition/Main_page' })
        .then(function(res) {
            throw new Error('Expected an error, but got status: ' + res.status);
        }, function(err) {
            assert.status(err, 404);
        });
    });

    it('unsupported language', function() {
        return preq.get({ uri: server.config.uri + 'ru.wiktionary.org/v1/page/definition/Baba' })
        .then(function(res) {
            throw new Error('Expected an error, but got status: ' + res.status);
        }, function(err) {
            assert.status(err, 501);
        });
    });

    it('non-English term on English Wiktionary returns valid results', function() {
        return preq.get({ uri: server.config.uri + 'en.wiktionary.org/v1/page/definition/%D0%B8%D0%B7%D0%B1%D0%B5%D1%80%D0%B0' })
        .then(function(res) {
            assert.status(res, 200);
            assert.ok(Object.keys(res).length !== 0);
        });
    });

    it('translingual term', function() {
        return preq.get({ uri: server.config.uri + 'en.wiktionary.org/v1/page/definition/Toxicodendron' })
        .then(function(res) {
            assert.status(res, 200);
            assert.ok(Object.keys(res).length !== 0);
        });
    })
});
