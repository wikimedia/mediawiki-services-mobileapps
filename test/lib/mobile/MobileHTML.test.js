'use strict';

const assert = require('../../utils/assert.js');
const MobileHTML = require('../../../lib/mobile/MobileHTML');
const fixtures = require('../../utils/fixtures');
const perf = require('../../utils/performance');
const scripts = fixtures.readProcessingScript('mobile-html');

describe('lib:MobileHTML', () => {
      it('does not block the event loop', () => {
        const doc = fixtures.readIntoDocument('United_States.html');
        const mobileHTMLPromise = MobileHTML.promise(doc, scripts);
        return perf.measure(mobileHTMLPromise, 1000).then(doc => {
          assert.equal(doc.querySelector('section[data-mw-section-id="1"]').firstChild.outerHTML, '<div class="pcs-edit-section-header"><h2 id="Etymology" class="pcs-edit-section-title">Etymology</h2><span class="pcs-edit-section-link-container"><a href="/w/index.php?title=United_States&amp;action=edit&amp;section=1" data-id="1" data-action="edit_section" class="pcs-edit-section-link"></a></span></div>');
        });
      });
});
