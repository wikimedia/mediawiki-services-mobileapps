'use strict';

const _ = require('underscore');

const defaultProject = [
	'wikiquote', 'wikisource', 'wikibooks', 'wikinews', 'wikiversity', 'wikimedia', 'mediawiki'
];
const wikidataProject = ['wikidata'];
const wikipediaProject = ['wikipedia'];
const wikivoyageProject = ['wikivoyage'];
const wiktionaryProject = ['wiktionary'];

const projectDomains = {
	'mobile-html': new Set([...wikipediaProject, ...wikivoyageProject, ...wiktionaryProject]),
	'media-list': new Set([...wikipediaProject, ...wikivoyageProject, ...wiktionaryProject]),
	'page-summary': new Set([...defaultProject, ...wikipediaProject, ...wikivoyageProject]),
	'page-talk': new Set(wikipediaProject),
	'word-definition': new Set(wiktionaryProject),
	'mobile-html-offline-resources': new Set([
		...wikipediaProject, ...wikivoyageProject, ...wiktionaryProject]),
	'wikitext-to-mobile-html': new Set([
		...defaultProject, ...wikidataProject, ...wikipediaProject, ...wikivoyageProject, ...wiktionaryProject
	]),
	'static-assets': new Set([
		...defaultProject, ...wikipediaProject, ...wikivoyageProject, ...wiktionaryProject
	])
};

// eslint-disable-next-line
const projectRegex = (domains) => new RegExp(`.*\.(${ Array.from(domains).join('|') })\.org`);

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

/**
 * Mapping of project names to allow middlewares to restrict access to endpoints by domain
 *
 * @type {Object.<string, Function>}
 */
const projectAllowMiddlewares = _.mapObject(projectDomains, (domains, name) => {
	// For each (project, domains) pair return a middleware to restrict access
	const pattern = projectRegex(domains);
	return (req, res, next) => allowPattern(req, res, next, pattern);
});

module.exports = {
	projectAllowMiddlewares
};
