"use strict";

const domino = require('domino');
const assert = require('./../../../utils/assert.js');
const extractLeadIntroduction = require('./../../../../lib/transforms').extractLeadIntroduction;

describe('extractLeadIntroduction', () => {
    it('matches the spec', () => {
        const testCases = [
            // Only the first paragraph is selected
            [
                '<p>One</p><p>Two</p>',
                '<p>One</p>'
            ],
            // Text nodes and children (e.g. b tags) are included in the intro
            [
                '<p><b>Colombo Airport</b> may refer to:</p>',
                '<p><b>Colombo Airport</b> may refer to:</p>'
            ],
            // Lists are included in the lead intro
            [
                '<p><b>Colombo Airport</b> may refer to:</p><ul><li>item</li></ul>',
                '<p><b>Colombo Airport</b> may refer to:</p><ul><li>item</li></ul>'
            ],
            // Tables are not part of the lead introduction.
            [
                '<p><b>Colombo Airport</b> may refer to:</p><ul><li>item</li></ul>' +
                  '<table><tr><td>Text</td></tr></table>',
                '<p><b>Colombo Airport</b> may refer to:</p><ul><li>item</li></ul>'
            ],
            // We take the first available P tag
            [
                '<ul><li>List item</li></ul><p>The lead paragraph is here.</p>',
                '<p>The lead paragraph is here.</p>'
            ],
            // We do not take nested P tags as being the intro.
            [
                '<ul><li>List item</li></ul><div><p>The lead paragraph is not here.</p></div>',
                ''
            ],
            // Initial paragraphs from transclusions are skipped.
            [
                '<p about="#mwt1">Here is some unwanted transcluded content, perhaps an ' +
                  'artifact of a dewiki hatnote.</p><p>Here is the first content paragraph.</p>',
                '<p>Here is the first content paragraph.</p>'
            ],
            // Initial paragraphs from transclusions are accepted if they contain <b> element.
            [
                '<p about="#mwt1">Here is a <b>good first paragraph</b> that happens to be' +
                  'transcluded.</p><p>Second paragraph, we don\'t want this!</p>',
                '<p about="#mwt1">Here is a <b>good first paragraph</b> that happens to be' +
                  'transcluded.</p>'
            ]
        ];

        testCases.forEach((test) => {
            const doc = domino.createDocument(`<html><body>${test[0]}</body></html>`);
            const lead = extractLeadIntroduction(doc);
            assert.equal(lead, test[1]);
        });
    });

    it('Trailing text content is escaped', () => {
        const html = '<p>foo</p>&lt;script&gt;alert(1);&lt;/script&gt;';
        const doc = domino.createDocument(html);
        const lead = extractLeadIntroduction(doc);
        assert.deepEqual(lead, html);
    });
});
