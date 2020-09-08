'use strict';

const domino = require('domino');
const preq   = require('preq');
const assert = require('../../utils/assert.js');
const server = require('../../utils/server.js');

describe('mobile-html', function() {

    this.timeout(20000);

    before(() => server.start());

    const localUri = (title, domain = 'en.wikipedia.org') => {
        return `${server.config.uri}${domain}/v1/page/mobile-html/${title}`;
    };

    it('HTML should be sectioned', () => {
        const uri = localUri('Foobar/788941783');
        return preq.get({ uri })
        .then((res) => {
            const document = domino.createDocument(res.body);
            assert.selectorExistsNTimes(document, 'section', 7, 'should have 7 sections');
        });
    });

    it('mobile-html should have css links + viewport set', () => {
        const uri = localUri('Foobar/788941783');
        return preq.get({ uri })
        .then((res) => {
            const document = domino.createDocument(res.body);
            assert.selectorExistsNTimes(document, 'html > head > link[rel=stylesheet]', 3,
                'should have 3 css files');
            assert.selectorExistsNTimes(document, 'html > head > meta[name=viewport]', 1,
                'should have 1 meta element setting viewport');
        });
    });

    it('mobile-html should have lead paragraph moved up', () => {
        const uri = localUri('Dog/844680047');
        return preq.get({ uri })
        .then((res) => {
            const document = domino.createDocument(res.body);
            const section0 = document.querySelector('section[data-mw-section-id=0]');
            // children[0] edit button
            // children[1] 1st hatnote
            // children[2] 2nd hatnote
            assert.ok(section0.children[3].outerHTML.startsWith('<p>The <b>domestic dog</b>'));
        });
    });

    it('mobile-html should not have navboxes', () => {
        const uri = localUri('Cat');
        return preq.get({ uri })
        .then((res) => {
            const document = domino.createDocument(res.body);
            assert.selectorDoesNotExist(document, 'div.navbox', 'Document contain navboxes');
        });
    });

    it('mobile-html should have meta tags indicating page protection', () => {
        const uri = localUri('Elmo/916610952', 'en.wikipedia.org');
        return preq.get(uri).then((res) => {
            const document = domino.createDocument(res.body);
            const edit = document.querySelector('meta[property=mw:pageProtection:edit]');
            assert.deepEqual(edit.getAttribute('content'), 'autoconfirmed');
            const move = document.querySelector('meta[property=mw:pageProtection:move]');
            assert.deepEqual(move.getAttribute('content'), 'sysop');
        });
    });

    it('mobile-html from mobileview should have meta tags indicating page protection', () => {
        const uri = localUri('%E9%97%87%E5%BD%B1%E4%B9%8B%E5%BF%83/54664518', 'zh.wikipedia.org');
        return preq.get(uri).then((res) => {
            const document = domino.createDocument(res.body);
            const meta = document.querySelector('meta[property=mw:pageProtection:edit]');
            assert.deepEqual(meta.getAttribute('content'), 'autoconfirmed');
        });
    });

});
