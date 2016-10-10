/**
 * DOM transformation shared with app. Let's keep this in sync with the app.
 * Last sync: Android repo 3d5b441 www/js/transforms/relocateFirstParagraph.js
 *
 * The main changes from the original Android app file are:
 * 1) Checking for heading tags since now we're dealing not just with the first
 *    section but the whole page content.
 * 2) No need to check for is main page since that is now done before this
 *    function is called.
 * 3) We cannot use the trick using element height to skip P tags because
 *    on the server we don't know the pixel height of an element.
 * 4) Use content.createElement() instead of document.createElement()
 * 5) On the service side we don't have #content_block_0 yet. That element
 *    gets created by the app when it pulls in the content over the JS bridge.
 */

'use strict';

function findFirstGoodParagraphIn( nodes ) {
    var minLength = 40;
    var firstGoodParagraphIndex;
    var i;

    for ( i = 0; i < nodes.length; i++ ) {
        if ( nodes[i].tagName && nodes[i].tagName.indexOf('H') === 0 ) {
            // Don't go past the first heading tag (since that would be the next section)
            break;

        } else if (nodes[i].tagName === 'P' ) {
            // Ensure the P being pulled up has at least a couple lines of text.
            // Otherwise silly things like a empty P or P which only contains a
            // BR tag will get pulled up (see articles on "Chemical Reaction" and
            // "Hawaii").
            // We cannot use the trick using element height because on the server
            // we don't know the pixel height of an element.
            if ( nodes[i].textContent.length < minLength ) {
                nodes[i].className = 'skipped';
                continue;
            }
            firstGoodParagraphIndex = i;
            break;
        }
    }

    return firstGoodParagraphIndex;
}

function addNode( span, node ) {
    span.appendChild( node.parentNode.removeChild( node ) );
}

function addTrailingNodes( span, nodes, startIndex ) {
    for ( var i = startIndex; i < nodes.length; i++ ) {
        if ( nodes[i].tagName === 'P' ) {
            break;
        }
        addNode( span, nodes[i] );
    }
}

// Create a lead span to be moved to the top of the page, consisting of the first
// qualifying <p> element encountered and any subsequent non-<p> elements until
// the next <p> is encountered.
//
// Simply moving the first <p> element up may result in elements appearing
// between the first paragraph as designated by <p></p> tags and other elements
// (such as an unnumbered list) that may also be intended as part of the first
// display paragraph.  See T111958.
function createLeadSpan( doc, childNodes ) {
    var leadSpan = doc.createElement( 'span' );
    var firstGoodParagraphIndex = findFirstGoodParagraphIn( childNodes );
    if ( firstGoodParagraphIndex ) {
        addNode( leadSpan, childNodes[ firstGoodParagraphIndex ] );
        addTrailingNodes(leadSpan, childNodes, firstGoodParagraphIndex + 1 );
    }

    return leadSpan;
}

/**
 * Move the first non-empty paragraph (and related elements) of the lead section
 * to the top of the lead section.
 * This will have the effect of shifting the infobox and/or any images at the top of the page
 * below the first paragraph, allowing the user to start reading the page right away.
 * @param {Document} lead a document that has the lead section as the body
 */
function moveFirstGoodParagraphUp(lead) {
    var leadSection = lead.body;
    if ( !leadSection ) {
        return;
    }

    var childNodes = leadSection.childNodes;
    if ( !childNodes ) {
        return;
    }

    var leadSpan = createLeadSpan( lead, childNodes );
    leadSection.insertBefore( leadSpan, leadSection.firstChild );
}

module.exports = moveFirstGoodParagraphUp;
