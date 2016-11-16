'use strict';
/**
 Article extracts
 */

/**
 * @param {string} [str]
 * @return {string} str, less parenthetical expressions and their leading whitespace, if balanced.
 */
function removeParens(str) {
    function count(paren) {
        return ((str || '').match(new RegExp('\\' + paren, 'g')) || []).length;
    }

    const openCount = count('(');
    const closeCount = count(')');
    return openCount && openCount === closeCount
         ? removeParens(str.replace(/\s*\([^()]*\)/g, ''))
         : str;
}

/**
 * Find all matches of regex in text, calling callback with each match object
 *
 * TODO: remove when switching to Parsoid. Copied from:
 * https://github.com/wikimedia/mediawiki-services-cxserver/blob/0d21a808f7ab6b82086171af927467c1b9460626/lineardoc/Utils.js
 *
 * @param {string} text The text to search
 * @param {Regex} regex The regex to search; should be created for this function call
 * @param {Function} callback Function to call with each match
 * @return {Array} The return values from the callback
 */
function findAll( text, regex, callback ) {
    let match, boundary, boundaries = [];
    while ( true ) {
        match = regex.exec( text );
        if ( match === null ) {
            break;
        }
        boundary = callback( text, match );
        if ( boundary !== null ) {
            boundaries.push( boundary );
        }
    }
    return boundaries;
}

/**
 * Test a possible English sentence boundary match
 *
 * TODO: remove when switching to Parsoid. Copied from:
 * https://github.com/wikimedia/mediawiki-services-cxserver/blob/0d21a808f7ab6b82086171af927467c1b9460626/segmentation/languages/SegmenterDefault.js
 *
 * @param {string} text The plaintext to segment
 * @param {Object} match The possible boundary match (returned by regex.exec)
 * @return {number|null} The boundary offset, or null if not a sentence boundary
 */
function findBoundary( text, match ) {
    let tail, head, lastWord;

    tail = text.slice( match.index + 1, text.length );
    head = text.slice( 0, match.index );

    // Trailing non-final punctuation: not a sentence boundary
    if ( tail.match( /^[,;:]/ ) ) {
        return null;
    }
    // Next word character is number or lower-case: not a sentence boundary
    if ( tail.match( /^\W*[0-9a-z]/ ) ) {
        return null;
    }

    // Do not break in abbreviations. Example D. John, St. Peter
    lastWord = head.match( /(\w*)$/ )[ 0 ];
    // Exclude at most 2 letter abbreviations. Examples: T. Dr. St. Jr. Sr. Ms. Mr.
    // But not all caps like "UK." as in  "UK. Not US",
    if ( lastWord.length <= 2 && lastWord.match( /^\W*[A-Z][a-z]?$/ ) && tail.match( /^\W*[A-Z]/ ) ) {
        return null;
    }

    // Include any closing punctuation and trailing space
    return match.index + 1 + tail.match( /^['”"’]*\s*/ )[ 0 ].length;
}

/**
 * Find English sentence boundaries
 *
 * TODO: remove when switching to Parsoid. Copied from:
 * https://github.com/wikimedia/mediawiki-services-cxserver/blob/0d21a808f7ab6b82086171af927467c1b9460626/segmentation/languages/SegmenterDefault.js
 *
 * @param {string} text The plaintext to segment
 * @returns {number[]} Sentence boundary offsets
 */
function getBoundaries( text ) {
    // Regex to find possible English sentence boundaries.
    // Must not use a shared regex instance (re.lastIndex is used)
    return findAll( text, /[.!?]/g, findBoundary );
}

function format(extract) {
    const MAX_SENTENCES = 2;
    const cleanStr = removeParens(extract.replace(/\s+/g, ' '));
    const boundaries = getBoundaries(cleanStr);
    const cleanStrEndIndex = boundaries[Math.min(boundaries.length, MAX_SENTENCES - 1)];

    const ret = cleanStr.slice(0, cleanStrEndIndex).trim();
    if (ret !== '…' && ret !== '..') {
        return ret;
    }
}

module.exports = {
    format: format
};