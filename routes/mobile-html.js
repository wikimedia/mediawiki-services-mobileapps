/**
 * mobileapp provides facades for Mobile Apps (Android, iOS)
 * Initially, this focuses on page (view) content.
 * The goal is to avoid having to use a web view and style the content natively inside the app
 * using plain TextViews.
 * The payload should not have any extra data, and should be easily consumed by the apps.
 *
 * Status: Prototype -- not ready for production
 * Currently using the mobileview action MW API, and removing some data we don't display.
 * The output is in HTML, with two script blocks embedded for the JSON metadata:
 * one at the beginning for things the app needs for initial display and another
 * one at the end for things that could be used later (gallery).
 * TODO: add some transformations that currently are being done by the apps and remove some more unneeded data
 */

'use strict';

var BBPromise = require('bluebird');
var preq = require('preq');
var domino = require('domino');
var sUtil = require('../lib/util');
var mUtil = require('../lib/mobile-util');
var util = require('util');
var transforms = require('../lib/transforms');
var mwapi = require('../lib/mwapi');
var gallery = require('../lib/gallery');


/**
 * The main router object
 */
var router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
var app;

function dbg(name, obj) {
    if (app.conf.debug) {
        console.log("DEBUG: " + name + ": " + util.inspect(obj));
        //console.log("DEBUG: " + name + ": " + JSON.stringify(obj, null, 2));
        //app.logger.log('debug', name + ": " + JSON.stringify(obj));
    }
}

/**
 * Create HTML for the section heading and edit button.
 * @param section JSON of section
 * @returns {string} HTML doc fragment
 * @see app code sections.js
 */
function buildSectionHeading(section) {
    var document = domino.createDocument();
    var tocLevel = section.toclevel || 0;
    var heading = document.createElement("h" + ( tocLevel + 1 ));
    // TODO: RTL support
    //heading.setAttribute( "dir", window.directionality );
    heading.innerHTML = typeof section.line !== "undefined" ? section.line : "";
    if (section.anchor) {
        heading.id = section.anchor;
    }
    heading.className = "section_heading";
    heading.setAttribute("data-id", section.id);

    var editButton = document.createElement("a");
    editButton.setAttribute("data-id", section.id);
    editButton.setAttribute("data-action", "edit_section");
    editButton.className = "edit_section_button";
    heading.appendChild(editButton);

    return heading.outerHTML;
}

/** For Parsoid payload */
function rmTemplates(doc, names) {
    var nodes = doc.querySelectorAll('[typeof~=mw:Transclusion]');
    var dataMW;
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        dataMW = node.getAttribute('data-mw');
        if (dataMW) {
            var name;
            try {
                name = JSON.parse(dataMW).parts[0].template.target.wt.trim().toLowerCase();
            } catch (e) {}
            if (name && names[name]) {
                // remove siblings if the about matches
                var about = node.getAttribute('about');
                var next = node.nextSibling;
                while (next
                        && ( // Skip over inter-element whitespace
                            next.nodeType === 3 && /^\w+$/.test(next.nodeValue))
                        // same about
                        || next.getAttribute && next.getAttribute('about') === about) {
                    if (next.nodeType !== 3) {
                        node.parentNode.removeChild(next);
                    }
                    next = node.nextSibling;
                }
                // finally, remove the transclusion node itself
                node.parentNode.removeChild(node);
            }
        }
    }
}

/**
 * Embeds a JSON object inside HTML
 * by creating an application/json script tag inside an HTML document.
 * http://stackoverflow.com/questions/7581133/how-can-i-read-a-json-in-the-script-tag-from-javascript
 */
function embedJsScriptInHtml(doc, name, jsonObj) {
    var script = doc.createElement("script");
    script.setAttribute("type", "application/json");
    script.setAttribute("id", name);
    script.innerHTML = JSON.stringify(jsonObj);
    return script;
}

// from Android code: www/js/loader.js
function addStyleLink(doc, head, href) {
    var link = doc.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("type", "text/css");
    link.setAttribute("charset", "UTF-8");
    link.setAttribute("href", href);
    head.appendChild(link);
}

function addToHtmlHead(doc) {
    var head = doc.querySelector("head");

    var script = doc.createElement("script");
    script.setAttribute("src", "/static/bundle.js");
    head.appendChild(script);

    // <meta name="viewport" content="width=device-width, user-scalable=no" />
    var meta = doc.createElement("meta");
    meta.setAttribute("name", "viewport");
    meta.setAttribute("content", "width=device-width, user-scalable=no");
    head.appendChild(meta);

    addStyleLink(doc, head, "/static/styles.css"); // Light mode hard-coded for now
}

/**
 * Compiles the final HTML string output.
 * All sections are combined, plus two JavaScript blocks for the metadata.
 * One at the beginning, and another one at the end of the HTML body.
 * The idea of the two script blocks is to have one at the beginning, which should include
 * whatever is needed to display what's above the fold and some minor, basic metadata.
 * The rest should go to the second block.
 * Right now the two script blocks are split up in a fairly straightforward way
 * to ease coding of this service. Further optimizations are conceivable.
 * The big item is the ToC, which could go to the end as well.
 *
 * @param sections JSON: sections[]
 * @param meta1 JSON: metadata needed first
 * @param meta2 metadata needed later
 * @returns {Document.outerHTML|*|Element.outerHTML|string|exports.outerHTML|outerHTML}
 */
function compileHtml(html, meta1, meta2) {

    var doc = domino.createDocument(html);

    doc.head.innerHTML = '';

    // Strip some content
    transforms.runDomTransforms(doc);

    addToHtmlHead(doc);
    var body = doc.body;


    body.setAttribute("class", "stable");

    doc.head.appendChild(embedJsScriptInHtml(doc, "mw-app-meta1", meta1));

    var contentWrapperDiv = doc.createElement("div");
    contentWrapperDiv.setAttribute("id", "content");
    contentWrapperDiv.setAttribute("class", "content");
    var contentDiv = doc.createElement("div");
    contentDiv.setAttribute("id", "content_block_0");
    contentWrapperDiv.appendChild(contentDiv);

    body.appendChild(contentWrapperDiv);

    while (body.children.length > 1) {
        contentDiv.appendChild(body.children[0]);
    }


    // TODO: probably not needed anymore
    var loadingSectionsDiv = doc.createElement("div");
    loadingSectionsDiv.setAttribute("id", "loading_sections");
    body.appendChild(loadingSectionsDiv);

    body.appendChild(embedJsScriptInHtml(doc, "mw-app-meta2", meta2));

    return doc.outerHTML;
}

function buildToCJSON(sections) {
    var toc = [];
    for (var idx = 0; idx < sections.length; idx++) {
        var section = sections[idx];
        toc.push({
            id: section.id,
            toclevel: section.toclevel,
            line: section.line,
            anchor: section.anchor
        });
    }
    return toc;
}

function buildPageContentJSON(orig) {
    return {
        lastmodified: orig.lastmodified,
        id: orig.id,
        revision: orig.revision,
        displaytitle: orig.displaytitle,
        description: orig.description,
        image: orig.image,
        thumb: orig.thumb,
        protection: orig.protection,
        editable: orig.editable,
        toc: buildToCJSON(orig.sections)
    };
}

/** Returns a promise to retrieve the page content from MW API mobileview */
function pageContentPromise(logger, domain, title) {
    return mwapi.getAllSections(logger, domain, title)
    .then(function (response) {
        //// transform all sections
        //var sections = response.body.mobileview.sections;
        //for (var idx = 0; idx < sections.length; idx++) {
        //    var section = sections[idx];
        //    var html = buildSectionHeading(section) + buildContentDiv(section.text, idx);
        //    section.text = html;
        //}

        //if (!response.body.mobileview.mainpage) {
        //    // don't do anything if this is the main page, since many wikis
        //    // arrange the main page in a series of tables.
        //    // TODO: should we also exclude file and other special pages?
        //    sections[0].text = transforms.moveFirstParagraphUpInLeadSection(sections[0].text);
        //}

        return {
            json: buildPageContentJSON(response.body.mobileview)
        };
    });
}

/**
 * GET {domain}/v1/page/mobile-html/{title}
 * Gets the mobile app version of a given wiki page.
 */
router.get('/mobile-html/:title', function (req, res) {
    //dbg("req.params", req.params);
    return BBPromise.props({
        html: preq.get({
            uri: app.conf.restbase_uri + '/' + req.params.domain.replace(/^(\w+\.)m\./, '$1')
            + '/v1/page/html/' + encodeURIComponent(req.params.title),
        }),
        page: pageContentPromise(req.logger, req.params.domain, req.params.title),
        media: gallery.collectionPromise(req.logger, req.params.domain, req.params.title)
    }).then(function (response) {
        var html = compileHtml(response.html.body, response.page.json, response.media);
        res.status(200);
        mUtil.setETag(res, response.page.json.revision);
        res.type('html').end(html);
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

