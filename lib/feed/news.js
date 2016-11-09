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

function constructStory(restbase_tpl, domain, storyHtml) {
    var story = { links: [] };
    var linkTitles = [];

    var pushMergeLinkForTitle = function(title) {
        this.push({ $merge: [ mUtil.getRbPageSummaryUrl(restbase_tpl, domain, title) ] });
    };

    storyHtml.querySelectorAll('a[rel="mw:WikiLink"]').forEach(function(anchor) {
        var href = anchor.href;
        var title = removeFragment(href.slice(1));

        if (linkTitles.indexOf(title) === -1) {
            pushMergeLinkForTitle.call(story.links, title);
            linkTitles.push(title);
        }
    });

    story.story = storyHtml.innerHTML;
    return story;
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

    req.params.title = NEWS_TEMPLATES[lang].title;
    return parsoid.getParsoidHtml(app, req)
    .then(function (response) {
        var stories = domino.createDocument(response.body)
                            .querySelector(NEWS_TEMPLATES[lang].selector)
                            .getElementsByTagName('li');
        var result = {
            payload: [],
            meta: { etag: parsoid.getRevisionFromEtag(response.headers) }
        };

        Array.prototype.forEach.call(stories, function(storyHtml) {
            result.payload.push(constructStory(app.restbase_tpl, req.params.domain, storyHtml));
        });

        return result;
    });
}

module.exports = {
    promise: promise,

    // visible for testing
    removeFragment: removeFragment,
    constructStory: constructStory
};
