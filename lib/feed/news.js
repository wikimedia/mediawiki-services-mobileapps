'use strict';

const BBPromise = require('bluebird');
const mUtil = require('../mobile-util');
const parsoid = require('../parsoid-access');
const HTTPError = require('../util').HTTPError;
const rmElements = require('../transforms').rmElements;
const NEWS_TEMPLATES = require('../../etc/feed/news-sites');

function constructStory(restbaseTpl, domain, lang, storyHtml) {
    const story = { links: [] };
    const linkTitles = [];

    const topicAnchor = storyHtml.querySelector(NEWS_TEMPLATES[lang].topicAnchorSelector);
    const topicTitle = mUtil.extractDbTitleFromAnchor(topicAnchor);
    storyHtml.querySelectorAll('a[rel="mw:WikiLink"]').forEach((anchor) => {
        const storyTitle = mUtil.extractDbTitleFromAnchor(anchor);
        if (linkTitles.indexOf(storyTitle) === -1) {
            story.links.splice(storyTitle === topicTitle ? 0 : story.links.length, 0, {
                $merge: [ mUtil.getRbPageSummaryUrl(restbaseTpl, domain, storyTitle) ]
            });
            linkTitles.push(storyTitle);
        }
    });

    rmElements(storyHtml, 'span[style^=float:right]');
    story.story = storyHtml.innerHTML;
    if (story.story.length > 0 && story.links.length > 0) {
        return story;
    } else {
        return undefined;
    }
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
    .then((response) => {
        const selector = NEWS_TEMPLATES[lang].headlineSelectorAll;
        const result = {
            payload: [],
            meta: { etag: parsoid.getRevisionFromEtag(response.headers) }
        };
        return mUtil.createDocument(response.body)
        .then((doc) => {
            const headlines = doc.querySelectorAll(selector);

            Array.prototype.forEach.call(headlines, (storyHtml) => {
                const story = constructStory(app.restbase_tpl, req.params.domain, lang, storyHtml);
                if (story) {
                    result.payload.push(story);
                }
            });

            return result;
        });
    });
}

module.exports = {
    promise,

    // visible for testing
    constructStory
};
