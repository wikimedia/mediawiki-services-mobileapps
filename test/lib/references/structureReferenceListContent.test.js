'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
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
    <li><cite class="citation web">foo</cite></li>
    <li><cite class="citation book">bar</cite></li>
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

const oneRefInListOld = `<ol typeof="mw:Extension/references" class="mw-references references" about="#mwt1678">
${simpleDogRef}
</ol>`;
const oneRefInListNew = `<div typeof="mw:Extension/references" about="#mwt1678"><ol class="mw-references references">
${simpleDogRef}
</ol><div>`;

// List_of_most_viewed_YouTube_videos
const mostViewedYoutubeVideosContent = 'Some videos may not be available worldwide due to <a href="./Geolocation_software#Regional_licensing" title="Geolocation software">regional restrictions</a> in certain countries.';
const mostViewedYoutubeVideosOld = `<ol class="mw-references references" typeof="mw:Extension/references" about="#mwt571"><li about="#cite_note-4" id="cite_note-4"><a href="./List_of_most_viewed_YouTube_videos#cite_ref-4" data-mw-group="upper-alpha" rel="mw:referencedBy"><span class="mw-linkback-text">↑ </span></a> <span id="mw-reference-text-cite_note-4" class="mw-reference-text">${mostViewedYoutubeVideosContent}</span></li></ol>`;
const mostViewedYoutubeVideosNew = `<div typeof="mw:Extension/references" about="#mwt571"><ol class="mw-references references"><li about="#cite_note-4" id="cite_note-4"><a href="./List_of_most_viewed_YouTube_videos#cite_ref-4" data-mw-group="upper-alpha" rel="mw:referencedBy"><span class="mw-linkback-text">↑ </span></a> <span id="mw-reference-text-cite_note-4" class="mw-reference-text">${mostViewedYoutubeVideosContent}</span></li></ol></div>`;

// funny business
const attemptedXssRef = `<li about="#cite_note-101" id="cite_note-101">
  <a href="./Dog#cite_ref-101" rel="mw:referencedBy"><span class="mw-linkback-text">&lt;script&gt;alert(1);&lt;/script&gt; </span></a>
  <span id="mw-reference-text-cite_note-101" class="mw-reference-text">&lt;script&gt;alert(2);&lt;/script&gt;</span>
</li>`;

// https://en.wikipedia.org/api/rest_v1/page/html/List_of_highest-grossing_Indian_films/822986388
// Had issue parsing `toirupee` reference
const indianFilmsToIRupeeRefInRef = '<li id="cite_note-toirupee-6"><span class="mw-cite-backlink">^ <a href="#cite_ref-toirupee_6-0"><sup><i><b>a</b></i></sup></a> <a                   href="#cite_ref-toirupee_6-1"><sup><i><b>b</b></i></sup></a> <a href="#cite_ref-toirupee_6-2"><sup><i><b>c</b></i></sup></a></span> <span           class="reference-text"><a rel="nofollow" class="external text" href="https://web.archive.org/web/20130816032924/http://timesofindia.indiatimes.com/business/india-business/Journey-of-Indian-rupee-since-independence/articleshow/21844179.cms">Journey of Indian rupee since independence</a>, <i><a href="/wiki/The_Times_of_India" title="The Times of India">The Times of India</a></i>. Retrieved on 2013-12-01.</span></li>';

// Also having issue parsing ref `181`
const indianFilmsRef181 = `<li id="cite_note-toirupee-6">
    <a href="./List_of_highest-grossing_Indian_films#cite_ref-toirupee_6-0" rel="mw:referencedBy">
        <span class="mw-linkback-text">↑ </span>
    </a>
</li>`;

// https://en.wikipedia.org/api/rest_v1/page/html/Shameless_(U.S._TV_series)/823068141
const noBackLinkRef = `<li id="cite_note-S8renewal-120">
    <span rel="mw:referencedBy"></span>
    <span id="mw-reference-text-cite_note-S8renewal-120" class="mw-reference-text">Foo</span>
</li>`;

describe('lib:structureReferenceListContent', () => {
    let logger;
    let script;

    before(() => {
        const processing = path.join(__dirname, '../../../processing/references.yaml');
        script = yaml.safeLoad(fs.readFileSync(processing));
    });

    beforeEach(() => {
        logger = {
            log: sinon.stub()
        };
    });

    const createDocument = (html) => {
        const doc = domino.createDocument(html);
        transforms.preprocessParsoidHtml(doc, script);
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
            const illegalRef = '<li about="#cite_note-101" id="cite_note-101"><div></div></li>';
            const doc = createDocument(illegalRef);
            assert.deepEqual(
                mut.unit.structureBackLinks(doc.querySelector('li'), logger),
                []);
            assert.ok(logger.log.calledOnce);
        });

        it('text content is escaped', () => {
            const doc = createDocument(attemptedXssRef);
            assert.deepEqual(
                mut.unit.structureBackLinks(doc.querySelector('li'), logger), [{
                    href: './Dog#cite_ref-101',
                    text: '&lt;script&gt;alert(1);&lt;/script&gt;'
                }]);
            assert.ok(logger.log.notCalled);
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

        it('text content is escaped', () => {
            const doc = createDocument(attemptedXssRef);
            assert.deepEqual(
                mut.unit.getReferenceContent(doc.querySelector('span.mw-reference-text')), {
                    html: '&lt;script&gt;alert(2);&lt;/script&gt;',
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
                    href: './Dog#cite_ref-101',
                    text: '↑'
                }],
                content: {
                    html: 'some HTML',
                    type: 'generic'
                },
                id: '101'
            });
            assert.ok(logger.log.notCalled);
        });

        it('two back links + one cite tag', () => {
            const doc = createDocument(twoBacklinksDogRef);
            const result = mut.unit.buildOneReferenceItem(doc.querySelector('li'), logger);
            assert.deepEqual(result, {
                back_links: [{
                    href: './Dog#cite_ref-perri2016_13-0',
                    text: '1'
                }, {
                    href: './Dog#cite_ref-perri2016_13-1',
                    text: '2'
                }],
                content: {
                    html: '<cite class="citation journal">cite 1</cite><span>more HTML</span>',
                    type: 'journal'
                },
                id: 'perri2016-13'
            });
            assert.ok(logger.log.notCalled);
        });

        it('back links in span.mw-cite-backlink', () => {
            const doc = createDocument(indianFilmsToIRupeeRefInRef);
            const result = mut.unit.buildOneReferenceItem(doc.querySelector('li'), logger);
            assert.deepEqual(result, {
                back_links: [
                    { href: '#cite_ref-toirupee_6-0', text: 'a' },
                    { href: '#cite_ref-toirupee_6-1', text: 'b' },
                    { href: '#cite_ref-toirupee_6-2', text: 'c' },
                ],
                content: {
                    html: '<a rel="nofollow" class="external text" href="https://web.archive.org/web/20130816032924/http://timesofindia.indiatimes.com/business/india-business/Journey-of-Indian-rupee-since-independence/articleshow/21844179.cms">Journey of Indian rupee since independence</a>, <i><a href="/wiki/The_Times_of_India" title="The Times of India">The Times of India</a></i>. Retrieved on 2013-12-01.',
                    type: 'generic'
                },
                id: 'toirupee-6'
            });
            assert.ok(logger.log.notCalled);
        });

        it('no content in indianFilmsRef181', () => {
            const doc = createDocument(indianFilmsRef181);
            const result = mut.unit.buildOneReferenceItem(doc.querySelector('li'), logger);
            assert.deepEqual(result, {
                back_links: [
                    { href: './List_of_highest-grossing_Indian_films#cite_ref-toirupee_6-0', text: '↑' }
                ],
                content: {
                    html: '',
                    type: 'generic'
                },
                id: 'toirupee-6'
            });
            assert.ok(logger.log.notCalled);
        });

        it('no back link in Shameless_(U.S._TV_series)', () => {
            const doc = createDocument(noBackLinkRef);
            const result = mut.unit.buildOneReferenceItem(doc.querySelector('li'), logger);
            assert.deepEqual(result, {
                back_links: [],
                content: {
                    html: 'Foo',
                    type: 'generic'
                },
                id: 'S8renewal-120'
            });
            assert.ok(logger.log.calledOnce);
        });
    });

    describe('.buildReferenceList', () => {
        it('one simple reference in list (old)', () => {
            const doc = createDocument(oneRefInListOld);
            const result = mut.buildReferenceList(doc.querySelector('ol.mw-references'), logger);
            assert.deepEqual(result.references_by_id, {
                101: {
                    back_links: [{
                        href: './Dog#cite_ref-101',
                        text: '↑'
                    }],
                    content: {
                        html: 'some HTML',
                        type: 'generic'
                    }
                }
            });
            assert.deepEqual(result.order, [ '101' ]);
            assert.ok(logger.log.notCalled);
        });

        it('one simple reference in list (new)', () => {
            const doc = createDocument(oneRefInListNew);
            const result = mut.buildReferenceList(doc.querySelector('ol.mw-references'), logger);
            assert.deepEqual(result.references_by_id, {
                101: {
                    back_links: [{
                        href: './Dog#cite_ref-101',
                        text: '↑'
                    }],
                    content: {
                        html: 'some HTML',
                        type: 'generic'
                    }
                }
            });
            assert.deepEqual(result.order, [ '101' ]);
            assert.ok(logger.log.notCalled);
        });

        it('one reference in list (old)', () => {
            const doc = createDocument(mostViewedYoutubeVideosOld);
            const result = mut.buildReferenceList(doc.querySelector('ol.mw-references'), logger);
            assert.deepEqual(result.references_by_id, {
                4: {
                    back_links: [{
                        href: './List_of_most_viewed_YouTube_videos#cite_ref-4',
                        text: '↑'
                    }],
                    content: {
                        html: mostViewedYoutubeVideosContent,
                        type: 'generic'
                    }
                }
            });
            assert.deepEqual(result.order, [ '4' ]);
            assert.ok(logger.log.notCalled);
        });

        it('one reference in list (new)', () => {
            const doc = createDocument(mostViewedYoutubeVideosNew);
            const result = mut.buildReferenceList(doc.querySelector('ol.mw-references'), logger);
            assert.deepEqual(result.references_by_id, {
                4: {
                    back_links: [{
                        href: './List_of_most_viewed_YouTube_videos#cite_ref-4',
                        text: '↑'
                    }],
                    content: {
                        html: mostViewedYoutubeVideosContent,
                        type: 'generic'
                    }
                }
            });
            assert.deepEqual(result.order, [ '4' ]);
            assert.ok(logger.log.notCalled);
        });
    });
});
