'use strict';

/*
    Escape/unescape functions for various parentheses:
    ()（）-> to four values in a Unicode Private Use Area (PUA).
    To keep it simple those four values are selected in the PUA
    of the BMP (Basic Multilingual Plane Unicode range of U+E000–U+F8FF).
    The values are U+F001 through U+F004.
    This selection is somewhat arbitrary and could be changed anytime.
 */

const _ = require('underscore');
const forEachDomAttribute = require('./forEachDomAttribute');

const escapeMap = {
    '(': '\uf001',
    ')': '\uf002',
    '（': '\uf003',
    '）': '\uf004'
};
const unescapeMap =  _.invert(escapeMap);

const reUnescapedCharSource = `[${_.keys(escapeMap).join('')}]`;
const reUnescapedChar = new RegExp(reUnescapedCharSource, 'g');
const reHasUnescapedChar = new RegExp(reUnescapedCharSource);

const reEscapedCharSource = `[${_.keys(unescapeMap).join('')}]`;
const reEscapedChar = new RegExp(reEscapedCharSource, 'g');

/**
 * Escapes various parentheses in a string to the respective characters.
 *
 * @param {!string} input
 * @return {!string}
 */
function escape(input) {
    return input.replace(reUnescapedChar, (match) => {
        return escapeMap[match];
    });
}

/**
 * Unescapes certain characters in a string back to the respective parentheses.
 *
 * @param {!string} input
 * @return {!string}
 */
function unescape(input) {
    return input.replace(reEscapedChar, (match) => {
        return unescapeMap[match];
    });
}

function needsEscaping(input) {
    return reHasUnescapedChar.test(input);
}

/**
 * Escapes various parentheses characters in all attributes to some arbitrarily
 * selected characters in a Unicode Private Use Area (PUA).
 * Note: Both functions need to be used used as a pair.
 * This means that this function is only useful for temporary escaping, and the
 * resulting output string must be unescaped via the unescape function before
 * exposing it further.
 *
 * @param {!Element} root where to start searching for attributes
 */
function escapeAllAttributes(root) {
    forEachDomAttribute(root, (elem, attr) => {
        const value = attr.data;
        if (needsEscaping(value)) {
            elem.setAttribute(attr.localName, escape(value));
        }
    });
}

module.exports = {
    escapeAllAttributes,
    escape,
    unescape
};
