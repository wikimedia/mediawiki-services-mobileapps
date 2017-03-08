'use strict';

const domino = require('domino');
const assert = require('../../utils/assert.js');
const parseProp = require('../../../lib/parseProperty.js');
const filePageUrlToFileUrlSelector = parseProp.testing.filePageUrlToFileUrlSelector;

describe('parse-pronunciation-selector-chars-test', () => {
    const coverProblematicChars = () => {
        return [
            "'", '"', '[', ']'
        ];
    };

    // eslint-disable-next-line no-unused-vars
    const coverMoreChars = () => {
        const array = [];

        for (let i = 0x10; i <= 0xff; i++) {
            array.push(unescape(`%${i.toString(16)}`));
        }
        return array;
    };

    const specialChars = coverProblematicChars();
    // const specialChars = coverMoreChars();

    specialChars.forEach((char) => {
        it(`${escape(char)} = ${char} in file name does not cause parsing error`, () => {
            const filePageUrl = `/wiki/File:A_${escape(char)}_b.ogg`;
            const expected = filePageUrl.replace('/wiki/', '//up/');
            const html = `<a href="${expected}">foo</a>`;
            const doc = domino.createDocument(html);
            const selector = filePageUrlToFileUrlSelector(filePageUrl);
            const result = doc.querySelector(selector);
            assert.ok(result, `${selector} not found in ${html}`);
            assert.deepEqual(result.getAttribute('href'), expected);
        });
    });
});
