import {ARIA} from  './HTMLUtilities'

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

const CLASS = {
    CONTROL: {
        BASE: 'pcs-section-control',
        SHOW: 'pcs-section-control-show',
        HIDE: 'pcs-section-control-hide'
    },
    SECTION: {
        HIDE: 'pcs-section-hidden'
    },
    HEADER: {
        HIDEABLE: 'pcs-section-hideable-header'
    }
}

const ID = {
    PREFIX: {
        CONTENT: 'pcs-section-content-',
        CONTROL: 'pcs-section-control-'
    },
    ARIA_COLLAPSE: 'pcs-section-aria-collapse',
    ARIA_EXPAND: 'pcs-section-aria-expand'
}

const getControlIdForSectionId = (sectionId: string): string => {
    return ID.PREFIX.CONTROL + sectionId
}

const getContentIdForSectionId = (sectionId: string): string => {
    return ID.PREFIX.CONTENT + sectionId
}
/**
 * @param {!Document} document - document for the control
 * @param {!string} sectionId - sectionId for the control
 * @return {Element} the control element
 */
const getControl = (document: Document, sectionId: string): Element => {
    const control: Element = document.createElement('span')
    control.id = getControlIdForSectionId(sectionId)
    control.classList.add(CLASS.CONTROL.BASE)
    control.classList.add(CLASS.CONTROL.SHOW)
    return control
}

const prepareForHiding = (document: Document, sectionId: string, section: Element, headerWrapper: Element, header: Element, expandText: string, collapseText: string) => {
    const control: Element = getControl(document, sectionId)

    if (document.getElementById(ID.ARIA_EXPAND) === null) {
        const ariaDescriptionExpand = document.createElement('span')
        ariaDescriptionExpand.setAttribute('id', ID.ARIA_EXPAND)
        ariaDescriptionExpand.setAttribute(ARIA.LABEL, expandText)
        control.appendChild(ariaDescriptionExpand)
    }

    if (document.getElementById(ID.ARIA_COLLAPSE) === null) {
        const ariaDescriptionCollapse = document.createElement('span')
        ariaDescriptionCollapse.setAttribute('id', ID.ARIA_COLLAPSE)
        ariaDescriptionCollapse.setAttribute(ARIA.LABEL, collapseText)
        control.appendChild(ariaDescriptionCollapse)
    }
    control.setAttribute('role', 'button')
    control.setAttribute(ARIA.LABELED_BY, ID.ARIA_EXPAND)

    if (headerWrapper && control) {
        headerWrapper.appendChild(control)
        headerWrapper.classList.add(CLASS.HEADER.HIDEABLE)
        headerWrapper.setAttribute('onclick', `pcs.c1.Sections.setHidden('${sectionId}', false);`)
    }
    let el = section.firstElementChild
    const div = document.createElement('div')
    while (el) {
        const toRemove = el
        el = el.nextElementSibling
        if (toRemove === header) {
            continue;
        }
        section.removeChild(toRemove)
        div.appendChild(toRemove)
    }
    div.id = getContentIdForSectionId(sectionId)
    div.classList.add(CLASS.SECTION.HIDE)
    section.appendChild(div)
}

const setHidden = (document: Document, sectionId: string, hidden: boolean = true) => {
    const controlId: string = getControlIdForSectionId(sectionId)
    const contentId: string = getContentIdForSectionId(sectionId)
    const control = document.getElementById(controlId)
    const content = document.getElementById(contentId)
    if (!control || !content) {
        return
    }
    if (hidden) {
        control.classList.remove(CLASS.CONTROL.HIDE)
        control.classList.add(CLASS.CONTROL.SHOW)
        content.classList.add(CLASS.SECTION.HIDE)
        control.setAttribute(ARIA.LABELED_BY, ID.ARIA_EXPAND)
    } else {
        control.classList.remove(CLASS.CONTROL.SHOW)
        control.classList.add(CLASS.CONTROL.HIDE)
        content.classList.remove(CLASS.SECTION.HIDE)
        control.setAttribute(ARIA.LABELED_BY, ID.ARIA_COLLAPSE)
    }
    const header = control.parentElement
    if (!header) {
        return
    }
    header.setAttribute('onclick', `pcs.c1.Sections.setHidden('${sectionId}', ${!hidden});`)
}

const getTopLevelSectionIdForElement = (element: Element): string | undefined => {
    let parent: Element | null = element
    while ((parent = parent.parentElement)) {
        if (parent.tagName !== 'SECTION') {
            continue
        }
        if (!parent.parentElement || parent.parentElement.id !== 'pcs') {
            continue
        }
        const sectionId = parent.getAttribute('data-mw-section-id')
        if (!sectionId) {
            continue
        }
        return sectionId
    }
    return
}

const expandCollapsedSectionIfItContainsElement = (document: Document, element: Element) => {
    const sectionId = getTopLevelSectionIdForElement(element)
    if (!sectionId) {
        return
    }
    setHidden(document, sectionId, false)
}

// Adds a HR before the indicated section
// Used to separate article content from collapsed sections
const createFoldHR = (document: Document, section: Element) => {
    if (!section.parentElement) {
        return
    }
    const hr: Element = document.createElement('hr')
    hr.classList.add('pcs-fold-hr')
    section.parentElement.insertBefore(hr, section);
}


export default {
    createFoldHR,
    expandCollapsedSectionIfItContainsElement,
    getSectionIDOfElement,
    getLeadParagraphText,
    getSectionOffsets,
    prepareForHiding,
    setHidden,
    getControlIdForSectionId,
    isMediaWikiSectionElement
}