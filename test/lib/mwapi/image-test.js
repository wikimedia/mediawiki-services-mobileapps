'use strict';

const assert = require('../../utils/assert.js');
const buildUrls = require('../../../lib/mwapi').buildLeadImageUrls;
const scale = require('../../../lib/thumbnail').scaleURL;

const path = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0';

// https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Foo.jpg/2000px-Foo.jpg
const thumb = (width, file = 'Foo.jpg', prefix = '') => `${path}/${file}/${prefix}${width}px-${file}`;

describe('lib:mwapi', () => {
    it('scaled thumb URL returned if initial URL is a thumb URL and original width > desired width', () => {
        const notAThumb = 'https://upload.wikimedia.org/wikipedia/commons/9/96/Vasskertentrance.jpg';
        assert.deepEqual(scale(thumb(720), 320), thumb(320));
        assert.deepEqual(scale(thumb(120), 320), undefined);
        assert.deepEqual(scale(notAThumb, 320), undefined);
    });
});

describe('lib:mwapi buildLeadImageUrls', () => {

    it('2000px thumb should be resized for all widths', () => {
        assert.deepEqual(buildUrls(thumb(2000)), {
            320: thumb(320),
            640: thumb(640),
            800: thumb(800),
            1024: thumb(1024)
        });
    });

    it('555px thumb should return 320 and 555 for rest', () => {
        assert.deepEqual(buildUrls(thumb(555)), {
            320: thumb(320),
            640: thumb(555),
            800: thumb(555),
            1024: thumb(555)
        });
    });

    it('750px thumb should return 320, 640, and 750 for rest', () => {
        assert.deepEqual(buildUrls(thumb(750)), {
            320: thumb(320),
            640: thumb(640),
            800: thumb(750),
            1024: thumb(750)
        });
    });

    it('200px thumb should return 200px URL for all thumb sizes', () => {
        assert.deepEqual(buildUrls(thumb(200)), {
            320: thumb(200),
            640: thumb(200),
            800: thumb(200),
            1024: thumb(200)
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

    it("should ignore 'thumb' when not a path segment", () => {
        const file = 'https://upload.wikimedia.org/wikipedia/commons/9/9d/200px-thumb.jpg';
        assert.deepEqual(buildUrls(file), {
            320: file,
            640: file,
            800: file,
            1024: file
        });
    });

    // https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/9999px-Foo.jpg/2000px-9999px-Foo.jpg
    it('should create thumb URLs correctly if width regex pattern is in original filename', () => {
        const file = thumb(2000, '9999px-Foo.jpg');
        assert.deepEqual(buildUrls(file), {
            320: thumb(320, '9999px-Foo.jpg'),
            640: thumb(640, '9999px-Foo.jpg'),
            800: thumb(800, '9999px-Foo.jpg'),
            1024: thumb(1024, '9999px-Foo.jpg')
        });
    });

    // https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Foo.jpg/qlow-2000px-Foo.jpg
    it('should handle edge case thumb filename patterns', () => {
        const file = thumb(2000, 'Foo.jpg', 'qlow-');
        assert.deepEqual(buildUrls(file), {
            320: thumb(320, 'Foo.jpg', 'qlow-'),
            640: thumb(640, 'Foo.jpg', 'qlow-'),
            800: thumb(800, 'Foo.jpg', 'qlow-'),
            1024: thumb(1024, 'Foo.jpg', 'qlow-')
        });
    });

    // https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/9999px-Foo.jpg/qlow-2000px-9999px-Foo.jpg
    it('should handle edge case thumb filename patterns with width regex in original name', () => {
        const file = thumb(2000, '9999px-Foo.jpg', 'qlow-');
        assert.deepEqual(buildUrls(file), {
            320: thumb(320, '9999px-Foo.jpg', 'qlow-'),
            640: thumb(640, '9999px-Foo.jpg', 'qlow-'),
            800: thumb(800, '9999px-Foo.jpg', 'qlow-'),
            1024: thumb(1024, '9999px-Foo.jpg', 'qlow-')
        });
    });
});
