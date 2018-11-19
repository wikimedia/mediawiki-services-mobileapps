'use strict';

const P = require('bluebird');
const transforms = require('./transforms');

/**
 * Iterates through the steps of a processing script and performs the indicated transforms.
 * Transforms may be indicated as either a plain string indicating the name of a transform function
 * attached to the transforms object, or a key-value object, with the key representing the name
 * of a transform function attached to the transform object, and the value representing values to
 * pass in (represented as either an array or an object, depending on the structure of the
 * transform function).
 * @param {!Document} doc page Document object
 * @param {!Object} script processing script
 * @return {!Promise} promise resolving to the transformed doc
 */
module.exports = function(doc, script) {

    /**
     * Process array `arr` in chunks of size `size` per tick using function `fn`.
     * @param {!Array} arr array
     * @param {!Function} fn processing function
     */
    function _processChunked(arr, fn) {
        return P.each(arr, chunk => new P((res, rej) => {
            return setImmediate(() => chunk.forEach(i => fn(i, res, rej)));
        }));
    }

    return _processChunked(script, (step, res, rej) => {
        if (typeof step === 'string') {
            transforms[step](doc);
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
        res();
    }).then(() => doc);
};
