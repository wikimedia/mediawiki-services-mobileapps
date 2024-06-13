/**
 * MediaWiki API helpers
 */

'use strict';

/**
 * @module lib/mwapi
 */

const _ = require('underscore');
const BBPromise = require('bluebird');
const sUtil = require('./util');
const api = require('./api-util');
const wikiLanguage = require('./wikiLanguage');
const HTTPError = sUtil.HTTPError;
const Title = require('mediawiki-title').Title;
const Namespace = require('mediawiki-title').Namespace;
const constants = require('./mwapi-constants');
const thumbnail = require('./thumbnail');
const descriptionsUtils = require('./description-util');
const transforms = require('./transforms');
const flaggedWikisList = require('./flaggedWikisList.json');

const mwapi = {};

const ENWIKI_REGEX = /^en\.wikipedia(?:\.beta\.wmflabs)?\.org$/;

/**
 * Extends an object of keys for an api query with
 * common api parameters.
 *
 * @param {!Object} query
 * @return {!Object}
 */
function apiParams(query) {
	return Object.assign(query, {
		format: 'json',
		formatversion: 2
	});
}

/**
 * @param {!Object} req
 * @param {!string} languageCode
 * @return {array}
 */
function getRelevantLanguages(req, languageCode) {
	const isLanguageCodeWithVariants = wikiLanguage.isLanguageCodeWithVariants(languageCode);
	if (isLanguageCodeWithVariants) {
		const acceptLanguage = req.headers['accept-language'];
		return wikiLanguage.relevantWikiLanguageCodesFromAcceptLanguageHeader(
			acceptLanguage,
			languageCode
		);
	}
	return [];
}

/**
 * @param {Object} logger
 * @param {Object} response
 */
mwapi.checkForParseInResponse = function(logger, response) {
	if (!(response && response.body && response.body.parse)) {
		// we did not get our expected parse from the MW API, propagate that

		if (response.body.error && response.body.error.code) {
			if (response.body.error.code === 'missingtitle') {
				throw new HTTPError({
					status: 404,
					type: 'missingtitle',
					title: "The page you requested doesn't exist",
					detail: response.body
				});
			}
			// TODO: add more error conditions here:
		}

		// fall-through to generic error message
		const message = `no parse in response: ${ JSON.stringify(response.body, null, 2) }`;
		logger.log('warn/mwapi', message);
		throw new HTTPError({
			status: 504,
			type: 'api_error',
			title: 'no parse in response',
			detail: response.body
		});
	}
};

/**
 * @param {*} req
 * @param {*} response
 */
mwapi.checkForQueryPagesInResponse = function(req, response) {
	if (!(response && response.body && response.body.query && response.body.query.pages)) {
		// we did not get our expected query.pages from the MW API, propagate that
		req.logger.log('error/mwapi', 'no query.pages in response');
		throw new HTTPError({
			status: 504,
			type: 'api_error',
			title: 'no query.pages in response',
			detail: response.body
		});
	}
};

// copied from restbase/lib/mwUtil.js
/**
 * @param {!Object} siteInfoRes
 * @return {string}
 */
mwapi.findSharedRepoDomain = function(siteInfoRes) {
	const sharedRepo = (siteInfoRes.body.query.repos || []).find((repo) => {
		return repo.name === 'shared';
	});
	if (sharedRepo) {
		const domainMatch = /^((:?https?:)?\/\/[^/]+)/.exec(sharedRepo.descBaseUrl);
		if (domainMatch) {
			return domainMatch[0];
		}
	}
};

/**
 * Builds a request for siteinfo data for the MW site for the request domain.
 *
 * @param {!Object} req the request object
 * @return {!Promise} a promise resolving as an JSON object containing the response
 */
const siteInfoCache = {};
mwapi.getSiteInfo = function(req) {
	const rp = req.params;
	if (!siteInfoCache[rp.domain]) {
		const query = apiParams({
			action: 'query',
			meta: 'siteinfo|allmessages',
			siprop: 'general|namespaces|namespacealiases|specialpagealiases',
			ammessages: 'toc'
		});

		siteInfoCache[rp.domain] = api.mwApiGet(req, query)
			.then((res) => {
				const general = res.body.query.general;
				const allmessages = res.body.query.allmessages;

				return {
					general: {
						mainpage: general.mainpage,
						lang: general.lang,
						legaltitlechars: general.legaltitlechars,
						case: general.case,
						mobileserver: general.mobileserver,
						toctitle: allmessages[0].content
					},
					namespaces: res.body.query.namespaces,
					namespacealiases: res.body.query.namespacealiases,
					specialpagealiases: res.body.query.specialpagealiases,
					sharedRepoRootURI: mwapi.findSharedRepoDomain(res)
				};
			});
	}
	return siteInfoCache[rp.domain];
};

/**
 * Given protection status for an article simplify it to allow easy reference
 *
 * @param {!Array} mwApiProtectionObj e.g.
 *  [ { type: 'edit', level: 'autoconfirmed', expiry: 'infinity' }
 * @return {!Object} { 'edit': ['autoconfirmed'] },
 */
mwapi.simplifyProtectionObject = function(mwApiProtectionObj) {
	const protection = {};
	mwApiProtectionObj.forEach((entry) => {
		const type = entry.type;
		const level = entry.level;

		if (!protection[type]) {
			protection[type] = [];
		}
		if (!protection[type].includes(level)) {
			protection[type].push(level);
		}
	});
	return protection;
};

/**
 * Extract primary Earth coordinates, if any, from the API 'coordinates' object
 *
 * @param {!Object} coords the coordinates object from the MW API
 * @return {?Object} the primary Earth coordinates, if any
 */
mwapi.getPrimaryEarthCoordinates = (coords) => {
	if (Array.isArray(coords)) {
		const primary = coords.filter(c => c.globe === 'earth' && c.primary);
		if (primary.length) {
			return {
				latitude: primary[0].lat,
				longitude: primary[0].lon
			};
		}
	}
};

/**
 * Metadata query to MW API for metadata response
 *
 * @param {!Object} req
 * @param {!Object} query
 */
mwapi.queryForMetadata = (req, query, responseBuilder) => {
	const languageCode = wikiLanguage.getLanguageCode(req.params.domain);
	const site = `${ languageCode }wiki`;
	const languages = getRelevantLanguages(req, languageCode);
	return BBPromise.join(
		mwapi.getSiteInfo(req),
		mwapi.getDisplayTitle(req),
		languages ? mwapi.getCentralDescription(req, site, languages) : BBPromise.resolve({}),
		api.mwApiGet(req, query),
		(siteinfo, parse, wbEntities, metadata) => {
			const body = metadata.body;
			const page = body.query && body.query.pages && body.query.pages[0];
			const entities = wbEntities && wbEntities.body && wbEntities.body.entities;
			const title = {
				normalized: (body.query
                    && body.query.normalized && body.query.normalized[0]
                    && body.query.normalized[0].to)
                    || page.title,
				display: (parse && parse.body && parse.body.parse && parse.body.parse.displaytitle)
                    || (page.pageprops && page.pageprops.displaytitle)
                    || page.title
			};
			const description = descriptionsUtils.parseDescription(page, entities, languages, true);
			if (!page || page.missing || page.invalid) {
				throw new HTTPError({
					status: 404,
					type: 'missingtitle',
					title: "The page you requested doesn't exist",
					detail: body
				});
			}

			return responseBuilder(page, siteinfo, title, description);
		});
};

/**
 * @param {!Object} req
 * @return {Promise<Object>}
 */
mwapi.getMetadataForMobileHtml = (req) => {
	const query = apiParams({
		action: 'query',
		prop: 'description|info|pageimages|pageprops|revisions',
		inprop: 'protection',
		rvprop: 'timestamp',
		pilicense: 'any',
		piprop: 'original',
		pilangcode: wikiLanguage.relevantLanguageVariantOrCode(req),
		titles: req.params.title
	});

	return mwapi.queryForMetadata(req, query, (page, siteinfo, title, description) => {
		const revision = page.revisions[ 0 ] || {};
		return {
			description: description && description.value,
			description_source: description && description.source,
			displaytitle: title.display,
			normalizedtitle: title.normalized,
			modified: revision.timestamp,
			protection: page.protection,
			originalimage: page.original,
			pageprops: page.pageprops
		};
	});
};

/**
 * Request metadata from MW API
 *
 * @param {!Object} req
 * @return {Promise<Object>}
 */
mwapi.getMetadataForMetadata = (req) => {
	const props = ['pageprops', 'info', 'description', 'langlinks', 'categories'];

	const query = apiParams({
		action: 'query',
		prop: props.join('|'),
		titles: req.params.title,
		lllimit: 'max',
		inprop: 'protection',
		clprop: 'hidden',
		cllimit: 50,
	});

	return mwapi.queryForMetadata(req, query, (page, siteinfo, title, description) => {
		return {
			title: page.title,
			displaytitle: title.display,
			coordinates: page.coordinates,
			langlinks: page.langlinks,
			protection: page.protection && mwapi.simplifyProtectionObject(page.protection),
			description: description && description.value,
			description_source: description && description.source,
			categories: page.categories
		};
	});
};

/**
 * @param {!Object} req
 * @return {!Promise<Object>}
 */
mwapi.getDisplayTitle = (req) => {
	const query = apiParams({
		action: 'parse',
		prop: 'displaytitle',
		page: req.params.title
	});
	return api.mwApiGet(req, query);
};

/**
 * Get the page description from central wiki (wikidata)
 *
 * @param {!Object} req
 * @param {!string} site
 * @param {!string[]} languages
 * @return {!Promise<Object>}
 */
mwapi.getCentralDescription = (req, site, languages) => {
	const query = apiParams({
		action: 'wbgetentities',
		sites: site,
		languages: languages.join('|').toLowerCase(),
		titles: req.params.title,
		props: 'descriptions'
	});
	return api.mwApiGet(req, query, api.getWikidataDomain(req.params.domain));
};

/**
 * Get a CSRF token for altDomain (or req domain) using the authHeaders.
 *
 * It is only safe to bypass CSRF token server-side if the API is PUT/DELETE
 * request with JSON content-type. That means a request to the API is never
 * a simple request, forcing the browser to preflight it. Since we never respond
 * with Access-Control-Allow-Credentials, and ignore the cookie auth, it's safe.
 *
 * @param {!Object} req
 * @param {!Object} authHeaders
 * @param {?string} altDomain
 * @return {Promise<string>}
 */
mwapi.getEditToken = (req, authHeaders, altDomain = null) => {
	return api.mwApiGet(req, apiParams({
		action: 'query',
		meta: 'tokens',
		type: 'csrf'
	}), altDomain, authHeaders)
		.then((res) => {
			const token = res.body
            && res.body.query
            && res.body.query.tokens
            && res.body.query.tokens.csrftoken;
			if (!token) {
				throw new HTTPError({
					status: 401,
					type: 'unauthorized',
					title: 'Failed to obtain an edit token'
				});
			}
			return token;
		});
};

/**
 * Fetches content of the main slot of the latest revision of the page.
 *
 * @param {!Object} req
 * @param {!string} title
 * @param {!Object} authHeaders
 * @return {Promise<Object>}
 */
mwapi.getPageLatestPageContent = (req, title, authHeaders) => {
	const query = apiParams({
		action: 'query',
		prop: 'revisions',
		titles: req.params.title,
		rvslots: 'main',
		rvprop: 'ids|content'
	});
	return api.mwApiGet(req, query, null, authHeaders)
		.then((res) => {
			if (!res || !res.body || !res.body.query) {
				throw new HTTPError({
					status: 500,
					type: 'internal_error',
					title: 'Unexpected MW action API response'
				});
			}
			if ( !res.body.query.pages
            || !res.body.query.pages.length
            || res.body.query.pages[0].missing
			) {
				throw new HTTPError({
					status: 404,
					type: 'not_found',
					title: 'Page not found',
					description: `Page ${ title } not found on ${ req.params.domain }`
				});
			}
			return res.body.query.pages[0];
		});
};

/**
 * Set the page description on a central wiki (wikidata)
 *
 * @param {!Object} req
 * @param {!string} description
 * @return {Promise<Object>} with 'value' and 'language' properties.
 */
mwapi.setCentralDescription = (req, description) => {
	const wikidataDomain = api.getWikidataDomain(req.params.domain);
	let languageCode = wikiLanguage.getLanguageCode(req.params.domain);
	const site = `${ languageCode }wiki`;
	if (req.headers['content-language']
        && wikiLanguage.isLanguageCodeWithVariants(languageCode)
        && wikiLanguage.getAllLanguageVariantsForLanguageCode(languageCode).includes(req.headers['content-language'])) {
		languageCode = req.headers['content-language'];
	}

	// Only support OAuth authentication. Currently the API will
	// be exposed via the API Gateway which only supports OAuth.
	const authHeaders = {};
	if (req.headers.authorization) {
		authHeaders.authorization = req.headers.authorization;
	}

	return mwapi.getEditToken(req, authHeaders, wikidataDomain)
		.then((token) => {
			const query = apiParams({
				action: 'wbsetdescription',
				site,
				title: req.params.title,
				language: languageCode,
				value: description,
				summary: req.body.comment || '',
				token
			});
			return api.mwApiPost(req, query, wikidataDomain, authHeaders);
		})
		.then((res) => {
			if (res.body.error || !res.body.entity) {
				throw new HTTPError({
					status: 500,
					type: 'internal_error',
					title: 'Internal Error',
					detail: res.body.error
				});
			}
			return res.body.entity.descriptions[languageCode];
		});
};

/**
 * @param {!Object} req
 * @param {!string} description
 * @return {Promise<Object>} with 'value' and 'language' properties.
 */
mwapi.setLocalShortDescription = (req, description) => {
	if (!ENWIKI_REGEX.test(req.params.domain)) {
		throw new HTTPError({
			status: 500,
			type: 'internal_error',
			title: 'Internal error',
			detail: `Attempt to set local short description for ${ req.params.domain }`
		});
	}

	// Only support OAuth authentication. Currently the API will
	// be exposed via the API Gateway which only supports OAuth.
	const authHeaders = {};
	if (req.headers.authorization) {
		authHeaders.authorization = req.headers.authorization;
	}

	return mwapi.getEditToken(req, authHeaders)
		.then((token) => {
			return mwapi.getPageLatestPageContent(req, req.params.title, authHeaders)
				.then((pageInfo) => {
					// An existing page must have latest revision and main slot,
					// so no fancy existence checking
					const slotInfo = pageInfo.revisions[0].slots.main;
					if ( slotInfo.contentmodel !== 'wikitext' ) {
						throw new HTTPError({
							status: 501,
							type: 'unsupported',
							title: 'Unsupported page content model',
							detail: `Short descriptions not supported for ${ slotInfo.contentmodel } pages`
						});
					}
					return {
						pageid: pageInfo.pageid,
						revid: pageInfo.revisions[0].revid,
						content: slotInfo.content
					};
				})
				.then((contentInfo) => {
					let query;
					if (descriptionsUtils.containsLocalDescription(contentInfo.content)) {
						// The page already contains the short description. Replace.
						let newWikitext;
						if (description === '') {
							newWikitext = descriptionsUtils.deleteLocalDescription(
								contentInfo.content);
						} else {
							newWikitext = descriptionsUtils.replaceLocalDescription(
								contentInfo.content, description);
						}
						query = {
							action: 'edit',
							pageid: contentInfo.pageid,
							summary: req.body.comment || '',
							minor: true,
							baserevid: contentInfo.revid,
							text: newWikitext,
							token
						};
					} else if (description !== '') {
						// The page does not contain short description. Prepend.
						query = {
							action: 'edit',
							pageid: contentInfo.pageid,
							summary: req.body.comment || '',
							minor: true,
							baserevid: contentInfo.revid,
							prependtext: `{{Short description|${ description }}}`,
							token
						};
					} else {
						// The page does not contain short description, no need to delete.
						return BBPromise.resolve({ value: null, language: 'en' });
					}
					return api.mwApiPost(req, apiParams(query), null, authHeaders)
						.then((res) => {
							if (res.status !== 200) {
								throw new HTTPError({
									status: 500,
									type: 'internal_error',
									title: 'Internal Error',
									detail: `Unexpected response status from MW action=edit: ${ res.status }`
								});
							}
							if (res.body && res.body.edit && res.body.edit.result === 'Success') {
								return { value: description || null, language: 'en' };
							}
							throw new HTTPError({
								status: 500,
								type: 'internal_error',
								title: `Page edit error ${ res.body.error.code }`,
								detail: res.body.error.info
							});
						});
				});
		});
};

/**
 * Get metadatedata from MW API for summary response
 *
 * @param {!Object} req
 * @param {!number} thumbSize
 * @return {!Promise<Object>}
 */
mwapi.getMetadataForSummary = (req, thumbSize) => {
	const props = ['coordinates', 'description', 'pageprops', 'pageimages', 'revisions', 'info'];
	const params = {
		action: 'query',
		prop: props.join('|'),
		pilicense: 'any',
		piprop: 'thumbnail|original|name',
		pilangcode: wikiLanguage.relevantLanguageVariantOrCode(req),
		pithumbsize: thumbSize,
		rvprop: 'contentmodel|timestamp',
		rvslots: 'main',
	};

	if (req.params.revision) {
		params.revids = req.params.revision;
	} else {
		params.titles = req.params.title;
	}
	const query = apiParams(params);

	return mwapi.queryForMetadata(req, query, (page, siteinfo, title, description) => {
		const revision = page.revisions && page.revisions[0];
		const contentmodel = revision && revision.slots && revision.slots.main
            && revision.slots.main.contentmodel;
		return {
			id: page.pageid,
			title: page.title,
			displaytitle: title.display,
			pageprops: page.pageprops,
			normalizedtitle: title.normalized || page.title,
			ns: page.ns,
			nsText: siteinfo.namespaces[page.ns].name,
			thumbnail: page.thumbnail,
			originalimage: page.original,
			dir: page.pagelanguagedir,
			lang: page.pagelanguagehtmlcode,
			description: description && description.value,
			description_source: description && description.source,
			geo: page.coordinates && mwapi.getPrimaryEarthCoordinates(page.coordinates),
			mobileHost: siteinfo.general.mobileserver,
			mainpage: siteinfo.general.mainpage === page.title ? true : undefined,
			redirect: page.redirect,
			contentmodel,
			timestamp: revision.timestamp,
			talkNsText: page.ns % 2 === 0 ? siteinfo.namespaces[page.ns + 1]
                && new Namespace(page.ns + 1, siteinfo).getNormalizedText() : undefined
		};
	});
};

/**
 * Get article short description from MW API
 *
 * @param {!Object} req
 * @return {!Promise}
 */
mwapi.getMetadataForDescription = (req) => {
	const languageCode = wikiLanguage.getLanguageCode(req.params.domain);
	const site = `${ languageCode }wiki`;
	const languages = getRelevantLanguages(req, languageCode);
	const query = apiParams({
		action: 'query',
		prop: 'description',
		titles: req.params.title,
	});
	return BBPromise.join(
		languages ? mwapi.getCentralDescription(req, site, languages) : BBPromise.resolve({}),
		api.mwApiGet(req, query),
		(wbEntities, localDescr) => {
			const body = localDescr.body;
			const page = body.query && body.query.pages && body.query.pages[0];
			const entities = wbEntities && wbEntities.body && wbEntities.body.entities;
			const description = descriptionsUtils.parseDescription(page, entities,
				languages, false);
			if (description) {
				description.lang = description.lang || languageCode;
				return description;
			}
			throw new HTTPError({
				status: 404,
				type: 'not_found',
				title: 'Short description not found'
			});
		}
	);
};

/**
 * Builds the request to get page metadata from MW API action=query
 *
 * @param {!Object} req the request object
 * @return {!Promise} a promise resolving as an JSON object containing the response
 */
mwapi.getMetadataForMobileSections = (req, thumbSize) => {
	const props = ['coordinates', 'description', 'pageprops', 'pageimages', 'revisions',
		'info', 'langlinks'];

	const query = apiParams({
		action: 'query',
		prop: props.join('|'),
		titles: req.params.title,
		pilicense: 'any',
		piprop: 'thumbnail|original|name',
		pithumbsize: thumbSize,
		pilangcode: wikiLanguage.relevantLanguageVariantOrCode(req),
		inprop: 'protection',
		lllimit: 'max',
		rvprop: ['ids', 'timestamp', 'user', 'contentmodel'].join('|'),
		rvslots: 'main',
	});

	return mwapi.queryForMetadata(req, query, (page, siteinfo, title, description) => {
		const revision = page.revisions && page.revisions[0];
		const contentmodel = revision && revision.slots && revision.slots.main
            && revision.slots.main.contentmodel;
		const protection = page.protection && mwapi.simplifyProtectionObject(page.protection);

		return {
			id: page.pageid,
			title: page.title,
			ns: page.ns,
			displaytitle: title.display,
			normalizedtitle: title.normalized || page.title,
			pageprops: page.pageprops,
			lastmodified: revision && revision.timestamp,
			lastmodifier: revision && {
				anon: revision.anon,
				user: revision.user,
				gender: 'unknown' // Always set to unknown until support in API added (T172228)
			},
			image: page.pageimage ? { file: page.pageimage } : undefined,
			languagecount: page.langlinks ? page.langlinks.length : 0,
			thumbnail: page.thumbnail,
			originalimage: page.original,
			protection,
			editable: protection && !protection.edit,
			mainpage: siteinfo.general.mainpage === page.title ? true : undefined,
			revision: revision && revision.revid,
			description: description && description.value,
			description_source: description && description.source,
			contentmodel,
			redirect: page.redirect, // needed to ensure MCS isn't handling redirects internally
			// primary earth coordinates, if any
			geo: page.coordinates && mwapi.getPrimaryEarthCoordinates(page.coordinates)
		};
	});
};

/**
 * Builds the request to get all sections from MW API action=parse.
 * We can avoid using parse API when Parsoid supports language variants for Chinese.
 *
 * @param {!Object} req the request object
 * @return {!Promise} a promise resolving as an JSON object containing the response
 */
mwapi.getPageFromMobileview = function(req) {
	const props = ['text', 'sections',
		'langlinks',
		'revid',
		'displaytitle', 'protection',
	];

	const query = apiParams({
		action: 'parse',
		page: req.params.title,
		prop: props.join('|'),
	});

	// Workaround for a bug in MobileView where it only works with relevant language codes
	// For example: en-us, zh-tw won't work for zhwiki, en-us needs to be filtered out
	const headers = {};
	const languageCode = wikiLanguage.getLanguageCode(req.params.domain);
	if (wikiLanguage.isLanguageCodeWithVariants(languageCode)) {
		const acceptLanguage = req.headers['accept-language'];
		const languages = wikiLanguage.relevantWikiLanguageCodesFromAcceptLanguageHeader(
			acceptLanguage,
			languageCode
		);
		if (languages[0]) {
			headers['accept-language'] = languages[0];
		}
	}

	return api.mwApiGet(req, query, req.params.domain, headers).then((response) => {
		mwapi.checkForParseInResponse(req.logger, response);

		// construct mobile view
		const parseResult = response.body.parse;
		const text = parseResult.text;
		response.body.mobileview = Object.assign( parseResult, {
			revision: parseResult.revid,
			id: parseResult.pageid,
			normalizedtitle: parseResult.title.replace( /_/g, ' ' ),
			languagecount: parseResult.langlinks.length,
			sections: transforms.makeSections( text ),
			ns: parseResult.title.includes(':') ? undefined : 0,
			text: undefined,
			langlinks: undefined
		} );
		delete response.body.parse;
		return response;
	});
};

/**
 * Builds a set of URLs for different thumbnail sizes of an image based on the provided array of
 * widths.
 *
 * @param {!string} initialUrl an initial thumbnail URL for an image, for example:
 *     https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Foo.jpg/640px-Foo.jpg
 * @param {!number[]} desiredWidths an array of desired widths for which to construct URLs
 * @return {!Object} with widths as keys and the corresponding thumb URLs as values
 */
mwapi.buildImageUrlSet = function(initialUrl, desiredWidths) {
	const result = {};
	desiredWidths.forEach((width) => {
		result[width] = thumbnail.scaleURL(initialUrl, width) || initialUrl;
	});
	return result;
};

/**
 * Builds a set of URLs for lead images with different sizes based on common bucket widths:
 * 320, 640, 800, 1024.
 *
 * @param {!string} initialUrl
 * @return {!Object}
 */
mwapi.buildLeadImageUrls = function(initialUrl) {
	return mwapi.buildImageUrlSet(initialUrl, [ constants.LEAD_IMAGE_S, constants.LEAD_IMAGE_M,
		constants.LEAD_IMAGE_L, constants.LEAD_IMAGE_XL ]);
};

/**
 * Get a Title object for a MW title string
 *
 * @param {!string} title a MediaWiki page title string
 * @param {!Object} siteinfo siteinfo from the MW API
 * @return {!Object} a mediawiki-title Title object that can be used to obtain a db-normalized title
 */
mwapi.getTitleObj = function(title, siteinfo) {
	return Title.newFromText(title, siteinfo);
};

/**
 * @param {!string} title
 * @param {!Object} siteinfo
 */
mwapi.getDbTitle = function(title, siteinfo) {
	return mwapi.getTitleObj(title, siteinfo).getPrefixedDBKey();
};

/**
 * Changes the namespace prefix of a page title to the canonical File: prefix
 *
 * @param  {!string} pageTitle title of a page with a namespace
 * @return {!string} filePageTitle title with a File: prefix
 */
mwapi.getCanonicalFileTitle = function(title) {
	return title && title.replace(/^.+:/g, 'File:');
};

/**
 * Function to resolve page redirects and return the resolved title
 *
 * @param {!Object} req the request object
 * @return {Promise<T>} resolvedTitle title resolved from redirect query
 */
mwapi.resolveTitleRedirect = function(req) {
	const { title } = req.params;

	return api.mwApiGet(req, {
		action: 'query',
		format: 'json',
		titles: title,
		redirects: 1,
		converttitles: 1
	}).then((res) => {
		const responseData = res.body.query;
		if (title) {
			if (responseData.converted) {
				// Return the right title to redirect if it has another language option
				return responseData.converted[0].to;
			} else if (responseData.redirects) {
				return responseData.redirects[0].to;
			} else {
				return title;
			}
		}
		return;
	}).catch(e => {
		throw e;
	});
};

/**
 * Function that returns flagged revision of the article. If it doesn't exist, latest revision id
 *
 *  @param {!Object} req the request object
 *  @return {?number}
 */
mwapi.getFlaggedOrLatestRevision = function(req) {
	const isFlagged = flaggedWikisList.includes(req.params.domain),
		{ title } = req.params,
		props = ['info', 'flagged'];

	if (isFlagged && !req.params.revision) {
		return api.mwApiGet(req, {
			action: 'query',
			format: 'json',
			titles: title,
			formatversion: 2,
			prop: props.join('|')
		}).then((res) => {
			const pages = res.body.query && res.body.query.pages;
			if (pages && pages[0]) {
				if (pages[0].flagged &&
					pages[0].flagged.stable_revid) {
					return pages[0].flagged.stable_revid;
				} else if (pages[0].lastrevid) {
					return pages[0].lastrevid;
				}
			}
			return null;
		});
	}
	return req.params.revision || null;
};

module.exports = mwapi;
