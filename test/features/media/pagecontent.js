'use strict';

const preq   = require('preq');
const assert = require('../../utils/assert');
const server = require('../../utils/server');

describe('media', function() {

    this.timeout(20000);

    before(() => server.start());
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
