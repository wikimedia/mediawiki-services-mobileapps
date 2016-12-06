'use strict';

const preq = require('preq');
const domino = require('domino');
const constants = require('./constants');
const Template = require('swagger-router').Template;
const news = require('../../../lib/feed/news');
const summUrl = require('../../../lib/mobile-util').getRbPageSummaryUrl;
const assert = require('../../utils/assert');
const server = require('../../utils/server');
const checkHeaders = require('../../utils/headers').checkHeaders;
const NEWS_TEMPLATES = require('../../../etc/feed/news-sites');

const rbTemplate = new Template({
    method: '{{request.method}}',
    uri: 'https://{{domain}}/api/rest_v1/{+path}',
    query: '{{ default(request.query, {}) }}',
    headers: '{{request.headers}}',
    body: '{{request.body}}'
});

const enwiki = 'en.wikipedia.org';

const testStoryObj = {
    story: constants.newsHtml4,
    links: [
        { $merge: [
            summUrl(rbTemplate, enwiki, 'Sport_of_athletics')
        ] },
        { $merge: [
            summUrl(rbTemplate, enwiki, 'Kendra_Harrison')
        ] },
        { $merge: [
            summUrl(rbTemplate, enwiki, `Women's_100_metres_hurdles_world_record_progression`)
        ] },
        { $merge: [
            summUrl(rbTemplate, enwiki, '100_metres_hurdles')
        ] },
        { $merge: [
            summUrl(rbTemplate, enwiki, 'London_Grand_Prix')
        ] }
    ]
};


describe('in the news', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => { return server.start(); });

    for (const lang in NEWS_TEMPLATES) {
        if ({}.hasOwnProperty.call(NEWS_TEMPLATES, lang)) {
            it(`${lang}: should respond with expected headers, incl. CORS and CSP headers`, () => {
                return checkHeaders(`${server.config.uri}${lang}.wikipedia.org/v1/page/news`,
                    'application/json');
            });

            it(`${lang}: results list should have expected properties`, () => {
                return preq.get({ uri: `${server.config.uri + lang}.wikipedia.org/v1/page/news` })
                    .then((res) => {
                        assert.deepEqual(res.status, 200);
                        assert.ok(res.body.length);
                        res.body.forEach((elem) => {
                            if ({}.hasOwnProperty.call(res.body, elem)) {
                                assert.ok(elem.story, 'story should be present');
                                assert.ok(elem.links, 'links should be present');
                                elem.links.forEach((link) => {
                                    assert.ok(link.$merge, '$merge should be present');
                                    assert.ok(link.missing === undefined,
                                        'no missing links should be present');
                                });
                            }
                        });
                    });
            });
        }
    }

    it('unsupported language with aggregated=true should return 204', () => {
        return preq.get({
            uri: `${server.config.uri}is.wikipedia.org/v1/page/news`,
            query: { aggregated: true }
        })
        .then((res) => {
            assert.status(res, 204);
            assert.deepEqual(!!res.body, false, 'Expected the body to be empty');
        });
    });

    it('URL fragments should be stripped correctly', () => {
        assert.deepEqual(news.removeFragment('100_metres_hurdles#Top_25_fastest_athletes'),
            '100_metres_hurdles');
        assert.deepEqual(news.removeFragment('Kendra_Harrison'), 'Kendra_Harrison');
    });

    it('News story constructed correctly (duplicate titles handled correctly)', () => {
        const html = domino.createDocument(constants.newsHtml3).getElementsByTagName('li')[0];
        const story = news.constructStory(rbTemplate, 'en.wikipedia.org', html);
        assert.deepEqual(story, testStoryObj);
    });
});
