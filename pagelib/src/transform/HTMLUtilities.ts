/**
 * @module pagelib/src/transform/HTMLUtilities
 */

export const ARIA = {
    LABEL: 'aria-label',
    LABELED_BY: 'aria-labelledby'
}

const escapeCallback = (s: string): string => {
    switch (s) {
        case '\'':
            return '&#039;'
        case '"':
            return '&quot;'
        case '<':
            return '&lt;'
        case '>':
            return '&gt;'
        case '&':
            return '&amp;'
        default:
            return ''
    }
}

const escape = (input: string): string => {
    return input && input.replace( /['"<>&]/g, escapeCallback )
}

const encodeUnsafeId = (id: string): string => {
    const encodeChar = (c: string): string => (c === "'" ? '%27' : encodeURIComponent(c));
    return id.replace(/['\\%\n\r\u2028\u2029]/g, encodeChar);
}

export default {
    escape,
    encodeUnsafeId
}
