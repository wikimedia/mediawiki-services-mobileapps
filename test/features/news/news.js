'use strict';

var preq = require('preq');
var domino = require('domino');
var news = require('../../../lib/feed/news');
var assert = require('../../utils/assert');
var server = require('../../utils/server');
var headers = require('../../utils/headers');
var constants = require('./constants');

var hrefs = [
    '/Sport_of_athletics',
    '/Kendra_Harrison',
    '/Women\'s_100_metres_hurdles_world_record_progression',
    '/100_metres_hurdles',
    '/100_metres_hurdles#Top_25_fastest_athletes',
    '/London_Grand_Prix'
];

var testTitles = [
    'Kendra_Harrison',
    '100_metres_hurdles'
];

var testTitles2 = [
    'Sport_of_athletics',
    'Kendra_Harrison',
    'Women\'s_100_metres_hurdles_world_record_progression',
    '100_metres_hurdles',
    'London_Grand_Prix'
];

function toElement(str) {
    var elem = domino.createDocument().createElement('li');
    elem.innerHTML = str;
    return elem;
}

describe('in the news', function() {
    this.timeout(20000);

    before(function () { return server.start(); });
    [ 'da', 'de', 'el', 'en', 'es', 'fi', 'fr', 'he', 'ko', 'no', 'pl', 'pt', 'ru', 'sv', 'vi', 'zh' ].forEach(function(lang) {
        it(lang + ': should respond to GET request with expected headers, incl. CORS and CSP headers', function () {
            return headers.checkHeaders(server.config.uri + lang + '.wikipedia.org/v1/page/news',
                'application/json');
        });
        it(lang + ': results list should have expected properties', function () {
            return preq.get({uri: server.config.uri + lang + '.wikipedia.org/v1/page/news'})
                .then(function (res) {
                    assert.deepEqual(res.status, 200);
                    assert.ok(res.body.length);
                    res.body.forEach(function (elem) {
                        assert.ok(elem.story, 'story should be present');
                        assert.ok(elem.links, 'links should be present');
                        elem.links.forEach(function (link) {
                            assert.ok(link.title, 'title should be present');
                            assert.ok(link.missing === undefined, 'no missing links should be present');
                        });
                    });
                });
        });
    });

    it('unsupported language with aggregated=true should return 200', function() {
        return preq.get({
            uri: server.config.uri + 'is.wikipedia.org/v1/page/news',
            query: { aggregated: true }
        })
        .then(function(res) {
            assert.status(res, 200);
            assert.deepEqual(!!res.body, false, 'Expected the body to be empty');
        });
    });

    it('URL fragments should be stripped correctly', function() {
        assert.deepEqual(news.removeFragment('100_metres_hurdles#Top_25_fastest_athletes'), '100_metres_hurdles');
        assert.deepEqual(news.removeFragment('Kendra_Harrison'), 'Kendra_Harrison');
    });

    it('Duplicate titles handled correctly', function() {
        news.pushTitleIfNew(testTitles, {}, 'Kendra_Harrison');
        assert.deepEqual(testTitles, [ 'Kendra_Harrison', '100_metres_hurdles' ]);
        news.pushTitleIfNew(testTitles, {}, news.removeFragment('100_metres_hurdles#Top_25_fastest_athletes'));
        assert.deepEqual(testTitles, [ 'Kendra_Harrison', '100_metres_hurdles' ]);
    });

    it('Links titles list constructed correctly', function() {
        var linkTitles = [];
        for (var i = 0, n = hrefs.length; i < n; i++) {
            news.createLinksList(hrefs[i], linkTitles, { links: [] });
        }
        assert.deepEqual(linkTitles, testTitles2);
    });
});
