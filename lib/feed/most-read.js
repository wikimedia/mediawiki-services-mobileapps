/**
 * Most-read article promise and related support functions.
 */

'use strict';

var mUtil = require('../mobile-util');
var dateUtil = require('../dateUtil');
var api = require('../api-util');
var mwapi = require('../mwapi');
var blacklist = require('./blacklist');


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

function getTopPageviews(app, req) {
    var domain = 'wikimedia.org';
    var path = 'metrics/pageviews/top/%proj/all-access/%y/%m/%d'
                .replace('%proj',
                  mUtil.removeTLD(mUtil.mobileToCanonical(req.params.domain)))
                .replace('%y', req.params.yyyy)
                .replace('%m', req.params.mm)
                .replace('%d', req.params.dd);
    var restReq = {
        headers: { accept: 'application/json; charset=utf-8' }
    };

    return api.restApiGet(app, domain, path, restReq)
    .then(function(response) {
        mUtil.checkResponseStatus(response);
        return response;
    });
}

function promise(app, req) {
    var goodTitles;
    return getTopPageviews(app, req).then(function (response) {
        var queryTitlesList, rankedTitles = response.body
                         && response.body.items
                         && response.body.items[0]
                         && response.body.items[0].articles;

        goodTitles = blacklist.filter(rankedTitles)
                              .slice(0, mwapi.API_QUERY_MAX_TITLES);
        queryTitlesList = constructQueryListFrom(goodTitles);
        return mwapi.requestMostReadMetadata(app, req, queryTitlesList.join('|'));
    }).then(function (response) {
        mUtil.checkResponseStatus(response);

        var query = response.body && response.body.query;
        var normalizations = query && query.normalized;
        var pages = query && query.pages;
        var mainPageTitle = query && query.general && query.general.mainpage;

        mUtil.adjustMemberKeys(normalizations, [['article', 'from'],
                                                ['title', 'to']]);
        mUtil.mergeByProp(goodTitles, normalizations, 'article');
        mUtil.fillInMemberKeys(goodTitles, [['title', 'article']]);
        mUtil.mergeByProp(goodTitles, pages, 'title');
        goodTitles = blacklist.filterSpecialPages(goodTitles, mainPageTitle);

        var results = goodTitles.map(function(entry) {
            return Object.assign(entry, {
                normalizedtitle: entry.title,
                title: entry.article,
                description: entry.terms
                             && entry.terms.description
                             && entry.terms.description[0],
                revid: entry.revisions
                             && entry.revisions[0]
                             && entry.revisions[0].revid,
                thumbnail: entry.thumbnail
                             && entry.thumbnail.source
                             ? mwapi.buildListThumbUrls(entry.thumbnail.source)
                             : undefined,
                article: undefined,
                ns: undefined,
                terms: undefined,
                revisions: undefined
            });
        });

        if (results.length) {
            return {
                date: dateUtil.dateStringFrom(req),
                articles: results
            };
        }
        mUtil.throw404('No results found; something is probably wrong.');
    });
}

module.exports = {
    promise: promise
};