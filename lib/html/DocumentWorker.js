const P = require('bluebird');
const constants = require('../constants');

/**
 * DocumentWorker walks a Document tree to perform processing
 * @param {!Document} doc Parsoid document
 * @param {?DOMNode} node to walk
 */
class DocumentWorker {
  constructor(doc, node) {
    this.doc = doc;
    this.treeWalker = doc.createTreeWalker(node || doc);
  }

/**
 * Return a promise for the processed and finalized worker
 * @return {!Promise}
 */
  get promise() {
    const limit = constants.MAX_MS_PER_TICK;
    return new P(res => {
      this.work(limit, () => {
        this.finalize(limit, () => {
          res(this);
        });
      });
    });
  }

/**
 * Process a given node. Subclassers should override this method
 * @param {!DOMNode} node
 */
  process(node) {

  }

/**
 * Perform the next finalization step. Subclassers should override this method
 * @return {!boolean} whether or not there are  more steps
 */
  finalizeStep() {

  }

/**
 * Process the document for a given interval
 * @param {!limit} limit in ms for processing or -1 for no limit
 */
  workFor(limit) {
    let node;
    let finished = true;
    let start = Date.now();
    while ((node = this.treeWalker.nextNode())) {
      this.process(node);
      if (limit !== -1 && (Date.now() - start) >= limit) {
        finished = false;
        break;
      }
    }
    return finished;
  }

/**
 * Process the entire document synchronously
 */
  workSync() {
    this.workFor(-1);
  }

/**
 * Process the entire document, taking a break with setImmediate after roughly the given interval
 * @param {!limit} limit in ms for processing or -1 for no limit
 * @param {!function} done to call when done
 */
  work(limit, done) {
    if (this.workFor(limit)) {
      setImmediate(() => {
        done();
      });
    } else {
      setImmediate(() => {
        this.work(limit, done);
      });
    }
  }

/**
 * Finalize the document for a given interval
 * @param {!limit} limit in ms for processing or -1 for no limit
 */
  finalizeFor(limit) {
    let node;
    let finished = true;
    let start = Date.now();
    while (this.finalizeStep()) {
      if (limit !== -1 && (Date.now() - start) >= limit) {
        finished = false;
        break;
      }
    }
    return finished;
  }

/**
 * Finalize synchronously
 */
  finalizeSync() {
    this.finalizeFor(-1);
  }

/**
 * Finalize the work
 * @param {!limit} limit in ms for processing or -1 for no limit
 * @param {!function} done to call when done
 */
  finalize(limit, done) {
    if (this.finalizeFor(limit)) {
      setImmediate(() => {
        done();
      });
    } else {
      setImmediate(() => {
        this.finalize(limit, done);
      });
    }
  }
}

module.exports = DocumentWorker;
