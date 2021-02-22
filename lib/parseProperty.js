/**
 * Common DOM transformations for mobile apps.
 * We rearrange some content and remove content that is not shown/needed.
 */

'use strict';

const PronunciationParentSelector = require('./selectors').PronunciationParentSelector;
const PronunciationSelector = require('./selectors').PronunciationSelector;
const SpokenWikipediaSelector = require('./selectors').SpokenWikipediaSelector;

function parsePronunciation(doc) {
    const parent = doc.querySelector(PronunciationParentSelector);
    if (!parent) {
        return;
    }

    const pronunciationAnchor = parent.parentNode.querySelector(PronunciationSelector);
    const url = pronunciationAnchor && pronunciationAnchor.getAttribute('href');
    return url && { url };
}

/**
 * Get the file page titles of any Spoken Wikipedia files in the article.
 *
 * @param {!Document} doc
 * @return {?Object} Object containing a list of Spoken Wikipedia file page titles, or undefined
 *   if none are found.
 */
function parseSpokenWikipedia(doc) {
    const spokenSectionDiv = doc.querySelector(SpokenWikipediaSelector);
    if (!spokenSectionDiv) {
        return;
    }

    const audioElements = spokenSectionDiv.getElementsByTagName('audio');
    if (!audioElements.length) {
        return;
    }

    const files = [];

    for (const audio of Array.from(audioElements)) {
        const sources = audio.getElementsByTagName('source');
        const original = sources.item(0);
        if (!original) {
            continue;
        }
        const src = original.getAttribute('src');
        if (!src) {
            continue;
        }
        const filename = src.split('/').pop();
        files.push(`File:${filename}`);
    }

    if (files.length) {
        return { files };
    }
}

module.exports = {
    parsePronunciation,
    parseSpokenWikipedia
};
