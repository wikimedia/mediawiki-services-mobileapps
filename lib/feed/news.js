'use strict';

const BBPromise = require('bluebird');
const domino = require('domino');
const api = require('../api-util');
const mUtil = require('../mobile-util');
const mwapi = require('../mwapi');
const parsoid = require('../parsoid-access');
const HTTPError = require('../util').HTTPError;
const NEWS_TEMPLATES = require('../../etc/feed/news-sites');

function removeFragment(href) {
    if (href.indexOf('#') > -1) {
        return href.substring(0, href.indexOf('#'));
    }
    return href;
}

function constructStory(restbase_tpl, domain, storyHtml) {
    const story = { links: [] };
    const linkTitles = [];

    const pushMergeLinkForTitle = function(title) {
        this.push({ $merge: [ mUtil.getRbPageSummaryUrl(restbase_tpl, domain, title) ] });
    };

    storyHtml.querySelectorAll('a[rel="mw:WikiLink"]').forEach(function(anchor) {
        const href = anchor.href;
        const title = removeFragment(href.slice(1));

        if (linkTitles.indexOf(title) === -1) {
            pushMergeLinkForTitle.call(story.links, title);
            linkTitles.push(title);
        }
    });

    story.story = storyHtml.innerHTML;
    return story;
}

function promise(app, req) {
    const lang = req.params.domain.split('.')[0];
    const aggregated = !!req.query.aggregated;

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
        const stories = domino.createDocument(response.body)
                            .querySelector(NEWS_TEMPLATES[lang].selector)
                            .getElementsByTagName('li');
        const result = {
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
