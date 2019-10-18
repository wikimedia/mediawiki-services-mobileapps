const P = require('bluebird');
const Chunk = require('../html/Chunk');
const TalkPageTopic = require('./TalkPageTopic');

const sectionTagNames = new Set(['SECTION']);

/**
 * TalkPage represents a structured version of a talk page.
 * @param {!Document} doc Parsoid document
 * @param {!String} lang the language of the document
 * @param {?boolean} immediate whether or not to process the document immediately
 */
class TalkPage {
  constructor(doc, lang, immediate = true) {
    this.topics = [];
    this.lang = lang;
    this.previousSectionId = 0;
    this.treeWalker = doc.createTreeWalker(doc.body);
    if (!immediate) {
      return;
    }
    this.process();
    this.finalize();
  }

/**
 * Returns a promise that is fufilled by a TalkPage
 * @param {!Document} doc Parsoid document
 * @param {!String} lang the language of the document
 * @param {?integer} limit the max number of DOMNodes to process per event loop cycle
 */
  static promise(doc, lang, limit = 1024) {
    return new P(res => {
      const talkPage = new TalkPage(doc, lang, false);
      talkPage.processAsync(limit, res);
    });
  }

/**
 * Process the document
 * @param {?integer} limit the max number of DOMNodes to process
 */
  process(limit = -1) {
    let i = 0;
    let finished = true;
    let node;
    while ((node = this.treeWalker.nextNode())) {
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
      i++;
      if (limit !== -1 && i >= limit) {
         finished = false;
         break;
      }
    }
    return finished;
  }

/**
 * Process the document asyncronously
 * @param {!integer} limit the max number of DOMNodes to process per event loop
 * @param {!Function} function that takes a single parameter, the processed TalkPage
 */
  processAsync(limit, done) {
    if (this.process(limit)) {
      setImmediate(() => {
        this.finalize();
        done(this);
      });
    } else {
      setImmediate(() => {
        this.processAsync(limit, done);
      });
    }
  }

/**
 * Finalize the talk page by removing internal state
 */
  finalize() {
    this.pushCurrentTopic();
    this.currentTopic = undefined;
    this.lang = undefined;
    this.previousSectionId = undefined;
    this.doc = undefined;
    this.ancestor = undefined;
    this.section = undefined;
    this.treeWalker = undefined;
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
