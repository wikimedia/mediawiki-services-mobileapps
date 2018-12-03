/* global describe, it, before, after */

'use strict';

const preq   = require('preq');
const assert = require('../../utils/assert.js');
const server = require('../../utils/server.js');
const URI    = require('swagger-router').URI;
const yaml   = require('js-yaml');
const fs     = require('fs');

const dateUtil = require('../../../lib/dateUtil');
const pad = dateUtil.pad;
const Ajv    = require('ajv');

const baseUri = `${server.config.uri}en.wikipedia.org/v1/`;
const d1 = new Date();
const d2 = new Date(Date.now() - 2 * dateUtil.ONE_DAY);
const dateStr1 = `${d1.getUTCFullYear()}/${pad(d1.getUTCMonth() + 1)}/${pad(d1.getUTCDate())}`;
const monthDayStr1 = `${pad(d1.getUTCMonth() + 1)}/${pad(d1.getUTCDate())}`;
const dateStr2 = `${d2.getUTCFullYear()}/${pad(d2.getUTCMonth() + 1)}/${pad(d2.getUTCDate())}`;

if (!server.stopHookAdded) {
    server.stopHookAdded = true;
    after(() => server.stop());
}

function staticSpecLoad() {

    let spec;
    const myService = server.config.conf.services[server.config.conf.services.length - 1].conf;
    const specPath = `${__dirname}/../../../${myService.spec ? myService.spec : 'spec.yaml'}`;

    try {
        spec = yaml.safeLoad(fs.readFileSync(specPath));
    } catch (e) {
        // this error will be detected later, so ignore it
        spec = { paths: {}, 'x-default-params': {} };
    }

    return spec;

}

function validateExamples(pathStr, defParams, mSpec) {

    const uri = new URI(pathStr, {}, true);

    if (!mSpec) {
        try {
            uri.expand(defParams);
            return true;
        } catch (e) {
            throw new Error(`Missing parameter for route ${pathStr} : ${e.message}`);
        }
    }

    if (!Array.isArray(mSpec)) {
        throw new Error(`Route ${pathStr} : x-amples must be an array!`);
    }

    mSpec.forEach((ex, idx) => {
        if (!ex.title) {
            throw new Error(`Route ${pathStr}, example ${idx}: title missing!`);
        }
        ex.request = ex.request || {};
        try {
            uri.expand(Object.assign({}, defParams, ex.request.params || {}));
        } catch (e) {
            throw new Error(
                `Route ${pathStr}, example ${idx} (${ex.title}): missing parameter: ${e.message}`
            );
        }
    });

    return true;

}

function constructTestCase(title, path, method, request, response) {

    return {
        title,
        request: {
            uri: server.config.uri + (path[0] === '/' ? path.substr(1) : path),
            method,
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

    const ret = [];

    Object.keys(paths).forEach((pathStr) => {
        Object.keys(paths[pathStr]).forEach((method) => {
            const p = paths[pathStr][method];
            if ({}.hasOwnProperty.call(p, 'x-monitor') && !p['x-monitor']) {
                return;
            }
            const uri = new URI(pathStr, {}, true);
            if (!p['x-amples']) {
                ret.push(constructTestCase(
                    pathStr,
                    uri.toString({ params: defParams }),
                    method,
                    {},
                    {}
                ));
                return;
            }
            p['x-amples'].forEach((ex) => {
                ex.request = ex.request || {};
                ret.push(constructTestCase(
                    ex.title,
                    uri.toString({ params: Object.assign({}, defParams, ex.request.params || {}) }),
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

    if (expected === null || expected === undefined) {
        // nothing to expect, so we can return
        return true;
    }
    if (result === null || result === undefined) {
        result = '';
    }

    if (expected.constructor === Object) {
        Object.keys(expected).forEach((key) => {
            const val = expected[key];
            assert.deepEqual({}.hasOwnProperty.call(result, key), true,
                `Body field ${key} not found in response!`);
            cmp(result[key], val, `${key} body field mismatch!`);
        });
        return true;
    } else if (expected.constructor === Array) {
        if (result.constructor !== Array) {
            assert.deepEqual(result, expected, errMsg);
            return true;
        }
        // only one item in expected - compare them all
        if (expected.length === 1 && result.length > 1) {
            result.forEach((item) => {
                cmp(item, expected[0], errMsg);
            });
            return true;
        }
        // more than one item expected, check them one by one
        if (expected.length !== result.length) {
            assert.deepEqual(result, expected, errMsg);
            return true;
        }
        expected.forEach((item, idx) => {
            cmp(result[idx], item, errMsg);
        });
        return true;
    }

    if (expected.length > 1 && expected[0] === '/' && expected[expected.length - 1] === '/') {
        if ((new RegExp(expected.slice(1, -1))).test(result)) {
            return true;
        }
    } else if (expected.length === 0 && result.length === 0) {
        return true;
    } else if (result === expected || result.startsWith(expected)) {
        return true;
    }

    assert.deepEqual(result, expected, errMsg);
    return true;

}

function validateTestResponse(testCase, res) {

    const expRes = testCase.response;

    // check the status
    assert.status(res, expRes.status);
    // check the headers
    Object.keys(expRes.headers).forEach((key) => {
        const val = expRes.headers[key];
        assert.deepEqual({}.hasOwnProperty.call(res.headers, key), true,
            `Header ${key} not found in response!`);
        cmp(res.headers[key], val, `${key} header mismatch!`);
    });
    // check the body
    if (!expRes.body) {
        return true;
    }
    res.body = res.body || '';
    if (Buffer.isBuffer(res.body)) {
        res.body = res.body.toString();
    }
    if (expRes.body.constructor !== res.body.constructor) {
        if (expRes.body.constructor === String) {
            res.body = JSON.stringify(res.body);
        } else {
            res.body = JSON.parse(res.body);
        }
    }
    // check that the body type is the same
    if (expRes.body.constructor !== res.body.constructor) {
        throw new Error(
            `Expected body type ${expRes.body.constructor} but got ${res.body.constructor}`
        );
    }

    // compare the bodies
    cmp(res.body, expRes.body, 'Body mismatch!');

    return true;

}

describe('Swagger spec', function() {

    // the variable holding the spec
    let spec = staticSpecLoad();
    // default params, if given
    let defParams = spec['x-default-params'] || {};

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => {
        return server.start();
    });

    it('get the spec', () => {
        return preq.get(`${server.config.uri}?spec`)
        .then((res) => {
            assert.status(200);
            assert.contentType(res, 'application/json');
            assert.notDeepEqual(res.body, undefined, 'No body received!');
            spec = res.body;
        });
    });

    it('spec validation', () => {
        if (spec['x-default-params']) {
            defParams = spec['x-default-params'];
        }
        // check the high-level attributes
        ['info', 'swagger', 'paths'].forEach((prop) => {
            assert.deepEqual(!!spec[prop], true, `No ${prop} field present!`);
        });
        // no paths - no love
        assert.deepEqual(!!Object.keys(spec.paths), true, 'No paths given in the spec!');
        // now check each path
        Object.keys(spec.paths).forEach((pathStr) => {
            assert.deepEqual(!!pathStr, true, 'A path cannot have a length of zero!');
            const path = spec.paths[pathStr];
            assert.deepEqual(!!Object.keys(path), true, `No methods defined for path: ${pathStr}`);
            Object.keys(path).forEach((method) => {
                const mSpec = path[method];
                if ({}.hasOwnProperty.call(mSpec, 'x-monitor') && !mSpec['x-monitor']) {
                    return;
                }
                validateExamples(pathStr, defParams, mSpec['x-amples']);
            });
        });
    });

    describe('validate responses against schema', () => {
        const ajv = new Ajv({});

        const assertValidSchema = (uri, schemaPath) => {
            return preq.get({ uri })
            .then((res) => {
                if (!ajv.validate(schemaPath, res.body)) {
                    throw new assert.AssertionError({ message: ajv.errorsText() });
                }
            });
        };

        const assertValidSchemaAggregated = (uri) => {
            return preq.get({ uri, query: { aggregated: true } })
            .then((res) => {
                if (res.body) {
                    throw new assert.AssertionError({ message: 'Response should be empty!' });
                }
            });
        };

        const assertBadRequest = (uri) => {
            return preq.get({ uri })
            .then((res) => {
                assert.fail('This request should fail!');
            })
            .catch((err) => {
                if (!ajv.validate('#/definitions/problem', err.body)) {
                    throw new assert.AssertionError({ message: ajv.errorsText() });
                }
            });
        };

        Object.keys(spec.definitions).forEach((defName) => {
            ajv.addSchema(spec.definitions[defName], `#/definitions/${defName}`);
        });

        // Valid non-aggregated requests

        it('featured article response should conform to schema', () => {
            const uri = `${baseUri}page/featured/${dateStr1}`;
            return assertValidSchema(uri, '#/definitions/article_summary_merge_link');
        });

        it('featured image response should conform to schema', () => {
            const uri = `${baseUri}media/image/featured/${dateStr1}`;
            return assertValidSchema(uri, '#/definitions/image');
        });

        it('most-read response should conform to schema', () => {
            const uri = `${baseUri}page/most-read/${dateStr2}`;
            return assertValidSchema(uri, '#/definitions/mostread');
        });

        it('news response should conform to schema', () => {
            const uri = `${baseUri}page/news`;
            return assertValidSchema(uri, '#/definitions/news');
        });

        it('random response should conform to schema', () => {
            const uri = `${baseUri}page/random/title`;
            return assertValidSchema(uri, '#/definitions/random');
        });

        it('announcements should conform to schema', () => {
            const uri = `${baseUri}feed/announcements`;
            return assertValidSchema(uri, '#/definitions/announcements');
        });

        it('onthisday response should conform to schema', () => {
            const uri = `${baseUri}feed/onthisday/all/${monthDayStr1}`;
            return assertValidSchema(uri, '#/definitions/onthisdayResponse');
        });

        it('summary response should conform to schema', () => {
            const uri = `${baseUri}page/summary/Dubai/808803658`;
            return assertValidSchema(uri, '#/definitions/summary');
        });

        it('metadata response should conform to schema', () => {
            const uri = `${baseUri}page/metadata/Hummingbird`;
            return assertValidSchema(uri, '#/definitions/metadata');
        });

        it('media response should conform to schema', () => {
            const uri = `${baseUri}page/media/Hummingbird`;
            return assertValidSchema(uri, '#/definitions/media_list');
        });

        it('references response should conform to schema', () => {
            const uri = `${baseUri}page/references/List_of_highest-grossing_Indian_films`;
            return assertValidSchema(uri, '#/definitions/references_response');
        });

        // Bad requests return empty response for aggregated=true

        it('featured article response should conform to schema (invalid lang, agg=true)', () => {
            const uri = `${server.config.uri}is.wikipedia.org/v1/page/featured/${dateStr1}`;
            return assertValidSchemaAggregated(uri);
        });

        it('featured image response should conform to schema (invalid date, agg=true)', () => {
            const uri = `${baseUri}media/image/featured/2004/01/01`;
            return assertValidSchemaAggregated(uri);
        });

        it('most-read response should conform to schema (invalid date, agg=true)', () => {
            const uri = `${baseUri}page/most-read/2004/01/01`;
            return assertValidSchemaAggregated(uri);
        });

        it('news response (invalid language, agg=true) should be empty', () => {
            return assertValidSchemaAggregated(`${server.config.uri}is.wikipedia.org/v1/page/news`);
        });

        // Bad requests fail without aggregated=true

        it('featured article request should fail for invalid language when !agg=true', () => {
            const uri = `${server.config.uri}is.wikipedia.org/v1/page/featured/${dateStr1}`;
            return assertBadRequest(uri);
        });

        it('featured image request should fail for invalid date when !agg=true', () => {
            const uri = `${baseUri}media/image/featured/2004/01/01`;
            return assertBadRequest(uri);
        });

        it('most-read request should fail for invalid date when !agg=true', () => {
            const uri = `${baseUri}page/most-read/2004/01/01`;
            return assertBadRequest(uri);
        });

        it('news request should fail for invalid language when !agg=true', () => {
            return assertBadRequest(`${server.config.uri}is.wikipedia.org/v1/page/news`);
        });
    });

    describe('validate spec examples', () => {

        constructTests(spec.paths, defParams).forEach((testCase) => {
            it(testCase.title, () => {
                return preq(testCase.request)
                .then((res) => {
                    validateTestResponse(testCase, res);
                }, (err) => {
                    validateTestResponse(testCase, err);
                });
            });
        });

    });

});
