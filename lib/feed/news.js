'use strict';

var domino = require('domino');
var api = require('../api-util');
var mUtil = require('../mobile-util');
var mwapi = require('../mwapi');
var parsoid = require('../parsoid-access');
var HTTPError = require('../util').HTTPError;

function promise(app, req, dontThrow) {
    if (req.params.domain.indexOf('en.') !== 0) {
        if (dontThrow) {
            return { payload: undefined, meta: undefined };
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
    req.params.title = 'Template:In_the_news';
    return parsoid.getParsoidHtml(app, req)
    .then(function (response) {
        result.meta.etag = parsoid.getRevisionFromEtag(response.headers);

        var linkTitles = [];
        var doc = domino.createDocument(response.body);
        var newsList = doc.getElementsByTagName('ul')[0];
        var stories = newsList.getElementsByTagName('li');

        for (var j = 0, m = stories.length; j < m; j++) {
            var anchors = stories[j].getElementsByTagName('a');
            var story = {
                story: stories[j].innerHTML,
                links: []
            };

            for (var i = 0, n = anchors.length; i < n; i++) {
                var anchor = anchors[i];
                var title = anchor.href.slice(1);
                story.links.push({ title: title });
                linkTitles.push(title);
            }

            result.payload.push(story);
        }
        return mwapi.getFeedPageListMetadata(app, req, linkTitles.join('|'));
    }).then(function(response) {
        api.checkResponseStatus(response);

        var query = response.body && response.body.query;
        var normalizations = query && query.normalized;
        var pages = query && query.pages;

        mUtil.adjustMemberKeys(normalizations, [['title', 'from'],
                                                ['normalizedtitle', 'to']]);
        mUtil.adjustMemberKeys(pages, [['normalizedtitle', 'title']]);
        mUtil.mergeByProp(pages, normalizations, 'normalizedtitle');
        mUtil.fillInMemberKeys(pages, [['title', 'normalizedtitle']]);

        var pageResults = {};

        pages.forEach(function(page) {
            pageResults[page.title] = Object.assign(page, {
                description: page.terms
                             && page.terms.description
                             && page.terms.description[0],
                terms: undefined
            });
        });

        result.payload.forEach(function(story) {
            mUtil.mergeByProp(story.links, pageResults, 'title', false);
        });

        return result;
    });
}

module.exports = {
    promise: promise
};