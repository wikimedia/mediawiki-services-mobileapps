/**
 * Most-read article promise and related support functions.
 */

'use strict';

var BBPromise = require('bluebird');
var mUtil = require('../mobile-util');
var api = require('../api-util');
var mwapi = require('../mwapi');
var filterSpecialPages = require('./filter-special');
var dateUtil = require('../dateUtil');
var HTTPError = require('../util').HTTPError;

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
    var result = [];
    for (var i = 0, n = goodTitles.length; i < n; i++) {
        result.push(goodTitles[i].article);
    }
    return result;
}

function getTopPageviews(app, req, aggregated) {
    var yesterday = new Date(dateUtil.getRequestedDate(req) - dateUtil.ONE_DAY);
    var year = aggregated ? yesterday.getUTCFullYear() : req.params.yyyy;
    var month = aggregated ? dateUtil.pad(yesterday.getUTCMonth() + 1) : req.params.mm;
    var day = aggregated ? dateUtil.pad(yesterday.getUTCDate()) : req.params.dd;
    var apiDomain = 'wikimedia.org';
    var targetDomain = mUtil.removeTLD(mUtil.mobileToCanonical(req.params.domain));
    var basePath = 'metrics/pageviews/top/%proj/%platform/%y/%m/%d'
                .replace('%proj', targetDomain)
                .replace('%y', year)
                .replace('%m', month)
                .replace('%d', day);

    var desktopPath = basePath.replace('%platform', 'desktop');
    var combinedPath = basePath.replace('%platform', 'all-access');

    var restReq = {
        headers: { accept: 'application/json; charset=utf-8' }
    };

    return BBPromise.props({
        desktop: api.restApiGet(app, apiDomain, desktopPath, restReq),
        combined: api.restApiGet(app, apiDomain, combinedPath, restReq)
    }).then(function(response) {
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
    var desktopArticles = (function() {
        var result = {};
        desktopMostRead.forEach(function(entry) {
            result[entry.article] = entry;
        });
        return result;
    })();
    return allPlatformsMostRead.filter(function(entry) {
        var title = entry.article;
        var totalViews = entry.views;
        var desktopViews = desktopArticles[title] && desktopArticles[title].views;
        return (desktopViews
            && desktopViews >= totalViews * FILTER_THRESHOLD
            && desktopViews <= totalViews * (1 - FILTER_THRESHOLD));
    });
}

function promise(app, req) {
    var aggregated = !!req.query.aggregated;
    var goodTitles, resultsDate;

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
    .then(function (response) {
        // We're working mainly with the overall list of top pageviews, and cut
        // this off at 50 (the max that can be sent in a single MW API query).
        // We'll keep twice as many desktop-only pageviews for the comparator
        // list to try to account for cases near the edge.  For instance, an
        // article could be #49 on the overall list but #51 on the desktop-only
        // pageviews list.  This way we can still compare desktop vs. overall
        // pageviews for it.
        var QUERY_TITLES = mwapi.API_QUERY_MAX_TITLES;
        var COMPARATOR_TITLES = 2 * QUERY_TITLES;

        var combinedResults = response.combined && response.combined.body;
        var desktopResults = response.desktop && response.desktop.body;
        var combinedItems = combinedResults && combinedResults.items && combinedResults.items[0];
        var desktopItems = desktopResults && desktopResults.items && desktopResults.items[0];
        var combinedMostRead = combinedItems && combinedItems.articles && combinedItems.articles.slice(0, QUERY_TITLES);
        var desktopMostRead = desktopItems && desktopItems.articles && desktopItems.articles.slice(0, COMPARATOR_TITLES);
        resultsDate = combinedItems && combinedItems.year + '-' + combinedItems.month + '-' + combinedItems.day + 'Z';
        goodTitles = filterBotTraffic(combinedMostRead, desktopMostRead);
        return mwapi.getMostReadMetadata(app, req, constructQueryListFrom(goodTitles).join('|'));
    }).then(function (response) {
        api.checkResponseStatus(response);
        var query = response.body && response.body.query;
        var normalizations = query && query.normalized;
        var pages = query && query.pages;
        var mainPageTitle = query && query.general && query.general.mainpage;

        if (normalizations) {
            mUtil.adjustMemberKeys(normalizations, ['article', 'from'], ['title', 'to']);
            mUtil.mergeByProp(goodTitles, normalizations, 'article');
        }

        mUtil.fillInMemberKeys(goodTitles, ['title', 'article']);
        mUtil.mergeByProp(goodTitles, pages, 'title', true);
        goodTitles = filterSpecialPages(goodTitles, mainPageTitle);

        var results = goodTitles.map(function(entry) {
            return Object.assign(entry, {
                $merge: [ mUtil.getRbPageSummaryUrl(app, req.params.domain, entry.article) ],
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
        mUtil.throw404('No results found; something is probably wrong.');
    }).catch(function(err) {
        // Catch and handle the error if this is an aggregated request and the
        // pageview data are not yet loaded.
        if (aggregated && err.status === 404) {
            return BBPromise.resolve({});
        }
        throw err;
    });
}

module.exports = {
    promise: promise,

    //visible for testing
    filterBotTraffic: filterBotTraffic
};
