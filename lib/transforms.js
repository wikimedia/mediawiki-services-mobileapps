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
transforms.addRtlPageLibSupport = require('./transformations/pcs/addRtlPageLibSupport');
transforms.addPageHeader = require('./transformations/pcs/addPageHeader');
transforms.addSectionEditButtons = require('./transformations/pcs/addSectionEditButtons');
transforms.adjustThumbWidths = require('./transformations/pcs/adjustThumbWidths');
transforms.hideEditButtons = require('./transformations/pcs/hideEditButtons');
transforms.lazyLoadImagePrep = require('./transformations/pcs/lazyLoadImagePrep');
transforms.pcsHideRedLinks = require('./transformations/pcs/hideRedLinks');
transforms.prepForCollapseTable = require('./transformations/pcs/prepForCollapseTable');
transforms.prepForTheme = require('./transformations/pcs/prepForTheme');
transforms.relocateFirstParagraph = require('./transformations/pcs/relocateFirstParagraph');
transforms.widenImages = require('./transformations/pcs/widenImages');
transforms.makeUrlSchemeless = require('./transformations/pcs/makeUrlSchemeless');

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

module.exports = transforms;
