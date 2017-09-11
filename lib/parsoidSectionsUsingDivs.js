'use strict';

/*
  This is an old way of doing sectioning, which is preserved only for the definitions endpoint.
  TODO: We should move the definition parsing implementation to the new way
  (parsoidSectionsUsingSectionTags.js) soon since when Parsoid deploys adding <section> tags the
  definitions code may be negatively affected by that.
*/

function parseNextSection(sectionDiv, startingNode) {
    let nextNode;
    const nextSection = {};
    let node = startingNode;

    while (node) {
        if (!(/^H[2-6]$/.test(node.tagName))) {
            nextNode = node.nextSibling;
            sectionDiv.appendChild(node);
            node = nextNode;
            continue;
        } else {
            nextSection.toclevel = parseInt(node.tagName.charAt(1), 10) - 1;
            nextSection.line = node.innerHTML.trim();
            nextSection.anchor = node.id;
            node = node.nextSibling;
            break;
        }
    }
    return { sectionDiv, nextNode: node, nextSection };
}

/**
 * Old sectioning code: wraps wiki sections in <div> elements.
 * Just kept for the definitions endpoint.
 * @param {!document} doc the parsed DOM Document of the Parsoid output
 */
function addSectionDivs(doc) {
    let i = 0;
    let output;
    let sectionDiv;
    const node = doc.body.firstChild;

    sectionDiv = doc.createElement('div');
    sectionDiv.id = `section_${i}`;
    sectionDiv.className = 'toclevel_1';
    output = parseNextSection(sectionDiv, node);
    i++;

    if (output.nextNode) {
        doc.body.insertBefore(output.sectionDiv, output.nextNode);
    } else {
        doc.body.appendChild(output.sectionDiv);
    }

    while (output.nextNode) {
        const section = output.nextSection;
        sectionDiv = doc.createElement('div');
        sectionDiv.id = `section_${i}`;
        sectionDiv.className = `toclevel_${section.toclevel}`;
        sectionDiv.title = section.line;
        sectionDiv.setAttribute('data-anchor', section.anchor);
        output = parseNextSection(sectionDiv, output.nextNode);
        if (output.nextNode) {
            doc.body.insertBefore(output.sectionDiv, output.nextNode);
        } else {
            doc.body.appendChild(output.sectionDiv);
        }
        i++;
    }
}

/**
 * @param {!document} doc the parsed DOM Document of the Parsoid output
 * @return {!sections[]} an array of section JSON elements
 */
function getSectionsText(doc) {
    const sections = [];
    const sectionDivs = doc.querySelectorAll('div[id^=section]');

    for (let i = 0; i < sectionDivs.length; i++) {
        const currentSection = {};
        const currentSectionDiv = sectionDivs[i];
        currentSection.id = i;
        currentSection.text = currentSectionDiv.innerHTML;

        if (i !== 0) {
            const className = currentSectionDiv.className;
            currentSection.toclevel = parseInt(className.substring('toclevel_'.length), 10);
            currentSection.line = currentSectionDiv.title;
            currentSection.anchor = currentSectionDiv.getAttribute('data-anchor');
        }

        sections.push(currentSection);
    }

    return sections;
}

module.exports = {
    addSectionDivs,
    getSectionsText
};
