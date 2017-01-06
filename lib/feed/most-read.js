/**
 * Most-read article promise and related support functions.
 */

'use strict';

const BBPromise = require('bluebird');
const mUtil = require('../mobile-util');
const mwapi = require('../mwapi');
const filter = require('./most-read-filter');
const dateUtil = require('../dateUtil');
const pageviews = require('../pageviews');

/**
 * @public {!string} date ISO 8601 timestamp of pageviews recorded
 * @public {!number} views Integer pageviews on date
 */
class DatedPageviews {
    constructor(date, views) {
        this.date = date;
        this.views = views;
    }
}

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

function getTopPageviews(app, req, domain, date) {
    const apiDomain = 'wikimedia.org';
    const restReq = {
        headers: { accept: 'application/json; charset=utf-8' }
    };
    const client = new pageviews.Client(app, apiDomain, restReq);

    // todo: remove manual bot filtering when a user agent parameter is available for top as in the
    //       per-article endpoint
    return BBPromise.props({
        desktop: client.reqTop(domain, pageviews.Platform.DESKTOP_WEB, date),
        combined: client.reqTop(domain, pageviews.Platform.ALL, date)
    });
}

function pageviewsPageRspToDatedPageviews(rsp) {
    return rsp.body.items.map((item) => {
        return new DatedPageviews(dateUtil.iso8601DateFromYYYYMMDD(item.timestamp), item.views);
    });
}

function promise(app, req) {
    const aggregated = !!req.query.aggregated;
    let goodTitles;
    let resultsDate;

    if (!dateUtil.validate(dateUtil.hyphenDelimitedDateString(req))) {
        if (aggregated) {
            return BBPromise.resolve({ meta: {} });
        }
        dateUtil.throwDateError();
    }

    const targetDomain = mUtil.removeTLD(mUtil.mobileToCanonical(req.params.domain));

    const reqDate = dateUtil.getRequestedDate(req);
    const date = aggregated ? dateUtil.addDays(reqDate, -1) : reqDate;

    return getTopPageviews(app, req, targetDomain, date)
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

        goodTitles = filter.filterBotTraffic(combinedArticlesSlice, desktopArticlesSlice);
        if (mUtil.isEmpty(goodTitles)) {
            mUtil.throw404('No results found.');
        }

        const year = firstCombinedItems.year;
        const month = firstCombinedItems.month;
        const day = firstCombinedItems.day;
        resultsDate = `${year}-${month}-${day}Z`;
        return mwapi.getMostReadMetadata(app, req, constructQueryListFrom(goodTitles).join('|'));
    }).then((response) => {
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

        goodTitles = filter.filterSpecialPages(goodTitles, mainPageTitle);
        if (mUtil.isEmpty(goodTitles)) {
            mUtil.throw404('No results found.');
        }

        const apiDomain = 'wikimedia.org';
        const restReq = {
            headers: { accept: 'application/json; charset=utf-8' }
        };
        const client = new pageviews.Client(app, apiDomain, restReq);

        const targetDomain = mUtil.removeTLD(mUtil.mobileToCanonical(req.params.domain));
        const start = dateUtil.addDays(new Date(resultsDate), -4);
        const end = new Date(resultsDate);

        const articles = goodTitles.map((entry) => {
            return Object.assign(entry, {
                $merge: [
                    mUtil.getRbPageSummaryUrl(app.restbase_tpl, req.params.domain, entry.article)
                ],
                article: undefined,
                fromencoded: undefined,
                ns: undefined,
                terms: undefined,
                title: undefined,
                revisions: undefined,
                view_history: client.reqPage(targetDomain, pageviews.Platform.ALL,
                    pageviews.Agent.USER, entry.article, pageviews.Granularity.DAILY, start, end)
                     .then(pageviewsPageRspToDatedPageviews)
            });
        });

        return BBPromise.all(articles.map((article) => BBPromise.props(article)))
        .then((response) => {
            return {
                payload: {
                    date: resultsDate,
                    articles: response
                },
                meta: {
                    revision: dateUtil.dateStringFrom(req)
                }
            };
        });
    }).catch((err) => {
        // Catch and handle the error if this is an aggregated request and the
        // pageview data are not yet loaded.
        if (aggregated && err.status === 404) {
            return BBPromise.resolve({ meta: {} });
        }
        throw err;
    });
}

module.exports = {
    promise
};
