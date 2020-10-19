'use strict';

const _ = require('underscore');

const descriptionUtil = {};

const TEMPLATE_PARSE_REGEX = /({{Short description\|(?:1=)?)([^}|]+)([^}]*}})/;
/**
 * Parse out descriptions from query results for requested languages.
 *
 * @param {Object} page
 * @param {Object[]} entities
 * @param {string[]} languages
 * @return {{source: string, lang: ?string, value: ?string}}
 */
descriptionUtil.parseDescription = (page, entities, languages) => {
    let result;
    if (page.description) {
        result = {
            value: page.description,
            source: page.descriptionsource
        };
    }
    if (result && result.source === 'local') {
        return result;
    }
    if (languages.length && entities) {
        const entityVals = _.values(entities);
        for (let i = 0, len = languages.length; i < len; i++) {
            const lang = languages[i];
            const found = entityVals.find(e => {
                return e.descriptions && e.descriptions[lang] && e.descriptions[lang].value;
            });
            if (found) {
                result = {
                    value: found.descriptions[lang].value,
                    source: 'central',
                    lang
                };
                break;
            }
        }
    }
    return result;
};

/**
 * Checks whether wikitext contains local short description template.
 *
 * @see https://en.wikipedia.org/wiki/Template:Short_description
 * @param {!string} wikitext
 */
descriptionUtil.containsLocalDescription = (wikitext) => {
    return TEMPLATE_PARSE_REGEX.test(wikitext);
};

/**
 * Replace the value of the local short description within wikitext.
 *
 * @param {!string} wikitext
 * @param {!string} description
 */
descriptionUtil.replaceLocalDescription = (wikitext, description) => {
    return wikitext.replace(
        TEMPLATE_PARSE_REGEX,
        `$1${description}$3`
    );
};

/**
 * Delete local short description in wikitext.
 *
 * @param {!string} wikitext
 */
descriptionUtil.deleteLocalDescription = (wikitext) => {
    return wikitext.replace(
        TEMPLATE_PARSE_REGEX,
        ''
    );
};

module.exports = descriptionUtil;
