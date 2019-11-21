'use strict';

const assert = require('../../utils/assert');
const server = require('../../utils/server');
const css = require('../../../lib/css').testing;

describe('css', function() {

    this.timeout(20000);

    before(() => server.start());

    it('default RL request wiki uses canonical domain (request should not redirect)', () => {
        return css.load(css.SITE_MODULES).then(res => assert.ok(!res.headers['content-location']));
    });

});
