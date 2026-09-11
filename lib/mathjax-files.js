'use strict';

const MATHJAX_FONT_NAMES = new Set([
	'PUA.js',
	'accents-b-i.js',
	'accents.js',
	'arabic.js',
	'arrows.js',
	'braille-d.js',
	'braille.js',
	'calligraphic.js',
	'cherokee.js',
	'cyrillic-ss.js',
	'cyrillic.js',
	'devanagari.js',
	'double-struck.js',
	'fraktur.js',
	'greek-ss.js',
	'greek.js',
	'hebrew.js',
	'latin-b.js',
	'latin-bi.js',
	'latin-i.js',
	'latin.js',
	'marrows.js',
	'math.js',
	'monospace-ex.js',
	'monospace-l.js',
	'monospace.js',
	'mshapes.js',
	'phonetics-ss.js',
	'phonetics.js',
	'sans-serif-b.js',
	'sans-serif-bi.js',
	'sans-serif-ex.js',
	'sans-serif-i.js',
	'sans-serif-r.js',
	'sans-serif.js',
	'script.js',
	'shapes.js',
	'symbols-b-i.js',
	'symbols.js',
	'variants.js'
]);

const MATHJAX_MAP_NAMES = new Set( [
	'af.json',
	'base.json',
	'ca.json',
	'da.json',
	'de.json',
	'en.json',
	'es.json',
	'euro.json',
	'fr.json',
	'hi.json',
	'it.json',
	'ko.json',
	'nb.json',
	'nemeth.json',
	'nn.json',
	'sv.json'
]);

module.exports = {
	MATHJAX_FONT_NAMES,
	MATHJAX_MAP_NAMES
};
