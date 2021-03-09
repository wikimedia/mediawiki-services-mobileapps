'use strict';

const languageMapping = require('./wikiLanguageMapping.json');

/*
Language variant handling for srwiki and zhwiki.
There are many more wikipedias with variants.
Support for them could be added in the future.
https://phabricator.wikimedia.org/source/mediawiki/browse/master/languages/LanguageConverter.php
*/

/**
 * @public {!string} value
 * @public {!Array<string>} components value separated by "-"
 * @public {!number} quality value
 */
class LanguageTag {
    /**
     * @param {!string} component of an accept language header
     */
    constructor(value) {
        const split = value.split(';');
        let quality = 1.0;
        let components = [];
        let tag = '';
        if (split.length > 0) {
            components = split[0].split('-').map((comp) => {
                return comp.trim();
            });
            tag = split[0].trim();
        }
        if (split.length > 1) {
            const match = split[1].match(/\d+\.*\d*/);
            if (match) {
                quality = parseFloat(match) || 1.0;
            }
        }
        this.tag = tag;
        this.quality = quality;
        this.components = components;
    }
}

/**
 * @param {!string} domain the domain to get the language code for
 * @return {?string} the lowercased language code for the domain or undefined
 * if it could not be determined
 */
function getLanguageCode(domain) {
    if (!domain) {
        return undefined;
    }
    const components = domain.split('.');
    if (components.length < 3) {
        return undefined;
    }
    if (components[0].toLowerCase() === 'www') {
        return undefined;
    }
    return components[0].toLowerCase();
}

function getAllLanguageVariantsForLanguageCode(code) {
    if (!code) {
        return [];
    }
    const mapping = languageMapping[code];
    const codes = [code];
    if (!mapping) {
        return codes;
    }
    const defaultMapping = mapping.default;
    if (!defaultMapping) {
        return codes;
    }
    for (const key of Object.keys(defaultMapping)) {
        if (key === 'default') {
            continue;
        }
        const value = defaultMapping[key];
        if (!value) {
            continue;
        }
        codes.push(value);
    }
    return codes;
}

/**
 * @param {!string} code the lowercased language code to check
 * @return {!boolean} whether or not the language code supports variants
 */
function isLanguageCodeWithVariants(code) {
    if (!code) {
        return false;
    }
    return languageMapping[code] !== undefined;
}

/**
 * @param {!string} value of the accept-language header
 * @return {!Array<LanguageTag>} array of language tags
 */
function parseAcceptLanguageHeaderIntoLanguageTags(value) {
    if (!value) {
        return [];
    }
    const codesWithPriorities = value.split(',').map((pair) => {
        return new LanguageTag(pair);
    });
    return codesWithPriorities;
}

/**
 * @param {!string} value of the accept-language header
 * @param {!string} languageCode the lowercased language code to check
 * @return {!Array} array of preferred wiki language codes that are relevant for the language code
 */
function relevantWikiLanguageCodesFromAcceptLanguageHeader(value, wikiCode) {
    const sortedCodes = parseAcceptLanguageHeaderIntoLanguageTags(value).sort((a, b) => {
        return b.quality - a.quality;
    }).map((tag) => {
        const components = tag.components.map((comp) => {
            return comp && comp.toLowerCase();
        });
        const normalizedCode = components[0];
        if (components.length <= 1) {
            return undefined;
        }
        const codeMapping = languageMapping[normalizedCode];
        if (!codeMapping) {
            return undefined;
        }
        const maybeScript = components[1];
        const maybeCountry = components[2] || maybeScript;
        const scriptMapping = codeMapping[maybeScript] || codeMapping.default;
        return scriptMapping[maybeCountry] || scriptMapping.default;
    }).filter((code, index, array) => { // remove undefined and duplicates
        return code && array.indexOf(code) === index;
    });
    if (wikiCode) {
        const filteredLanguages = sortedCodes.filter((code) => {
            return code.startsWith(wikiCode);
        });
        if (!filteredLanguages.includes(wikiCode)) {
            filteredLanguages.push(wikiCode);
        }
        return filteredLanguages;
    } else {
        return sortedCodes;
    }
}

/**
 * @param req {Object} the http request object
 * @return {!string} first relevant language variant from request, fallback to language code
 */
function relevantLanguageVariantOrCode(req) {
    const languageCode = getLanguageCode(req.params.domain);
    const acceptLanguage = req.headers['accept-language'];
    const languages = relevantWikiLanguageCodesFromAcceptLanguageHeader(
        acceptLanguage,
        languageCode
    );
    if (languages) {
        return languages[0];
    }
    return languageCode;
}

module.exports = {
    getLanguageCode,
    getAllLanguageVariantsForLanguageCode,
    isLanguageCodeWithVariants,
    relevantWikiLanguageCodesFromAcceptLanguageHeader,
    parseAcceptLanguageHeaderIntoLanguageTags,
    relevantLanguageVariantOrCode
};
