/**
 * Gets parent index of index.
 * @param  {!number} index
 * @param  {[!TalkReply]} array Reverse-order TalkReply array.
 * @return {!number}
 */
const getParentIndex = (index, array) => {
   return array.findIndex((reply, thisIndex) => {
     return !(thisIndex < index || reply.depth >= array[index].depth);
   });
};

/**
 * Gets child indices of index.
 * @param  {!number} index
 * @param  {[!TalkReply]} array Reverse-order TalkReply array.
 * @return {[!number]}
 */
const getChildrenIndices = (index, array) => {
  return array.reduce((ids, reply, thisIndex) => {
    const thisParentIndex = getParentIndex(thisIndex, array);
    if (!thisParentIndex || thisParentIndex !== index) {
      return ids;
    }
    ids.push(thisIndex);
    return ids;
  }, []);
};

/**
 * Gets sibling indices of index, including index.
 * @param  {!number} index
 * @param  {[!TalkReply]} array Reverse-order TalkReply array.
 * @return {[!number]}
 */
const getInclusiveSiblingIndices = (index, array) => {
  const parentIndex = getParentIndex(index, array);
  if (!parentIndex) {
    return [];
  }

  const isContiguous = (thisIndex, offset, a) =>
    a[array[thisIndex].childIndex + offset - array[index].childIndex] === index;

  return getChildrenIndices(parentIndex, array).filter(isContiguous);
};

/**
 * Gets sibling indices of index, excluding index.
 * @param  {!number} index
 * @param  {[!TalkReply]} array Reverse-order TalkReply array.
 * @return {[!number]}
 */
const getSiblingIndices = (index, array) => {
  return getInclusiveSiblingIndices(index, array).filter(thisIndex => thisIndex !== index);
};

/**
 * Gets descendent indices of index.
 * @param  {!number} index
 * @param  {[!TalkReply]} array Reverse-order TalkReply array.
 * @return {[!number]}
 */
const getDescendentIndices = (index, array) => {
  const descendentIndices = [];
  const getDescendentIndicesInner = parentIndex => {
    getChildrenIndices(parentIndex, array).forEach(thisIndex => {
      descendentIndices.push(thisIndex);
      getDescendentIndicesInner(thisIndex);
    });
  };
  getDescendentIndicesInner(index);
  return descendentIndices;
};

/**
 * Gets array of ancestor elements of an element, including the element.
 * @param  {!Element} element
 * @return {[!Element]}
 */
const getFamilyTree = element => {
  let elem = element;
  let tree = [element];
  while ((elem = elem.parentElement) !== null) {
    tree.push(elem);
  }
  return tree;
};

module.exports = {
  getParentIndex,
  getChildrenIndices,
  getInclusiveSiblingIndices,
  getSiblingIndices,
  getDescendentIndices,
  getFamilyTree
};
