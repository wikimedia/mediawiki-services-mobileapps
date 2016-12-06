/* eslint-env mocha */

'use strict';

const assert = require('../../utils/assert.js');
const preq   = require('preq');
const server = require('../../utils/server.js');
const headers = require('../../utils/headers.js');

describe('definition', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', () => {
        return headers.checkHeaders(`${server.config.uri}en.wiktionary.org/v1/page/definition/cat`);
    });

    it('en \'cat\' request should have expected structure and content', () => {
        return preq.get({ uri: `${server.config.uri}en.wiktionary.org/v1/page/definition/cat` })
            .then((res) => {
                const en = res.body.en;
                const bodytext = JSON.stringify(res.body);
                assert.ok(bodytext.indexOf('ib-brac') === -1);
                assert.ok(bodytext.indexOf('ib-content') === -1);
                assert.ok(bodytext.indexOf('defdate') === -1);
                assert.deepEqual(res.status, 200);
                assert.notDeepEqual(en, undefined);
                assert.ok(en.length === 8);
                for (let i = 0; i < en.length; i++) {
                    assert.notDeepEqual(en[i].partOfSpeech, undefined);
                    assert.notDeepEqual(en[i].definitions, undefined);
                    for (let j = 0; j < en[i].definitions.length; j++) {
                        assert.notDeepEqual(en[i].definitions[j].definition, undefined);
                        if (en[i].definitions[j].examples) {
                            assert.ok(en[i].definitions[j].examples.length !== 0);
                        }
                    }
                }
                assert.deepEqual(en[0].partOfSpeech, 'Noun');
                const def0 = en[0].definitions[0].definition;
                assert.ok(def0.indexOf('An animal of the family ') === 0,
                    'Expected different start of definition specifying family');
                assert.deepEqual(en[1].partOfSpeech, 'Verb');
                const def1 = en[1].definitions[0].definition;
                assert.ok(def1.indexOf('To <a href="/wiki/hoist" title="hoist">hoist</a>') === 0,
                    'Expected different start of definition linking to hoist');
            });
    });

    it('missing definitions', () => {
        const uri = `${server.config.uri}en.wiktionary.org/v1/page/definition/Dssjbkrt`;
        return preq.get({ uri })
        .then((res) => {
            throw new Error(`Expected an error, but got status: ${res.status}`);
        }, (err) => {
            assert.status(err, 404);
        });
    });

    it('non-term page', () => {
        const uri = `${server.config.uri}en.wiktionary.org/v1/page/definition/Main_page`;
        return preq.get({ uri })
        .then((res) => {
            throw new Error(`Expected an error, but got status: ${res.status}`);
        }, (err) => {
            assert.status(err, 404);
        });
    });

    it('unsupported language', () => {
        const uri = `${server.config.uri}ru.wiktionary.org/v1/page/definition/Baba`;
        return preq.get({ uri })
        .then((res) => {
            throw new Error(`Expected an error, but got status: ${res.status}`);
        }, (err) => {
            assert.status(err, 501);
        });
    });

    it('non-English term on English Wiktionary returns valid results', () => {
        const uri = `${server.config.uri}en.wiktionary.org/v1/page/definition/%E4%B8%AD%E5%9B%BD`;
        return preq.get({ uri })
        .then((res) => {
            assert.status(res, 200);
            assert.ok(Object.keys(res).length !== 0);
        });
    });

    it('translingual term', () => {
        const uri = `${server.config.uri}en.wiktionary.org/v1/page/definition/Toxicodendron`;
        return preq.get({ uri })
        .then((res) => {
            assert.status(res, 200);
            assert.ok(Object.keys(res).length !== 0);
        });
    });
});
