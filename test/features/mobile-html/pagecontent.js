'use strict';

const domino = require('domino');
const preq   = require('preq');
const assert = require('../../utils/assert.js');
const server = require('../../utils/server.js');

describe('mobile-html', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

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
            // children[0] is the container span for the edit button.
            assert.ok(section0.children[1].outerHTML.startsWith(`<p>The <b>domestic dog</b>`));
        });
    });

});
