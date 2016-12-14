/**
 * Helper functions for handling blacklisted titles.
 */

'use strict';

const BLACKLIST = require('../../etc/feed/blacklist');
const escape = require('escape-string-regexp');
const HTTPError = require('../util').HTTPError;


/**
 * Articles with less than this proportion of pageviews on either desktop or
 * mobile are likely bot traffic and will be filtered from the output.
 *
 * Must be in the interval [0, 1].
 */
const BOT_FILTER_THRESHOLD = 0.1;

function isBlacklisted(title) {
    return BLACKLIST.indexOf(title) !== -1;
}

function filterSpecialPages(pages, mainPageTitle) {
    const mainPageRegExp = new RegExp(`^${escape(mainPageTitle)}$`, 'i');
    return pages.filter((page) => {
        return page.ns === 0 && !mainPageRegExp.test(page.title);
    });
}

/**
 * Implements an editor-proposed heuristic in which top-pageview articles with
 * almost all desktop pageviews or almost all mobile pageviews, rather than a
 * relatively even mix of the two, are presumed to be inflated by bot traffic
 * and not of sufficient human interest to include in the feed.
 */
function filterBotTraffic(allPlatformsMostRead, desktopMostRead) {

    if (BOT_FILTER_THRESHOLD < 0 || BOT_FILTER_THRESHOLD > 1) {
        throw new HTTPError({
            status: 500,
            type: 'internal_error',
            title: 'Internal error',
            detail: 'An internal error occurred'
        });
    }

    // Create an object with title keys for speedy desktop article lookups when
    // iterating over combined-platform top pageviews
    const desktopArticles = (function() {
        const result = {};
        desktopMostRead.forEach((entry) => {
            result[entry.article] = entry;
        });
        return result;
    }());
    return allPlatformsMostRead.filter((entry) => {
        const title = entry.article;
        const totalViews = entry.views;
        const desktopViews = desktopArticles[title] && desktopArticles[title].views;
        return (desktopViews
            && desktopViews >= totalViews * BOT_FILTER_THRESHOLD
            && desktopViews <= totalViews * (1 - BOT_FILTER_THRESHOLD))
            && !isBlacklisted(title);
    });
}

module.exports = {
    filterSpecialPages,
    filterBotTraffic
};
