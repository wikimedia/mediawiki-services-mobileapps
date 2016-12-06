/* eslint-env mocha */

'use strict';

const assert = require('../../utils/assert.js');
const preq   = require('preq');
const server = require('../../utils/server.js');
const headers = require('../../utils/headers.js');

describe('mobile-text', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/mobile-text/Foobar`;
        return headers.checkHeaders(uri, 'application/json');
    });
    it('should have the right meta fields in the JSON response', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/page/mobile-text/Foobar` })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.notDeepEqual(res.body.lastmodified, undefined);
                assert.notDeepEqual(res.body.revision, undefined);
                assert.notDeepEqual(res.body.languagecount, undefined);
                assert.notDeepEqual(res.body.id, undefined);
                assert.notDeepEqual(res.body.protection, undefined);
                assert.notDeepEqual(res.body.editable, undefined);
                assert.deepEqual(res.body.displaytitle, 'Foobar');
            });
    });
    it('should have the right structure of section objects', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/page/mobile-text/Foobar` })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.notDeepEqual(res.body.sections, undefined);
                for (let i = 0; i < res.body.sections.length; i++) {
                    assert.notDeepEqual(res.body.sections[i].id, undefined);
                    assert.notDeepEqual(res.body.sections[i].items, undefined);
                }
            });
    });
    it('should have the right structure of paragraph, image, and video objects', () => {
        const uri = `${server.config.uri}test.wikipedia.org/v1/page/mobile-text/LiteTest`;
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                let numParagraphs = 0;
                let numImages = 0;
                let numVideos = 0;
                for (let i = 0; i < res.body.sections.length; i++) {
                    const section = res.body.sections[i];
                    for (let j = 0; j < section.items.length; j++) {
                        const item = section.items[j];
                        if (item.type === 'p') {
                            assert.notDeepEqual(item.text, undefined);
                            numParagraphs++;
                        } else if (item.type === 'image') {
                            assert.notDeepEqual(item.src, undefined);
                            assert.notDeepEqual(item.name, undefined);
                            numImages++;
                        } else if (item.type === 'video') {
                            assert.notDeepEqual(item.src, undefined);
                            assert.notDeepEqual(item.name, undefined);
                            numVideos++;
                        }
                    }
                }
                assert.notDeepEqual(numParagraphs, 0);
                assert.notDeepEqual(numImages, 0);
                assert.notDeepEqual(numVideos, 0);
            });
    });
});
