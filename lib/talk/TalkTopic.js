const TalkReply = require('./TalkReply').TalkReply;
const removal = require('./parser-removal');
const relationships = require('./parser-relationships');
const crypto = require('crypto');
// const debugging = require('./parser-debugging');

/**
 * Creates SHA256 for a string.
 * @param  {!string} input Input string.
 * @return {!string} SHA256 for input string.
 */
const createSha256 = input => {
  const shasum = crypto.createHash('sha256');
  shasum.update(input);
  return shasum.digest('hex');
};

/**
 * Combines replies, where appropriate, in TalkReply array, returning array of only the replies to
 * to be kept.
 * @param  {[!TalkReply]} accumulator Accumulator for replies to be kept.
 * @param  {!TalkReply} reply
 * @param  {!number} index
 * @param  {[!TalkReply]} array Original full TalkReply array.
 * @return {[!TalkReply]} Final TalkReply array, of only replies to be kept, in reverse order
 * of appearance.
 */
const replyCombiner = (accumulator, reply, index, array) => {
  const nextReply = (index + 1 < array.length) ? array[index + 1] : null;
  if (reply.shouldCombineWith(nextReply)) {
    nextReply.combineWith(reply);
  } else {
    accumulator.push(reply);
  }
  return accumulator;
};

/**
 * Combines list item replies, where appropriate, in TalkReply array, returning array with list item
 * replies thus combined. N-deep aware so works with deeply nested lists.
 * @param  {[!TalkReply]} accumulator Accumulator for replies while list item replies are being
 * combined.
 * @param  {!TalkReply} reply
 * @param  {!number} index
 * @param  {[!TalkReply]} array Original full TalkReply array.
 * @return {[!TalkReply]} Final TalkReply array, with list item replies combined, in reverse order
 * of appearance.
 */
const listItemCombiner = (accumulator, reply, index, array) => {

  if (reply.isListItem && !reply.endsWithSig) {
    const alreadyInAccumulator = accumulator.findIndex(listInfo => {
        return listInfo.siblingIndices.find(thisIndex => thisIndex === index);
    }) !== -1;

    if (!alreadyInAccumulator) {
      const inclusiveSiblingIndices = relationships.getInclusiveSiblingIndices(index, array);
      if (inclusiveSiblingIndices.length > 1) {
        accumulator.push({
          depth: reply.depth,
          minIndex: Math.min(...inclusiveSiblingIndices),
          maxIndex: Math.max(...inclusiveSiblingIndices),
          siblingIndices: inclusiveSiblingIndices
        });
      }
    }
  }

  const isAtEnd = index === array.length - 1;
  if (!isAtEnd) {
    return accumulator;
  }

  let indicesToRemove = [];

  accumulator
    .sort((a, b) => b.depth - a.depth) // Sort deepest to shallowest so deepest lists handled 1st.
    .forEach(thing => {
      const combineThese = array.reduce((innerAccumulator, innerReply, innerIndex) => {
        if (
          innerIndex >= thing.minIndex &&
          innerIndex < thing.maxIndex &&
          !indicesToRemove.includes(innerIndex)
        ) {
          indicesToRemove.push(innerIndex);
          innerAccumulator.unshift(innerReply);
        }
        return innerAccumulator;
      }, []);

      const combineIntoThis = array[thing.maxIndex];
      combineIntoThis.convertToListContainingSelfAndItems(combineThese);

      // 'combineWith' (for items at this depth) so newly converted lists get added to parent LI
      // if needed
      const nextReply =
        (thing.maxIndex + 1 < array.length) ? array[thing.maxIndex + 1] : null;
      if (
        nextReply !== null &&
        nextReply.isListItem &&
        (combineIntoThis.depth === nextReply.depth + 1) &&
        combineIntoThis.shouldCombineWith(nextReply)
      ) {
        nextReply.combineWith(combineIntoThis);
        indicesToRemove.push(thing.maxIndex);
      }
    });

  return array.filter((_, index) => !indicesToRemove.includes(index));
};

const arraysOfNodesAroundBreaksReducer = (resultArray, item, index) => {
  const isBR = item.tagName && item.tagName === 'BR';
  if (isBR || index === 0) {
    resultArray.push([]);
  }
  if (!isBR) {
    resultArray[resultArray.length - 1].push(item);
  }
  return resultArray;
};

const pContainingArrayOfNodes = (nodeArray, doc) => {
  const p = doc.createElement('p');
  nodeArray.forEach(p.appendChild, p);
  return p;
};

const soughtElementsInSectionReversed = (sectionElement, doc) => {
  return Array.from(sectionElement.querySelectorAll('p,li,dt,dd,th,td,pre,div,blockquote,center'))
    .reduce((accumulator, element) => {
      if (!['PRE', 'LI', 'DT', 'DD'].includes(element.tagName)) {
        element.childNodes
          .reduce(arraysOfNodesAroundBreaksReducer, [])
          .map(nodes => pContainingArrayOfNodes(nodes, doc))
          .forEach(p => accumulator.unshift(p));
      } else {
        accumulator.unshift(element);
      }
      return accumulator;
    }, []);
};

class TalkTopic {
  constructor(sectionElement, doc, translations) {
    this.id = 0;
    this.replies = this.repliesFromSectionElement(sectionElement, doc, translations);
    const header = sectionElement.querySelector('h1,h2,h3,h4,h5,h6');
    this.depth = header ? parseInt(header.tagName.replace(/[^0-9]/g, ''), 10) : 1;
    this.html = removal.customTextContent(header, doc);
    this.shas = {
      html: '',
      indicator: ''
    };
  }

  // Occasionally the first reply is at a non-zero depth.
  // Reduce all reply depths by first reply depth.
  normalizeReplyDepths(replies) {
    if (replies.length === 0) {
      return;
    }
    const initialReplyDepth = replies[0].depth;
    if (initialReplyDepth === 0) {
      return;
    }
    replies.forEach(reply => {
      const newDepth = reply.depth - initialReplyDepth;
      reply.depth = newDepth > -1 ? newDepth : 0;
    });
  }

  repliesFromSectionElement(sectionElement, doc, translations) {
    const replyForElement = element => new TalkReply(element, doc, translations);
    const replyIsNonBlank = reply => reply.html.length > 0;
    const replies = soughtElementsInSectionReversed(sectionElement, doc)
      .map(replyForElement)
      .filter(replyIsNonBlank)
      // .reduce(debugging.debugCombiner, []) // Useful for debugging w/o the 2 combiners below.
      .reduce(listItemCombiner, [])
      .reduce(replyCombiner, [])
      .reverse();

    this.normalizeReplyDepths(replies);
    replies.forEach(reply => reply.pruneTemporaryProperties());

    return replies;
  }

  addShas() {
    this.replies.forEach((reply, index) => {
      reply.sha = createSha256(`${index}${reply.html}`);
    });

    this.shas.html = createSha256(`${this.id}${this.html}`);

    // `indicator` doesn't  include index to prevent any topic deletions from causing all messages
    // from topics beneath current topic from showing as unread
    this.shas.indicator =
      createSha256(`${this.html}${this.replies.map(reply => reply.sha).join('')}`);
  }

  isEmpty() {
    return this.html.length === 0 && this.replies.length === 0;
  }
}

module.exports = {
  TalkTopic,
  createSha256
};
