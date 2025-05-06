'use strict';

/**
 * @module lib/restbase-compact
 */

/**
 * Checks if a request requires restbase compatibility
 *
 * @param {!Object} req the incoming request object
 * @return {boolean} flag value
 */
function isRestbaseCompatReq(req) {
	const header = 'x-restbase-compat';
	const value = (header in req.headers) && req.headers[header];
	return value === 'true';
}

/**
 *
 * Checks if a request is allowed for caching
 * Used to ease out the traffic for restbase sunset
 * TODO: Remove this once restbase sunset is complete
 *
 * @param req
 * @param res
 */
function isRequestCachable(req, res) {
	const conf = req.app.conf;

	// Default to exclude nothing
	const excludedUserAgents = (conf && conf.excludedUserAgents) || [];
	// Default to exclude no domain
	const excludedDomainsPattern = new RegExp(conf && conf.excludedDomainsPattern || '/^$/');

	const isUaExcluded = excludedUserAgents.includes(req.get('user-agent'));
	// Return 403 for excluded domains
	if (isUaExcluded && excludedDomainsPattern.test(req.params.domain)) {
		res.send(403, 'RESTBase sunset: Domain not allowed');
	}

	return !isUaExcluded;
}

module.exports = {
	isRestbaseCompatReq,
	isRequestCachable
};
