'use strict';

const assert = require('../../utils/assert.js');
const buildUrls = require('../../../lib/mwapi').buildLeadImageUrls;
const scale = require('../../../lib/thumbnail').scaleURL;
const { findClosestWidthIndex, adjustSrcSet, ALLOWED_THUMB_WIDTHS } = require('../../../lib/thumbnail');

const path = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0';

// https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Foo.jpg/2000px-Foo.jpg
const thumb = (width, file = 'Foo.jpg', prefix = '') => `${ path }/${ file }/${ prefix }${ width }px-${ file }`;

describe('lib:mwapi', () => {
	it('scaled thumb URL returned if initial URL is a thumb URL and original width > desired width', () => {
		const notAThumb = 'https://upload.wikimedia.org/wikipedia/commons/9/96/Vasskertentrance.jpg';
		assert.deepEqual(scale(thumb(720), 330), thumb(330));
		assert.deepEqual(scale(thumb(120), 330), undefined);
		assert.deepEqual(scale(notAThumb, 330), undefined);
	});
});

describe('lib:mwapi buildLeadImageUrls', () => {

	it('2000px thumb should be resized for all widths', () => {
		assert.deepEqual(buildUrls(thumb(2000)), {
			330: thumb(330),
			500: thumb(500),
			960: thumb(960),
			1280: thumb(1280)
		});
	});

	it('555px thumb should return 330, 500 and 555 for rest', () => {
		assert.deepEqual(buildUrls(thumb(555)), {
			330: thumb(330),
			500: thumb(500),
			960: thumb(555),
			1280: thumb(555)
		});
	});

	it('750px thumb should return 330, 500, and 750 for rest', () => {
		assert.deepEqual(buildUrls(thumb(750)), {
			330: thumb(330),
			500: thumb(500),
			960: thumb(750),
			1280: thumb(750)
		});
	});

	it('200px thumb should return 200px URL for all thumb sizes', () => {
		assert.deepEqual(buildUrls(thumb(200)), {
			330: thumb(200),
			500: thumb(200),
			960: thumb(200),
			1280: thumb(200)
		});
	});

	it('should ignore non-thumbnail URLs', () => {
		const file = 'https://upload.wikimedia.org/wikipedia/commons/9/9d/2000px-Foo.jpg';
		assert.deepEqual(buildUrls(file), {
			330: file,
			500: file,
			960: file,
			1280: file
		});
	});

	it("should ignore 'thumb' when not a path segment", () => {
		const file = 'https://upload.wikimedia.org/wikipedia/commons/9/9d/200px-thumb.jpg';
		assert.deepEqual(buildUrls(file), {
			330: file,
			500: file,
			960: file,
			1280: file
		});
	});

	// https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/9999px-Foo.jpg/2000px-9999px-Foo.jpg
	it('should create thumb URLs correctly if width regex pattern is in original filename', () => {
		const file = thumb(2000, '9999px-Foo.jpg');
		assert.deepEqual(buildUrls(file), {
			330: thumb(330, '9999px-Foo.jpg'),
			500: thumb(500, '9999px-Foo.jpg'),
			960: thumb(960, '9999px-Foo.jpg'),
			1280: thumb(1280, '9999px-Foo.jpg')
		});
	});

	// https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Foo.jpg/qlow-2000px-Foo.jpg
	it('should handle edge case thumb filename patterns', () => {
		const file = thumb(2000, 'Foo.jpg', 'qlow-');
		assert.deepEqual(buildUrls(file), {
			330: thumb(330, 'Foo.jpg', 'qlow-'),
			500: thumb(500, 'Foo.jpg', 'qlow-'),
			960: thumb(960, 'Foo.jpg', 'qlow-'),
			1280: thumb(1280, 'Foo.jpg', 'qlow-')
		});
	});

	// https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/9999px-Foo.jpg/qlow-2000px-9999px-Foo.jpg
	it('should handle edge case thumb filename patterns with width regex in original name', () => {
		const file = thumb(2000, '9999px-Foo.jpg', 'qlow-');
		assert.deepEqual(buildUrls(file), {
			330: thumb(330, '9999px-Foo.jpg', 'qlow-'),
			500: thumb(500, '9999px-Foo.jpg', 'qlow-'),
			960: thumb(960, '9999px-Foo.jpg', 'qlow-'),
			1280: thumb(1280, '9999px-Foo.jpg', 'qlow-')
		});
	});
});

describe('lib:thumbnail adjustSrcSet', () => {
	it('should use consecutive buckets for 1x, 1.5x, and 2x', () => {
		const srcSet = `${ thumb(640) } 1x, ${ thumb(960) } 1.5x, ${ thumb(1280) } 2x`;
		const origWidth = 2000;
		const candidateBucketWidth = 500;

		const result = adjustSrcSet(srcSet, origWidth, candidateBucketWidth);

		// 500 is at index 6, so 1x->500, 1.5x->960, 2x->1280
		assert.deepEqual(result, `${ thumb(500) } 1x, ${ thumb(960) } 1.5x, ${ thumb(1280) } 2x`);
	});

	it('should handle srcset entries in any order', () => {
		const srcSet = `${ thumb(1280) } 2x, ${ thumb(640) } 1x, ${ thumb(960) } 1.5x`;
		const origWidth = 2000;
		const candidateBucketWidth = 500;

		const result = adjustSrcSet(srcSet, origWidth, candidateBucketWidth);

		assert.deepEqual(result, `${ thumb(1280) } 2x, ${ thumb(500) } 1x, ${ thumb(960) } 1.5x`);
	});
});

describe('lib:thumbnail findClosestWidthIndex', () => {
	it('should return index 0 when value is below lower limit', () => {
		const index = findClosestWidthIndex(5);
		assert.deepEqual(index, 0);
		assert.deepEqual(ALLOWED_THUMB_WIDTHS[index], 20);
	});

	it('should return last index when value is above upper limit', () => {
		const index = findClosestWidthIndex(5000);
		assert.deepEqual(index, ALLOWED_THUMB_WIDTHS.length - 1);
		assert.deepEqual(ALLOWED_THUMB_WIDTHS[index], 3840);
	});

	it('should return correct index when value matches an allowed width', () => {
		const index = findClosestWidthIndex(500);
		assert.deepEqual(ALLOWED_THUMB_WIDTHS[index], 500);
	});

	it('should return index of closest allowed width for in-between values', () => {
		const index = findClosestWidthIndex(750);
		assert.deepEqual(ALLOWED_THUMB_WIDTHS[index], 960);
	});
});
