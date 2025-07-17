'use strict';

const uuidv1 = require('uuid').v1;
const storage = require('@wikimedia/cassandra-storage');
const { Request } = require('express');
const { makeOutgoingRequest } = require('axios-wmf-service-mesh');
const { isString, rest } = require('underscore');
const { getLanguageCode, isLanguageCodeWithVariants, relevantLanguageVariantOrCode,
	getAllLanguageVariantsForLanguageCode
} = require('./wikiLanguage');
const { isRequestCachable } = require('./restbase-compat');

const defaultKeyFunc = (req) => decodeURIComponent(req.originalUrl);
const defaultProjectFunc = (req) => {
	const domain = req.params.domain;
	// If domain has language variants, use variant as part of the project name
	const langcode = getLanguageCode(domain);
	if (langcode && isLanguageCodeWithVariants(langcode)) {
		const variantOrCode = relevantLanguageVariantOrCode(req);
		return `${ domain }-${ variantOrCode }`;
	}
	return domain;
};

/**
 *
 * Checks whether a request is triggered by cache pregeneration.
 * Pregeneration is using `cache-control: no-cache` as header.
 *
 * @param req
 * @return {boolean}
 */
const isPregenerationRequest = (req) => req.get('cache-control') === 'no-cache';

/**
 * Generate purge events for a PCS request
 *
 * @param {Request} req
 * @return {Array}
 */
const purgeEvents = (req) => {
	const baseEvent = {
		$schema: '/resource_change/1.0.0',
		meta: {
			request_id: req.headers['x-request-id'],
			id: uuidv1(),
			dt: new Date().toISOString(),
			domain: req.params.domain,
		},
		tags: ['pcs']
	};

	let events = [];
	if (req.purgePaths) {
		const eventFunc = (stream, path) => {
			const uri = ['http://', req.params.domain, '/api/rest_v1', path].join('');
			const event = structuredClone(baseEvent);
			event.meta.uri = uri;
			event.meta.stream = stream;
			return event;
		};
		events = events.concat(
			// TODO: Re-enable events when event flooding goes down
			// TODO: Ideally use a dedicated topic for this type of events
			// req.purgePaths.map((p) => eventFunc(req.app.conf.caching.event.stream.change, p)),
			req.purgePaths.map((p) => eventFunc(req.app.conf.caching.event.stream.purge, p))
		);
	}
	return events;
};

/**
 * Send events to eventgate
 *
 * @param {Request} parentReq
 * @param {Array} events
 */
const sendEvents = (parentReq, events) => {
	const eventGateRequest = parentReq.app.eventgate_tpl.expand({
		request: {
			body: events
		}
	});
	makeOutgoingRequest(eventGateRequest, parentReq).catch((err) => {
		parentReq.app.logger.log('warn/eventgate', err.toJSON());
	});
};

const getCacheCounter = (app) => app.metrics.makeMetric({
	type: 'Counter',
	name: 'cache_operations_total',
	labels: {
		names: ['status', 'domain', 'path', 'pregeneration']
	},
	prometheus: {
		name: 'cache_operations_total',
		help: 'App level caching operations total count',
		staticLabels: app.metrics.getServiceLabel()
	}
});

/**
 * Purge language variants on cache update
 *
 * @param req
 */
const purgeLanguageVariants = (req) => {
	const needsInvalidation = isPregenerationRequest(req);
	const langcode = getLanguageCode(req.params.domain);
	const hasLanguageVariants = langcode && isLanguageCodeWithVariants(langcode);

	// Purge storage for language-variants when we invalidate caches
	if (needsInvalidation && hasLanguageVariants) {
		const variantOrCode = relevantLanguageVariantOrCode(req);
		const restOfVariants = getAllLanguageVariantsForLanguageCode(langcode).filter(
			elem => elem !== variantOrCode
		);
		// Purge the rest of the language variants other than the requested
		restOfVariants.forEach(variant => {
			// Copy only the needed information to a request-like object
			// but override accept-language header
			const clonedReq = {
				originalUrl: req.originalUrl,
				params: {
					domain: req.params.domain,
				},
				headers: {
					'accept-language': variant,
				}
			};
			req.app.cache.delete(defaultKeyFunc(clonedReq), defaultProjectFunc(clonedReq));
		});
	}
};

/**
 * Cache update hook: send purge events, purge language variants and emit metrics
 *
 * @param req
 * @param res
 */
const cacheUpdateHook = (req, res) => {
	purgeLanguageVariants(req);
	sendEvents(req, purgeEvents(req));
	getCacheCounter(req.app).increment(1, ['update', req.params.domain, req.route.path, isPregenerationRequest(req)]);
};

/**
 * Cache hit hook: emit metrics
 *
 * @param req
 * @param res
 * @param hitObj
 */
const cacheHitHook = (req, res, hitObj) => {
	getCacheCounter(req.app).increment(1, ['hit', req.params.domain, req.route.path, isPregenerationRequest(req)]);
};

/**
 * Initialize cache storage backend
 *
 * @param {Object} conf
 * @return {Object}
 */
const initCache = (app) => {
	const cacheConfig = app.conf.cassandra;
	cacheConfig.localDc = app.conf.cassandra.local_dc;
	cacheConfig.username = app.conf.cassandra.authentication.username;
	cacheConfig.password = app.conf.cassandra.authentication.password;
	cacheConfig.keyspace = app.conf.caching.cassandra.keyspace;
	cacheConfig.storageTable = app.conf.caching.cassandra.storageTable;

	// Adapt value to match cassandra config from helm charts
	if (cacheConfig.tls && isString(cacheConfig.tls.ca)) {
		cacheConfig.tls.ca = [cacheConfig.tls.ca];
	}

	app.cache = new storage.Engine(cacheConfig);
	app.cacheMiddleware = storage.middlewareFactory(
		defaultKeyFunc,
		defaultProjectFunc,
		cacheUpdateHook,
		cacheHitHook,
		app.conf.caching.ttl,
		app.conf.caching.maxJitter
	);
};

async function checkIfUnmodifiedSince(req, res) {
	const dt = req.get('if-unmodified-since');
	const req_with_eventdt = req.app.metrics.makeMetric({
		type: 'Counter',
		name: 'total_pregen_req_with_eventdt',
		labels: {
			names: ['domain', 'path', 'stale_event']
		},
		prometheus: {
			name: 'total_pregen_req_with_eventdt',
			help: 'Total count of pregen requests with event.dt in the headers',
			staticLabels: req.app.metrics.getServiceLabel()
		}
	});

	if (isPregenerationRequest(req) && dt) {
		const hitObj = await req.app.cache.get(defaultKeyFunc(req), defaultProjectFunc(req));
		if (hitObj) {
			const staleEvent = hitObj.cached > Date.parse(dt);
			if (staleEvent) {
				res.send(412, 'Pregeneration event is stale');
			}
			req_with_eventdt.increment(1, [req.params.domain, req.route.path, staleEvent]);
		}
	}
}

const defaultCacheMiddleware = (req, res, next) => {
	const conf = req.app.conf.caching;
	const cachingEnabled = conf && conf.enabled;
	if (isLanguageCodeWithVariants(getLanguageCode(req.params.domain))) {
		res.vary('accept-language');
	}
	if (cachingEnabled && isRequestCachable(req, res)) {
		// HACK: Check if unmodified since header and disallow stale events
		checkIfUnmodifiedSince(req, res);
		return req.app.cacheMiddleware(req, res, next);
	}
	next();
};

module.exports = {
	initCache,
	defaultCacheMiddleware,
	purgeEvents,
	sendEvents,
	purgeLanguageVariants,
	isPregenerationRequest,
};
