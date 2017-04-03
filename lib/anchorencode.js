'use strict';

const urlencode = require('locutus/php/url/urlencode');

/**
 * Encodes an input string so that it can be used as an HTML anchor id
 * (e.g. for a section in a page: <h2 id="anchor">).
 * See https://www.mediawiki.org/wiki/Manual:PAGENAMEE_encoding#Encodings_compared
 * https://www.mediawiki.org/wiki/Special:Code/MediaWiki/16279
 * core/include/parser/CoreParserFunctions.php
 * https://phabricator.wikimedia.org/T9059
 * https://gerrit.wikimedia.org/r/#/c/226032/
 * @param {!string} input the input string (usually the heading text of a section heading)
 * @return {!string} the sanitized version of the input string so it can be used as an anchor.
 */
function anchorencode(input) {
    const id = input.replace(/\s+/g, '_');
    return urlencode(id)
        .replace(/%3A/g, ':')
        .replace(/%/g, '.');
}

module.exports = {
    anchorencode
};
