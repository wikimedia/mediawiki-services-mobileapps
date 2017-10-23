'use strict';

const assert = require('../../utils/assert');
const mwapi = require('../../../lib/mwapi');

const logger = require('bunyan').createLogger({
    name: 'test-logger',
    level: 'warn'
});

logger.log = function(a, b) {};

describe('lib:apiUtil', () => {

    it('checkForQueryPagesInResponse should return 504 when query.pages are absent', () => {
        return new Promise((resolve) => {
            return resolve({});
        }).then((response) => {
            assert.throws(() => {
                mwapi.checkForQueryPagesInResponse({ logger }, response);
            }, /api_error/);
        });
    });
});
