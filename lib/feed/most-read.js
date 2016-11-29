/**
 * Most-read article promise and related support functions.
 */

'use strict';

const BBPromise = require('bluebird');
const mUtil = require('../mobile-util');
const api = require('../api-util');
const mwapi = require('../mwapi');
const filterSpecialPages = require('./filter-special');
const dateUtil = require('../dateUtil');
const HTTPError = require('../util').HTTPError;

/**
 * Articles with less than this proportion of pageviews on either desktop or
 * mobile are likely bot traffic and will be filtered from the output.
 *
 * Must be in the interval [0, 1].
 */
const FILTER_THRESHOLD = 0.1;

/**
 * Construct a list of title strings from the array of good article objects.
 */
function constructQueryListFrom(goodTitles) {
    const result = [];
    for (let i = 0, n = goodTitles.length; i < n; i++) {
        result.push(goodTitles[i].article);
    }
    return result;
}

function getTopPageviews(app, req, aggregated) {
    const yesterday = new Date(dateUtil.getRequestedDate(req) - dateUtil.ONE_DAY);
    const year = aggregated ? yesterday.getUTCFullYear() : req.params.yyyy;
    const month = aggregated ? dateUtil.pad(yesterday.getUTCMonth() + 1) : req.params.mm;
    const day = aggregated ? dateUtil.pad(yesterday.getUTCDate()) : req.params.dd;
    const apiDomain = 'wikimedia.org';
    const targetDomain = mUtil.removeTLD(mUtil.mobileToCanonical(req.params.domain));
    const basePath = 'metrics/pageviews/top/%proj/%platform/%y/%m/%d'
                .replace('%proj', targetDomain)
                .replace('%y', year)
                .replace('%m', month)
                .replace('%d', day);

    const desktopPath = basePath.replace('%platform', 'desktop');
    const combinedPath = basePath.replace('%platform', 'all-access');

    const restReq = {
        headers: { accept: 'application/json; charset=utf-8' }
    };

    return BBPromise.props({
        desktop: api.restApiGet(app, apiDomain, desktopPath, restReq),
        combined: api.restApiGet(app, apiDomain, combinedPath, restReq)
    }).then((response) => {
        api.checkResponseStatus(response);
        return response;
    });
}

/**
 * Implements an editor-proposed heuristic in which top-pageview articles with
 * almost all desktop pageviews or almost all mobile pageviews, rather than a
 * relatively even mix of the two, are presumed to be inflated by bot traffic
 * and not of sufficient human interest to include in the feed.
 */
function filterBotTraffic(allPlatformsMostRead, desktopMostRead) {
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
            && desktopViews >= totalViews * FILTER_THRESHOLD
            && desktopViews <= totalViews * (1 - FILTER_THRESHOLD));
    });
}

function promise(app, req) {
    const aggregated = !!req.query.aggregated;
    let goodTitles;
    let resultsDate;

    if (!dateUtil.validate(dateUtil.hyphenDelimitedDateString(req))) {
        if (aggregated) {
            return BBPromise.resolve({});
        }
        dateUtil.throwDateError();
    }

    if (FILTER_THRESHOLD < 0 || FILTER_THRESHOLD > 1) {
        throw new HTTPError({
            status: 500,
            type: 'internal_error',
            title: 'Internal error',
            detail: 'An internal error occurred'
        });
    }

    return getTopPageviews(app, req, aggregated)
    .then((response) => {
        // We're working mainly with the overall list of top pageviews, and cut
        // this off at 50 (the max that can be sent in a single MW API query).
        // We'll keep twice as many desktop-only pageviews for the comparator
        // list to try to account for cases near the edge.  For instance, an
        // article could be #49 on the overall list but #51 on the desktop-only
        // pageviews list.  This way we can still compare desktop vs. overall
        // pageviews for it.
        const QUERY_TITLES = mwapi.API_QUERY_MAX_TITLES;
        const DESKTOP_TITLES = 2 * QUERY_TITLES;

        const combinedResults = response.combined && response.combined.body;
        const desktopResults = response.desktop && response.desktop.body;
        const combinedItems = combinedResults && combinedResults.items;
        const firstCombinedItems = combinedItems && combinedResults.items[0];
        const desktopItems = desktopResults && desktopResults.items;
        const firstDesktopItems = desktopItems && desktopResults.items[0];
        const combinedArticles = firstCombinedItems && firstCombinedItems.articles;
        const combinedArticlesSlice = combinedArticles && combinedArticles.slice(0, QUERY_TITLES);
        const desktopArticles = firstDesktopItems && firstDesktopItems.articles;
        const desktopArticlesSlice = desktopArticles && desktopArticles.slice(0, DESKTOP_TITLES);
        goodTitles = filterBotTraffic(combinedArticlesSlice, desktopArticlesSlice);

        if (mUtil.isEmpty(goodTitles)) {
            mUtil.throw404('No results found.');
        }

        const year = firstCombinedItems.year;
        const month = firstCombinedItems.month;
        const day = firstCombinedItems.day;
        resultsDate = `${year}-${month}-${day}Z`;
        return mwapi.getMostReadMetadata(app, req, constructQueryListFrom(goodTitles).join('|'));
    }).then((response) => {
        api.checkResponseStatus(response);
        const query = response.body && response.body.query;
        const normalizations = query && query.normalized;
        const pages = query && query.pages;
        const mainPageTitle = query && query.general && query.general.mainpage;

        if (mUtil.isEmpty(pages)) {
            mUtil.throw404('No results found.');
        }

        if (normalizations) {
            mUtil.adjustMemberKeys(normalizations, ['article', 'from'], ['title', 'to']);
            mUtil.mergeByProp(goodTitles, normalizations, 'article');
        }

        mUtil.fillInMemberKeys(goodTitles, ['title', 'article']);
        mUtil.mergeByProp(goodTitles, pages, 'title', true);
        goodTitles = filterSpecialPages(goodTitles, mainPageTitle);

        const results = goodTitles.map((entry) => {
            return Object.assign(entry, {
                $merge: [
                    mUtil.getRbPageSummaryUrl(app.restbase_tpl, req.params.domain, entry.article)
                ],
                article: undefined,
                fromencoded: undefined,
                ns: undefined,
                terms: undefined,
                title: undefined,
                revisions: undefined
            });
        });

        if (results.length) {
            return {
                payload: {
                    date: resultsDate,
                    articles: results
                },
                meta: {
                    etag: mUtil.getDateStringEtag(dateUtil.dateStringFrom(req))
                }
            };
        }
        mUtil.throw404('No results found.');
    }).catch((err) => {
        // Catch and handle the error if this is an aggregated request and the
        // pageview data are not yet loaded.
        if (aggregated && err.status === 404) {
            return BBPromise.resolve({});
        }
        throw err;
    });
}

module.exports = {
    promise,

    // visible for testing
    filterBotTraffic
};
