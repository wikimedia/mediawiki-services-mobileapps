'use strict';

const assert = require('../../utils/assert');
const mUtil = require('../../../lib/mobile-util');
const domino = require('domino');

describe('lib:mobile-util', () => {

    it('removeTLD should remove TLD', () => {
        assert.deepEqual(mUtil.removeTLD('ru.wikipedia.org'), 'ru.wikipedia');
    });

    it('URL fragments should be stripped correctly', () => {
        assert.deepEqual(mUtil.removeFragment('100_metres_hurdles#Top_25_fastest_athletes'),
            '100_metres_hurdles');
        assert.deepEqual(mUtil.removeFragment('Kendra_Harrison'), 'Kendra_Harrison');
    });

    it('removeLinkPrefix should strip the ./ correctly', () => {
        assert.deepEqual(mUtil.removeLinkPrefix('./100_metres_hurdles#Top_25_fastest_athletes'),
            '100_metres_hurdles#Top_25_fastest_athletes');
        assert.deepEqual(mUtil.removeLinkPrefix('Kendra_Harrison'), 'Kendra_Harrison');
    });

    it('extractDbTitleFromAnchor should get the right parts of the href', () => {
        const linkHtml = `<html><head><base href="//en.wikipedia.org/wiki/"/></head></html><body>
<a href="./My_db_title">foo bar</a></body></html>`;
        const document = domino.createDocument(linkHtml);
        const link = document.querySelector('a');
        assert.deepEqual(mUtil.extractDbTitleFromAnchor(link), 'My_db_title');
    });

    it('getSummaryType identifies main and disambig pages, defaults to \'standard\'', () => {
        assert.deepEqual(mUtil.getSummaryType({ "mainpage": true }), 'mainpage');
        assert.deepEqual(mUtil.getSummaryType({ "pageprops": { "disambiguation": "" } }),
            'disambiguation');
        assert.deepEqual(mUtil.getSummaryType({}), 'standard');
    });
});
