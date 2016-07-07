'use strict';


var assert = require('assert');


/**
 * Asserts whether the return status was as expected
 */
function status(res, expected) {

    deepEqual(res.status, expected,
        'Expected status to be ' + expected + ', but was ' + res.status);

}


/**
 * Asserts whether content type was as expected
 */
function contentType(res, expected) {

    var actual = res.headers['content-type'];
    deepEqual(actual, expected,
        'Expected content-type to be ' + expected + ', but was ' + actual);

}


function isDeepEqual(result, expected, message) {

    try {
        if (typeof expected === 'string') {
            assert.ok(result === expected || (new RegExp(expected).test(result)), message);
        } else {
            assert.deepEqual(result, expected, message);
        }
        return true;
    } catch (e) {
        return false;
    }

}


function deepEqual(result, expected, message) {

    try {
        if (typeof expected === 'string') {
            assert.ok(result === expected || (new RegExp(expected).test(result)));
        } else {
            assert.deepEqual(result, expected, message);
        }
    } catch (e) {
        console.log('Expected:\n' + JSON.stringify(expected, null, 2));
        console.log('Result:\n' + JSON.stringify(result, null, 2));
        throw e;
    }

}


function notDeepEqual(result, expected, message) {

    try {
        assert.notDeepEqual(result, expected, message);
    } catch (e) {
        console.log('Not expected:\n' + JSON.stringify(expected, null, 2));
        console.log('Result:\n' + JSON.stringify(result, null, 2));
        throw e;
    }

}


function property(object, property) {
    const msg = `expected property="${property}"`;
    assert.ok(object, msg);
    assert.ok(object.hasOwnProperty(property), msg);
}


function notProperty(object, property) {
    assert.ok(!object || !object.hasOwnProperty(property),
        `unexpected property="${property}"`);
}


function fails(promise, onRejected) {

    var failed = false;

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


function contains(result, sub, message) {
    try {
        assert.ok(result.indexOf(sub) > -1, message);
    } catch (e) {
        console.log('Substring:\n' + sub);
        console.log('Not in result:\n' + result);
        throw e;
    }

}


function selectorExistsNTimes(doc, selector, n, message) {

    if (!message) {
        message = "querySelectorAll('" + selector + "')";
    }
    deepEqual(doc.querySelectorAll(selector).length, n, message);

}


function selectorExistsOnce(doc, selector, message) {

    selectorExistsNTimes(doc, selector, 1, message);

}


function selectorHasValue(doc, selector, expected, message) {

    if (!message) {
        message = "querySelector('" + selector + "').innerHTML value is not " + expected;
    }
    deepEqual(doc.querySelector(selector).innerHTML, expected, message);

}


function selectorContainsValue(doc, selector, expected, message) {

    if (!message) {
        message = "querySelector('" + selector + "').innerHTML value does not contain " + expected;
    }
    assert.ok(doc.querySelector(selector).innerHTML.includes(expected), message);

}


module.exports.ok             = assert.ok;
module.exports.equal          = assert.equal;
module.exports.throws         = assert.throws;
module.exports.doesNotThrow   = assert.doesNotThrow;
module.exports.fails          = fails;
module.exports.deepEqual      = deepEqual;
module.exports.isDeepEqual    = isDeepEqual;
module.exports.notDeepEqual   = notDeepEqual;
module.exports.property       = property;
module.exports.notProperty    = notProperty;
module.exports.contentType    = contentType;
module.exports.status         = status;
module.exports.contains       = contains;
module.exports.selectorExistsNTimes = selectorExistsNTimes;
module.exports.selectorExistsOnce = selectorExistsOnce;
module.exports.selectorHasValue = selectorHasValue;
module.exports.selectorContainsValue = selectorContainsValue;

