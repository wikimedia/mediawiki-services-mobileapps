'use strict';

const assert = require('../../utils/assert.js');
const preq = require('preq');

exports.shouldBehaveLikeMobileSections = function(localUri) {

    it('Mismatched title and revision id give 404', () => {
        const title = '%2Fr%2FThe_Donald';
        const rev = 752758357; // belongs to Roald Dahl
        const uri = localUri(`${title}/${rev}`);
        return preq.get({ uri })
        .catch((res) => {
            assert.equal(res.status, 404);
        });
    });

    it('Malformed revision id gives bad request', () => {
        const title = '%2Fr%2FThe_Donald'; // belongs to Roald Dahl
        const rev = 'Reddit';
        const uri = localUri(`${title}/${rev}`);
        return preq.get({ uri })
        .catch((res) => {
            assert.equal(res.status, 400, 'Should be integer');
        });
    });

    it('Missing title should respond with 404', () => {
        const uri = localUri('weoiuyrxcmxn', 'test.wikipedia.org');
        return preq.get({ uri })
        .then(() => {
            assert.fail("expected an exception to be thrown");
        }).catch((res) => {
            assert.equal(res.status, 404);
        });
    });

};
