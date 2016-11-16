/**
 * mobileapp/lite provides page content for a potential lite Mobile App.
 * The goal is to avoid having to use a web view and style the content natively inside the app
 * using plain TextViews.
 * The payload should not have any extra data, and should be easy to consume by the Lite App.
 *
 * Status: Prototype -- not ready for production
 * Currently using the mobileview action MW API, and removing some data we don't display.
 * TODO: Split the "text" objects of each section into paragraph and table objects
 * TODO: add some transformations that currently are being done by the apps and remove some more unneeded data
 */

'use strict';

//var BBPromise = require('bluebird');
const preq = require('preq');
const domino = require('domino');
const sUtil = require('../lib/util');
const mUtil = require('../lib/mobile-util');
const mwapi = require('../lib/mwapi');

// shortcut
const HTTPError = sUtil.HTTPError;


/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;


function rmSelectorAll(doc, selector) {
    const ps = doc.querySelectorAll(selector) || [];
    for (let idx = 0; idx < ps.length; idx++) {
        const node = ps[idx];
        node.parentNode.removeChild(node);
    }
}

function structureThumbnail(thumbDiv) {
    const thumb = {};
    const thumbimg = thumbDiv.querySelector("img");
    if (thumbimg) {
        thumb.src = thumbimg.getAttribute("src");
    }
    const videoDiv = thumbDiv.querySelector("div.PopUpMediaTransform");
    if (videoDiv && thumbimg) {
        thumb.type = "video";
        thumb.name = thumbimg.alt;
    } else {
        thumb.type = "image";
        const alink = thumbDiv.querySelector("a");
        if (alink) {
            thumb.name = alink.href;
        }
    }
    const caption = thumbDiv.querySelector("div.thumbcaption");
    if (caption) {
        thumb.caption = caption.innerHTML;
    }
    return thumb;
}

/**
 * Nuke stuff from the DOM we don't want.
 */
function runDomTransforms(section) {
    const doc = domino.createDocument(section.text);
    rmSelectorAll(doc, 'div.noprint');
    rmSelectorAll(doc, 'div.infobox');
    rmSelectorAll(doc, 'div.metadata');
    rmSelectorAll(doc, 'table'); // TODO: later we may want to transform some of the tables into a JSON structure


    // and break it down into items...
    section.items = [];
    let itemIndex = 0;
    let thumbnails, tid, thumb;

    const hatnotes = doc.querySelectorAll("div.hatnote") || [];
    for (let hid = 0; hid < hatnotes.length; hid++) {
        section.items[itemIndex] = {};
        section.items[itemIndex].type = "hatnote";
        section.items[itemIndex].text = hatnotes[hid].innerHTML;
        itemIndex++;
    }

    const ps = doc.querySelectorAll("p") || [];
    for (let pid = 0; pid < ps.length; pid++) {
        const p = ps[pid];

        if (p.innerHTML.length < 4) {
            continue;
        }

        section.items[itemIndex] = {};
        section.items[itemIndex].type = "p";
        section.items[itemIndex].text = p.innerHTML;
        itemIndex++;

        // find all images in this paragraph, and append them as section items
        thumbnails = p.querySelectorAll("div.thumb") || [];
        for (tid = 0; tid < thumbnails.length; tid++) {
            thumb = thumbnails[tid];
            section.items[itemIndex] = structureThumbnail(thumb);
            itemIndex++;
        }

        // remove other inline images from this paragraph
        rmSelectorAll(p, 'img');
        // and remove this paragraph from the DOM
        p.parentNode.removeChild(p);
    }


    // find all images in this section (outside of paragraphs), and append them as section items
    thumbnails = doc.querySelectorAll("div.thumb") || [];
    for (tid = 0; tid < thumbnails.length; tid++) {
        thumb = thumbnails[tid];
        section.items[itemIndex] = structureThumbnail(thumb);
        itemIndex++;
    }

    delete section.text;
}

/**
 * GET {domain}/v1/page/mobile-text/{title}
 * Gets the lite mobile app version of a given wiki page.
 */
router.get('/mobile-text/:title', function (req, res) {
    return mwapi.getAllSections(app, req)
    // and then return it
    .then(function (apiRes) {
        // transform all sections
        const sections = apiRes.body.mobileview.sections;
        for (let idx = 0; idx < sections.length; idx++) {
            const section = sections[idx];
            // run DOM transforms on the section...
            runDomTransforms(section);
        }

        res.status(200);
        mUtil.setETag(req, res, apiRes.body.mobileview.revision);
        res.json(apiRes.body.mobileview).end();
    });
});

module.exports = function (appObj) {
    app = appObj;
    return {
        path: '/page',
        api_version: 1,
        router: router
    };
};
