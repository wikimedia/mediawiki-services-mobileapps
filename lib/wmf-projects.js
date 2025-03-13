'use strict';

const defaultProjects = [
	'wikipedia', 'wiktionary', 'wikivoyage'
];
const summaryProjects = [
	'wikipedia', 'wikivoyage', 'wikisource',
	'wikibooks', 'wikinews', 'wikiversity', 'wikimedia',
	'mediawiki'
];

// eslint-disable-next-line
const defaultRegex = new RegExp(`.*\.(${ defaultProjects.join('|') })\.org`);
// eslint-disable-next-line
const summaryRegex = new RegExp(`.*\.(${ summaryProjects.join('|') })\.org`);

/**
 * Middleware helper to allow or deny access based on a domain pattern
 * Returns 404 for not allowed patterns
 *
 * @param req
 * @param res
 * @param next
 * @param pattern
 */
const allowPattern = (req, res, next, pattern) => {
	const domain = req.params.domain;
	if (pattern.test(domain)) {
		return next();
	}
	res.status(404).send( 'Domain not allowed' );
};

// Middleware used to check for supported domains by default
const defaultDomainsAllow = (req, res, next) => allowPattern(req, res, next, defaultRegex);

// Middleware used to check for supported domains by summary endpoint
const summaryDomainsAllow = (req, res, next) => allowPattern(req, res, next, summaryRegex);

module.exports = {
	defaultDomainsAllow,
	summaryDomainsAllow
};
