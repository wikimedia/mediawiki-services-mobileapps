'use strict';

const uuidv1 = require('uuid').v1;
const storage = require('@wikimedia/cassandra-storage');
const { Request } = require('express');
const { makeOutgoingRequest } = require('axios-wmf-service-mesh');
const { isString } = require('underscore');

const defaultKeyFunc = (req) => req.originalUrl;
const defaultProjectFunc = (req) => req.params.domain;

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
			const uri = [req.params.domain, '/api/rest_v1', path].join('');
			const event = structuredClone(baseEvent);
			event.meta.uri = uri;
			event.meta.stream = stream;
			return event;
		};
		events = events.concat(
			req.purgePaths.map((p) => eventFunc(req.app.conf.caching.event.stream.change, p)),
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
		(req) => sendEvents(req, purgeEvents(req)),
		app.conf.caching.ttl
	);
};

const defaultCacheMiddleware = (req, res, next) => {
	const conf = req.app.conf.caching;
	const cachingEnabled = conf && conf.enabled;
	const excludedUserAgents = (conf && conf.excludedUserAgents) || [];
	const userAgentAllowed = !excludedUserAgents.includes(req.get('user-agent'));
	if (cachingEnabled && userAgentAllowed) {
		return req.app.cacheMiddleware(req, res, next);
	}
	next();
};

module.exports = {
	initCache,
	defaultCacheMiddleware,
	purgeEvents,
	sendEvents
};
