'use strict';

const preq = require('preq');
const Title = require('mediawiki-title').Title;
const assert = require('../../utils/assert.js');
const headers = require('../../utils/headers.js');
const server = require('../../utils/server.js');
const mUtil = require('../../../lib/mobile-util');

const blaLead = require('../../fixtures/formatted-lead-Β-lactam_antibiotic.json');
const siteinfo = require('../../fixtures/siteinfo_enwiki.json');

describe('summary', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => { return server.start(); });

    const localUri = (title, domain = 'en.wikipedia.org') => {
        return `${server.config.uri}${domain}/v1/page/summary/${title}`;
    };

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', () => {
        const uri = localUri('Foobar');
        return headers.checkHeaders(uri);
    });

    it('should respond with expected properties in payload', () => {

        const uri = localUri('Foobar/798652007');
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.type, 'standard');
                assert.deepEqual(res.body.revision, 798652007);
                assert.deepEqual(res.body.titles.title, "Foobar");
                assert.deepEqual(res.body.titles.normalized_title, "Foobar");
                assert.deepEqual(res.body.titles.display_title, "Foobar");
                assert.deepEqual(res.body.titles.namespace_id, 0);
                assert.deepEqual(res.body.titles.namespace_name, "");
                assert.ok(res.body.extract.indexOf('foobar') > -1);
                assert.ok(res.body.extract_html.indexOf('<b>foobar</b>') > -1);
            });
    });

    it('titles dictionary contains all required fields', () => {
        const title = Title.newFromText('Β-lactam_antibiotic', siteinfo);
        const result = mUtil.buildTitleDictionary(title, blaLead);
        assert.deepEqual(result.title, "Β-lactam_antibiotic");
        assert.deepEqual(result.normalized_title, "Β-lactam antibiotic");
        assert.deepEqual(result.display_title, "β-lactam antibiotic");
        assert.deepEqual(result.namespace_id, 0);
        assert.deepEqual(result.namespace_name, "");
    });
});
