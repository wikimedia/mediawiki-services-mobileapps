'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const assert = require('../../utils/assert.js');
const unit = require('../../../lib/summary').testing;

describe('lib:summary', () => {
    describe('buildExtracts', () => {
        let script;

        before(() => {
            const processing = path.join(__dirname, '../../../processing/summary.yaml');
            script = yaml.safeLoad(fs.readFileSync(processing));
        });

        function test(inputString, expected, message) {
            return unit.buildExtracts(inputString, { ns: 0, contentmodel: 'wikitext' }, [ script ])
            .then((result) => {
                assert.deepEqual(result.extract_html, expected, message);
            });
        }
        it('Applies stripUnneededMarkup', () => {
            test('<section data-mw-section-id="0"><p><span><span id="coordinates"><a>Hello</a></span></span></p><p>2</p></section>',
                '<p>2</p>', 'Unneeded markup is stripped.');
        });
        // https://bg.wikipedia.org/api/rest_v1/page/html/%D0%92%D1%82%D0%BE%D1%80%D0%B0_%D1%81%D0%B2%D0%B5%D1%82%D0%BE%D0%B2%D0%BD%D0%B0_%D0%B2%D0%BE%D0%B9%D0%BD%D0%B0/8391615
        it("Don't select scribunto errors.", () => {
            test(
                `<section data-mw-section-id="0"><p><strong><span class="scribunto-error">Грешка в Lua: not enough memory.
</span></strong></p></section>`,
                '');
        });
    });

    describe('getSummaryType', () => {
        it('identifies main page', () => {
            assert.deepEqual(unit.getSummaryType({ mainpage: true }), 'mainpage');
        });
        it('identifies disambig page', () => {
            assert.deepEqual(unit.getSummaryType({ pageprops: { disambiguation: '' } }),
                'disambiguation');
        });
        it('defaults to "standard"', () => {
            assert.deepEqual(unit.getSummaryType({ ns: 0, contentmodel: 'wikitext' }), 'standard');
        });
        it('type for ns > 0 is no-extract', () => {
            assert.deepEqual(unit.getSummaryType({ ns: 1, contentmodel: 'wikitext' }), 'no-extract');
        });
        it('type for non-wikitext content model is no-extract', () => {
            assert.deepEqual(unit.getSummaryType({ ns: 0, contentmodel: 'binary' }), 'no-extract');
        });
        it('type for redirect is no-extract', () => {
            assert.deepEqual(unit.getSummaryType({ ns: 0, contentmodel: 'wikitext', redirect: true }), 'no-extract');
        });
    });
});
