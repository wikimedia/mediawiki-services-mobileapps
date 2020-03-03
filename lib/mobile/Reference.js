/* eslint-disable no-useless-escape */
const linkTextSplitter = /[\[\]\s]/;

class Reference {
    constructor(element, id) {
        this.element = element;
        this.id = id;
        this.backLinks = [];
    }

    /**
     * Truncates link text for display as a back link.
     * For example [notes 1] becomes [N 1]
     * @param {string} text
     * @returns {string} truncated link
     */
    static truncateLinkText(text) {
        if (!text || text.length < 6) {
            return text;
        }
        let linkText = text;
        const linkGroups = linkText.split(linkTextSplitter).filter(s => s !== '');
        let number = linkGroups[linkGroups.length - 1];
        const isGrouped = linkGroups.length > 1;
        const maxNumberLength = isGrouped ? 2 : 3;
        const diff = number.length - maxNumberLength;
        if (diff > 0) {
            const repeat = Array(diff + 2).join('.');
            number = repeat + number.slice(diff + 1);
        }
        if (isGrouped) {
            linkText = `[${linkGroups[0].slice(0, 1).toUpperCase()} ${number}]`;
        } else {
            linkText = `[${number}]`;
        }
        return linkText;
    }
}

module.exports = Reference;
