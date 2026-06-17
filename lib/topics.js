'use strict';

/**
 * @module lib/topics
 *
 * Fetches the "topics" that an article belongs to from the Lift Wing
 * outlink-topic-model inference service. The topics are an ML-derived
 * classification of the article into a hierarchy of subject areas, e.g.
 * "Geography.Regions.Americas.North_America".
 */

const { makeOutgoingRequest } = require('axios-wmf-service-mesh');
const wikiLanguage = require('./wikiLanguage');

/**
 * Fetches the predicted topics for the requested article.
 *
 * This is best-effort, supplementary metadata: any failure (bad response,
 * timeout, unsupported wiki, etc.) resolves to undefined rather than
 * rejecting, so it never prevents the page from being served.
 *
 * @param {!Object} req the incoming request object
 * @param {?(number|string)} pageId the page id of the article
 * @param {?(number|string)} revisionId the revision id of the article
 * @return {!Promise<?Array<{topic: string, score: number}>>} a promise
 *   resolving to the list of predicted topics, or undefined if unavailable
 */
async function getPredictedTopics(req, pageId, revisionId) {
	const app = req.app;
	const lang = wikiLanguage.getLanguageCode(req.params.domain);
	if (!lang || !pageId || !revisionId) {
		return undefined;
	}

	const request = app.predicted_topics_tpl.expand({
		request: {
			params: {
				domain: req.params.domain,
				// Path parameters for the internal production endpoint, e.g.
				// .../article_topics/{wikiId}/{pageId}/{revisionId}
				wikiId: `${ lang }wiki`,
				pageId: pageId,
				revisionId: revisionId
			},
			headers: req.headers,
			// Body for the public Lift Wing endpoint, which takes a POST.
			body: {
				page_id: pageId,
				revision_id: revisionId,
				lang
			}
		}
	});
	// The template expander percent-encodes a literal ':' in a uri path,
	// so we need to unencode it before making the request.
	request.uri = request.uri.toString().replace(/%3A/gi, ':');

	try {
		const response = await makeOutgoingRequest(request, req);
		const results = response.data?.prediction?.results;
		return results.map((result) => ({
			topic: result.topic,
			score: result.score
		}));
	} catch (err) {
		app.logger.log('warn/predicted_topics', {
			msg: 'Failed to fetch predicted topics',
			error: err.message
		});
		return undefined;
	}
}

module.exports = {
	getPredictedTopics
};
