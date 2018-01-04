'use strict';

const assert = require('../../utils/assert.js');
const mut = require('../../../lib/references/structureReferenceListContent.js');
const transforms = require('../../../lib/transforms');
const domino = require('domino');
const sinon = require('sinon');

/* eslint-disable max-len */
// Examples adopted from https://en.wikipedia.org/api/rest_v1/page/html/Dog/793160878
const simpleDogRef = `<li about="#cite_note-101" id="cite_note-101">
  <a href="./Dog#cite_ref-101" rel="mw:referencedBy"><span class="mw-linkback-text">↑ </span></a>
  <span id="mw-reference-text-cite_note-101" class="mw-reference-text">some HTML</span>
</li>`;

const twoBacklinksDogRef = `<li about="#cite_note-perri2016-13" id="cite_note-perri2016-13">
<span rel="mw:referencedBy">
<a href="./Dog#cite_ref-perri2016_13-0"><span class="mw-linkback-text">1 </span></a>
<a href="./Dog#cite_ref-perri2016_13-1"><span class="mw-linkback-text">2 </span></a>
</span>
<span id="mw-reference-text-cite_note-perri2016-13" class="mw-reference-text">
<cite class="citation journal">cite 1</cite>
<span>more HTML</span>
</span>
</li>`;

// Example adopted from https://en.wikipedia.org/api/rest_v1/page/html/Barack_Obama/795995847
const ulRefContent = `<ul>
    <li> <cite class="citation web">foo</cite> </li>
    <li> <cite class="citation book">bar</cite> </li>
</ul>`;
const ulRef = `<li about="#cite_note-Merriam-Webster_Dictionary-1" id="cite_note-Merriam-Webster_Dictionary-1">
<a href="./Barack_Obama#cite_ref-Merriam-Webster_Dictionary_1-0" rel="mw:referencedBy">
<span class="mw-linkback-text">↑ </span></a>
<span id="mw-reference-text-cite_note-Merriam-Webster_Dictionary-1" class="mw-reference-text">
${ulRefContent}</span></li>`;

// Example adopted from List_of_highest-grossing_Indian_films/797890359
const indianFilmsRefContent = `<i>Awaara</i>: <span>₹</span>5.75 crore (US$12.08 million) in 1954 (
<span>₹</span>739 crore (US$110 million) in 2016)
<ul><li>India: <span>₹</span>2.3 crore
<span><a><span class="mw-reflink-text">[137]</span></a></span>
 (US$4.83 million)<span><a>[n 21]</a></span></li>
</ul>`;
const indianFilmsRef = `<li about="#cite_note-Awaara-157" id="cite_note-Awaara-157">
<a href="./List_of_highest-grossing_Indian_films#cite_ref-Awaara_157-0" data-mw-group="n" rel="mw:referencedBy">
<span class="mw-linkback-text">↑ </span></a> <span id="mw-reference-text-cite_note-Awaara-157" class="mw-reference-text">
${indianFilmsRefContent}</span></li>`;

const oneRefInList = `<ol typeof="mw:Extension/references" class="mw-references" about="#mwt1678">
${simpleDogRef}
</ol>`;

// List_of_most_viewed_YouTube_videos
const mostViewedYoutubeVideosContent = `Some videos may not be available worldwide due to <a href="./Geolocation_software#Regional_licensing" title="Geolocation software">regional restrictions</a> in certain countries.`;
const mostViewedYoutubeVideos = `<ol class="mw-references" typeof="mw:Extension/references" about="#mwt571"><li about="#cite_note-4" id="cite_note-4"><a href="./List_of_most_viewed_YouTube_videos#cite_ref-4" data-mw-group="upper-alpha" rel="mw:referencedBy"><span class="mw-linkback-text">↑ </span></a> <span id="mw-reference-text-cite_note-4" class="mw-reference-text">${mostViewedYoutubeVideosContent}</span></li>`;

describe('lib:structureReferenceListContent', () => {
    let logger;

    beforeEach(() => {
        logger = {
            log: sinon.stub()
        };
    });

    const createDocument = (html) => {
        const doc = domino.createDocument(html);
        transforms.stripUnneededReferenceMarkup(doc);
        return doc;
    };

    describe('.structureBackLinks', () => {
        it('one back link', () => {
            const doc = createDocument(simpleDogRef);
            assert.deepEqual(
                mut.unit.structureBackLinks(doc.querySelector('li'), logger), [{
                    href: './Dog#cite_ref-101',
                    text: '↑'
                }]);
            assert.ok(logger.log.notCalled);
        });

        it('two back links', () => {
            const doc = createDocument(twoBacklinksDogRef);
            assert.deepEqual(
                mut.unit.structureBackLinks(doc.querySelector('li'), logger), [ {
                    href: './Dog#cite_ref-perri2016_13-0',
                    text: '1'
                }, {
                    href: './Dog#cite_ref-perri2016_13-1',
                    text: '2'
                }]
            );
            assert.ok(logger.log.notCalled);
        });

        it('unexpected child element should emit logging', () => {
            // a <li> without a <span> nor <a>
            const illegalRef = `<li about="#cite_note-101" id="cite_note-101"><div></div></li>`;
            const doc = createDocument(illegalRef);
            assert.deepEqual(
                mut.unit.structureBackLinks(doc.querySelector('li'), logger),
                []);
            assert.ok(logger.log.calledOnce);
        });
    });

    describe('.getReferenceContent', () => {
        it('no citation', () => {
            const doc = createDocument(simpleDogRef);
            assert.deepEqual(
                mut.unit.getReferenceContent(doc.querySelector('span.mw-reference-text')), {
                    html: 'some HTML',
                    type: 'generic'
                });
            assert.ok(logger.log.notCalled);
        });

        it('one citation', () => {
            const doc = createDocument(twoBacklinksDogRef);
            assert.deepEqual(
                mut.unit.getReferenceContent(doc.querySelector('span.mw-reference-text')), {
                    html: '<cite class="citation journal">cite 1</cite><span>more HTML</span>',
                    type: 'journal'
                });
            assert.ok(logger.log.notCalled);
        });

        it('<ul>', () => {
            const doc = createDocument(ulRef);
            assert.deepEqual(
                mut.unit.getReferenceContent(doc.querySelector('span.mw-reference-text')), {
                    html: ulRefContent,
                    type: 'generic'
                });
            assert.ok(logger.log.notCalled);
        });

        it('single <ul> child', () => {
            const doc = createDocument(indianFilmsRef);
            assert.deepEqual(
                mut.unit.getReferenceContent(doc.querySelector('span.mw-reference-text')), {
                    html: indianFilmsRefContent,
                    type: 'generic'
                });
            assert.ok(logger.log.notCalled);
        });
    });

    describe('.buildOneReferenceItem', () => {
        it('simple ref', () => {
            const doc = createDocument(simpleDogRef);
            const result = mut.unit.buildOneReferenceItem(doc.querySelector('li'), logger);
            assert.deepEqual(result, {
                back_links: [{
                    "href": "./Dog#cite_ref-101",
                    "text": "↑"
                }],
                content: 'some HTML',
                type: 'generic',
                id: '101'
            });
            assert.ok(logger.log.notCalled);
        });

        it('two back links + one cite tag', () => {
            const doc = createDocument(twoBacklinksDogRef);
            const result = mut.unit.buildOneReferenceItem(doc.querySelector('li'), logger);
            assert.deepEqual(result, {
                back_links: [{
                    "href": "./Dog#cite_ref-perri2016_13-0",
                    "text": "1"
                }, {
                    "href": "./Dog#cite_ref-perri2016_13-1",
                    "text": "2"
                }],
                content: '<cite class="citation journal">cite 1</cite><span>more HTML</span>',
                type: 'journal',
                id: 'perri2016-13'
            });
            assert.ok(logger.log.notCalled);
        });
    });

    describe('.buildReferenceList', () => {
        it('one simple reference in list', () => {
            const doc = createDocument(oneRefInList);
            const result = mut.buildReferenceList(doc.querySelector('ol'), logger);
            assert.deepEqual(result.references, {
                '101': {
                    back_links: [{
                        "href": "./Dog#cite_ref-101",
                        "text": "↑"
                    }],
                    content: 'some HTML',
                    type: 'generic'
                }
            });
            assert.deepEqual(result.order, [ '101' ]);
            assert.ok(logger.log.notCalled);
        });

        it('one reference in list', () => {
            const doc = createDocument(mostViewedYoutubeVideos);
            const result = mut.buildReferenceList(doc.querySelector('ol'), logger);
            assert.deepEqual(result.references, {
                '4': {
                    back_links: [{
                        "href": "./List_of_most_viewed_YouTube_videos#cite_ref-4",
                        "text": "↑"
                    }],
                    content: mostViewedYoutubeVideosContent,
                    type: 'generic'
                }
            });
            assert.deepEqual(result.order, [ '4' ]);
            assert.ok(logger.log.notCalled);
        });
    });
});
