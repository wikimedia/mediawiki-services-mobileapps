'use strict';

/*
 * Extracts page issues from document.
 * This method has side effects - removing page issues from the input.
 * @param {Document} lead
 * @param {Boolean} [removeNodes] when true the hatnotes will be removed from the lead Document
 * @return {undefined|Object[]} of issues or undefined if a page has no issues
 */
function extractPageIssues(doc, removeNodes) {
    var nodesToDelete;
    var issues;
    var nodes = doc.querySelectorAll( '.ambox-multiple_issues table .mbox-text-span' );
    // If no nodes found proceed to look for single page issues.
    nodes = nodes.length ? nodes : doc.querySelectorAll( '.ambox .mbox-text-span' );
    if ( nodes.length ) {
        issues = Array.prototype.map.call( nodes, function ( span ) {
            return {
                text: span.innerHTML
            };
        } );

        // delete all the nodes we found.
        if ( removeNodes ) {
            nodesToDelete = doc.querySelectorAll( '.ambox-multiple_issues,.ambox' );
            Array.prototype.forEach.call( nodesToDelete, function ( node ) {
                node.parentNode.removeChild( node );
            } );
        }
    }
    return issues;
}

module.exports = extractPageIssues;
