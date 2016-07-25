'use strict';

var domino = require('domino');
var api = require('../api-util');
var mUtil = require('../mobile-util');
var mwapi = require('../mwapi');
var parsoid = require('../parsoid-access');
var HTTPError = require('../util').HTTPError;

var newsTemplates = {
    en: 'Template:In_the_news',
    de: 'Wikipedia:Hauptseite/Aktuelles',
    he: 'תבנית:חדשות_ואקטואליה',
    ru: 'Шаблон:Актуальные_события'
};

function removeFragment(href) {
    if (href.indexOf('#') > -1) {
        return href.substring(0, href.indexOf('#'));
    }
    return href;
}

function pushTitleIfNew(linkTitles, story, href) {
    if (linkTitles.indexOf(href) === -1) {
        story.links.push({ title: href });
        linkTitles.push(href);
    }
}

function createLinksList(href, linkTitles, story) {
    pushTitleIfNew(linkTitles, story, removeFragment(href.slice(1)));
}

function promise(app, req, dontThrow) {
    var lang = req.params.domain.split('.')[0];
    if (!newsTemplates[lang]) {
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
    req.params.title = newsTemplates[lang];
    return parsoid.getParsoidHtml(app, req)
    .then(function (response) {
        result.meta.etag = parsoid.getRevisionFromEtag(response.headers);

        var linkTitles = [];
        var doc = domino.createDocument(response.body);
        var newsList = doc.getElementsByTagName('ul')[0];
        var stories = newsList.getElementsByTagName('li');

        for (var j = 0, m = stories.length; j < m; j++) {
            var anchors = stories[j].querySelectorAll('a[rel="mw:WikiLink"]');
            var story = {
                links: []
            };

            for (var i = 0, n = anchors.length; i < n; i++) {
                createLinksList(anchors[i].href, linkTitles, story);
            }

            story.story = stories[j].innerHTML;
            result.payload.push(story);
        }
        return mwapi.getFeedPageListMetadata(app, req, linkTitles.join('|'), true);
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
    promise: promise,

    // visible for testing
    removeFragment: removeFragment,
    pushTitleIfNew: pushTitleIfNew,
    createLinksList: createLinksList
};