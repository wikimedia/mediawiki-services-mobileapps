const util = require('./TalkPageTopicUtilities');
const ChunkReplacement = require('../html/ChunkReplacement');

const newlineRegex = / *(\n+) */g;
const headerTagRegex = /^H[0-9]$/g;
const trailingWhitespaceRegex = /\s+$/;
const leadingWhitespaceRegex = /^\s+/;
const tagsToRemove = new Set(['STYLE', 'SCRIPT']);

/**
 * TalkPageTopic represents a structured version of a talk page topic.
 * @param {!integer} id topic id
 * @param {!String} lang the language of the document
 */
class TalkPageTopic {
  constructor(id, lang) {
    this.id = id;
    this.replies = [];
    this.depth = 1;
    this.html = '';

    this.language = lang;
    this.chunksForCurrentReply = [];
    this.chunksForTitle = [];
    this.replyDepth = 0;

    this.isEndingReply = false;
  }

/**
 * Push the next chunk on to this topic
 * @param {!Chunk} the chunk
 */
  push(chunk) {
    // track reply depth
    const isList = util.isList(chunk);
    if (isList) {
      if (chunk.isEnd) {
        this.replyDepth--;
      } else {
        this.replyDepth++;
      }
    }

    // ignore certain chunks entirely
    if (this.parsePotentiallyIgnoredChunk(chunk)) {
      return;
    }

    // parse the topic title and don't push title chunks onto the reply
    if (this.parseTitle(chunk)) {
      return;
    }

    const isListItem = util.isListItem(chunk);
    const isReplyDelimiter = isList || isListItem
      || util.isNonListReplyDelimiter(chunk);

    if (this.isEndingReply && !isReplyDelimiter) {
      // finish splitting the reply on the first non-delimiter
      // encountered after starting the split below
      this.isEndingReply = false;
      this.pushCurrentReply();
    } else if (isReplyDelimiter
        && util.endsWithSignature(this.chunksForCurrentReply, this.language)) {
      // if this is a potential delimiter and it ends with a signature
      // start splitting this into a new reply
      this.isEndingReply = true;
    }

    chunk.isList = isList;
    chunk.isListItem = isListItem;
    chunk.isReplyDelimiter = isReplyDelimiter;
    chunk.depth = this.replyDepth;
    this.chunksForCurrentReply.push(chunk);
  }

  parsePotentiallyIgnoredChunk(chunk) {
    if (this.ignoredChunkName) {
      if (chunk.isEnd && chunk.tagName === this.ignoredChunkName) {
        this.ignoredChunkName = undefined;
      }
      return true;
    }

    if (tagsToRemove.has(chunk.tagName)) {
      this.ignoredChunkName = chunk.tagName;
      return true;
    }

    return false;
  }

  parseTitle(chunk) {
    if (this.titleDelim) {
      if (chunk.tagName === this.titleDelim && chunk.isEnd) {
        this.titleDelim = undefined;
      } else {
        this.html += util.replacementFor(chunk, this.chunksForTitle);
        this.chunksForTitle.push(chunk);
      }
      return true;
    } else if (this.html.length === 0 && chunk.isTag
        && chunk.tagName.length === 2
        && chunk.tagName.match(headerTagRegex)) {
      this.titleDelim = chunk.tagName;
      this.depth = parseInt(chunk.tagName.substring(1), 10) || 1;
      return true;
    }
    return false;
  }

  pushCurrentReply() {
    // get the appropriate replacements
    let chunkReplacements = this.chunksForCurrentReply.map((chunk, index, chunks) => {
      const replacement = util.replacementFor(chunk, chunks.slice(0, index));
      return new ChunkReplacement(chunk, replacement);
    });

    // trim the replacements list, remove unmatched tags, and remove orphaned list items
    chunkReplacements = ChunkReplacement.trimWhitespace(chunkReplacements);
    chunkReplacements = ChunkReplacement.trimReplyDelimiters(chunkReplacements);
    chunkReplacements = ChunkReplacement.removeUnterminatedTags(chunkReplacements);
    chunkReplacements = ChunkReplacement.removeOrphanedListItems(chunkReplacements);

    if (chunkReplacements.length === 0) {
      this.chunksForCurrentReply = [];
      return;
    }

    // reduce the replacements list into a single string
    // consume whitespace around chunks that cause a line break
    let trimLeadingWhitespace = false;
    let depth = -1;
    const reply = chunkReplacements.reduce((acc, chunkReplacement, index, chunks) => {
      let replacement = chunkReplacement.text;
      const chunk = chunkReplacement.chunk;
      if (trimLeadingWhitespace) {
        replacement = replacement.replace(leadingWhitespaceRegex, '');
        trimLeadingWhitespace = replacement.length === 0;
      }
      if (chunk.isList || chunk.isListItem) {
        acc = acc.replace(trailingWhitespaceRegex, '');
        trimLeadingWhitespace = true;
      }
      if (depth === -1 && replacement.trim().length !== 0) {
        depth = chunk.depth;
      }
      return acc + replacement;
    }, '').trim().replace(newlineRegex, (match, newlines) => {
      return '<br>'.repeat(Math.min(2, newlines.length));
    });
    this.chunksForCurrentReply = [];

    if (reply.length === 0) {
      return;
    }

    const index = this.replies.length;
    this.replies.push({
      sha: util.createSha256(`${index}${reply}`),
      depth: depth,
      html: reply
    });
  }

/**
 * Finalize the reply by removing internal state
 */
  finalize() {
    this.pushCurrentReply();
    this.html = this.html.trim();
    this.shas = {
      html: util.createSha256(`${this.id}${this.html}`),
      indicator: util.createSha256(`${this.html}${this.replies.map(reply => reply.sha).join('')}`)
    };

    this.replyDepth = undefined;
    this.titleDelim = undefined;
    this.ignoredChunkName = undefined;
    this.chunksForCurrentReply = undefined;
    this.chunksForTitle = undefined;
    this.isEndingReply = undefined;
    this.language = undefined;
  }
}

module.exports = TalkPageTopic;
