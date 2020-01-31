const constants = {};

constants.forbiddenElementClassSubstrings = new Set([
  'nomobile',
  'navbox'
]);

constants.forbiddenElementClasses = new Set([
  'geo-nondefault',
  'geo-multi-punct',
  'hide-when-compact'
]);

constants.forbiddenElementIDs = new Set([
  'coordinates' // Template:Coord
]);

constants.forbiddenDivClasses = new Set([
  'infobox',
  'magnify'
]);

constants.forbiddenSpanClasses = new Set([
  'Z3988'
]);

constants.attributesToRemoveFromElements = {
  A: ['about', 'data-mw', 'typeof'],
  ABBR: ['title'],
  B: ['about', 'data-mw', 'typeof'],
  BLOCKQUOTE: ['about', 'data-mw', 'typeof'],
  BR: ['about', 'data-mw', 'typeof'],
  CITE: ['about', 'data-mw', 'typeof'],
  CODE: ['about', 'data-mw', 'typeof'],
  DIV: ['data-mw', 'typeof'],
  FIGURE: ['typeof'],
  'FIGURE-INLINE': ['about', 'data-file-type', 'data-mw', 'itemscope', 'itemtype', 'lang', 'rel', 'title', 'typeof'],
  I: ['about', 'data-mw', 'typeof'],
  IMG: ['about', 'alt', 'resource'],
  LI: ['about'],
  LINK: ['data-mw', 'typeof'],
  OL: ['about', 'data-mw', 'typeof'],
  P: ['data-mw', 'typeof'],
  SPAN: ['about', 'data-file-type', 'data-mw', 'itemscope', 'itemtype', 'lang', 'rel', 'title', 'typeof'],
  STYLE: ['about', 'data-mw'],
  SUP: ['about', 'data-mw', 'rel', 'typeof'],
  TABLE: ['about', 'data-mw', 'typeof'],
  UL: ['about', 'data-mw', 'typeof']
};

// TODO: Add tests for these regexes when output is finalized
constants.mwidRegex = /^mw[\w-]{2,3}$/;
constants.httpsRegex = /^https:\/\//;
constants.headerTagRegex = /^H[0-9]$/;
constants.bracketSpanRegex = /^(\[|\])$/;
constants.inlineBackgroundStyleRegex = /(?:^|\s|;)background(?:-color)?:\s*(?!(?:transparent)|(?:none)|(?:inherit)|(?:unset)|(?:#?$)|(?:#?;))/;
constants.infoboxClassRegex = /(?:^|\s)infobox(?:_v3)?(?:\s|$)/;
constants.infoboxClassExclusionRegex = /(?:^|\s)(?:metadata)|(?:mbox-small)(?:\s|$)/i;
constants.newClassRegex = /(?:^|\s)new(?:\s|$)/;

/**
 * Images within a "<div class='noresize'>...</div>" should not be widened.
 * Example exhibiting links overlaying such an image:
 *  'enwiki > Counties of England > Scope and structure > Local government'
 * Side-by-side images should not be widened. Often their captions mention 'left' and 'right', so
 * we don't want to widen these as doing so would stack them vertically.
 * Examples exhibiting side-by-side images:
 *  'enwiki > Cold Comfort (Inside No. 9) > Casting'
 *  'enwiki > Vincent van Gogh > Letters'
*/
constants.widenImageExclusionClassRegex = /(?:tsingle)|(?:noresize)|(?:noviewer)/;

module.exports = constants;
