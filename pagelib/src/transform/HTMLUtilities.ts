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

export default {
    escape
}