/**
 * mobileapp provides page content for the Mobile Apps.
 * The goal is to avoid having to use a web view and style the content natively inside the app
 * using plain TextViews.
 * The payload should not have any extra data, and should be easy to consume by the apps.
 *
 * Status: Experimental
 * Currently using the mobileview action MW API, and removing some data we don't display.
 * TODO: add more transformations that currently are being done by the apps
 */

'use strict';

const BBPromise = require('bluebird');
const domino = require('domino');
const mwapi = require('../lib/mwapi');
const apiUtil = require('../lib/api-util');
const mUtil = require('../lib/mobile-util');
const parsoid = require('../lib/parsoid-access');
const sUtil = require('../lib/util');
const transforms = require('../lib/transforms');

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

/** Returns a promise to retrieve the page content from MW API mobileview */
function pageContentForMainPagePromise(req) {
    return mwapi.getMainPageData(app, req)
    .then((response) => {
        const page = response.body.mobileview;
        const sections = page.sections;
        let section;

        // transform all sections
        for (let idx = 0; idx < sections.length; idx++) {
            section = sections[idx];
            section.text = transforms.runMainPageDomTransforms(section.text);
        }

        page.sections = sections;
        return page;
    });
}

function buildLeadSections(sections) {
    const len = sections.length;
    const out = [];

    out.push(sections[0]);
    for (let i = 1; i < len; i++) {
        const section = sections[i];
        const item = {
            id: section.id,
            toclevel: section.toclevel,
            anchor: section.anchor,
            line: section.line
        };
        out.push(item);
    }
    return out;
}

/*
 * Build the lead for the requested page.
 * @param {!Object} input
 * @param {?Boolean} [legacy] whether to perform legacy transformations
 * @return {!Object} lead json
 */
function buildLead(input, legacy) {
    const lead = domino.createDocument(input.page.sections[0].text);

    if (legacy) {
        // Move the first good paragraph up for any page except main pages.
        // It's ok to do unconditionally since we throw away the page
        // content if this turns out to be a main page.
        //
        // TODO: should we also exclude file and other special pages?
        transforms.relocateFirstParagraph(lead);
    }
    const hatnotes = transforms.extractHatnotes(lead, !legacy);
    const issues = transforms.extractPageIssues(lead, !legacy);

    let infobox;
    let intro;
    let sections;
    let text;
    let disambiguation;
    let contentmodel;
    if (input.meta.contentmodel !== 'wikitext') {
        contentmodel = input.meta.contentmodel;
    }
    if (input.meta.pageprops && input.meta.pageprops.disambiguation !== undefined) {
        disambiguation = true;
    }

    if (!legacy && !input.meta.mainpage) {
        const stubArticle = input.page.sections.length <= 1;
        if (!stubArticle) {
            infobox = transforms.extractInfobox(lead);
        }
        // We should always extract the introduction as it's useful for
        // things like the summary endpoint
        // however on pages where there is only
        // one section we shouldn't remove it from initial HTML as it may
        // have an undesirable result.
        intro = transforms.extractLeadIntroduction(lead, !stubArticle);
        text = lead.body.innerHTML;
    } else {
        // update text after extractions have taken place
        sections = buildLeadSections(input.page.sections);
        input.page.sections[0].text = lead.body.innerHTML;
    }


    return {
        ns: input.meta.ns,
        contentmodel,
        userinfo: input.meta.userinfo,
        imageinfo: input.meta.imageinfo,
        id: input.meta.id,
        issues,
        revision: input.page.revision,
        lastmodified: input.meta.lastmodified,
        lastmodifier: input.meta.lastmodifier,
        displaytitle: input.meta.displaytitle,
        normalizedtitle: input.meta.normalizedtitle,
        wikibase_item: input.meta.pageprops && input.meta.pageprops.wikibase_item,
        disambiguation,
        description: input.meta.description,
        protection: input.meta.protection,
        editable: input.meta.editable,
        mainpage: input.meta.mainpage,
        languagecount: input.meta.languagecount,
        image: mUtil.defaultVal(mUtil.filterEmpty({
            file: input.meta.image && input.meta.image.file,
            urls: input.meta.thumb && mwapi.buildLeadImageUrls(input.meta.thumb.url)
        })),
        pronunciation: input.page.pronunciation,
        spoken: input.page.spoken,
        hatnotes,
        infobox,
        intro,
        geo: input.meta.geo,
        sections,
        text
    };
}

function buildRemaining(input) {
    // don't repeat the first section in remaining
    const sections = input.page.sections.slice(1);
    // mark references sections with a flag (if no sections its a stub or main page)
    if (sections.length) {
        transforms.markReferenceSections(sections, false);
    }
    return {
        sections
    };
}

/*
 * Build a response which contains only reference sections
 * @param {!Object} input
 * @return {!Object}
 */
function buildReferences(input) {
    const remaining = buildRemaining(input);
    const sections = [];
    remaining.sections.forEach((section) => {
        if (section.isReferenceSection) {
            sections.push(section);
        }
    });
    return {
        sections
    };
}

/*
 * @param {!Object} input
 * @param {?Boolean} [legacy] whether to perform legacy transformations
 * @return {!Object}
 */
function buildAll(input, legacy) {
    return {
        lead: buildLead(input, legacy),
        remaining: buildRemaining(input)
    };
}

/**
 * For main page only, switch to mobileview content because Parsoid doesn't
 * provide a good mobile presentation of main pages.
 */
function mainPageFixPromise(req, response) {
    return pageContentForMainPagePromise(req)
    .then((mainPageContent) => {
        return {
            page: mainPageContent,
            meta: response.meta
        };
    });
}

/**
 * Given a partial response for a user page, it will be hydrated
 * to contain information about the owner of the user page.
 * @param {!Request} req
 * @param {!Response} res
 * @return {!Promise}
 */
function handleUserPagePromise(req, res) {
    return apiUtil.mwApiGet(app, req.params.domain, {
        action: 'query',
        format: 'json',
        formatversion: '2',
        meta: 'globaluserinfo',
        guiuser: req.params.title.split(':')[1]
    })
    .then((resp) => {
        const body = resp.body;
        const meta = res.meta;
        if (body.query && body.query.globaluserinfo) {
            meta.userinfo = body.query.globaluserinfo;
        }
        return {
            page: res.page,
            meta,
            extract: res.extract
        };
    });
}

/**
 * Given a partial response for a file page, it will be hydrated
 * to contain information about the image on the page.
 * @param {!Request} req
 * @param {!Response} res
 * @return {!Promise}
 */
function handleFilePagePromise(req, res) {
    return apiUtil.mwApiGet(app, req.params.domain, {
        action: 'query',
        format: 'json',
        formatversion: '2',
        titles: req.params.title,
        prop: 'imageinfo',
        iiprop: 'url',
        iiurlwidth: mwapi.LEAD_IMAGE_L,
        iirurlheight: mwapi.LEAD_IMAGE_L * 0.75
    })
    .then((resp) => {
        const body = resp.body;
        const meta = res.meta;
        let ii;

        if (body.query && body.query.pages && body.query.pages.length) {
            ii = body.query.pages[0].imageinfo;
            meta.imageinfo = ii ? ii[0] : ii;
        }
        return {
            page: res.page,
            meta,
            extract: res.extract
        };
    });
}

function isSubpage(title) {
    return title.indexOf('/') > -1;
}

/**
 * Handles special cases such as main page and different
 * namespaces, preparing for output.
 * @param {!Request} req
 * @param {!Response} res
 * @return {!Promise}
 */
function _handleNamespaceAndSpecialCases(req, res) {
    const ns = res.meta.ns;
    if (res.meta.mainpage) {
        return mainPageFixPromise(req, res);
    } else if (ns === 2 && !isSubpage(req.params.title)) {
        return handleUserPagePromise(req, res);
    } else if (ns === 6) {
        return handleFilePagePromise(req, res);
    }
    return res;
}

/**
 * Creates a raw object representing a page in preparation
 * for further massaging
 * @param {!Request} req
 * @param {?Boolean} [legacy] when true MCS will
 *  apply legacy transformations that we are in the process
 *  of deprecating.
 * @return {!BBPromise}
 */
function _collectRawPageData(req, legacy) {
    return BBPromise.props({
        page: parsoid.pageJsonPromise(app, req, legacy),
        meta: mwapi.getMetadata(app, req)
    }).then((interimState) => {
        return _handleNamespaceAndSpecialCases(req, interimState);
    });
}

/*
 * @param {!Request} req
 * @param {!Response} res
 * @param {?Boolean} [legacy] when true MCS will
 *  apply legacy transformations that we are in the process
 *  of deprecating.
 * @return {!BBPromise}
 */
function buildAllResponse(req, res, legacy) {
    return _collectRawPageData(req, legacy).then((response) => {
        response = buildAll(response, legacy);
        res.status(200);
        mUtil.setETag(res, response.lead.revision);
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.mobileSections);
        res.json(response).end();
    });
}

/*
 * Builds an object which gives structure to the lead of an article
 * providing access to metadata.
 * @param {!Request} req
 * @param {?Boolean} [legacy] when true MCS will
 *  apply legacy transformations that we are in the process
 *  of deprecating.
 * @return {!BBPromise}
 */
function buildLeadObject(req, legacy) {
    return _collectRawPageData(req, legacy).then((lead) => {
        return buildLead(lead, legacy);
    });
}

/*
 * Responds with the lead content of a page in structured form.
 * @param {!Request} req
 * @param {!Response} res
 * @param {?Boolean} [legacy] when true MCS will
 *  apply legacy transformations that we are in the process
 *  of deprecating.
 * @return {!BBPromise}
 */
function buildLeadResponse(req, res, legacy) {
    return buildLeadObject(req, legacy).then((response) => {
        res.status(200);
        mUtil.setETag(res, response.revision);
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.mobileSections);
        res.json(response).end();
    });
}


/*
 * Build a summary for the page given in req
 * @param {!Request} req
 *  not apply legacy transformations that we are in the process
 *  of deprecating.
 * @return {!BBPromise}
 */
function buildSummary(req) {
    return buildLeadObject(req, false).then((lead) => {
        let summary = {};
        const type = 'standard';
        let code = 200;

        if (!lead) {
            return false;
        } else if (lead.contentmodel || lead.ns !== 0) {
            code = 204;
        } else if (lead.intro) {
            summary = transforms.summarize(lead.intro);
        }
        return Object.assign({
            code,
            type,
            revision: lead.revision
        }, summary);
    });
}

/**
 * GET {domain}/v1/page/mobile-sections/{title}
 * Gets the mobile app version of a given wiki page.
 */
router.get('/mobile-sections/:title/:revision?/:tid?', (req, res) => {
    return buildAllResponse(req, res, true);
});

/**
 * GET {domain}/v1/page/mobile-sections-lead/{title}
 * Gets the lead section for the mobile app version of a given wiki page.
 */
router.get('/mobile-sections-lead/:title/:revision?/:tid?', (req, res) => {
    return buildLeadResponse(req, res, true);
});

/**
 * GET {domain}/v1/page/mobile-sections-remaining/{title}
 * Gets the remaining sections for the mobile app version of a given wiki page.
 */
router.get('/mobile-sections-remaining/:title/:revision?/:tid?', (req, res) => {
    return BBPromise.props({
        page: parsoid.pageJsonPromise(app, req, true)
    }).then((response) => {
        res.status(200);
        mUtil.setETag(res, response.page.revision);
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.mobileSections);
        res.json(buildRemaining(response)).end();
    });
});

/**
 * GET {domain}/v1/page/references/{title}/{revision:?}
 * Gets any sections which are part of a reference sections for a given wiki page.
 */
router.get('/references/:title/:revision?/:tid?', (req, res) => {
    return BBPromise.props({
        page: parsoid.pageJsonPromise(app, req, false)
    }).then((response) => {
        res.status(200);
        mUtil.setETag(res, response.page.revision);
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.mobileSections);
        res.json(buildReferences(response)).end();
    });
});

/**
* GET {domain}/v1/page/summary/{title}/{revision?}/{tid?}
* Extracts a summary of a given wiki page limited to one paragraph of text
*/
router.get('/summary/:title/:revision?/:tid?', (req, res) => {
    return buildSummary(req).then((summary) => {
        if (summary) {
            res.status(summary.code);
            if (summary.code === 200) {
                delete summary.code;
                mUtil.setETag(res, summary.revision);
                mUtil.setContentType(res, mUtil.CONTENT_TYPES.summary);
                res.send(JSON.stringify(summary));
            }
            res.end();
        } else {
            res.status(404);
        }
    });
});

/**
* GET {domain}/v1/page/formatted/{title}/{revision?}
* Gets a formatted version of a given wiki page rather than a blob of wikitext.
*/
router.get('/formatted/:title/:revision?/:tid?', (req, res) => {
    return buildAllResponse(req, res, false);
});

/**
* GET {domain}/v1/page/formatted-lead/{title}/{revision?}
* Gets a formatted version of a given wiki page rather than a blob of wikitext.
*/
router.get('/formatted-lead/:title/:revision?/:tid?', (req, res) => {
    return buildLeadResponse(req, res, false);
});

module.exports = function(appObj) {
    app = appObj;
    return {
        path: '/page',
        api_version: 1,
        router
    };
};
