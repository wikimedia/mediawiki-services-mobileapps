'use strict';

const assert = require('../../utils/assert.js');
const mwapi = require('../../../lib/mwapi');

describe('lib:mwapi:image', function() {
    this.timeout(20000);

    it('buildLeadImageUrls("a") should return all "a"s', () => {
        assert.deepEqual(mwapi.buildLeadImageUrls('a'), {
            320: 'a',
            640: 'a',
            800: 'a',
            1024: 'a'
        }
        );
    });

    it('buildLeadImageUrls with size 1024px', () => {
        assert.deepEqual(mwapi.buildLeadImageUrls('//upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sun_in_February.jpg/1024px-Sun_in_February.jpg'), {
            320: '//upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sun_in_February.jpg/320px-Sun_in_February.jpg',
            640: '//upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sun_in_February.jpg/640px-Sun_in_February.jpg',
            800: '//upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sun_in_February.jpg/800px-Sun_in_February.jpg',
            1024: '//upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sun_in_February.jpg/1024px-Sun_in_February.jpg'
        }
        );
    });

    it('buildLeadImageUrls with size 555px should return size 320 for 320 and then 555 for rest', () => {
        assert.deepEqual(mwapi.buildLeadImageUrls('//upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sun_in_February.jpg/555px-Sun_in_February.jpg'), {
            320: '//upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sun_in_February.jpg/320px-Sun_in_February.jpg',
            640: '//upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sun_in_February.jpg/555px-Sun_in_February.jpg',
            800: '//upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sun_in_February.jpg/555px-Sun_in_February.jpg',
            1024: '//upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sun_in_February.jpg/555px-Sun_in_February.jpg'
        }
        );
    });

    it('buildLeadImageUrls with size 750px should return size 320, 640, and then 750 for rest', () => {
        assert.deepEqual(mwapi.buildLeadImageUrls('//upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sun_in_February.jpg/750px-Sun_in_February.jpg'), {
            320: '//upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sun_in_February.jpg/320px-Sun_in_February.jpg',
            640: '//upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sun_in_February.jpg/640px-Sun_in_February.jpg',
            800: '//upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sun_in_February.jpg/750px-Sun_in_February.jpg',
            1024: '//upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sun_in_February.jpg/750px-Sun_in_February.jpg'
        }
        );
    });
    it('buildLeadImageUrls with size 200px should return size 200 for all URLs', () => {
        assert.deepEqual(mwapi.buildLeadImageUrls('//upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sun_in_February.jpg/200px-Sun_in_February.jpg'), {
            320: '//upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sun_in_February.jpg/200px-Sun_in_February.jpg',
            640: '//upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sun_in_February.jpg/200px-Sun_in_February.jpg',
            800: '//upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sun_in_February.jpg/200px-Sun_in_February.jpg',
            1024: '//upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sun_in_February.jpg/200px-Sun_in_February.jpg'
        }
        );
    });
});
