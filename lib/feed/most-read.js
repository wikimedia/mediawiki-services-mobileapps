/**
 * Most-read article promise and related support functions.
 */

'use strict';

var mUtil = require('../mobile-util');
var dateUtil = require('../dateUtil');
var api = require('../api-util');
var mwapi = require('../mwapi');
var blacklist = require('./blacklist');
var dateUtil = require('../dateUtil');

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
    var domain = 'wikimedia.org';
    var path = 'metrics/pageviews/top/%proj/all-access/%y/%m/%d'
                .replace('%proj',
                  mUtil.removeTLD(mUtil.mobileToCanonical(req.params.domain)))
                .replace('%y', year)
                .replace('%m', month)
                .replace('%d', day);
    var restReq = {
        headers: { accept: 'application/json; charset=utf-8' }
    };

    return api.restApiGet(app, domain, path, restReq)
    .then(function(response) {
        api.checkResponseStatus(response);
        return response;
    });
}

function promise(app, req, aggregated) {
    var goodTitles;
    var date = dateUtil.hyphenDelimitedDateString(req);
    dateUtil.validate(date);
    return getTopPageviews(app, req, aggregated).then(function (response) {
        var queryTitlesList, rankedTitles = response.body
                         && response.body.items
                         && response.body.items[0]
                         && response.body.items[0].articles;

        goodTitles = blacklist.filter(rankedTitles)
                              .slice(0, mwapi.API_QUERY_MAX_TITLES);
        queryTitlesList = constructQueryListFrom(goodTitles);
        return mwapi.getFeedPageListMetadata(app, req, queryTitlesList.join('|'), false);
    }).then(function (response) {
        api.checkResponseStatus(response);

        var query = response.body && response.body.query;
        var normalizations = query && query.normalized;
        var pages = query && query.pages;
        var mainPageTitle = query && query.general && query.general.mainpage;

        mUtil.adjustMemberKeys(normalizations, [['article', 'from'],
                                                ['title', 'to']]);
        mUtil.mergeByProp(goodTitles, normalizations, 'article');
        mUtil.fillInMemberKeys(goodTitles, [['title', 'article']]);
        mUtil.mergeByProp(goodTitles, pages, 'title', true);
        goodTitles = blacklist.filterSpecialPages(goodTitles, mainPageTitle);

        var results = goodTitles.map(function(entry) {
            return Object.assign(entry, {
                normalizedtitle: entry.title,
                title: entry.article,
                description: entry.terms
                             && entry.terms.description
                             && entry.terms.description[0],
                thumbnail: entry.thumbnail,
                article: undefined,
                ns: undefined,
                terms: undefined,
                revisions: undefined
            });
        });

        if (results.length) {
            return {
                payload: {
                    date: dateUtil.iso8601DateFrom(req),
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
            return {};
        }
        throw err;
    });
}

module.exports = {
    promise: promise
};
