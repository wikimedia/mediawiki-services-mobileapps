const Polyfill = require('./Polyfill').default
/**
 * get Section Offsets object to handle quick scrolling in the table of contents
 * @param  {!HTMLBodyElement} body HTML body element DOM object.
 * @return {!object} section offsets object
 */
const getSectionOffsets = (body: HTMLBodyElement): object => {
    const sections = Polyfill.querySelectorAll(body, 'section')
    return {
        sections: sections.reduce((results: Array<object>, section: HTMLElement) => {
            const id = section.getAttribute('data-mw-section-id');
            const heading = section &&
                section.firstElementChild &&
                section.firstElementChild.querySelector('.pcs-edit-section-title');
            if (id && parseInt(id) >= 1) {
                results.push({
                    heading: heading && heading.innerHTML,
                    id: parseInt(id),
                    yOffset: section.offsetTop,
                });
            }
            return results;
        }, [])
    }
}

/**
 * Get section of a given element
 * @param  {!Element} element
 * @return {!Element} section
 */
const getSectionOfElement = (element: Element): Element | null => {
    let current: Element | null = element
    while (current) {
        if (isMediaWikiSectionElement(current)) {
            return current
        }
        current = current.parentElement
    }
    return null
}

/**
 * Get section id of a given element
 * @param  {!Element} element
 * @return {!Element} section
 */
const getSectionIDOfElement = (element: Element): string | null => {
    let section = getSectionOfElement(element)
    return section && section.getAttribute('data-mw-section-id')
}

/**
 * Get lead paragraph text
 * @param  {!Document} document object.
 * @return {!string} lead paragraph text
 */
const getLeadParagraphText = (document: Document): string => {
    let firstParagraphInASection = <HTMLElement>document.querySelector('#content-block-0>p');
    return firstParagraphInASection && firstParagraphInASection.innerText || '';
}


/**
 * @param {!Element} element - element to test
 * @return {boolean} true if this is a element that represents a MediaWiki section
 */
const isMediaWikiSectionElement = (element: Element): boolean => {
    if (!element) {
        return false
    }
    // mobile-html output has `data-mw-section-id` attributes on section tags
    if (element.tagName === 'SECTION' && element.getAttribute('data-mw-section-id')) {
        return true
    }
    return false
}

export default {
    getSectionIDOfElement,
    getLeadParagraphText,
    getSectionOffsets,
    isMediaWikiSectionElement
}