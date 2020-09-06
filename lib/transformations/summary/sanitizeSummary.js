'use strict';

/*
    Sanitize summary content using the sanitize-html library.
    Input and output are strings.
 */

const sanitizeHtml = require('sanitize-html');

const ANY_REGEX = /^[0-9a-zA-Z,.#%() _-]{1,80}$/; // but none of :/\ and not over 80 characters
const DECIMAL_REGEX = /^-?\d{0,5}\.?\d{1,8}$/;
const CSS_SIZE_REGEX
    = /^-?\d{0,5}\.?\d{1,8}(%|pc|pt|px|rem|em|ex|ch|vh|vw|vmin|vmax|mm|cm|in|lin)$/;
const SINGLE_STRING_REGEX = /^[0-9a-zA-Z_-]{1,80}$/; // single ASCII words only, no spaces
const HEX_REGEX = /^#(0x)?[0-9a-fA-F]{3,8}$/;
const RGB_REGEX = /^rgba?\([0-9a-zA-Z,./% _-]{6,40}\)$/;
const HSL_REGEX = /^hsla?\([0-9a-zA-Z,./% _-]{6,40}\)$/;

const SANITIZE_RULES = {
    // no 'a' tags allowed since we had transformed them to 'span' tags anyways
    allowedTags: [ 'abbr', 'address',
        'b', 'bdi', 'bdo', 'blockquote', 'br',
        'caption', 'cite', 'code',
        'data', 'dd', 'del', 'dfn', 'dl', 'dt', 'div', 'em',
        'figcaption', 'figure', 'figure-inline',
        'hr', 'i', 'img', 'ins', 'kbd', 'li',
        'map', 'mark', 'ol', 'p', 'pre', 'q',
        's', 'samp', 'small', 'span', 'strike', 'strong', 'sub', 'sup',
        'time', 'u', 'ul',
        'var', 'wbr' ],
    nonTextTags: [ 'style', 'script', 'textarea', // <-- defaults
        'embed', 'object', 'noscript', 'audio', 'video' ],
    allowedAttributes: {
        '*': [ 'align', 'alt', 'aria-*', 'bgcolor', 'center', 'class', 'dir',
            'height', 'hidden', 'lang', 'style', 'title', 'translate', 'width' ],
        data: [ 'value' ],
        img: [ 'decoding', 'ismap', 'longdesc', 'sizes', 'src', 'srcset', 'usemap' ],
        ol: [ 'reversed', 'start', 'type' ],
        source: [ 'sizes', 'src', 'srcset', 'type', 'media' ],
        time: [ 'datetime' ]
    },
    allowedStyles: {
        '*': {
            background: [ HEX_REGEX, RGB_REGEX, HSL_REGEX, SINGLE_STRING_REGEX ],
            'background-color': [ HEX_REGEX, RGB_REGEX, HSL_REGEX, SINGLE_STRING_REGEX ],
            border: [ ANY_REGEX ],
            color: [ HEX_REGEX, RGB_REGEX, HSL_REGEX, SINGLE_STRING_REGEX ],
            display: [ SINGLE_STRING_REGEX ],
            font: [ ANY_REGEX ],
            'font-family': [ ANY_REGEX ],
            'font-size': [ CSS_SIZE_REGEX ],
            'font-style': [ /^normal$/, /^italic$/, /^oblique$/ ],
            'font-weight': [ /^bold$/,  /^bolder$/, /^lighter$/, /^normal$/, /^oblique$/,
                /^\d{3}$/ ],
            height: [ CSS_SIZE_REGEX ],
            'letter-spacing': [ CSS_SIZE_REGEX ],
            'line-height': [ DECIMAL_REGEX ],
            'text-align': [ /^left$/, /^right$/, /^center$/, /^justify$/ ],
            'text-decoration': [ ANY_REGEX ],
            'text-transform': [ /^capitalize$/, /^uppercase$/, /^lowercase$/, /^none$/,
                /^full-width$/, /^inherit$/, /^initial$/, /^unset$/ ],
            'vertical-align': [ CSS_SIZE_REGEX ],
            width: [ CSS_SIZE_REGEX ],
            'word-spacing': [ CSS_SIZE_REGEX ]
        }
    },
    allowedSchemes: [ 'data', 'http' , 'https' ]
};

/**
 * Parses the input HTML string and applies transformations to make
 * the resulting HTML string safer to consume.
 *
 * @param {string} html input HTML
 * @return {string} sanitized HTML
 */
function sanitize(html) {
    return sanitizeHtml(html, SANITIZE_RULES);
}

module.exports = {
    sanitize,
    testing: {
        ANY_REGEX,
        DECIMAL_REGEX,
        CSS_SIZE_REGEX,
        SINGLE_STRING_REGEX,
        HEX_REGEX,
        RGB_REGEX,
        HSL_REGEX
    }
};
