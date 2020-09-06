'use strict';

const crypto = require('crypto');
const allTranslations = require('./parser-translations');

const tagReplacements = {
  A: 'a',
  B: 'b',
  I: 'i',
  SUP: 'sup',
  SUB: 'sub',
  DT: 'b',
  CODE: 'b',
  BIG: 'b',
  LI: 'li',
  OL: 'ol',
  UL: 'ul',
  DL: 'ul',
  DD: 'li'
};

const listTags = new Set(['UL', 'OL', 'DL']);
const isList = chunk => {
  return chunk.isTag && listTags.has(chunk.tagName);
};

const listItemTags = new Set(['LI', 'DD', 'DT']);
const isListItem = chunk => {
  return chunk.isTag && listItemTags.has(chunk.tagName);
};

const attributesToRemoveMap = {
  style: true,
  id: true,
  class: true,
  rel: true,
  about: true,
  'data-mw': true,
  typeof: true
};

const escapeRegex = /[<>]/g;
const escapeMap = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;'
};

const escape = text => {
  return text.replace(escapeRegex, (match) => {
    return escapeMap[match] || '';
  });
};

/**
 * Creates SHA256 for a string.
 *
 * @param  {!string} input Input string.
 * @return {!string} SHA256 for input string.
 */
const createSha256 = input => {
  const shasum = crypto.createHash('sha256');
  shasum.update(input);
  return shasum.digest('hex');
};

const timestampRegex = /(?:2\d{3}|(?:[0-2]\d:\d\d))\s+\([A-Z]{2,5}\)/;
// cache regexes
const userTalkURLRegexes = {};
/**
 * User talk URL regex for a given language
 *
 * @param {!string} language
 */
const userTalkURLRegex = language => {
  let userTalkURLRegex = userTalkURLRegexes[language];
  if (!userTalkURLRegex) {
    let translations = allTranslations.translationsForLang(language);
    if (!translations) {
      translations = allTranslations.translationsForLang('en');
    }
    userTalkURLRegex = new RegExp(`\\/(?:${translations.user})|(?:${translations.userTalk}):`, 'i');
    userTalkURLRegexes[language] = userTalkURLRegex;
  }
  return userTalkURLRegex;
};

/**
 * Determines whether or not an array of chunks ends with a signature
 *
 * @param {!Array<Chunk>} chunks to check
 * @param {!string} language to use when checking
 * @return {!boolean} whether or not the chunks end with a signature
 */
const endsWithSignature = (chunks, language) => {
  let foundNonSignatureText = true;
  let inLink = false;
  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i];
    if (!chunk.isTag) {
      const text = chunk.text;
      if (text) {
        const trimmedText = text.trim();
        if (trimmedText.length > 0 && !inLink) {
          foundNonSignatureText = !trimmedText.match(timestampRegex);
          break;
        }
      }
      continue;
    }

    const tagName = chunk.tagName;

    if (tagName !== 'A') {
      continue;
    }

    if (chunk.isEnd) {
      inLink = true;
      continue;
    }

    inLink = false;

    const href = chunk.getAttribute('href');
    if (href && href.match(userTalkURLRegex(language))) {
      foundNonSignatureText = false;
      break;
    }
    break;
  }
  return !foundNonSignatureText;
};

/**
 * Determines whether or not an array of chunks ends with an empty anchor
 *
 * @param {!Chunk} tag that is potentially an end anchor
 * @param {!Array<Chunk>} chunks preceding the tag
 * @return {!string} text for the empty link or empty string
 */
const additionalLinkTextForPotentialEmptyEndAnchor = (tag, chunks) => {
  if (!tag.isEnd || tag.tagName !== 'A') {
    return '';
  }
  let foundLinkText = false;
  let href = '';
  for (var i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i];
    if (!chunk.isTag) {
      foundLinkText = chunk.text.length > 0;
      continue;
    }
    if (chunk.tagName !== 'A') {
      continue;
    }
    href = chunk.getAttribute('href');
    break;
  }
  if (foundLinkText || !href) {
    return '';
  }
  const fileName = href.substring(href.lastIndexOf('/') + 1);
  return `[${fileName}]`;
};

const onlyNewlineRegex = /^\n+$/;
const isOnlyNewlines = (chunk) => {
  return !chunk.isTag && chunk.text.match(onlyNewlineRegex);
};

const nonListReplyDelimiters = new Set(['BR', 'P', 'TD']);
const isNonListReplyDelimiter = chunk => {
  return chunk.isTag && nonListReplyDelimiters.has(chunk.tagName);
};

/**
 * Structured talk page topic text replacement for a given chunk
 *
 * @param {!Chunk} chunk to replace
 * @param {!Array<Chunk>} chunks preceding the chunk to replace
 * @return {!string} text to replace the chunk with
 */
const replacementFor = (chunk, chunks) => {
  if (chunk.isText) {
    return escape(chunk.text);
  }

  const sub = tagReplacements[chunk.tagName];

  if (!sub) {
    return isNonListReplyDelimiter(chunk) ? '\n\n' : '';
  }

  const slash = chunk.isEnd ? '/' : '';
  const additionalText = additionalLinkTextForPotentialEmptyEndAnchor(chunk, chunks);
  let replacementTag = `${additionalText}<${slash}${sub}`;
  if (!chunk.isEnd) {
    const prunedAttributes = chunk.attributes.filter((attribute) => {
      const lowerCaseAttribute = attribute.name;
      if (attributesToRemoveMap[lowerCaseAttribute]) {
        return false;
      }
      return true;
    }).map((attribute) => {
      return `${attribute.name}="${attribute.value}"`;
    }).join(' ');
    if (prunedAttributes.length > 0) {
      replacementTag += ` ${prunedAttributes}`;
    }
  }
  return `${replacementTag}>`;
};

module.exports = {
  createSha256,
  replacementFor,
  isList,
  isListItem,
  isOnlyNewlines,
  isNonListReplyDelimiter,
  endsWithSignature
};
