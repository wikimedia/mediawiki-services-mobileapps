/**
 * Random article promise and related support functions.
 */

'use strict';

const api = require('../api-util');
const mwapi = require('../mwapi');
const BBPromise = require('bluebird');

const MAX_EXTRACT_LENGTH = 512;

/**
 * relativeScoreForResult returns a numeric score which can be used to
 * roughly determine the relative "quality" of random results.
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
 *
 * 0.0 to 1.0 point for extract length based on:
 *  ratio of extract chars to max possible extract chars: (ie 256 chars / 512 max chars = 0.5)
 *  this is used primarily as a tie-breaker as it can give a slight edge to results
 *  having slightly longer extracts
 *
 */
function relativeScoreForResult(result) {
    const hasThumbURL = result.thumbnail ? ('source' in result.thumbnail) : false;
    const hasWikidataDescription = result.terms ? ('description' in result.terms) : false;
    let isDisambiguationPage = result.pageprops ? ('disambiguation' in result.pageprops) : false;
    const hasExtract = ('extract' in result);
    let isListItemPage = false;

    if (hasWikidataDescription) {
        if (!isDisambiguationPage) {
            //HAX: the "disambiguation" flag is sometimes not set, so do backup wikidata description check. enwiki specific.
            if (result.terms.description[0].indexOf('disambiguation page') > -1) {
                isDisambiguationPage = true;
            }
        }
        //HAX: there is no "list item" flag, so do wikidata description check. enwiki specific.
        if (result.terms.description[0].indexOf('Wikimedia list article') > -1) {
            isListItemPage = true;
        }
    }

    let score = 0.0;
    if (hasThumbURL) {
        score += 2.0;
    }
    if (hasWikidataDescription) {
        score += 1.0;
    }
    if (isDisambiguationPage || isListItemPage) {
        score -= 10.0;
    }

    if (hasExtract) {
        let extractLength = result.extract.length;
        if (extractLength > MAX_EXTRACT_LENGTH) {
            extractLength = MAX_EXTRACT_LENGTH;
        }
        score += extractLength / MAX_EXTRACT_LENGTH;
    }
    return score;
}

function pickBestResult(scoredResults) {
    return scoredResults.reduce(function(prev, curr) {
        return curr.score > prev.score ? curr : prev;
    });
}

/**
 * GET {domain}/v1/page/random/summary
 * Returns a single random result well suited to card-type layouts, i.e.
 * one likely to have an image url, text extract and wikidata description.
 *
 * Multiple random items are requested, but only the result having
 * the highest relative score is returned. Requesting about 12 items
 * seems to consistently produce a really "good" result.
 */
function promise(app, req) {
    const itemsToRequest = 12;
    return api.mwApiGet(app, req.params.domain, {
        action: 'query',
        format: 'json',
        formatversion: 2,
        exchars: MAX_EXTRACT_LENGTH,
        exintro: 1,
        exlimit: itemsToRequest,
        explaintext: '',
        generator: 'random',
        grnfilterredir: 'nonredirects',
        grnlimit: itemsToRequest,
        grnnamespace: 0,
        pilimit: itemsToRequest,
        piprop: 'thumbnail',
        pithumbsize: 640,
        prop: 'extracts|pageterms|pageimages|revisions',
        wbptterms: 'description'
    }).then(function (response) {
        api.checkResponseStatus(response);

        const scoredResults = response.body.query.pages.map(function (result) {
            result.score = relativeScoreForResult(result);
            return result;
        });
        const bestResult = pickBestResult(scoredResults);

        return BBPromise.props({
            bestResult: bestResult,
            dbTitle: mwapi.getDbTitle(app, req, bestResult.title)
        });
    }).then(function (res) {
        return {
            payload: mwapi.buildSummaryResponse(res.bestResult, res.dbTitle),
            meta: {
                etag: mwapi.getRevisionFromExtract(res.bestResult)
            }
        };
    });
}

module.exports = {
    promise: promise,

    //visible for testing
    pickBestResult: pickBestResult
};
