/**
 * Random article promise and related support functions.
 */

'use strict';

const api = require('./api-util');
const mwapi = require('./mwapi');
const BBPromise = require('bluebird');

/**
 * Returns a numeric score which can be used to roughly determine the relative "quality" of random
 * results.
 *
 * Scores are calculated as follows:
 *
 * 2 points for having:
 *   thumb url
 *
 * 1 point for having:
 *   wikidataDescription
 *
 * -10 point for being:
 *   disambiguation page
 *   list item page
 */
function score(result) {
    const isDisambiguationPage = (result.pageprops && result.pageprops.disambiguation)
        || (result.description && result.description.includes('disambiguation page'));

    const isListPage = result.description && result.description.includes('Wikimedia list article');

    let score = 0.0;

    if (result.thumbnail) {
        score += 2.0;
    }
    if (result.description) {
        score += 1.0;
    }
    if (isDisambiguationPage || isListPage) {
        score -= 10.0;
    }
    return score;
}

function pickBestResult(scoredResults) {
    return scoredResults.reduce((prev, curr) => {
        return curr.score > prev.score ? curr : prev;
    });
}

/**
 * Returns a single random result well suited to card-type layouts, i.e.
 * one likely to have a page image and wikidata description.
 *
 * Multiple random items are requested, but only the result having
 * the highest relative score is returned. Requesting about 12 items
 * seems to consistently produce a really "good" result.
 */
function promise(req) {
    const itemsToRequest = 12;
    return BBPromise.join(
        mwapi.getSiteInfo(req),
        api.mwApiGet(req, {
            action: 'query',
            format: 'json',
            formatversion: 2,
            generator: 'random',
            grnfilterredir: 'nonredirects',
            grnlimit: itemsToRequest,
            grnnamespace: 0,
            pilimit: itemsToRequest,
            piprop: 'thumbnail',
            pithumbsize: 640,
            pilicense: 'any',
            prop: 'description|pageimages|revisions'
        }),
        (siteinfo, queryResponse) => {
            mwapi.checkForQueryPagesInResponse(req, queryResponse);
            const pages = queryResponse.body.query.pages;
            const scoredPages = pages.map(page => Object.assign(page, { score: score(page) }));
            const bestResult = pickBestResult(scoredPages);
            const dbTitle = mwapi.getDbTitle(bestResult.title, siteinfo);
            return {
                payload: mwapi.buildSummaryResponse(bestResult, dbTitle),
                meta: {
                    etag: mwapi.getRevisionFromRandomPage(bestResult)
                }
            };
        });
}

module.exports = {
    promise,

    // visible for testing
    pickBestResult
};
