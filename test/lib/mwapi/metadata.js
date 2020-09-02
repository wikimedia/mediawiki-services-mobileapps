'use strict';

const assert = require('../../utils/assert.js');
const queryForMetadata = require('../../../lib/mwapi').queryForMetadata;
const util = require('../../utils/testUtil');

const responseBuilder = (page, siteinfo, title, description) => {
    return {
        page,
        siteinfo,
        title,
        description,
    };
};

describe('lib:mwapi:queryForMetadata', () => {
    it('ensure that displaytitle is always requested', () => {
        const req = util.getMockedServiceReq({
            params: { title: 'Β-lactam_antibiotic', domain: 'en.wikipedia.org' },
        });
        const query = {
            format: 'json',
            formatversion: 2,
            action: 'query',
            prop: 'description|info|pageimages',
            inprop: 'protection',
            pilicense: 'any',
            piprop: 'original',
            titles: req.params.title,
        };

        return queryForMetadata(req, query, responseBuilder).then(metadata => {
            assert.deepEqual(metadata.title.display, 'β-lactam antibiotic');
        });
    });
});
