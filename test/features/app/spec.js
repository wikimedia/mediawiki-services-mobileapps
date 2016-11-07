'use strict';


var preq   = require('preq');
var assert = require('../../utils/assert');
var server = require('../../utils/server');
var dateUtil = require('../../../lib/dateUtil');
var URI    = require('swagger-router').URI;
var yaml   = require('js-yaml');
var fs     = require('fs');
var Ajv    = require('ajv');

var date = new Date();
var yesterday = new Date(Date.now() - dateUtil.ONE_DAY);
var dateString = date.getUTCFullYear() + '/' + dateUtil.pad(date.getUTCMonth() + 1) + '/' + dateUtil.pad(date.getUTCDate());
var yesterdayString = yesterday.getUTCFullYear() + '/' + dateUtil.pad(yesterday.getUTCMonth() + 1) + '/' + dateUtil.pad(yesterday.getUTCDate());


function staticSpecLoad() {

    var spec;
    var myService = server.config.conf.services[server.config.conf.services.length - 1].conf;
    var specPath = __dirname + '/../../../' + (myService.spec ? myService.spec : 'spec.yaml');

    try {
        spec = yaml.safeLoad(fs.readFileSync(specPath));
    } catch(e) {
        // this error will be detected later, so ignore it
        spec = {paths: {}, 'x-default-params': {}};
    }

    return spec;

}


function validateExamples(pathStr, defParams, mSpec) {

    var uri = new URI(pathStr, {}, true);

    if(!mSpec) {
        try {
            uri.expand(defParams);
            return true;
        } catch(e) {
            throw new Error('Missing parameter for route ' + pathStr + ' : ' + e.message);
        }
    }

    if(!Array.isArray(mSpec)) {
        throw new Error('Route ' + pathStr + ' : x-amples must be an array!');
    }

    mSpec.forEach(function(ex, idx) {
        if(!ex.title) {
            throw new Error('Route ' + pathStr + ', example ' + idx + ': title missing!');
        }
        ex.request = ex.request || {};
        try {
            uri.expand(Object.assign({}, defParams, ex.request.params || {}));
        } catch(e) {
            throw new Error('Route ' + pathStr + ', example ' + idx + ' (' + ex.title + '): missing parameter: ' + e.message);
        }
    });

    return true;

}


function constructTestCase(title, path, method, request, response) {

    return {
        title: title,
        request: {
            uri: server.config.uri + (path[0] === '/' ? path.substr(1) : path),
            method: method,
            headers: request.headers || {},
            query: request.query,
            body: request.body,
            followRedirect: false
        },
        response: {
            status: response.status || 200,
            headers: response.headers || {},
            body: response.body
        }
    };

}


function constructTests(paths, defParams) {

    var ret = [];

    Object.keys(paths).forEach(function(pathStr) {
        Object.keys(paths[pathStr]).forEach(function(method) {
            var p = paths[pathStr][method];
            var uri;
            if(p.hasOwnProperty('x-monitor') && !p['x-monitor']) {
                return;
            }
            uri = new URI(pathStr, {}, true);
            if(!p['x-amples']) {
                ret.push(constructTestCase(
                    pathStr,
                    uri.toString({params: defParams}),
                    method,
                    {},
                    {}
                ));
                return;
            }
            p['x-amples'].forEach(function(ex) {
                ex.request = ex.request || {};
                ret.push(constructTestCase(
                    ex.title,
                    uri.toString({params: Object.assign({}, defParams, ex.request.params || {})}),
                    method,
                    ex.request,
                    ex.response || {}
                ));
            });
        });
    });

    return ret;

}


function cmp(result, expected, errMsg) {

    if(expected === null || expected === undefined) {
        // nothing to expect, so we can return
        return true;
    }
    if(result === null || result === undefined) {
        result = '';
    }

    if(expected.constructor === Object) {
        Object.keys(expected).forEach(function(key) {
            var val = expected[key];
            assert.deepEqual(result.hasOwnProperty(key), true, 'Body field ' + key + ' not found in response!');
            cmp(result[key], val, key + ' body field mismatch!');
        });
        return true;
    } else if(expected.constructor === Array) {
        if(result.constructor !== Array) {
            assert.deepEqual(result, expected, errMsg);
            return true;
        }
        // only one item in expected - compare them all
        if(expected.length === 1 && result.length > 1) {
            result.forEach(function(item) {
                cmp(item, expected[0], errMsg);
            });
            return true;
        }
        // more than one item expected, check them one by one
        if(expected.length !== result.length) {
            assert.deepEqual(result, expected, errMsg);
            return true;
        }
        expected.forEach(function(item, idx) {
            cmp(result[idx], item, errMsg);
        });
        return true;
    }

    if(expected.length > 1 && expected[0] === '/' && expected[expected.length - 1] === '/') {
        if((new RegExp(expected.slice(1, -1))).test(result)) {
            return true;
        }
    } else if(expected.length === 0 && result.length === 0) {
        return true;
    } else if(result === expected || result.startsWith(expected)) {
        return true;
    }

    assert.deepEqual(result, expected, errMsg);
    return true;

}


function validateTestResponse(testCase, res) {

    var expRes = testCase.response;

    // check the status
    assert.status(res, expRes.status);
    // check the headers
    Object.keys(expRes.headers).forEach(function(key) {
        var val = expRes.headers[key];
        assert.deepEqual(res.headers.hasOwnProperty(key), true, 'Header ' + key + ' not found in response!');
        cmp(res.headers[key], val, key + ' header mismatch!');
    });
    // check the body
    if(!expRes.body) {
        return true;
    }
    res.body = res.body || '';
    if(Buffer.isBuffer(res.body)) { res.body = res.body.toString(); }
    if(expRes.body.constructor !== res.body.constructor) {
        if(expRes.body.constructor === String) {
            res.body = JSON.stringify(res.body);
        } else {
            res.body = JSON.parse(res.body);
        }
    }
    // check that the body type is the same
    if(expRes.body.constructor !== res.body.constructor) {
        throw new Error('Expected a body of type ' + expRes.body.constructor + ' but gotten ' + res.body.constructor);
    }

    // compare the bodies
    cmp(res.body, expRes.body, 'Body mismatch!');

    return true;

}


describe('Swagger spec', function() {

    // the variable holding the spec
    var spec = staticSpecLoad();
    // default params, if given
    var defParams = spec['x-default-params'] || {};

    this.timeout(20000);

    before(function () {
        return server.start();
    });

    it('get the spec', function() {
        return preq.get(server.config.uri + '?spec')
        .then(function(res) {
            assert.status(200);
            assert.contentType(res, 'application/json');
            assert.notDeepEqual(res.body, undefined, 'No body received!');
            spec = res.body;
        });
    });

    it('spec validation', function() {
        if(spec['x-default-params']) {
            defParams = spec['x-default-params'];
        }
        // check the high-level attributes
        ['info', 'swagger', 'paths'].forEach(function(prop) {
            assert.deepEqual(!!spec[prop], true, 'No ' + prop + ' field present!');
        });
        // no paths - no love
        assert.deepEqual(!!Object.keys(spec.paths), true, 'No paths given in the spec!');
        // now check each path
        Object.keys(spec.paths).forEach(function(pathStr) {
            var path;
            assert.deepEqual(!!pathStr, true, 'A path cannot have a length of zero!');
            path = spec.paths[pathStr];
            assert.deepEqual(!!Object.keys(path), true, 'No methods defined for path: ' + pathStr);
            Object.keys(path).forEach(function(method) {
                var mSpec = path[method];
                if(mSpec.hasOwnProperty('x-monitor') && !mSpec['x-monitor']) {
                    return;
                }
                validateExamples(pathStr, defParams, mSpec['x-amples']);
            });
        });
    });

    describe('validate responses against schema', function() {
        var ajv = new Ajv({});

        var assertValidSchema = function(uri, schemaPath) {
            return preq.get({ uri: uri })
            .then(function(res) {
                if (!ajv.validate(schemaPath, res.body)) {
                    throw new assert.AssertionError({ message: ajv.errorsText() });
                }
            });
        };

        var assertValidSchemaAggregated = function(uri) {
            return preq.get({ uri: uri, query: { aggregated: true } })
            .then(function(res) {
                if (!!res.body) {
                    throw new assert.AssertionError({ message: 'Response should be empty!' });
                }
            });
        };

        var assertBadRequest = function(uri) {
            return preq.get({ uri: uri })
            .then(function(res) {
                assert.fail("This request should fail!");
            })
            .catch(function(err) {
                if (!ajv.validate('#/definitions/problem', err.body)) {
                    throw new assert.AssertionError({ message: ajv.errorsText() });
                }
            });
        };

        Object.keys(spec.definitions).forEach(function(defName) {
            ajv.addSchema(spec.definitions[defName], '#/definitions/' + defName);
        });

        //Valid non-aggregated requests

        it('featured article response should conform to schema', function() {
            var uri = server.config.uri + 'en.wikipedia.org/v1/page/featured/' + dateString;
            return assertValidSchema(uri, '#/definitions/article_summary_merge_link');
        });

        it('featured image response should conform to schema', function() {
            var uri = server.config.uri + 'en.wikipedia.org/v1/media/image/featured/' + dateString;
            return assertValidSchema(uri, '#/definitions/image');
        });

        it('most-read response should conform to schema', function() {
            var uri = server.config.uri + 'en.wikipedia.org/v1/page/most-read/' + yesterdayString;
            return assertValidSchema(uri, '#/definitions/mostread');
        });

        it('news response should conform to schema', function() {
            var uri = server.config.uri + 'en.wikipedia.org/v1/page/news';
            return assertValidSchema(uri, '#/definitions/news');
        });

        it('random response should conform to schema', function() {
            var uri = server.config.uri + 'en.wikipedia.org/v1/page/random/title';
            return assertValidSchema(uri, '#/definitions/random');
        });

        //Bad requests return empty response for aggregated=true

        it('featured article response should conform to schema (invalid language, aggregated=true)', function() {
            return assertValidSchemaAggregated(server.config.uri + 'is.wikipedia.org/v1/page/featured/' + dateString);
        });

        it('featured image response should conform to schema (invalid date, aggregated=true)', function() {
            return assertValidSchemaAggregated(server.config.uri + 'en.wikipedia.org/v1/media/image/featured/2004/01/01');
        });

        it('most-read response should conform to schema (invalid date, aggregated=true)', function() {
            return assertValidSchemaAggregated(server.config.uri + 'en.wikipedia.org/v1/page/most-read/2004/01/01');
        });

        it('news response (invalid language, aggregated=true) should be empty', function() {
            return assertValidSchemaAggregated(server.config.uri + 'is.wikipedia.org/v1/page/news');
        });

        //Bad requests fail without aggregated=true

        it('featured article request should fail for invalid language when not in aggregated request', function() {
            return assertBadRequest(server.config.uri + 'is.wikipedia.org/v1/page/featured/' + dateString);
        });

        it('featured image request should fail for invalid date when not in aggregated request', function() {
            return assertBadRequest(server.config.uri + 'en.wikipedia.org/v1/media/image/featured/2004/01/01');
        });

        it('most-read request should fail for invalid date when not in aggregated request', function() {
            return assertBadRequest(server.config.uri + 'en.wikipedia.org/v1/page/most-read/2004/01/01');
        });

        it('news request should fail for invalid language when not in aggregated request', function() {
            return assertBadRequest(server.config.uri + 'is.wikipedia.org/v1/page/news');
        });
    });

    describe('validate spec examples', function() {

        constructTests(spec.paths, defParams).forEach(function(testCase) {
            it(testCase.title, function() {
                return preq(testCase.request)
                .then(function(res) {
                    validateTestResponse(testCase, res);
                }, function(err) {
                    validateTestResponse(testCase, err);
                });
            });
        });

    });

});

