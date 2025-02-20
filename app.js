'use strict';

/**
 * @module app
 */

const http = require('http');
const BBPromise = require('bluebird');
const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const fs = BBPromise.promisifyAll(require('fs'));
const sUtil = require('./lib/util');
const specLib = require('./lib/spec');
const apiUtil = require('./lib/api-util');
const coreApiCompat = require('./lib/core-api-compat');
const mUtil = require('./lib/mobile-util');
const packageInfo = require('./package.json');
const yaml = require('js-yaml');
const addShutdown = require('http-shutdown');
const path = require('path');
const { isRestbaseCompatReq } = require('./lib/restbase-compat');
const { initCache } = require('./lib/caching');

/**
 * Creates an express app and initialises it
 *
 * @param {!Object} options the options to initialise the app with
 * @return {!bluebird} the promise resolving to the app object
 */
function initApp(options) {

	// the main application object
	const app = express();

	// get the options and make them available in the app
	app.logger = options.logger;    // the logging device
	app.metrics = options.metrics;  // the metrics
	app.conf = options.config;      // this app's config options
	app.info = packageInfo;         // this app's package info

	// ensure some sane defaults
	if (!app.conf.port) {
		app.conf.port = 8888;
	}
	if (!app.conf.interface) {
		app.conf.interface = '0.0.0.0';
	}
	if (app.conf.compression_level === undefined) {
		app.conf.compression_level = 3;
	}
	if (app.conf.cors === undefined) {
		app.conf.cors = '*';
	}
	if (app.conf.csp === undefined) {
		app.conf.csp = "default-src 'none'; frame-ancestors 'none'";
	}

	// better to have these values in the config
	if (app.conf.mobile_html_csp === undefined) {
		return BBPromise.reject('config missing mobile_html_csp');
	}
	if (app.conf.mobile_html_rest_api_base_uri === undefined) {
		return BBPromise.reject('config missing mobile_html_rest_api_base_uri');
	}
	if (app.conf.mobile_html_local_rest_api_base_uri_template === undefined) {
		return BBPromise.reject('config missing mobile_html_local_rest_api_base_uri_template');
	}

	// set outgoing proxy
	if (app.conf.proxy) {
		process.env.HTTP_PROXY = app.conf.proxy;
		// if there is a list of domains which should
		// not be proxied, set it
		if (app.conf.no_proxy_list) {
			if (Array.isArray(app.conf.no_proxy_list)) {
				process.env.NO_PROXY = app.conf.no_proxy_list.join(',');
			} else {
				process.env.NO_PROXY = app.conf.no_proxy_list;
			}
		}
	}

	// set up header allowlist for logging
	if (!app.conf.log_header_allowlist) {
		app.conf.log_header_allowlist = [
			'cache-control', 'content-type', 'content-length', 'if-match',
			'user-agent', 'x-request-id'
		];
	}
	app.conf.log_header_allowlist = new RegExp(`^(?:${ app.conf.log_header_allowlist.map((item) => item.trim()).join('|') })$`, 'i');

	// set up default strategy for handling redirects
	app.conf.pcs_handles_redirects = app.conf.pcs_handles_redirects || false;

	// set up the request templates for the APIs
	apiUtil.setupApiTemplates(app);

	// set up the spec
	if (!app.conf.spec) {
		app.conf.spec = specLib.load(`${ __dirname }/spec`, {});
	}
	if (app.conf.spec.constructor !== Object) {
		try {
			app.conf.spec = yaml.load(fs.readFileSync(app.conf.spec));
		} catch (e) {
			app.logger.log('warn/spec', `Could not load the spec: ${ e }`);
			app.conf.spec = {};
		}
	}
	if (!app.conf.spec.openapi) {
		app.conf.spec.openapi = '3.0.1';
	}
	if (!app.conf.spec.info) {
		app.conf.spec.info = {
			version: app.info.version,
			title: app.info.name,
			description: app.info.description
		};
	}
	app.conf.spec.info.version = app.info.version;
	if (!app.conf.spec.paths) {
		app.conf.spec.paths = {};
	}

	// set the CORS and CSP headers
	app.all('*', (req, res, next) => {
		if (app.conf.cors !== false) {
			res.header('access-control-allow-origin', app.conf.cors);
			res.header('access-control-allow-headers', 'accept, x-requested-with, content-type');
			res.header('access-control-expose-headers', 'etag');
		}
		if (app.conf.csp !== false) {
			res.header('x-xss-protection', '1; mode=block');
			res.header('x-content-type-options', 'nosniff');
			res.header('x-frame-options', 'SAMEORIGIN');
			mUtil.setContentSecurityPolicy(res, app.conf.csp);
		}
		// restbase compatibility layer for security headers
		if (
			app.conf.restbase_compatibility.security_headers ||
			isRestbaseCompatReq(req) // bypass config feature flag with request header
		) {
			mUtil.setRestBaseCompatSecurityHeaders(res);
		}
		sUtil.initAndLogRequest(req, app);

		// add x-request-id in response headers
		res.header('x-request-id', req.context.reqId);

		next();
	});

	// set up the user agent header string to use for requests
	app.conf.user_agent = app.conf.user_agent || app.info.name;

	// set up default endpoint for parsoid to be restbase
	app.conf.use_coreparsoid_endpoint = app.conf.use_coreparsoid_endpoint || false;

	// disable the X-Powered-By header
	app.set('x-powered-by', false);
	// disable the ETag header - users should provide them!
	app.set('etag', false);
	// enable compression
	app.use(compression({ level: app.conf.compression_level }));
	// use the JSON body parser
	app.use(bodyParser.json({ limit: app.conf.max_body_size || '100kb' }));
	// use the application/x-www-form-urlencoded parser
	app.use(bodyParser.urlencoded({ extended: true }));
	// use text for text/html
	app.use(bodyParser.text({ type: 'text/html', limit: '10MB' }));

	// Initialize cache backend
	if (app.conf.caching && app.conf.caching.enabled) {
		initCache(app);
	}

	// Default cache headers
	const default_cache_headers = {
		'mobile-html': 's-maxage=1209600, max-age=0',
		'media-list': 's-maxage=1209600, max-age=0',
		'page-summary': 's-maxage=1209600, max-age=300'
	};
	app.conf.cache_headers = app.conf.cache_headers || default_cache_headers;

	return BBPromise.resolve(app);

}

/**
 * Loads all routes declared in routes/ into the app
 *
 * @param {Application} app the application object to load routes into
 * @param {string} dir routes folder
 * @return {bluebird} a promise resolving to the app object
 */
function loadRoutes(app, dir) {

	// recursively load routes from .js files under routes/
	return fs.readdirAsync(dir).map((fname) => BBPromise.try(() => {
		const resolvedPath = path.resolve(dir, fname);
		const isDirectory = fs.statSync(resolvedPath).isDirectory();
		if (isDirectory) {
			loadRoutes(app, resolvedPath);
		} else if (/\.js$/.test(fname)) {
			// import the route file
			const route = require(`${ dir }/${ fname }`);
			return route(app);
		}
	}).then((route) => {
		if (route === undefined) {
			return undefined;
		}
		// check that the route exports the object we need
		if (route.constructor !== Object || !route.path || !route.router ||
                !(route.api_version || route.skip_domain)) {
			throw new TypeError(`routes/${ fname } does not export the correct object!`);
		}
		// normalise the path to be used as the mount point
		if (route.path[0] !== '/') {
			route.path = `/${ route.path }`;
		}
		if (route.path[route.path.length - 1] !== '/') {
			route.path = `${ route.path }/`;
		}
		if (!route.skip_domain) {
			route.path = `/:domain/v${ route.api_version }${ route.path }`;
		}
		// wrap the route handlers with Promise.try() blocks
		sUtil.wrapRouteHandlers(route, app);
		// all good, use that route
		app.use(route.path, route.router);
	})).then(() => {
		// handle title redirects
		if (app.conf.pcs_handles_redirects) {
			app.use(coreApiCompat.httpTitleRedirectErrorMiddleware);
		}
		// catch errors
		sUtil.setErrorHandler(app);
		// route loading is now complete, return the app object
		return BBPromise.resolve(app);
	});

}

/**
 * Preload scripts for preprocessing Parsoid HTML for page content endpoints
 *
 * @param {Application} app the app object to use in the service
 * @return {bluebird} a promise resolving to the app object, with preprocessing scripts attached
 */
function loadPreProcessingScripts(app, dir) {

	/**
	 * Validate the script format
	 *
	 * @param {!Array} script processing script
	 * @throws error if script format is invalid
	 */
	function _validate(script) {
		if (script.filter((i) => typeof i === 'object' && Object.keys(i).length !== 1).length) {
			throw new Error('Invalid processing script format');
		}
	}

	app.conf.processing_scripts = {};
	return fs.readdirAsync(dir).map(filename => BBPromise.try(() => {
		const name = filename.split('.')[0];
		const script = yaml.load(fs.readFileSync(`${ dir }/${ filename }`));
		_validate(script);
		app.conf.processing_scripts[name] = script;
	})
		.catch(e => app.logger.log('warn/loading', `Error loading processing scripts: ${ e }`)))
		.then(() => BBPromise.resolve(app));
}

/**
 * Creates and start the service's web server
 *
 * @param {Application} app the app object to use in the service
 * @return {bluebird} a promise creating the web server
 */
function createServer(app) {

	// return a promise which creates an HTTP server,
	// attaches the app to it, and starts accepting
	// incoming client requests
	let server;
	return new BBPromise((resolve) => {
		server = http.createServer(app).listen(
			app.conf.port,
			app.conf.interface,
			resolve
		);
		server = addShutdown(server);
	}).then(() => {
		app.logger.log('info',
			`Worker ${ process.pid } listening on ${ app.conf.interface || '*' }:${ app.conf.port }`);

		// Don't delay incomplete packets for 40ms (Linux default) on
		// pipelined HTTP sockets. We write in large chunks or buffers, so
		// lack of coalescing should not be an issue here.
		server.on('connection', (socket) => {
			socket.setNoDelay(true);
		});

		return server;
	});

}

/**
 * The service's entry point. It takes over the configuration
 * options and the logger- and metrics-reporting objects from
 * service-runner and starts an HTTP server, attaching the application
 * object to it.
 *
 * @param {Object} options the options to initialise the app with
 * @return {bluebird} HTTP server
 */
module.exports = (options) => initApp(options)
	.then(app => loadRoutes(app, `${ __dirname }/routes`))
	.then(app => loadPreProcessingScripts(app, `${ __dirname }/processing`))
	.then((app) => {
		const setJsdocHeaders = (req, res, next) => {
			res.removeHeader('Content-Security-Policy');
			next();
		};
		app.use('/jsdoc', setJsdocHeaders, express.static(`${ __dirname }/docs/jsdoc`));
		return app;
	}).then(createServer);
