const relationships = require('./parser-relationships');
const removal = require('./parser-removal');

const endsWithUserOrUserTalkAnchor = (text, doc, translations) => {
  if (!translations) {
    return false;
  }
  const element = doc.createElement('div');
  element.innerHTML = text;
  const clone = removal.getCloneWithAnchorsAndTextNodesOnly(element);
  const userOrUserTalkAnchors =
    clone.querySelectorAll(`a[href*="/${translations.user}:"], a[href*="/${translations.userTalk}:"]`);

  if (userOrUserTalkAnchors.length > 0) {
    const lastAnchor = userOrUserTalkAnchors[userOrUserTalkAnchors.length - 1];
    const endOfLastAnchorNormalizedPositionInParent =
        (clone.innerHTML.indexOf(lastAnchor.outerHTML)
        + lastAnchor.outerHTML.length) / clone.innerHTML.length;
    return endOfLastAnchorNormalizedPositionInParent === 1.0;
  }
  return false;
};

const depthIndicatingAncestorTags = ['DL', 'UL', 'OL'];
const getReplyDepth = element => {
  let familyTreeTags = relationships.getFamilyTree(element).map(e => e.tagName);
  let depth = familyTreeTags.filter(tag => depthIndicatingAncestorTags.includes(tag)).length;
  if (element.tagName === 'DT') {
    depth = depth - 1;
  }
  return depth;
};

const timestampRegex = /.*(?:2\d{3}|(?:[0-2]\d:\d\d))\s+\([A-Z]{2,5}\)\s*$/;

class TalkReply {
  constructor(element = null, doc, translations) {
    this.sha = '';
    this.depth = getReplyDepth(element);

    this.isListItem = element.tagName === 'LI' || element.tagName === 'DD';
    this.isListItemOrdered = this.isListItem && element.parentElement.tagName === 'OL';
    this.childIndex = !element.parentElement ? -1
      : Array.from(element.parentElement.children).findIndex(obj => obj === element);

    const fragment = doc.createDocumentFragment();
    fragment.appendChild(element);

    this.html = removal.customTextContent(fragment, doc)
      .trim()
      .replace(/\n+/g, '<br>');

    this.endsWithSig =
      timestampRegex.test(this.html) || endsWithUserOrUserTalkAnchor(this.html, doc, translations);
  }

  isListItemFirstSibling(prevReply, nextReply) {
    return nextReply
      && nextReply.isListItemSiblingWith(this)
      && !this.isListItemSiblingWith(prevReply);
  }

  isListItemSiblingWith(otherReply) {
    if (!otherReply) {
      return false;
    }
    return this.isListItem
      && otherReply.isListItem
      && this.depth === otherReply.depth
      && this.isListItemOrdered === otherReply.isListItemOrdered
      && this.endsWithSig === false
      && otherReply.endsWithSig === false;
  }

  shouldCombineWith(otherReply) {
    if (!otherReply) {
      return false;
    }
    return !otherReply.endsWithSig;
  }

  combineWith(otherReply) {
    const stringStartsWithListTagHTML = string => string.startsWith('<ol>') || string.startsWith('<ul>');
    const stringEndsWithListTagHTML = string => string.endsWith('</ol>') || string.endsWith('</ul>');
    let separator = '';
    if (
      otherReply.html.length > 0
      &&
      !stringStartsWithListTagHTML(otherReply.html)
      &&
      !stringEndsWithListTagHTML(this.html)
    ) {
      const emSpace = String.fromCharCode(8195);
      separator = `<br><br>${emSpace.repeat(otherReply.depth)}`;
    }
    this.html = `${this.html}${separator}${otherReply.html}`;
  }

  convertToListContainingSelfAndItems(replyArray) {
    if (replyArray.length < 1) {
      return;
    }
    const newText = [];
    newText.push(this.isListItemOrdered ? '<ol>' : '<ul>');
    newText.push('<li>');
    newText.push(this.html);
    newText.push('</li>');
    replyArray.forEach(reply => {
      newText.push('<li>');
      newText.push(reply.html);
      newText.push('</li>');
    });
    newText.push(this.isListItemOrdered ? '</ol>' : '</ul>');
    this.html = newText.join('');
  }

  /**
   * Removes properties we don't want to deliver in final results.
   */
  pruneTemporaryProperties() {
    delete this.isListItem;
    delete this.isListItemOrdered;
    delete this.childIndex;
    delete this.endsWithSig;
  }
}

module.exports = {
  TalkReply,
  getReplyDepth,
  timestampRegex
};
