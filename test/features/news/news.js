'use strict';

const preq = require('preq');
const domino = require('domino');
const Template = require('swagger-router').Template;
const news = require('../../../lib/feed/news');
const mUtil = require('../../../lib/mobile-util');
const assert = require('../../utils/assert');
const server = require('../../utils/server');
const headers = require('../../utils/headers');
const NEWS_TEMPLATES = require('../../../etc/feed/news-sites');

const mock_restbase_tpl = new Template({
    method: '{{request.method}}',
    uri: 'https://{{domain}}/api/rest_v1/{+path}',
    query: '{{ default(request.query, {}) }}',
    headers: '{{request.headers}}',
    body: '{{request.body}}'
});

const testStoryHtml = '<li id="mwCA"><!--July 22--> In <a rel="mw:WikiLink" href="./Sport_of_athletics" title="Sport of athletics" id="mwCQ">athletics</a>, American sprinter <a rel="mw:WikiLink" href="./Kendra_Harrison" title="Kendra Harrison" id="mwCg">Kendra Harrison</a> breaks the <a rel="mw:WikiLink" href="./Women\'s_100_metres_hurdles_world_record_progression" title="Women\'s 100 metres hurdles world record progression" id="mwCw">28-year-old</a> <a rel="mw:WikiLink" href="./100_metres_hurdles" title="100 metres hurdles" id="mwDA">100 metres hurdles</a> <b id="mwDQ"><a rel="mw:WikiLink" href="./100_metres_hurdles#Top_25_fastest_athletes" title="100 metres hurdles" id="mwDg">world record</a></b> at the <a rel="mw:WikiLink" href="./London_Grand_Prix" title="London Grand Prix" id="mwDw">London Grand Prix</a>.</li>';

const testStoryObj = {
    story: '<!--July 22--> In <a rel="mw:WikiLink" href="./Sport_of_athletics" title="Sport of athletics" id="mwCQ">athletics</a>, American sprinter <a rel="mw:WikiLink" href="./Kendra_Harrison" title="Kendra Harrison" id="mwCg">Kendra Harrison</a> breaks the <a rel="mw:WikiLink" href="./Women\'s_100_metres_hurdles_world_record_progression" title="Women\'s 100 metres hurdles world record progression" id="mwCw">28-year-old</a> <a rel="mw:WikiLink" href="./100_metres_hurdles" title="100 metres hurdles" id="mwDA">100 metres hurdles</a> <b id="mwDQ"><a rel="mw:WikiLink" href="./100_metres_hurdles#Top_25_fastest_athletes" title="100 metres hurdles" id="mwDg">world record</a></b> at the <a rel="mw:WikiLink" href="./London_Grand_Prix" title="London Grand Prix" id="mwDw">London Grand Prix</a>.',
    links: [
        { $merge: [ mUtil.getRbPageSummaryUrl(mock_restbase_tpl, 'en.wikipedia.org', 'Sport_of_athletics') ] },
        { $merge: [ mUtil.getRbPageSummaryUrl(mock_restbase_tpl, 'en.wikipedia.org', 'Kendra_Harrison') ] },
        { $merge: [ mUtil.getRbPageSummaryUrl(mock_restbase_tpl, 'en.wikipedia.org', 'Women\'s_100_metres_hurdles_world_record_progression') ] },
        { $merge: [ mUtil.getRbPageSummaryUrl(mock_restbase_tpl, 'en.wikipedia.org', '100_metres_hurdles') ] },
        { $merge: [ mUtil.getRbPageSummaryUrl(mock_restbase_tpl, 'en.wikipedia.org', 'London_Grand_Prix') ] }
    ]
};

function toElement(str) {
    const elem = domino.createDocument().createElement('li');
    elem.innerHTML = str;
    return elem;
}

describe('in the news', function() {
    this.timeout(20000);

    before(() => { return server.start(); });
    for (const lang in NEWS_TEMPLATES) {
        it(`${lang}: should respond to GET request with expected headers, incl. CORS and CSP headers`, () => {
            return headers.checkHeaders(`${server.config.uri + lang}.wikipedia.org/v1/page/news`,
                'application/json');
        });
        it(`${lang}: results list should have expected properties`, () => {
            return preq.get({ uri: `${server.config.uri + lang}.wikipedia.org/v1/page/news` })
                .then((res) => {
                    assert.deepEqual(res.status, 200);
                    assert.ok(res.body.length);
                    res.body.forEach((elem) => {
                        assert.ok(elem.story, 'story should be present');
                        assert.ok(elem.links, 'links should be present');
                        elem.links.forEach((link) => {
                            assert.ok(link.$merge, '$merge should be present');
                            assert.ok(link.missing === undefined, 'no missing links should be present');
                        });
                    });
                });
        });
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
        assert.deepEqual(news.removeFragment('100_metres_hurdles#Top_25_fastest_athletes'), '100_metres_hurdles');
        assert.deepEqual(news.removeFragment('Kendra_Harrison'), 'Kendra_Harrison');
    });

    it('News story constructed correctly (duplicate titles handled correctly)', () => {
        const html = domino.createDocument(testStoryHtml).getElementsByTagName('li')[0];
        const story = news.constructStory(mock_restbase_tpl, 'en.wikipedia.org', html);
        assert.deepEqual(story, testStoryObj);
    });
});
