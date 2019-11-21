'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const assert = require('../../utils/assert.js');
const domino = require('domino');
const preprocessParsoidHtml = require('../../../lib/processing');
const transforms = require('../../../lib/transforms');

describe('lib:transforms', () => {
    const buildHtml = title => domino.createDocument('<html>'
        + '<head>'
        + '<base href="//en.wikipedia.org/wiki/"/>'
        + `<link rel="dc:isVersionOf" href="//en.wikipedia.org/wiki/${encodeURIComponent(title)}">`
        + '</head>'
        + '<body>'
        + '<sup class="mw-ref">'
        + `<a href="${title}#cite_note-foo"><span>[1]</span></a>`
        + '</sup>'
        + '<sup class="mw-ref">'
        + `<a href="${title}#cite_note-foo"><span>[2]</span></a>`
        + '</sup>'
        + '<sup class="mw-ref">'
        + `<a href="anythingElse${title}#cite_note-foo"><span>[2]</span></a>`
        + '</sup>'
        + '</body>'
        + '</html>');

    const buildHtml2 = title => domino.createDocument('<html>'
        + '<head>'
        + '<base href="//en.wikipedia.org/wiki/"/>'
        + `<link rel="dc:isVersionOf" href="//en.wikipedia.org/wiki/${encodeURIComponent(title)}">`
        + '</head>'
        + '<body>'
        + '<sup class="mw-ref">'
        + '<a href="A_&quot;B&quot;_C#cite_note-foo"><span>[1]</span></a>'
        + '</sup>'
        + '<sup class="mw-ref">'
        + '<a href="A_&quot;B&quot;_C#cite_note-foo"><span>[2]</span></a>'
        + '</sup>'
        + '<sup class="mw-ref">'
        + '<a href="anythingElseA_&quot;B&quot;_C#cite_note-foo"><span>[2]</span></a>'
        + '</sup>'
        + '</body>'
        + '</html>');

    const buildHtml3 = title => domino.createDocument('<html>'
        + '<head>'
        + '<base href="//en.wikipedia.org/wiki/"/>'
        + `<link rel="dc:isVersionOf" href="//en.wikipedia.org/wiki/${encodeURIComponent(title)}">`
        + '</head>'
        + '<body>'
        + '<span class="mw-reference-text">'
        + '<a href="./Seven_Years\'_War#cite_note-foo">Fish 2003</a>'
        + '</span>'
        + '<span class="mw-reference-text">'
        + '<a href="./Seven_Years\'_War#cite_note-foo">Fish 2003</a>'
        + '</span>'
        + '</body>'
        + '</html>');

    const testShortenPageInternalLinks = (doc, selectorTitle) => {
        assert.selectorExistsNTimes(doc, `a[href^=${selectorTitle}]`, 2,
            `before: did not find href starting with '${selectorTitle}' in ${doc.innerHTML}`);
        transforms.shortenPageInternalLinks(doc);
        assert.selectorExistsNTimes(doc, 'a[href=#cite_note-foo]', 2,
            `after: did not find href starting with '#cite_note-foo' in ${doc.innerHTML}`);
    };

    it('shortenPageInternalLinks should remove the title in the href', () => {
        const title = 'Test_page';
        testShortenPageInternalLinks(buildHtml(title), title);
    });

    it('shortenPageInternalLinks with single quote and space', () => {
        const title = 'Seven_Years\'_War';
        testShortenPageInternalLinks(buildHtml(title), 'Seven_Years');
    });

    it('shortenPageInternalLinks with colon and single quote', () => {
        const title = 'Wikipedia:Today\'s_featured_article%2FNovember%207,_2016';
        testShortenPageInternalLinks(buildHtml(title), 'Wikipedia:Today');
    });

    it('shortenPageInternalLinks with special chars', () => {
        // https://www.mediawiki.org/wiki/Manual:$wgLegalTitleChars -- except ' and "
        const title = '%!$&()*,\\-.\\/0-9:;=?@A-Z\\\\^_`a-z~\\x80-\\xFF+';
        testShortenPageInternalLinks(buildHtml(title), title);
    });

    it('shortenPageInternalLinks with double quote', () => {
        const title = 'A_"B"_C';
        testShortenPageInternalLinks(buildHtml2(title), 'A_');
    });

    it('shortenPageInternalLinks with single quote and startsWith ./', () => {
        const title = 'Seven_Years\'_War';
        testShortenPageInternalLinks(buildHtml3(title), './Seven_Years');
    });

    // de.wikipedia.org/api/rest_v1/page/html/Niedersachsen/172984059
    describe('summary:preprocessing', () => {

        let script;

        before(() => {
            const processing = path.join(__dirname, '../../../processing/summary.yaml');
            script = yaml.safeLoad(fs.readFileSync(processing));
        });

        function test(input, expected) {
            const doc = domino.createDocument(input);
            return preprocessParsoidHtml(doc, [ script ])
            .then((doc) => {
                assert.deepEqual(doc.body.innerHTML, expected);
            });
        }
        it('removes IPA speaker symbols (de): IPA in figure-inline', () => {
            test(
                '<figure-inline typeof="mw:Transclusion mw:Image" ' +
                'data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{' +
                '&quot;target&quot;:{&quot;wt&quot;:&quot;IPA&quot;,' +
                '&quot;href&quot;:&quot;./Vorlage:IPA&quot;},' +
                '&quot;params&quot;:{&quot;1&quot;:' +
                '{&quot;wt&quot;:&quot;ˈniːdɐzaksn̩&quot;},' +
                '&quot;Tondatei&quot;:{&quot;wt&quot;:&quot;De-Niedersachsen.ogg&quot;}},' +
                '&quot;i&quot;:0}}]}">' +
                '<a href="//upload.wikimedia.org/wikipedia/commons/f/ff/De-Niedersachsen.ogg">' +
                '<img src="Loudspeaker.svg/12px-Loudspeaker.svg.png"></a></figure-inline>',
                '');
        });
        // en.wikipedia.org/api/rest_v1/page/html/London/822677492
        it('removes IPA speaker symbols (en): IPAc-en in span', () => {
            test(
                '<span class="nowrap" typeof="mw:Transclusion" data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;IPAc-en&quot;,&quot;href&quot;:&quot;./Template:IPAc-en&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;ˈ&quot;},&quot;2&quot;:{&quot;wt&quot;:&quot;l&quot;},&quot;3&quot;:{&quot;wt&quot;:&quot;ʌ&quot;},&quot;4&quot;:{&quot;wt&quot;:&quot;n&quot;},&quot;5&quot;:{&quot;wt&quot;:&quot;d&quot;},&quot;6&quot;:{&quot;wt&quot;:&quot;ən&quot;},&quot;audio&quot;:{&quot;wt&quot;:&quot;En-uk-London.ogg&quot;}},&quot;i&quot;:0}}]}" id="mwDQ">[...]</span>',
                '');
        });
        it('removes spans with style display:none', () => {
            test(
                '<p><span class="geo noexcerpt" style="display:none">FOO</span></p>',
                '<p></p>');
        });
    });

    describe('rmMwIdAttributes', () => {
        /* See also:
           https://www.mediawiki.org/wiki/Parsoid/MediaWiki_DOM_spec/Element_IDs#ID_prefixing_/_pattern
           https://phabricator.wikimedia.org/diffusion/GPAR/browse/master/lib/utils/jsutils.js$166
         */
        function test(input, expected) {
            const doc = domino.createDocument(input);
            transforms.rmMwIdAttributes(doc, 'b');
            assert.deepEqual(doc.body.innerHTML, expected);
        }
        it('removes id attribute with -', () => {
            test(
                '<b id="mwa-b"></b>',
                '<b></b>');
        });
        it('removes id attribute with _', () => {
            // _ is covered in the regex by \w
            test(
                '<b id="mwa_b"></b>',
                '<b></b>');
        });
        it('does not remove id attribute with id not starting with mw', () => {
            test(
                '<b id="abc"></b>',
                '<b id="abc"></b>');
        });
        it('does not remove id attribute with id too long', () => {
            test(
                '<b id="mw_too-long"></b>',
                '<b id="mw_too-long"></b>');
        });
    });
});
