/* eslint-disable no-console */

'use strict';

const _ = require('underscore');
const assert = require('assert');

function deepEqual(result, expected, message) {

    try {
        assert.deepEqual(result, expected, message);
    } catch (e) {
        console.log(`Expected:\n${JSON.stringify(expected, null, 2)}`);
        console.log(`Result:\n${JSON.stringify(result, null, 2)}`);
        throw e;
    }

}

/**
 * Asserts whether the return status was as expected
 */
function status(res, expected) {

    deepEqual(res.status, expected,
        `Expected status to be ${expected}, but was ${res.status}`);

}

/**
 * Asserts whether content type was as expected
 */
function contentType(res, expectedRegexString) {

    const actual = res.headers['content-type'];
    assert.ok(RegExp(expectedRegexString).test(actual),
        `Expected content-type to match ${expectedRegexString}, but was ${actual}`);

}

function isDeepEqual(result, expected, message) {

    try {
        assert.deepEqual(result, expected, message);
        return true;
    } catch (e) {
        return false;
    }

}

function notDeepEqual(result, expected, message) {

    try {
        assert.notDeepEqual(result, expected, message);
    } catch (e) {
        console.log(`Not expected:\n${JSON.stringify(expected, null, 2)}`);
        console.log(`Result:\n${JSON.stringify(result, null, 2)}`);
        throw e;
    }

}

function property(object, property) {
    const msg = `expected property="${property}"`;
    assert.ok(object, msg);
    assert.ok({}.hasOwnProperty.call(object, property), msg);
}

function notProperty(object, property) {
    assert.ok(!object || !{}.hasOwnProperty.call(object, property),
        `unexpected property="${property}"`);
}

function fails(promise, onRejected) {

    let failed = false;

    function trackFailure(e) {
        failed = true;
        return onRejected(e);
    }

    function check() {
        if (!failed) {
            throw new Error('expected error was not thrown');
        }
    }

    return promise.catch(trackFailure).then(check);

}

/**
 * @param {?number} result
 * @param {!number} expected
 * @param {!number} delta
 * @param {?string} message
 */
function closeTo(result, expected, delta, message) {
    assert.ok(_.isNumber(result) && Math.abs(result - expected) <= delta,
        message || `Result is ${result}; expected ${expected} ± ${delta}`);
}

function contains(result, sub, message) {
    assert.ok(result.includes(sub),
        message || `'${sub}' not in:\n${result}`);
}

function notContains(result, sub, message) {
    assert.ok(!(result.includes(sub)),
        message || `Unexpected substring '${sub}' found in:\n${result}`);
}

function selectorExistsNTimes(doc, selector, n, message) {

    if (!message) {
        message = `querySelectorAll('${selector}')`;
    }
    deepEqual(doc.querySelectorAll(selector).length, n, message);

}

function selectorExistsOnce(doc, selector, message) {

    selectorExistsNTimes(doc, selector, 1, message);

}

function selectorDoesNotExist(doc, selector, message) {

    selectorExistsNTimes(doc, selector, 0, message);

}

function selectorHasValue(doc, selector, expected, message) {

    if (!message) {
        message = `querySelector('${selector}').innerHTML value is not ${expected}`;
    }
    deepEqual(doc.querySelector(selector).innerHTML, expected, message);

}

function selectorContainsValue(doc, selector, expected, message) {

    if (!message) {
        message = `querySelector('${selector}').innerHTML value does not contain ${expected}`;
    }
    assert.ok(doc.querySelector(selector).innerHTML.includes(expected), message);

}

function attributeNotContainsValue(doc, selector, attribute, expected, message) {

    if (!message) {
        message = `querySelector('${selector}').getAttribute('${attribute}') value contains ${expected}`;
    }
    assert.ok(!doc.querySelector(selector).getAttribute(attribute).includes(expected), message);

}

module.exports.ok             = assert.ok;
module.exports.equal          = assert.equal;
module.exports.throws         = assert.throws;
module.exports.doesNotThrow   = assert.doesNotThrow;
module.exports.fail           = assert.fail;
module.exports.fails          = fails;
module.exports.deepEqual      = deepEqual;
module.exports.isDeepEqual    = isDeepEqual;
module.exports.notDeepEqual   = notDeepEqual;
module.exports.property       = property;
module.exports.notProperty    = notProperty;
module.exports.contentType    = contentType;
module.exports.status         = status;
module.exports.closeTo        = closeTo;
module.exports.contains       = contains;
module.exports.notContains    = notContains;
module.exports.selectorExistsNTimes = selectorExistsNTimes;
module.exports.selectorExistsOnce = selectorExistsOnce;
module.exports.selectorDoesNotExist = selectorDoesNotExist;
module.exports.selectorHasValue = selectorHasValue;
module.exports.selectorContainsValue = selectorContainsValue;
module.exports.attributeNotContainsValue = attributeNotContainsValue;
module.exports.AssertionError = assert.AssertionError;
