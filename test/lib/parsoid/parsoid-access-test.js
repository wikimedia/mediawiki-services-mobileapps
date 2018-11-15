'use strict';

const parsoid = require('../../../lib/parsoid-access');
const assert = require('../../utils/assert');

describe('lib:parsoid-access etag handling', () => {

    it('gets strong etag with no quotes', () => {
        const headers = { etag: '123/Foo' };
        assert.deepEqual(parsoid.getEtagFromHeaders(headers), '123/Foo');
    });

    it('strips prefix from weak etags', () => {
        const headers = { etag: 'W/"123/Foo"' };
        assert.deepEqual(parsoid.getEtagFromHeaders(headers), '123/Foo');
    });

    it('gets revision from etag', () => {
        const headers = { etag: '123/Foo' };
        assert.deepEqual(parsoid.getRevisionFromEtag(headers), '123');
    });

    it('gets revision and tid from etag', () => {
        const headers = { etag: '123/Foo' };
        const revTid = parsoid.getRevAndTidFromEtag(headers);
        assert.deepEqual(revTid.revision, '123');
        assert.deepEqual(revTid.tid, 'Foo');
    });

    it('getEtagFromHeaders handles undefined input', () => {
        assert.deepEqual(parsoid.getEtagFromHeaders(), undefined);
        assert.deepEqual(parsoid.getEtagFromHeaders({}), undefined);
    });

    it('getRevisionFromEtag handles undefined input', () => {
        assert.deepEqual(parsoid.getRevisionFromEtag(), undefined);
        assert.deepEqual(parsoid.getRevisionFromEtag({}), undefined);
    });

    it('getRevAndTidFromEtag handles undefined input', () => {
        assert.deepEqual(parsoid.getRevAndTidFromEtag(), undefined);
        assert.deepEqual(parsoid.getRevAndTidFromEtag({}), undefined);
    });

});
