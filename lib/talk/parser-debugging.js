const relationships = require('./parser-relationships');

/**
 * Useful for debugging reply processing.
 * @param  {[!TalkReply]} accumulator
 * @param  {!TalkReply} reply
 * @param  {!number} index
 * @param  {[!TalkReply]} array
 * @return {[!TalkReply]}
 */
const debugCombiner = (accumulator, reply, index, array) => {
  // Adds bracketed annotation to reply html.
  reply.html =
    `${reply.html} [${index}, ${reply.childIndex}, ${reply.depth}, ${reply.endsWithSig}]`;

  // Adds bracketed annotation for relationships of a specific reply.
  const itemIndexToDebug = 7; // <- Change this to pick the reply to annotate.
  if (index === itemIndexToDebug) {
    const addDebugString = (thisReply, s) => {
      thisReply.html = `${thisReply.html} [${s}]`;
    };
    addDebugString(reply, 'SOUGHT');

    const parent = array[relationships.getParentIndex(index, array)];
    if (parent) {
      addDebugString(parent, 'PARENT');
    }

    const childIndices = relationships.getChildrenIndices(index, array);
    childIndices.forEach(thisIndex => {
      addDebugString(array[thisIndex], 'CHILD');
    });

    const siblingIndices = relationships.getSiblingIndices(index, array);
    siblingIndices.forEach(thisIndex => {
      addDebugString(array[thisIndex], 'SIBLING');
    });

    const inclusiveSiblingIndices = relationships.getInclusiveSiblingIndices(index, array);
    inclusiveSiblingIndices.forEach(thisIndex => {
      addDebugString(array[thisIndex], 'INCLUSIVE SIBLING');
    });

    const descendentIndices = relationships.getDescendentIndices(index, array);
    descendentIndices.forEach(thisIndex => {
      addDebugString(array[thisIndex], 'DESCENDENT');
    });
  }

  accumulator.push(reply);
  return accumulator;
};

module.exports = {
  debugCombiner
};
