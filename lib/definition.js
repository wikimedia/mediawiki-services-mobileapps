'use strict';

const mUtil = require('./mobile-util');
const sUtil = require('./util');
const parsoid = require('./parsoid-access');
const preprocessParsoidHtml = require('./processing');
const HTTPError = sUtil.HTTPError;
const parseDefinitions = require('./definitions/parseDefinitions');

/**
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @return {!promise} a promise to retrieve a set of definitions from Wiktionary.
 */
module.exports = (app, req) => {
    if (req.params.domain.indexOf('wiktionary.org') === -1) {
        throw new HTTPError({
            status: 400,
            type: 'invalid_domain',
            title: 'Invalid domain',
            detail: 'Definition requests only supported for wiktionary.org domains.'
        });
    }
    if (req.params.domain.indexOf('en') !== 0) {
        throw new HTTPError({
            status: 501,
            type: 'unsupported_language',
            title: 'Language not supported',
            detail: 'The language you have requested is not yet supported.'
        });
    }
    return parsoid.getParsoidHtml(req)
        .then(response => mUtil.createDocument(response.body)
        .then(doc => preprocessParsoidHtml(doc, app.conf.processing_scripts.definition))
        .then((doc) => {
            return {
                payload: parseDefinitions(doc, req.params.domain, req.params.title),
                _headers: {
                    'Content-Language': response.headers && response.headers['content-language'],
                    Vary: response.headers.vary
                },
                meta: {
                    revision: parsoid.getRevisionFromEtag(response.headers)
                }
            };
        }));
};
