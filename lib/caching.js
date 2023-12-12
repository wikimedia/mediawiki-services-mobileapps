'use strict';

const storage = require('@wikimedia/cassandra-storage');

const defaultKeyFunc = (req) => req.originalUrl;
const defaultProjectFunc = (req) => req.params.domain;

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

	app.cache = new storage.Engine(cacheConfig);
	app.cacheMiddleware = storage.middlewareFactory(
		defaultKeyFunc,
		defaultProjectFunc,
		app.conf.caching.ttl
	);
};

const defaultCacheMiddleware = (req, res, next) => {
	if (req.app.conf.caching && req.app.conf.caching.enabled) {
		return req.app.cacheMiddleware(req, res, next);
	}
	next();
};

module.exports = {
	initCache,
	defaultCacheMiddleware
};
