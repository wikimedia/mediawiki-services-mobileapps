'use strict';


// Default to recording+replaying http fixtures,
// only if we are not running in Docker
if (process.env.IN_DOCKER) {
    process.env.VCR_MODE = undefined;
} else {
    process.env.VCR_MODE = process.env.VCR_MODE || 'cache';
}

const BBPromise = require('bluebird');
const ServiceRunner = require('service-runner');
const logStream = require('./logStream');
const fs = require('fs');
const assert = require('./assert');
const yaml = require('js-yaml');
const extend = require('extend');


// set up the configuration
let config = {
    conf: yaml.safeLoad(fs.readFileSync(__dirname + '/../../config.yaml'))
};
// build the API endpoint URI by supposing the actual service
// is the last one in the 'services' list in the config file
const myServiceIdx = config.conf.services.length - 1;
const myService = config.conf.services[myServiceIdx];
config.uri = 'http://localhost:' + myService.conf.port + '/';
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

let stop = function() { return BBPromise.resolve(); };
let options = null;
const runner = new ServiceRunner();


function start(_options) {

    _options = _options || {};

    if (!assert.isDeepEqual(options, _options)) {
        console.log('server options changed; restarting');
        return stop().then(function() {
            options = _options;
            // set up the config
            config = extend(true, {}, origConfig);
            extend(true, config.conf.services[myServiceIdx].conf, options);
            return runner.start(config.conf)
            .then(function() {
                stop = function () {
                    console.log('stopping test server');
                    return runner.stop().then(function() {
                        stop = function() { return BBPromise.resolve(); };
                    });
                };
                return true;
            });
        });
    } else {
        return BBPromise.resolve();
    }

}

module.exports.config = config;
module.exports.start  = start;

