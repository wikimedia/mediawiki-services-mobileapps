'use strict';

const P = require('bluebird');
const constants = require('../constants');

/**
 * DocumentWorker walks a Document tree to perform processing
 *
 * @param {!Document} doc Parsoid document
 * @param {?DOMNode} node to walk
 */
class DocumentWorker {
  constructor(doc, node) {
    this.doc = doc;
    this.treeWalker = doc.createTreeWalker(node || doc);
    this.processingTime = 0;
  }

/**
 * Return a promise for the processed and finalized worker
 *
 * @return {!Promise}
 */
  get promise() {
    const limit = constants.MAX_MS_PER_TICK;
    return new P((resolve, reject) => {
      this._doWorkInChunks(() => this.workFor(limit), (err) => {
        if (err) {
          return reject(err);
        }
        this._doWorkInChunks(() => this.finalizeFor(limit), (err) => {
          if (err) {
            return reject(err);
          }
          resolve(this);
        });
      });
    });
  }

/**
 * Process a given node. Subclassers should override this method
 *
 * @param {!DOMNode} node
 */
  process(node) {

  }

/**
 * Perform the next finalization step. Subclassers should override this method
 *
 * @return {!boolean} whether or not there are  more steps
 */
  finalizeStep() {

  }

/**
 * Process the document for a given interval
 *
 * @param {!limit} limit in ms for processing or -1 for no limit
 */
  workFor(limit) {
    let node;
    let finished = true;
    const start = Date.now();
    while ((node = this.treeWalker.nextNode())) {
      this.process(node);
      if (limit !== -1 && (Date.now() - start) >= limit) {
        finished = false;
        break;
      }
    }
    const end = Date.now();
    this.processingTime += end - start;
    return finished;
  }

/**
 * Process the entire document synchronously
 */
  workSync() {
    this.workFor(-1);
  }

/**
 * Finalize the document for a given interval
 *
 * @param {!limit} limit in ms for processing or -1 for no limit
 */
  finalizeFor(limit) {
    let finished = true;
    const start = Date.now();
    while (this.finalizeStep()) {
      if (limit !== -1 && (Date.now() - start) >= limit) {
        finished = false;
        break;
      }
    }
    const end = Date.now();
    this.processingTime += end - start;
    return finished;
  }

/**
 * Finalize synchronously
 */
  finalizeSync() {
    this.finalizeFor(-1);
  }

/**
 * Repeats the chunk of work provided breaking off the event loop
 * until the chunk returns true.
 *
 * @param {Function} chunk - a step to call
 * @param {Function} done to call when done
 */
  _doWorkInChunks(chunk, done) {
    try {
      if (chunk()) {
        setImmediate(done);
      } else {
        setImmediate(() => this._doWorkInChunks(chunk, done));
      }
    } catch (err) {
      setImmediate(() => done(err));
    }
  }
}

module.exports = DocumentWorker;
