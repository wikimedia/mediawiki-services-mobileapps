'use strict';

const assert = require('../../utils/assert.js');
const domino = require('domino');
const transforms = require('../../../lib/transforms');

describe('lib:size-transforms', () => {
    const buildHtml = (title) => {
        return domino.createDocument('<body>'
            + '<span class="mw-ref">'
            + `<a href="${title}#cite_note-foo"><span>[1]</span></a>`
            + '</span>'
            + '<span class="mw-ref">'
            + `<a href="${title}#cite_note-foo"><span>[2]</span></a>`
            + '</span>'
            + '<span class="mw-ref">'
            + `<a href="anythingElse${title}#cite_note-foo"><span>[2]</span></a>`
            + '</span>'
            + '</body>');
    };

    const buildHtml2 = () => {
        return domino.createDocument('<body>'
            + '<span class="mw-ref">'
            + `<a href="A_&quot;B&quot;_C#cite_note-foo"><span>[1]</span></a>`
            + '</span>'
            + '<span class="mw-ref">'
            + `<a href="A_&quot;B&quot;_C#cite_note-foo"><span>[2]</span></a>`
            + '</span>'
            + '<span class="mw-ref">'
            + `<a href="anythingElseA_&quot;B&quot;_C#cite_note-foo"><span>[2]</span></a>`
            + '</span>'
            + '</body>');
    };

    const buildHtml3 = () => {
        return domino.createDocument('<body>'
            + '<span class="mw-reference-text">'
            + '<a href="./Seven_Years\'_War#cite_note-foo">Fish 2003</a>'
            + '</span>'
            + '<span class="mw-reference-text">'
            + '<a href="./Seven_Years\'_War#cite_note-foo">Fish 2003</a>'
            + '</span>'
            + '</body>');
    };

    const testShortenPageInternalLinks = (doc, title, selectorTitle) => {
        assert.selectorExistsNTimes(doc, `a[href^=${selectorTitle}]`, 2,
            `before: did not find href starting with '${selectorTitle}' in ${doc.innerHTML}`);
        transforms.shortenPageInternalLinks(doc, title);
        assert.selectorExistsNTimes(doc, 'a[href=#cite_note-foo]', 2,
            `after: did not find href starting with '#cite_note-foo' in ${doc.innerHTML}`);
    };

    it('shortenPageInternalLinks should remove the title in the href', () => {
        const title = 'Test_page';
        testShortenPageInternalLinks(buildHtml(title), title, title);
    });

    it('shortenPageInternalLinks with single quote and space', () => {
        const title = 'Seven_Years\'_War';
        testShortenPageInternalLinks(buildHtml(title), title, 'Seven_Years');
    });

    it('shortenPageInternalLinks with colon and single quote', () => {
        const title = 'Wikipedia:Today\'s_featured_article%2FNovember%207,_2016';
        testShortenPageInternalLinks(buildHtml(title), title, 'Wikipedia:Today');
    });

    it('shortenPageInternalLinks with special chars', () => {
        // https://www.mediawiki.org/wiki/Manual:$wgLegalTitleChars -- except ' and "
        const title = '%!$&()*,\\-.\\/0-9:;=?@A-Z\\\\^_`a-z~\\x80-\\xFF+';
        testShortenPageInternalLinks(buildHtml(title), title, title);
    });

    it('shortenPageInternalLinks with double quote', () => {
        const title = 'A_"B"_C';
        testShortenPageInternalLinks(buildHtml2(), title, 'A_');
    });

    it('shortenPageInternalLinks with single quote and startsWith ./', () => {
        const title = 'Seven_Years\'_War';
        testShortenPageInternalLinks(buildHtml3('./Seven_Years\'_War'), title, './Seven_Years');
    });
});
