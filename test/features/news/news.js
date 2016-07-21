'use strict';

var preq = require('preq');
var domino = require('domino');
var assert = require('../../utils/assert');
var server = require('../../utils/server');
var headers = require('../../utils/headers');
var constants = require('./constants');


function toElement(str) {
    var elem = domino.createDocument().createElement('li');
    elem.innerHTML = str;
    return elem;
}

describe('in the news', function() {
    this.timeout(20000);

    before(function () { return server.start(); });

    [ 'de', 'en', 'he', 'ru' ].forEach(function(lang) {
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
                            assert.ok(link.pageid, 'page id should be present >>> ' + JSON.stringify(link));
                            assert.ok(link.ns !== undefined, 'namespace should be present'); // 0 is falsey but good
                            assert.ok(link.title, 'title should be present');
                            assert.ok(link.normalizedtitle, 'normalized title should be present');
                            if (link.thumbnail) {
                                assert.ok(link.thumbnail.source, 'thumbnail should have source URL');
                            }
                        });
                    });
                });
        });
    });
});