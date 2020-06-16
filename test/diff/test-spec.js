'use strict';

const htmlDebug = require('./html-debug');
const beautifyHtml = require('js-beautify').html;

// To update the expected test results temporarily set the constant UPDATE_EXPECTED_RESULTS to true.
// After the run consider updating the TestSpec constructors later in this file to paste in the
// revisions and time ids (if any were left out or need to be updated).
const UPDATE_EXPECTED_RESULTS = process.env.DIFF_UPDATE;

// If enabled creates HTML files, one for each section covered by the diff tests.
const ENABLE_HTML_DEBUG = false;

/**
 * @protected {!string} _domain
 * @protected {!string} _route
 * @protected {?Array<string>} _parameters
 * @protected {?object} _options
 */
class TestSpec {
    /**
     * @param {!string} domain project domain (e.g. 'en.wikipedia.org')
     * @param {!string} route endpoint specifier
     * @param {?Array<string>} parameters parameter values
     * @param {?object} options an optional object for additional settings:
     * @param {?string} options.suffix file suffix, default = 'json'
     * @param {?string} options.method HTTP method, default = 'GET'
     * @param {?string} options.payloadFile file path to load a fixture for a POST request body
     * @param {?object} options.headers map of HTTP headers
     */
    constructor(domain, route, parameters, options) {
        this._domain = domain;
        this._route = route;
        this._parameters = parameters;
        this._options = options || {};
        this._options.suffix = this._options.suffix || 'json';
        this._options.method = this._options.method || 'GET';
        this._options.headers = this._options.headers || { 'cache-control': 'no-cache' };
        if (!this._options.headers['cache-control']) {
            this._options.headers['cache-control'] = 'no-cache';
        }
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
        return TestSpec.fsName(`${this._route}-${this.project()}-${this._parameters.join('-')}`);
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
        return encodeURIComponent(this.testName());
    }

    /**
     * @return {!string} file path to store expected result in
     */
    filePath() {
        return `${this.dir()}${this.fileName()}.${this._options.suffix}`;
    }

    /**
     * @return {!string} HTTP method ('GET' or 'POST')
     */
    getHttpMethod() {
        return this._options.method;
    }

    /**
     * @return {!object} map of header key value pairs
     */
    getHeaders() {
        return this._options.headers;
    }

    /**
     * @return {!string} file to load to use as body for POST requests
     */
    getPayloadFile() {
        return this._options.payloadFile;
    }

    /**
     * @return {!string} path portion of the request URI
     */
    uriPath() {
        let path = `${this._domain}/v1/${this._route}`;
        if (this._parameters) {
            for (const param of this._parameters) {
                path += `/${encodeURIComponent(param)}`;
            }
        }
        return path;
    }

    introduceFixedValuesForJSON(input) {
        input = JSON.parse(
            JSON.stringify(input)
            .replace(/#mwt\d+/g, '#mwt_present')
            .replace(/id=\\"mw[\w-]{2,3}\\"/g, 'id=\\"mw_id\\"')
        );

        if (input.lead) {
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
                    section.text = section.text.replace(/ImageMap_\w+/g, 'ImageMap_');
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

        return input;
    }

    introduceFixedValuesForHTML(input) {
        input = input
            .replace(/#mwt\d+/g, '#mwt_present')
            .replace(/id=\\"mw[\w-]{2,3}\\"/g, 'id=\\"mw_id\\"');

        input = input
            // Simplify the numbers in:
            // usemap=\"#ImageMap_1_922168371\"></a>
            // <map name=\"ImageMap_1_922168371\" id=\"ImageMap_1_922168371\">
            .replace(/ImageMap_\w+/g, 'ImageMap_')
            // Simplify the revision numbers in:
            // data-mw-deduplicate=\"TemplateStyles:r856303569\"
            .replace(
                /(data-mw-deduplicate="TemplateStyles:r)\d+(")/g,
                '$1_REV_$2'
            );

        // Simplify <meta property="mw:TimeUuid" content="34d12950-ada6-11e9-84ef-7ddcc0b63515">
        input = input
            .replace(
                /<meta property="mw:TimeUuid" content="[-0-9a-f]+"/,
                '<meta property="mw:TimeUuid" content="FIXED_TIME_UUID"'
            );

        input = beautifyHtml(input, { indent_size: 2, html: { end_with_newline: true } });

        return input;
    }

    postProcessing(rsp) {
        if (this._options.suffix === 'json') {
            let input = rsp.body;
            input = this.introduceFixedValuesForJSON(input);
            rsp.body = JSON.stringify(input, null, 2);
        } else if (this._options.suffix === 'html') {
            let input = rsp.body;
            input = this.introduceFixedValuesForHTML(input);
            rsp.body = input;
        }
        return rsp;
    }

    /**
     * @private
     * @param {!string} array input array
     * @return {!string} a string of JS code to make a array of strings
     */
    static toStringArrayCode(array) {
        return `['${array.join("', '")}']`;
    }

    /**
     * Prints the constructor for updating scripts
     * @return {string}
     */
    generator() {
        if (this._parameters) {
            return `    new TestSpec('${this._domain}', '${this._route}', ${TestSpec.toStringArrayCode(this._parameters)}),`;
        } else {
            return `    new TestSpec('${this._domain}', '${this._route}'),`;
        }
    }
}

const TEST_SPECS = [
    new TestSpec('meta.wikimedia.org', 'data/javascript/mobile', ['pagelib'], { suffix: 'js' }),
    new TestSpec('meta.wikimedia.org', 'data/css/mobile', ['pagelib'], { suffix: 'css' }),
    new TestSpec('en.wikipedia.org', 'data/css/mobile', ['site'], { suffix: 'css' }),

    new TestSpec('en.wikipedia.org', 'page/mobile-sections', ['User:BSitzmann_(WMF)/MCS/Test/TitleLinkEncoding', '743079682']),
    new TestSpec('en.wikipedia.org', 'page/mobile-sections', ['User:BSitzmann_(WMF)/MCS/Test/Frankenstein', '778666613']),

    new TestSpec('en.wikipedia.org', 'page/mobile-html', ['User:BSitzmann_(WMF)/MCS/Test/TitleLinkEncoding', '743079682'], { suffix: 'html' }),
    new TestSpec('en.wikipedia.org', 'page/mobile-html', ['User:BSitzmann_(WMF)/MCS/Test/Frankenstein', '778666613'], { suffix: 'html' }),
    new TestSpec('en.wikipedia.org', 'transform/html/to/mobile-html', ['Dog'], { suffix: 'html', method: 'POST', headers: { 'Content-Type': 'text/html' }, payloadFile: 'test/fixtures/Dog.html' }),
    // zh-TW is the first relevant language variant in this list of accepted languages
    new TestSpec('zh.wikipedia.org', 'page/mobile-html', ['天囷增十五', '44944947'], { suffix: 'html', headers: { 'accept-language': 'en-US,en;q=0.9,zh-TW;q=0.8,zh;q=0.7' } }),

    new TestSpec('en.wikipedia.org', 'page/media-list', ['Hummingbird', '810247947']),

    new TestSpec('en.wiktionary.org', 'page/definition', ['cat', '50657469']),

    new TestSpec('en.wikipedia.org', 'page/summary', ['Tokyo', '871928272']),

    new TestSpec('en.wikipedia.org', 'page/talk', ['User_talk:Brion_VIBBER', '895522398']),
    new TestSpec('en.wikipedia.org', 'page/talk', ['User_talk:Montehurd', '899425787']),
    new TestSpec('fr.wikipedia.org', 'page/talk', ['User_talk:Brion_VIBBER', '51609364'])
];
/* eslint-enable max-len */

module.exports = {
    UPDATE_EXPECTED_RESULTS,
    ENABLE_HTML_DEBUG,
    TEST_SPECS
};

// TODO: Check that we get back from the server the same version as mUtil.CONTENT_TYPES.html
