'use strict';

const fs = require('fs');
const path = require('path');
const mwapi = require('../../../lib/mwapi');
const assert = require('../../utils/assert');
const buildVariantInfo = require('../../../lib/metadata').testing.buildVariantInfo;

// eslint-disable-next-line max-len
const si = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../fixtures/siteinfo_enwiki.json'), 'utf8'));
const req = { params: { domain: 'en.wikipedia.org' } };

describe('lib:metadata buildVariantInfo', () => {

    it('builds content URLs if variants are found', () => {
        const meta = {
            variants: [ 'en-foo', 'en-bar' ],
            talkNsText: 'Talk',
            mobileHost: 'https://en.m.wikipedia.org'
        };
        const result = buildVariantInfo(req, meta, mwapi.getTitleObj('Test', si));
        assert.deepEqual(result, {
            'en-foo': {},
            'en-bar': {}
        });
    });

    it('returns undefined if no variants are found', () => {
        const meta = {};
        const result = buildVariantInfo(req, meta, mwapi.getTitleObj('Test', si));
        assert.deepEqual(result, undefined);
    });

});
