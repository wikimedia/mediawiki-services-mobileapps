/**
 * Common DOM transformations for mobile apps.
 * We rearrange some content and remove content that is not shown/needed.
 */

'use strict';

const transforms = {};

/* eslint-disable max-len */
// general content manipulations
transforms.addClassTo = require('./transformations/addClassTo');
transforms.flattenElements = require('./transformations/flattenElements');
transforms.rewriteUrlAttribute = require('./transformations/rewriteUrlAttribute');
transforms.rmAttributes = require('./transformations/rmAttributes');
transforms.rmBracketSpans = require('./transformations/rmBracketSpans');
transforms.rmComments = require('./transformations/rmComments');
transforms.rmElements = require('./transformations/rmElements');
transforms.rmMwIdAttributes = require('./transformations/rmMwIdAttributes');
transforms.rmRefLinkbacks = require('./transformations/rmRefLinkbacks');
transforms.shortenPageInternalLinks = require('./transformations/shortenPageInternalLinks');

// legacy app transforms
transforms.fixVideoAnchor = require('./transformations/legacy/anchorPopUpMediaTransforms');
transforms.legacyHideRedLinks = require('./transformations/legacy/hideRedLinks');

// page extracts
const extractHatnotes = require('./transformations/pageextracts/extractHatnotes');
transforms.extractHatnotesForMetadata = extractHatnotes.extractHatnotesForMetadata;
transforms.extractHatnotesForMobileSections = extractHatnotes.extractHatnotesForMobileSections;
transforms.extractLeadIntroduction = require('./transformations/pageextracts/extractLeadIntroduction');
const extractPageIssues = require('./transformations/pageextracts/extractPageIssues');
transforms.extractPageIssuesForMetadata = extractPageIssues.extractPageIssuesForMetadata;
transforms.extractPageIssuesForMobileSections = extractPageIssues.extractPageIssuesForMobileSections;

// PCS transforms
const head = require('./transformations/pcs/head');
transforms.addCssLinks = head.addCssLinks;
transforms.addMetaViewport = head.addMetaViewport;
transforms.addPageLibJs = head.addPageLibJs;
transforms.addSectionEditButtons = require('./transformations/pcs/addSectionEditButtons');
transforms.adjustThumbWidths = require('./transformations/pcs/adjustThumbWidths');
transforms.lazyLoadImagePrep = require('./transformations/pcs/lazyLoadImagePrep');
transforms.pcsHideRedLinks = require('./transformations/pcs/hideRedLinks');
transforms.prepForTheme = require('./transformations/pcs/prepForTheme');
transforms.relocateFirstParagraph = require('./transformations/pcs/relocateFirstParagraph');
transforms.widenImages = require('./transformations/pcs/widenImages');

// references
transforms.extractReferenceLists = require('./transformations/references/extractReferenceLists');
transforms.markReferenceSections = require('./transformations/references/markReferenceSections');
transforms.moveReferenceListStyles = require('./transformations/references/moveReferenceListStyles');
transforms.stripReferenceListContent = require('./transformations/references/stripReferenceListContent');
transforms.structureReferenceListContent = require('./transformations/references/structureReferenceListContent');

// summary
transforms.sanitizeSummary = require('./transformations/summary/sanitizeSummary');
transforms.stripGermanIPA = require('./transformations/summary/stripGermanIPA');
transforms.summarize = require('./transformations/summary/summarize');
/* eslint-enable max-len */

/**
 * Iterates through the steps of a processing script and performs the indicated transforms.
 * Transforms may be indicated as either a plain string indicating the name of a transform function
 * attached to the transforms object, or a key-value object, with the key representing the name
 * of a transform function attached to the transform object, and the value representing values to
 * pass in (represented as either an array or an object, depending on the structure of the
 * transform function).
 * @param {!Document} doc page Document object
 * @param {!Object} script processing script
 * @return {undefined}
 */
transforms.preprocessParsoidHtml = function(doc, script) {
    script.forEach((step) => {
        if (typeof step === 'string') {
            transforms[step](doc);
        } else {
            if (Object.keys(step).length !== 1) {
                throw new Error(`Invalid processing step definition: ${step}`);
            }
            const transform = Object.keys(step)[0];
            if (Array.isArray(step[transform])) {
                transforms[transform](doc, step[transform].join());
            } else {
                Object.keys(step[transform]).forEach((k) => {
                    const v = step[transform][k];
                    transforms[transform](doc, k, v);
                });
            }
        }
    });
};

module.exports = transforms;
