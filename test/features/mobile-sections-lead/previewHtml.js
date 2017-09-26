'use strict';

const assert = require('../../utils/assert.js');
const preq   = require('preq');
const server = require('../../utils/server.js');

describe('summary', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => { return server.start(); });

    it('200 For a page that does exist', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/summary/Barack Obama`;
        return preq.get({ uri })
            .then((res) => {
                assert.ok(res.status === 200);
            });
    });

    it('404 For a page that doesn\'t exist', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/summary/ashsahahash`;
        return preq.get({ uri })
            .catch((res) => {
                assert.ok(res.status === 404, 'Pages that do not exist 404');
            });
    });

    it('204 for pages that are not wikitext', () => {
        const title = 'Schema:RelatedArticles';
        const uri = `${server.config.uri}meta.wikimedia.org/v1/page/summary/${title}`;
        return preq.get({ uri })
            .then((res) => {
                assert.ok(res.status === 204, 'If not wikitext we send 204');
            });
    });

    it('204 for pages outside content namespace', () => {
        const title = 'Talk:Barack Obama';
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/summary/${title}`;
        return preq.get({ uri })
            .then((res) => {
                assert.ok(res.status === 204, 'If not in main namespace we send 204');
            });
    });

    it('204 for pages that are redirects', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/page/summary/Barack`;
        return preq.get({ uri })
            .then((res) => {
                assert.ok(res.status === 204, 'Redirect pages are resolved to 204');
            });
    });
});
