/* eslint-disable max-len */

'use strict';

const domino = require('domino');
const assert = require('./../../../utils/assert.js');
const extractPageIssuesForMetadata = require('./../../../../lib/transforms').extractPageIssuesForMetadata;
const extractPageIssuesForMobileSections = require('./../../../../lib/transforms').extractPageIssuesForMobileSections;

function testMetadataResult(doc, expected) {
    const result = extractPageIssuesForMetadata(doc);
    if (expected) {
        for (let i = 0; i < expected.length; i++) {
            assert.deepEqual(result[i].section, expected[i].section);
            assert.deepEqual(result[i].html, expected[i].html);
            assert.deepEqual(result[i].text, expected[i].text);
        }
    } else {
        assert.deepEqual(result, expected);
    }
}

function testMobileSectionsResult(doc, expected) {
    const result = extractPageIssuesForMobileSections(doc);
    if (expected) {
        for (let i = 0; i < expected.length; i++) {
            assert.deepEqual(result[i].text, expected[i].text);
            assert.deepEqual(result[i].html, undefined);
            assert.deepEqual(result[i].section, undefined);
        }
    } else {
        assert.deepEqual(result, expected);
    }
}

function testMobileSectionsNoRemoveAfterHtml(doc, expected) {
    extractPageIssuesForMobileSections(doc, false);
    assert.deepEqual(doc.outerHTML, expected);
}

function testMobileSectionsRemoveAfterHtml(doc, expected) {
    extractPageIssuesForMobileSections(doc, true);
    assert.deepEqual(doc.outerHTML, expected);
}

describe('extractPageIssues', () => {
    it('single issue', () => {
        const html = '<html><head></head><body><section data-mw-section-id="0">' +
                       '<table class="ambox">' +
                         '<tbody><tr><td>' +
                           '<div class="mbox-text-span">' +
                             '<b>Issue!</b>' +
                           '</div>' +
                         '</td></tr></tbody>' +
                       '</table>' +
                     '</section></body></html>';
        const afterRemoveHtml = '<html><head></head><body><section data-mw-section-id="0"></section></body></html>';
        const doc = domino.createDocument(html);
        testMetadataResult(doc, [ { section: 0, html: '<b>Issue!</b>', text: 'Issue!' } ]);
        testMobileSectionsResult(doc, [ { text: '<b>Issue!</b>' } ]);
        testMobileSectionsNoRemoveAfterHtml(doc, html);
        testMobileSectionsRemoveAfterHtml(doc, afterRemoveHtml);
    });

    it('multiple issues', () => {
        const html = '<html><head></head><body><section data-mw-section-id="0">' +
                       '<table class="ambox ambox-multiple_issues">' +
                         '<tbody><tr><td>' +
                           '<div class="mbox-text-span">' +
                             '<div class="mw-collapsible">' +
                               '<div class="mw-collapsible-content">' +
                                 '<table class="ambox">' +
                                   '<tbody><tr><td>' +
                                     '<div class="mbox-text-span">' +
                                       '<b>First issue!</b>' +
                                     '</div>' +
                                   '</td></tr></tbody>' +
                                 '</table>' +
                                 '<table class="ambox">' +
                                   '<tbody><tr><td>' +
                                     '<div class="mbox-text-span">' +
                                       '<b>Second issue!</b>' +
                                     '</div>' +
                                   '</td></tr></tbody>' +
                                 '</table>' +
                               '</div>' +
                             '</div>' +
                           '</div>' +
                         '</td></tr></tbody>' +
                       '</table>' +
                     '</section></body></html>';
        const afterRemoveHtml = '<html><head></head><body><section data-mw-section-id="0"></section></body></html>';
        const doc = domino.createDocument(html);
        testMetadataResult(doc, [
            { section: 0, html: '<b>First issue!</b>', text: 'First issue!' },
            { section: 0, html: '<b>Second issue!</b>', text: 'Second issue!' },
        ]);
        testMobileSectionsResult(doc, [
            { text: '<b>First issue!</b>' },
            { text: '<b>Second issue!</b>' }
        ]);
        testMobileSectionsNoRemoveAfterHtml(doc, html);
        testMobileSectionsRemoveAfterHtml(doc, afterRemoveHtml);
    });

    it('issue in non-lead section', () => {
        const html = '<html><head></head><body><section data-mw-section-id="0">Foo</section>' +
                     '<section data-mw-section-id="1">' +
                       '<table class="ambox">' +
                         '<tbody><tr><td>' +
                           '<div class="mbox-text-span">' +
                             '<b>Issue!</b>' +
                           '</div>' +
                         '</td></tr></tbody>' +
                       '</table>' +
                     '</section></body></html>';
        const doc = domino.createDocument(html);
        testMetadataResult(doc, [ { section: 1, html: '<b>Issue!</b>', text: 'Issue!' } ]);
        testMobileSectionsResult(doc, undefined);
        testMobileSectionsNoRemoveAfterHtml(doc, html);
        testMobileSectionsRemoveAfterHtml(doc, html);
    });

    it('no issues', () => {
        const html = '<html><head></head><body><section data-mw-section-id="0">Foo</section></body></html>';
        const doc = domino.createDocument(html);
        testMetadataResult(doc, undefined);
        testMobileSectionsResult(doc, undefined);
        testMobileSectionsNoRemoveAfterHtml(doc, html);
        testMobileSectionsRemoveAfterHtml(doc, html);
    });
});
