'use strict';

const htmlDebug = require('./html-debug');

// To update the expected test results temporarily set the constant UPDATE_EXPECTED_RESULTS to true.
// After the run consider updating the TestSpec constructors later in this file to paste in the
// revisions and time ids (if any were left out or need to be updated).
const UPDATE_EXPECTED_RESULTS = false;

// If enabled creates HTML files, one for each section covered by the diff tests.
const ENABLE_HTML_DEBUG = false;


/**
 * @protected {!string} _domain
 * @protected {!string} _route
 * @protected {?Array<string>} _parameters
 */
class TestSpec {
    /**
     * @param {!string} domain project domain (e.g. 'en.wikipedia.org')
     * @param {!string} route endpoint specifier
     * @param {?Array<string>} parameters parameter values
     */
    constructor(domain, route, parameters) {
        this._domain = domain;
        this._route = route;
        this._parameters = parameters;
    }

    /**
     * @protected
     * @return {!string} shortened project name (e.g. 'enwiki') based on domain
     */
    project() {
        return this._domain
                   .replace('.wikipedia.org', 'wiki')
                   .replace('.wiktionary.org', 'wiktionary');
    }

    /**
     * @protected
     * Translate a name to a file name.
     * @param {!string} input input string
     * @return {!string}
     */
    static fsName(input) {
        return input.replace(/\//g, '_');
    }

    /**
     * @return {!string} name of this test to print to the console
     */
    testName() {
        // eslint-disable-next-line max-len
        return `${TestSpec.fsName(this._route)}-${TestSpec.fsName(this.project())}-${this._parameters.join('-')}`;
    }

    /**
     * @return {!string} folder to store expected result in
     */
    dir() {
        return `${__dirname}/results/`;
    }


    /**
     * @return {!string} file name to store expected result in (without file extension)
     */
    fileName() {
        return `${encodeURIComponent(this.testName())}`;
    }

    /**
     * @return {!string} file path to store expected result in
     */
    filePath() {
        return `${this.dir()}${this.fileName()}.json`;
    }

    /**
     * @return {!string} path portion of the request URI
     */
    uriPath() {
        let path = `${this._domain}/v1/${this._route}`;
        if (this._parameters) {
            path += `/${this._parameters.join('/')}`;
        }
        return path;
    }

    postProcessing(rsp) {
        return rsp;
    }

    /**
     * @private
     * @param {!string} array input array
     * @return {!string} a string of JS code to make a array of strings
     */
    static toStringArrayCode(array) {
        return `['${array.join('\', \'')}']`;
    }

    /**
     * Prints the constructor for updating scripts
     * @return {string}
     */
    generator() {
        if (this._parameters) {
            // eslint-disable-next-line max-len
            return `    new TestSpec('${this._domain}', '${this._route}', ${TestSpec.toStringArrayCode(this._parameters)}),`;
        } else {
            return `    new TestSpec('${this._domain}', '${this._route}'),`;
        }
    }
}

/**
 * A TestSpec which covers a specific page which has optional revision and time id parameters
 * (powered by Parsoid).
 *
 * @protected {!string} _domain
 * @protected {!string} _route
 * @protected {!string} _title
 * @protected {?string} _revision
 */
class TestPageSpec extends TestSpec {
    /**
     * @param {!string} domain project domain (e.g. 'en.wikipedia.org')
     * @param {!string} route endpoint specifier
     * @param {!string} title human readable page title (unencoded)
     * @param {?string} revision revision of the page when the expectation was saved
     */
    constructor(domain, route, title, revision) {
        super(domain, route, [title, revision]);
        this._title = title;
        this._revision = revision;
    }

    /**
     * @override
     * @return {!string} name of this test to print to the console
     */
    testName() {
        // eslint-disable-next-line max-len
        return `${TestSpec.fsName(this._route)}-${TestSpec.fsName(this.project())}-${TestSpec.fsName(this._title)}`;
    }

    /**
     * @private
     * @return {!string} percent-encoded version of the title string
     */
    encodedTitle() {
        return encodeURIComponent(this._title);
    }

    /**
     * @override
     * @return {!string} path portion of the request URI
     */
    uriPath() {
        let path = `${this._domain}/v1/${this._route}/${this.encodedTitle()}`;
        if (this._revision) {
            path += `/${this._revision}`; // prefer revisions for more stability
        }
        return path;
    }

    postProcessing(rsp) {
        let input = rsp.body;

        input = JSON.parse(JSON.stringify(input).replace(/#mwt\d+/g, '#mwt_present'));

        if (input.lead) { // for mobile-sections and formatted
            // value does not come from wikitext but from Wikidata links
            delete input.lead.languagecount;

            // values not fixed to the given revision (but the latest revision of the page)
            delete input.lead.lastmodified;
            delete input.lead.lastmodifier;

            // to be able to generate a constructor with the revision
            this._revision = input.lead.revision;

            if (input.remaining) {
                input.remaining.sections.forEach((section) => {
                    // Simplify the numbers in:
                    // usemap=\"#ImageMap_1_922168371\"></a>
                    // <map name=\"ImageMap_1_922168371\" id=\"ImageMap_1_922168371\">
                    section.text = section.text.replace(/ImageMap_\d+_\d+/g, 'ImageMap_');
                    // Simplify the revision numbers in:
                    // data-mw-deduplicate=\"TemplateStyles:r856303569\"
                    section.text = section.text.replace(
                        /(data-mw-deduplicate="TemplateStyles:r)\d+(")/g,
                        '$1_REV_$2'
                    );
                });
            }

            if (ENABLE_HTML_DEBUG) {
                htmlDebug.htmlPostProcessing(input, `${this.dir()}/${this.fileName()}/`);
            }
        }

        if (input.tid) {
            input.tid = 'present';
        }

        rsp.body = input;
        return rsp;
    }

    /**
     * @override
     * Prints the constructor for updating scripts
     * @return {string}
     */
    generator() {
        const requiredParams = `'${this._domain}', '${this._route}', '${this._title}'`;
        let optionalParams = '';

        if (this._revision) {
            optionalParams = `, '${this._revision}'`;
        }

        return `    new TestPageSpec(${requiredParams}${optionalParams}),`;
    }
}

/* eslint-disable max-len */
const TEST_SPECS = [
    new TestSpec('en.wikipedia.org', 'page/featured', ['2016', '04', '29']),
    new TestSpec('en.wikipedia.org', 'media/image/featured', ['2016', '04', '29']),
    new TestSpec('en.wikipedia.org', 'page/most-read', ['2016', '01', '01']),

    /* Note: to add a time uuid uncomment a line in parsoid-access.js getRevisionFromEtag() */

    new TestPageSpec('en.wikipedia.org', 'page/mobile-sections', 'User:BSitzmann_(WMF)/MCS/Test/TitleLinkEncoding', '743079682'),
    new TestPageSpec('en.wikipedia.org', 'page/mobile-sections', 'User:BSitzmann_(WMF)/MCS/Test/Frankenstein', '778666613'),

    new TestPageSpec('en.wikipedia.org', 'page/formatted', 'User:BSitzmann_(WMF)/MCS/Test/TitleLinkEncoding', '743079682'),
    new TestPageSpec('en.wikipedia.org', 'page/formatted', 'User:BSitzmann_(WMF)/MCS/Test/Frankenstein', '778666613'),

    new TestPageSpec('en.wikipedia.org', 'page/media', 'Hummingbird', '810247947'),

    new TestPageSpec('www.mediawiki.org', 'page/references', 'Page_Content_Service/References/SimpleReference', '2640831'),
    new TestPageSpec('www.mediawiki.org', 'page/references', 'Page_Content_Service/References/MultipleReflists', '2640615'),
    new TestPageSpec('en.wikipedia.org', 'page/references', 'Neutronium', '857150438'),

    // new TestSpec('en.wiktionary.org', 'page/definition', ['cat']),
];
/* eslint-enable max-len */

module.exports = {
    UPDATE_EXPECTED_RESULTS,
    ENABLE_HTML_DEBUG,
    TEST_SPECS
};

// TODO: Check that we get back from the server the same version as mUtil.CONTENT_TYPES.html
