'use strict';

const assert = require('../../utils/assert.js');
const buildUrls = require('../../../lib/mwapi').buildLeadImageUrls;
const scale = require('../../../lib/mwapi').scaledImageUrl;

const path = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0';

describe('lib:mwapi', () => {
    it('image URLs are rewritten if URL contains a size and the desired width is smaller', () => {
        const prefix = 'https://upload.wikimedia.org/wikipedia/commons';
        assert.deepEqual(scale(`${prefix}/thumb/0/0b/Cat_poster_1.jpg/720px-Cat_poster_1.jpg`, 320),
            `${prefix}/thumb/0/0b/Cat_poster_1.jpg/320px-Cat_poster_1.jpg`);
        assert.deepEqual(scale(`${prefix}/thumb/0/0b/Cat_poster_1.jpg/120px-Cat_poster_1.jpg`, 320),
            `${prefix}/thumb/0/0b/Cat_poster_1.jpg/120px-Cat_poster_1.jpg`);
        assert.deepEqual(scale(`${prefix}/9/96/Vasskertentrance.jpg`, 320),
            `${prefix}/9/96/Vasskertentrance.jpg`);
    });
});

describe('lib:mwapi buildLeadImageUrls', () => {

    it('2000px thumb should be resized for all sizes', () => {
        assert.deepEqual(buildUrls(`${path}/Sun_in_February.jpg/2000px-Sun_in_February.jpg`), {
            320: `${path}/Sun_in_February.jpg/320px-Sun_in_February.jpg`,
            640: `${path}/Sun_in_February.jpg/640px-Sun_in_February.jpg`,
            800: `${path}/Sun_in_February.jpg/800px-Sun_in_February.jpg`,
            1024: `${path}/Sun_in_February.jpg/1024px-Sun_in_February.jpg`
        });
    });

    it('555px thumb should return 320 and 555 for rest', () => {
        assert.deepEqual(buildUrls(`${path}/Sun_in_February.jpg/555px-Sun_in_February.jpg`), {
            320: `${path}/Sun_in_February.jpg/320px-Sun_in_February.jpg`,
            640: `${path}/Sun_in_February.jpg/555px-Sun_in_February.jpg`,
            800: `${path}/Sun_in_February.jpg/555px-Sun_in_February.jpg`,
            1024: `${path}/Sun_in_February.jpg/555px-Sun_in_February.jpg`
        });
    });

    it('750px thumb should return 320, 640, and 750 for rest', () => {
        assert.deepEqual(buildUrls(`${path}/Sun_in_February.jpg/750px-Sun_in_February.jpg`), {
            320: `${path}/Sun_in_February.jpg/320px-Sun_in_February.jpg`,
            640: `${path}/Sun_in_February.jpg/640px-Sun_in_February.jpg`,
            800: `${path}/Sun_in_February.jpg/750px-Sun_in_February.jpg`,
            1024: `${path}/Sun_in_February.jpg/750px-Sun_in_February.jpg`
        });
    });

    it('200px thumb should return size 200 for all URLs', () => {
        assert.deepEqual(buildUrls(`${path}/Sun_in_February.jpg/200px-Sun_in_February.jpg`), {
            320: `${path}/Sun_in_February.jpg/200px-Sun_in_February.jpg`,
            640: `${path}/Sun_in_February.jpg/200px-Sun_in_February.jpg`,
            800: `${path}/Sun_in_February.jpg/200px-Sun_in_February.jpg`,
            1024: `${path}/Sun_in_February.jpg/200px-Sun_in_February.jpg`
        });
    });

    it('should ignore non-thumbnail URLs', () => {
        const file = 'https://upload.wikimedia.org/wikipedia/commons/9/9d/2000px-Foo.jpg';
        assert.deepEqual(buildUrls(file), {
            320: file,
            640: file,
            800: file,
            1024: file
        });
    });

    it('should ignore \'thumb\' when not a path segment', () => {
        const file = `https://upload.wikimedia.org/wikipedia/commons/9/9d/200px-thumb.jpg`;
        assert.deepEqual(buildUrls(file), {
            320: file,
            640: file,
            800: file,
            1024: file
        });
    });

    it('should create thumb URLs correctly if size regex pattern is in original filename', () => {
        const file = `${path}/9999px-Foo.jpg/2000px-9999px-Foo.jpg`;
        assert.deepEqual(buildUrls(file), {
            320: `${path}/9999px-Foo.jpg/320px-9999px-Foo.jpg`,
            640: `${path}/9999px-Foo.jpg/640px-9999px-Foo.jpg`,
            800: `${path}/9999px-Foo.jpg/800px-9999px-Foo.jpg`,
            1024: `${path}/9999px-Foo.jpg/1024px-9999px-Foo.jpg`
        });
    });

    it('should handle edge case thumb filename patterns', () => {
        const file = `${path}/Foo.jpg/qlow-2000px-Foo.jpg`;
        assert.deepEqual(buildUrls(file), {
            320: `${path}/Foo.jpg/qlow-320px-Foo.jpg`,
            640: `${path}/Foo.jpg/qlow-640px-Foo.jpg`,
            800: `${path}/Foo.jpg/qlow-800px-Foo.jpg`,
            1024: `${path}/Foo.jpg/qlow-1024px-Foo.jpg`
        });
    });

    it('should handle edge case thumb filename patterns with size regex in original name', () => {
        const file = `${path}/9999px-Foo.jpg/qlow-2000px-9999px-Foo.jpg`;
        assert.deepEqual(buildUrls(file), {
            320: `${path}/9999px-Foo.jpg/qlow-320px-9999px-Foo.jpg`,
            640: `${path}/9999px-Foo.jpg/qlow-640px-9999px-Foo.jpg`,
            800: `${path}/9999px-Foo.jpg/qlow-800px-9999px-Foo.jpg`,
            1024: `${path}/9999px-Foo.jpg/qlow-1024px-9999px-Foo.jpg`
        });
    });
});
