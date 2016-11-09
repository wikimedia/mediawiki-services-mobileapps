'use strict';

var BBPromise = require('bluebird');
var domino = require('domino');
var api = require('../api-util');
var mUtil = require('../mobile-util');
var mwapi = require('../mwapi');
var parsoid = require('../parsoid-access');
var HTTPError = require('../util').HTTPError;
var NEWS_TEMPLATES = require('../../etc/feed/news-sites');

function removeFragment(href) {
    if (href.indexOf('#') > -1) {
        return href.substring(0, href.indexOf('#'));
    }
    return href;
}

function promise(app, req) {
    var lang = req.params.domain.split('.')[0];
    var aggregated = !!req.query.aggregated;
    if (!NEWS_TEMPLATES[lang]) {
        if (aggregated) {
            return BBPromise.resolve({});
        }
        throw new HTTPError({
            status: 501,
            type: 'unsupported_language',
            title: 'Language not supported',
            detail: 'The language you have requested is not yet supported.'
        });
    }

    var result = {
        payload: [],
        meta: {}
    };
    req.params.title = NEWS_TEMPLATES[lang].title;
    return parsoid.getParsoidHtml(app, req)
    .then(function (response) {
        result.meta.etag = parsoid.getRevisionFromEtag(response.headers);

        var linkTitles = [];
        var doc = domino.createDocument(response.body);
        var newsList = doc.querySelector(NEWS_TEMPLATES[lang].selector);
        var stories = newsList.getElementsByTagName('li');

        for (var j = 0, m = stories.length; j < m; j++) {
            var anchors = stories[j].querySelectorAll('a[rel="mw:WikiLink"]');
            var story = {
                links: []
            };

            for (var i = 0, n = anchors.length; i < n; i++) {
                var href = anchors[i].href;
                var title = removeFragment(href.slice(1));

                if (linkTitles.indexOf(title) === -1) {
                    story.links.push({
                        $merge: [ mUtil.getRbPageSummaryUrl(app, req.params.domain, title) ]
                    });
                    linkTitles.push(title);
                }
            }

            story.story = stories[j].innerHTML;
            result.payload.push(story);
        }
        return result;
    });
}

module.exports = {
    promise: promise,

    // visible for testing
    removeFragment: removeFragment
};
