'use strict';

const P = require('bluebird');
const transforms = require('./transforms');
const constants = require('./constants');

/**
 * @param {!Document} doc page Document object
 * @param {!Object} script processing script
 * @param {!integer} max time in ms to run before taking a break
 * @param {!function} done called when done
 * @param {?Object} options optional object for additional input data that will be passed on to
 * scalar scripts
 * @return {void}
 */
const process = (doc, script, maxms, done, options) => {
  const start = Date.now();
  const checkTime = () => {
    if (maxms > 0 && (Date.now() - start) >= maxms) {
      return true;
    }
    return false;
  };
  let stepIndex = 0;
  const maxStepIndex = script.length - 1;
  for (const step of script) {
    if (typeof step === 'string') {
        transforms[step](doc, options);
    } else {
        const transform = Object.keys(step)[0];
        if (Array.isArray(step[transform])) {
            transforms[transform](doc, step[transform].join());
        } else {
            Object.keys(step[transform]).forEach((k) => {
                const v = step[transform][k];
                transforms[transform](doc, k, v);
            });
        }
    }
    stepIndex++;
    if (stepIndex < maxStepIndex && checkTime()) {
      break;
    }
  }
  if (stepIndex < maxStepIndex) {
    setImmediate(() => { process(doc, script.slice(stepIndex), maxms, done, options); });
    return;
  }
  done(doc);
};

/**
 * Iterates through the steps of a processing script and performs the indicated transforms.
 * Transforms may be indicated as either a plain string indicating the name of a transform function
 * attached to the transforms object, or a key-value object, with the key representing the name
 * of a transform function attached to the transform object, and the value representing values to
 * pass in (represented as either an array or an object, depending on the structure of the
 * transform function).
 *
 * @param {!Document} doc page Document object
 * @param {!Object} script processing script
 * @param {?Object} options optional object for additional input data that will be passed on to
 * scalar scripts
 * @param {?integer} max time in ms to run before taking a break
 * @return {!Promise} promise resolving to the transformed doc
 */
module.exports = function(doc, script, options, maxms = constants.MAX_MS_PER_TICK) {
  return new P(res => { process(doc, script, maxms, res, options); });
};
