const constants = {};

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
  IMG: ['about'],
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

constants.refGroupsGeneratedByCSS = new Set(['decimal', 'lower-alpha', 'upper-alpha', 'lower-greek', 'lower-roman', 'upper-roman']);

/**
 * These regexes are set up in this way to improve performance.
 * They should be compiled once and re-used. For class detection,
 * it was determined that a precompiled regex looking at the entire class string
 * was more performant than using `classList.contains`. MobileHTML.test.js
 * contains a performance test ensure this remains true.
 */
constants.forbiddenElementClassRegex = /(?:^|\s)(?:(?:geo-nondefault)|(?:geo-multi-punct)|(?:hide-when-compact))(?:\s|$)/;
constants.forbiddenElementClassSubstringRegex = /(?:(?:nomobile)|(?:navbox))/;
constants.forbiddenDivClassRegex = /(?:^|\s)(?:(?:infobox)|(?:magnify))(?:\s|$)/;
constants.forbiddenSpanClassRegex = /(?:^|\s)(?:Z3988)(?:\s|$)/;
constants.forbiddenElementIDRegex = /^coordinates$/;
constants.mwidRegex = /^mw[\w-]{2,3}$/;
constants.httpsRegex = /^https:\/\//;
constants.headerTagRegex = /^H[0-9]$/;
constants.bracketSpanRegex = /^(\[|\])$/;
constants.inlineBackgroundStyleRegex = /(?:^|\s|;)background(?:-color)?:\s*(?!(?:transparent)|(?:none)|(?:inherit)|(?:unset)|(?:#?$)|(?:#?;))/;
constants.infoboxClassRegex = /(?:^|\s)infobox(?:_v3)?(?:\s|$)/;
constants.infoboxClassExclusionRegex = /(?:^|\s)(?:(?:metadata)|(?:mbox-small))(?:\s|$)/i;
constants.newClassRegex = /(?:^|\s)new(?:\s|$)/;
constants.referenceListClassName = 'mw-references';
constants.citeNoteIdPrefix = 'cite_note-';
constants.citeNoteIdPrefixLength = constants.citeNoteIdPrefix.length;
constants.citeRefIdPrefix = 'cite_ref-';
constants.referenceClassRegex = /(?:^|\s)(?:mw-)?reference-text(?:\s|$)+/;
constants.referenceWrapClassRegex = /(?:^|\s)mw-references-wrap(?:\s|$)+/;

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
constants.widenImageExclusionClassRegex = /(?:^|\s)(?:(?:tsingle)|(?:noresize)|(?:noviewer))(?:\s|$)/;

module.exports = constants;
