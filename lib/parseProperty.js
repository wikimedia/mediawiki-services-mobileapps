/**
 * Common DOM transformations for mobile apps.
 * We rearrange some content and remove content that is not shown/needed.
 */

'use strict';

const PronunciationSelector = require('./selectors').PronunciationSelector;
const SpokenWikipediaId = require('./selectors').SpokenWikipediaId;

function parsePronunciation(doc, page) {
    const pronunciationAnchor = doc.querySelector(PronunciationSelector);
    const url = pronunciationAnchor && pronunciationAnchor.getAttribute('href');
    page.pronunciation = url && { url };
}

/**
 * Searches for Spoken Wikipedia audio files and adds them to the given page object.
 * https://en.wikipedia.org/wiki/Wikipedia:WikiProject_Spoken_Wikipedia/Template_guidelines
 */
function parseSpokenWikipedia(doc, page) {
    const spokenSectionDiv = doc.querySelector(`div${SpokenWikipediaId}`);
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
                page.spoken = {};
                page.spoken.files = [fileName];
            } else {
                const match = /Spoken Wikipedia-([2-5])/.exec(target.wt);
                if (match) {
                    // multiple audio files: skip first param (recording date)
                    page.spoken = {};
                    page.spoken.files = [];
                    const keyLength = Object.keys(template.params).length;
                    for (let key = 2; key <= keyLength; key++) {
                        fileName = `File:${template.params[key].wt}`;
                        page.spoken.files.push(fileName);
                    }
                }
            }
        }
    }
}

module.exports = {
    parsePronunciation,
    parseSpokenWikipedia
};
