"use strict";

/* eslint-disable max-len */

const assert = require('./../../utils/assert.js');
const summarize = require('./../../../lib/transformations/summarize');

describe('summarize', () => {
    it('matches the spec', () => {
        const testCases = [
            // Should flatten empty nodes
            [
                '<span></span><b></b><i></i><p><span>f</span></p>',
                '<p><span>f</span></p>'
            ],
            // Should flatten links
            [
                'This is some content with <a href="#"">a link</a>.',
                'This is some content with <span>a link</span>.'
            ],
            // Should strip .noexcerpts
            [
                'This summary should be nice and clean<span class="noexcerpts"> (noexcerpts will be omitted)</span>.',
                'This summary should be nice and clean.'
            ],
            // sup elements are retained and links are flattened
            [
                '<p>A <b>googolplex</b> is the number 10<sup>googol</sup>, or equivalently, 10<sup>(10<sup>100</sup>)</sup>.</p>',
                '<p>A <b>googolplex</b> is the number 10<sup>googol</sup>, or equivalently, 10<sup>(10<sup>100</sup>)</sup>.</p>'
            ],
            // references are stripped
            [
                '<p><b>France</b> is a country with territory status in western Europe and several overseas regions and territories.<span class=\"mw-ref\" id=\"cite_ref-twelve_21-0\"><a href=\"#cite_note-twelve-21\" <span class=\"mw-reflink-text\">[upper-roman 13]</span></a></p>',
                '<p><b>France</b> is a country with territory status in western Europe and several overseas regions and territories.</p>'
            ],
            // math tags are stripped but any math images are shown
            [
                '<p>The Planck–Einstein relation connects the particulate photon energy <span class=\"texhtml \"><i>E</i></span> with its associated wave frequency <span class=\"texhtml \"><i>f</i></span>:</p>\n\n<dl id=\"mwmQ\"><dd id=\"mwmg\"><span class=\"mwe-math-element\"><span class=\"mwe-math-mathml-inline mwe-math-mathml-a11y\" style=\"display: none;\"><math xmlns=\"http://www.w3.org/1998/Math/MathML\">\n  <semantics>\n    <mrow class=\"MJX-TeXAtom-ORD\">\n      <mstyle displaystyle=\"true\" scriptlevel=\"0\">\n        <mi>E</mi>\n        <mo>=</mo>\n        <mi>h</mi>\n        <mi>f</mi>\n      </mstyle>\n    </mrow>\n    <annotation encoding=\"application/x-tex\">{\\displaystyle E=hf}</annotation>\n  </semantics>\n</math></span><img src=\"https://wikimedia.org/api/rest_v1/media/math/render/svg/f39fac3593bb1e2dec0282c112c4dff7a99007f6\" class=\"mwe-math-fallback-image-inline\" aria-hidden=\"true\" style=\"vertical-align: -0.671ex; width:7.533ex; height:2.509ex;\"></span></dd></dl>',
                '<p>The Planck–Einstein relation connects the particulate photon energy <span class=\"texhtml \"><i>E</i></span> with its associated wave frequency <span class=\"texhtml \"><i>f</i></span>:</p>\n\n<dl id=\"mwmQ\"><dd id=\"mwmg\"><span class=\"mwe-math-element\"><img src=\"https://wikimedia.org/api/rest_v1/media/math/render/svg/f39fac3593bb1e2dec0282c112c4dff7a99007f6\" class=\"mwe-math-fallback-image-inline\" aria-hidden=\"true\" style=\"vertical-align: -0.671ex; width:7.533ex; height:2.509ex;\"></span></dd></dl>'
            ]
        ];
        testCases.forEach((test) => {
            assert.equal(summarize(test[0]), test[1], test[2]);
        });
    });
});
/* eslint-enable max-len */
