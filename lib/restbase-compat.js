'use strict';

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

module.exports = {
	isRestbaseCompatReq
};
