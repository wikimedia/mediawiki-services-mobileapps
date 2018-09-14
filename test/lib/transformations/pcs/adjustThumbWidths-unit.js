/* eslint-disable max-len */

'use strict';

const domino = require('domino');
const assert = require('../../../utils/assert');
const adjustThumbWidths = require('../../../../lib/transformations/pcs/adjustThumbWidths');


describe('lib:adjustThumbWidths', () => {

    it('thumbnail with large original', () => {
        const doc = domino.createDocument(`<img
            src="//upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/220px-Foo.jpg"
            width="220"
            height="180"
            data-file-width="1600"
            srcset="//upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/440px-Foo.jpg 2x,
            //upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/330px-Foo.jpg 1.5x"
        >`);
        adjustThumbWidths(doc);
        const img = doc.querySelector('img');
        assert.deepEqual(img.getAttribute('src'), '//upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/640px-Foo.jpg');
        assert.deepEqual(img.getAttribute('width'), '640');
        assert.deepEqual(img.getAttribute('height'), '524');
        assert.deepEqual(img.getAttribute('srcset'),
            '//upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/1280px-Foo.jpg 2x, //upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/960px-Foo.jpg 1.5x'
        );
    });

    it('thumbnail with medium original', () => {
        const doc = domino.createDocument(`<img
            src="//upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/220px-Foo.jpg"
            width="220"
            height="180"
            data-file-width="1000"
            srcset="//upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/440px-Foo.jpg 2x,
            //upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/330px-Foo.jpg 1.5x"
        >`);
        adjustThumbWidths(doc);
        const img = doc.querySelector('img');
        assert.deepEqual(img.getAttribute('src'), '//upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/640px-Foo.jpg');
        assert.deepEqual(img.getAttribute('width'), '640');
        assert.deepEqual(img.getAttribute('height'), '524');
        assert.deepEqual(img.getAttribute('srcset'), '//upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/960px-Foo.jpg 1.5x');
    });

    it('thumbnail with small original', () => {
        const doc = domino.createDocument(`<img
            src="//upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/220px-Foo.jpg"
            width="220"
            height="180"
            data-file-width="800"
            srcset="//upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/440px-Foo.jpg 2x,
            //upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/330px-Foo.jpg 1.5x"
        >`);
        adjustThumbWidths(doc);
        const img = doc.querySelector('img');
        assert.deepEqual(img.getAttribute('src'), '//upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/640px-Foo.jpg');
        assert.deepEqual(img.getAttribute('width'), '640');
        assert.deepEqual(img.getAttribute('height'), '524');
        assert.deepEqual(img.getAttribute('srcset'), null);
    });

    it('thumbnail with smaller original', () => {
        const doc = domino.createDocument(`<img
            src="//upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/220px-Foo.jpg"
            width="220"
            height="180"
            data-file-width="500"
            srcset="//upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/440px-Foo.jpg 2x,
            //upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/330px-Foo.jpg 1.5x"
        >`);
        adjustThumbWidths(doc);
        const img = doc.querySelector('img');
        assert.deepEqual(img.getAttribute('src'), '//upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/320px-Foo.jpg');
        assert.deepEqual(img.getAttribute('width'), '320');
        assert.deepEqual(img.getAttribute('height'), '262');
        assert.deepEqual(img.getAttribute('srcset'), '//upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/480px-Foo.jpg 1.5x');
    });

    it('thumbnail with too-small original', () => {
        const doc = domino.createDocument(`<img
            src="//upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/24px-Foo.jpg"
            width="24"
            height="24"
            data-file-width="80"
            srcset="//upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/48px-Foo.jpg 2x, //upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/36px-Foo.jpg 1.5x"
        >`);
        adjustThumbWidths(doc);
        const img = doc.querySelector('img');
        assert.deepEqual(img.getAttribute('src'), '//upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/24px-Foo.jpg');
        assert.deepEqual(img.getAttribute('width'), '24');
        assert.deepEqual(img.getAttribute('height'), '24');
        assert.deepEqual(img.getAttribute('srcset'),
            '//upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/48px-Foo.jpg 2x, //upload.wikimedia.org/wikipedia/commons/thumb/a/12/Foo.jpg/36px-Foo.jpg 1.5x'
        );
    });

    it('thumbnail with non-thumb src', () => {
        const doc = domino.createDocument(`<img
            id="nonThumb"
            src="//upload.wikimedia.org/wikipedia/commons/a/12/Foo.jpg"
            width="220"
            height="180"
            data-file-width="220"
        >`);
        adjustThumbWidths(doc);
        const img = doc.querySelector('img');
        assert.deepEqual(img.getAttribute('src'), '//upload.wikimedia.org/wikipedia/commons/a/12/Foo.jpg');
        assert.deepEqual(img.getAttribute('width'), '220');
        assert.deepEqual(img.getAttribute('height'), '180');
        assert.deepEqual(img.getAttribute('srcset'), null);
    });

});
