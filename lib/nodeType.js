'use strict';

// Node type constants
// https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType

module.exports = {
    ELEMENT_NODE                :  1,
    // ATTRIBUTE_NODE              :  2, // deprecated
    TEXT_NODE                   :  3,
    // CDATA_SECTION_NODE          :  4, // deprecated
    // ENTITY_REFERENCE_NODE       :  5, // deprecated
    // ENTITY_NODE                 :  6, // deprecated
    PROCESSING_INSTRUCTION_NODE :  7,
    COMMENT_NODE                :  8,
    DOCUMENT_NODE               :  9,
    DOCUMENT_TYPE_NODE          : 10,
    DOCUMENT_FRAGMENT_NODE      : 11,
    // NOTATION_NODE               : 12  // deprecated
};
