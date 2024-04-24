/* eslint-disable no-multiple-empty-lines */

'use strict';


const BBPromise = require('bluebird');
const ServiceRunner = require('service-runner');
const logStream = require('./logStream');
const fs = require('fs');
const assert = require('./assert');
const yaml = require('js-yaml');
const extend = require('extend');
const sepia = require('sepia');


// set up the configuration
let config = {
	conf: yaml.load(fs.readFileSync(`${ __dirname }/../../config.yaml`))
};
// build the API endpoint URI by supposing the actual service
// is the last one in the 'services' list in the config file
const myServiceIdx = config.conf.services.length - 1;
const myService = config.conf.services[myServiceIdx];
config.uri = `http://localhost:${ myService.conf.port }/`;
config.service = myService;
// no forking, run just one process when testing
config.conf.num_workers = 0;
// have a separate, in-memory logger only
config.conf.logging = {
	name: 'test-log',
	level: 'trace',
	stream: logStream()
};
// make a deep copy of it for later reference
const origConfig = extend(true, {}, config);

// Requests to our own service should always be live and not use the VCR facility.
sepia.filter({
	url: new RegExp(config.uri),
	forceLive: true
});

module.exports.stop = () => {
	return BBPromise.resolve();
};
let options = null;
const runner = new ServiceRunner();

async function start(_options) {
	options = _options;
	// set up the config
	config = extend(true, {}, origConfig);
	extend(true, config.conf.services[myServiceIdx].conf, options);
	await runner.start(config.conf);
	return runner;
}

module.exports.config = config;
module.exports.start = start;
