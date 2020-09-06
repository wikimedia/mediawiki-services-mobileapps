'use strict';

const P = require('bluebird');
const Chunk = require('../html/Chunk');
const TalkPageTopic = require('./TalkPageTopic');
const DocumentWorker = require('../html/DocumentWorker');
const sectionTagNames = new Set(['SECTION']);

/**
 * TalkPage represents a structured version of a talk page.
 *
 * @param {!Document} doc Parsoid document
 * @param {!String} lang the language of the document
 * @param {?boolean} immediate whether or not to process the document immediately
 */
class TalkPage extends DocumentWorker {
  constructor(doc, lang, immediate = true) {
    super(doc, doc.body);
    this.topics = [];
    this.lang = lang;
    this.previousSectionId = 0;
    if (!immediate) {
      return;
    }
    this.workSync();
    this.finalizeSync();
  }

/**
 * Returns a promise that is fufilled by a TalkPage
 *
 * @param {!Document} doc Parsoid document
 * @param {!String} lang the language of the document
 * @param {?integer} limit the limit in ms for each processing chunk
 */
  static promise(doc, lang) {
    const talkPage = new TalkPage(doc, lang, false);
    return talkPage.promise;
  }

/**
 * Process the document
 *
 * @param {?integer} limit the max number of DOMNodes to process
 */
  process(node) {
    if (sectionTagNames.has(node.tagName)) {
      while (this.ancestor && this.ancestor !== this.section) {
        const endChunk = new Chunk(this.ancestor, true);
        this.currentTopic.push(endChunk);
        this.ancestor = this.ancestor.parentNode;
      }
      this.pushCurrentTopic();
      this.section = node;
      const sectionIdString = node.getAttribute('data-mw-section-id');
      if (sectionIdString) {
        let sectionId = parseInt(sectionIdString, 10);
        if (sectionId - this.previousSectionId > 10) {
          sectionId = this.previousSectionId + 1;
        }
        this.previousSectionId = sectionId;
        this.currentTopic = new TalkPageTopic(sectionId, this.lang);
        this.ancestor = undefined;
      }
    } else if (this.currentTopic) {
      const chunk = new Chunk(node, false);

      while (this.ancestor && this.ancestor !== node.parentNode) {
        const endChunk = new Chunk(this.ancestor, true);
        this.currentTopic.push(endChunk);
        this.ancestor = this.ancestor.parentNode;
      }

      if (chunk.isTag) {
        this.ancestor = node;
        this.currentTopic.push(chunk);
      } else if (chunk.isText) {
        this.currentTopic.push(chunk);
      }
    }
  }

/**
 * Finalize the talk page by removing internal state
 */
  finalizeStep() {
    this.pushCurrentTopic();
    this.currentTopic = undefined;
    this.lang = undefined;
    this.previousSectionId = undefined;
    this.doc = undefined;
    this.ancestor = undefined;
    this.section = undefined;
    this.treeWalker = undefined;
    return false; // nothing left to do
  }

  pushCurrentTopic() {
    if (!this.currentTopic) {
      return;
    }
    this.currentTopic.finalize();
    const hasContent = this.currentTopic.html !== '' || this.currentTopic.replies.length > 0;
    if (hasContent) {
      this.topics.push(this.currentTopic);
    }
    this.currentTopic = undefined;
  }
}

module.exports = TalkPage;
