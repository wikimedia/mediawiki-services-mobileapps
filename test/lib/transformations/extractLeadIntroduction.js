"use strict";

const domino = require('domino');
const assert = require('./../../utils/assert.js');
const extractLeadIntroduction = require('./../../../lib/transformations/extractLeadIntroduction');

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
            ]
        ];

        testCases.forEach((test) => {
            const doc = domino.createDocument(`<html><body>${test[0]}</body></html>`);
            const lead = extractLeadIntroduction(doc);
            assert.equal(lead, test[1]);
        });
    });
});
