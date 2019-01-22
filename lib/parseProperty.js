/**
 * Common DOM transformations for mobile apps.
 * We rearrange some content and remove content that is not shown/needed.
 */

'use strict';

const PronunciationParentSelector = require('./selectors').PronunciationParentSelector;
const PronunciationSelector = require('./selectors').PronunciationSelector;
const SpokenWikipediaId = require('./selectors').SpokenWikipediaId;

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
 * Get any spoken Wikipedia files in the article.
 * https://en.wikipedia.org/wiki/Wikipedia:WikiProject_Spoken_Wikipedia/Template_guidelines
 */
function parseSpokenWikipedia(doc) {
    const spokenSectionDiv = doc.querySelector(`div${SpokenWikipediaId}`);
    let result;
    if (spokenSectionDiv) {
        const dataMW = spokenSectionDiv.getAttribute('data-mw');
        const parsedData = dataMW && JSON.parse(dataMW);
        const firstPart = parsedData && parsedData.parts[0];
        const template = firstPart && firstPart.template;
        const target = template && template.target;
        if (target && target.wt) {
            let fileName;
            if (target.wt === 'Spoken Wikipedia') {
                // single audio file: use first param (2nd param is recording date)
                fileName = `File:${template.params['1'].wt}`;
                result = { files: [fileName] };
            } else {
                const match = /Spoken Wikipedia-([2-5])/.exec(target.wt);
                if (match) {
                    // multiple audio files: skip first param (recording date)
                    const keyLength = Object.keys(template.params).length;
                    result = { files: [] };
                    for (let key = 2; key <= keyLength; key++) {
                        fileName = `File:${template.params[key].wt}`;
                        result.files.push(fileName);
                    }
                }
            }
        }
    }
    return result;
}

module.exports = {
    parsePronunciation,
    parseSpokenWikipedia
};
