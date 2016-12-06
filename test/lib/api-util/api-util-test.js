'use strict';

const preq   = require('preq');
const assert = require('../../utils/assert');
const mwapi = require('../../../lib/mwapi');

const logger = require('bunyan').createLogger({
    name: 'test-logger',
    level: 'warn'
});

logger.log = function(a, b) {};

describe('lib:apiUtil', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    it('checkForQueryPagesInResponse should return 504 when query.pages are absent', () => {
        return preq.post({
            uri: 'https://commons.wikimedia.org/w/api.php',
            body: {
                action: 'query',
                format: 'json',
                formatversion: 2,
                generator: 'images',
                prop: 'imageinfo|revisions',
                iiextmetadatafilter: 'ImageDescription',
                iiextmetadatamultilang: true,
                iiprop: 'url|extmetadata|dimensions',
                iiurlwidth: 1024,
                rawcontinue: '',
                titles: `Template:Potd/1980-07-06`
            }
        }).then((response) => {
            assert.throws(() => {
                mwapi.checkForQueryPagesInResponse({ logger }, response);
            }, /api_error/);
        });
    });
});
