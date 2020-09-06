'use strict';

const P = require('bluebird');
const assert = require('../utils/assert.js');
const constants = require('../../lib/constants');

const MS_PER_NS = 1000000;

const DEFAULT_MAX_BLOCK = constants.MAX_MS_PER_TICK * 2;

class Performance {

  static checkEventLoopBlockingTime (promise, maxns, initial, done) {
    if (promise.isFulfilled() || promise.isRejected() || promise.isCancelled()) {
      const diff = process.hrtime(initial);
      const ns = diff[0] * 1e9 + diff[1];
      done(ns, maxns);
      return;
    }
    const start = process.hrtime();
    setImmediate(() => {
      const diff = process.hrtime(start);
      const ns = diff[0] * 1e9 + diff[1];
      Performance.checkEventLoopBlockingTime(promise, ns > maxns ? ns : maxns, initial, done);
    });
  }

  static measure(promise, max = -1, maxblock = DEFAULT_MAX_BLOCK) {
    const perfPromise = new P(res => {
      const start = process.hrtime();
      Performance.checkEventLoopBlockingTime(promise, 0, start, (ns, blockns) => {
        assert.ok(ns < max * MS_PER_NS, `Should take less than ${max}ms. It took ${Math.round(ns / MS_PER_NS)}ms`);
        assert.ok(blockns < maxblock * MS_PER_NS, `Shouldn't block the event loop for more than ${maxblock}ms.
          It was blocked for ${Math.round(blockns / MS_PER_NS)}ms`);
        res();
      });
    });
    return P.join(promise, perfPromise).then(results => { return results[0]; });
  }

  // Marks the start and returns the object to send to finish
  static start() {
    return process.hrtime();
  }

  // Returns the time in ns since start
  static finish(start) {
    const diff = process.hrtime(start);
    return diff[0] * 1e9 + diff[1];
  }
}

module.exports = Performance;
