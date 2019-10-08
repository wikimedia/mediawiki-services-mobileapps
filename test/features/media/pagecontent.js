'use strict';

const preq   = require('preq');
const assert = require('../../utils/assert');
const server = require('../../utils/server');

describe('media', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => server.start());

    it('Sections/deep page should have no media items', () => {
        const uri = `${server.config.uri}test.wikipedia.org/v1/page/media/Sections%2Fdeep`;
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.items.length, 0, 'Expected no media items');
            });
    });
    it('en Main page should have at least one image', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/page/media/Main_Page` })
            .then((res) => {
                assert.ok(res.body.items.length > 0, 'Expected at least one media item');
            });
    });
    it('en Barack Obama should have many media items with valid entity IDs', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/page/media/Barack_Obama` })
            .then((res) => {
                const items = res.body.items;
                assert.deepEqual(res.status, 200);
                assert.ok(items.length > 3, 'Expected many media items');
                assert.ok(items.filter(i => i.wb_entity_id).length > 3,
                    'Expected many media items to have Commons Wikibase entity IDs');
                assert.ok(items.filter(i => i.wb_entity_id === 'Mundefined').length === 0,
                    'Expected no items to have invalid entity ID "Mundefined"');
            });
    });
    it('Missing title should respond with 404', () => {
        return preq.get({ uri: `${server.config.uri}test.wikipedia.org/v1/page/media/weoiuyrxxn` })
            .then(() => {
                assert.fail('expected an exception to be thrown');
            }).catch((res) => {
                assert.deepEqual(res.status, 404);
            });
    });
    it('Media-list should resolve redirects for image titles', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/page/media-list/Badminton_at_the_1992_Summer_Olympics` })
            .then((res) => {
                const items = res && res.body && res.body.items || [];
                const resolved = items.filter(item => {
                    return item.title === 'File:Olympic_rings_without_rims.svg';
                });
                assert.ok(resolved.length === 1, 'Expect File:Olympic_rings.svg redirect to be resolved');
            });
    });
});
