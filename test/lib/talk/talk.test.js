'use strict';

const assert = require('../../utils/assert.js');
const TalkPage = require('../../../lib/talk/TalkPage');
const domino = require('domino');
const fixtures = require('../../utils/fixtures');
const perf = require('../../utils/performance');
const P = require('bluebird');

describe('lib:talk', () => {
    describe('parseUserTalkPageDocIntoTopicsWithReplies', () => {
      it('two h2 topics return first topic ID 1', () => {
        const doc = domino.createDocument(`
          <section data-mw-section-id="0" id="mwAQ"></section>
          <section data-mw-section-id="1" id="mwAg">
            <h2 id="new_topic">new topic</h2>
            <p id="mwAw">
              Test <a rel="mw:WikiLink" href="./User:TSevener_(WMF)" title="User:TSevener (WMF)" id="mwBA">TSevener (WMF)</a> (<a rel="mw:WikiLink" href="./User_talk:TSevener_(WMF)" title="User talk:TSevener (WMF)" id="mwBQ">talk</a>) 16:09, 17 June 2019 (UTC)
            </p>
          </section>
          <section data-mw-section-id="2" id="mwBg">
            <h2 id="new_topic_2">new topic 2</h2>
              <p id="mwBw">
                Test <a rel="mw:WikiLink" href="./User:TSevener_(WMF)" title="User:TSevener (WMF)" id="mwCA">TSevener (WMF)</a> (<a rel="mw:WikiLink" href="./User_talk:TSevener_(WMF)" title="User talk:TSevener (WMF)" id="mwCQ">talk</a>) 16:09, 17 June 2019 (UTC)
              </p>
            </section>
        `);
        const topics = new TalkPage(doc, 'en').topics;
        assert.equal(topics.length, 2);
        assert.equal(topics[0].id, 1);
        assert.equal(topics[0].html, 'new topic');
        assert.equal(topics[0].replies.length, 1);
        assert.equal(topics[1].id, 2);
        assert.equal(topics[1].html, 'new topic 2');
        assert.equal(topics[1].replies.length, 1);
      });
      it('text before first h2 returns separate topic ID 0', () => {
        const doc = domino.createDocument(`
          <section data-mw-section-id="0" id="mwAQ">
            <p id="mwAg">Hello</p>
          </section>
          <section data-mw-section-id="1" id="mwAg">
            <h2 id="new_topic">new topic</h2>
            <p id="mwAw">
              Test <a rel="mw:WikiLink" href="./User:TSevener_(WMF)" title="User:TSevener (WMF)" id="mwBA">TSevener (WMF)</a> (<a rel="mw:WikiLink" href="./User_talk:TSevener_(WMF)" title="User talk:TSevener (WMF)" id="mwBQ">talk</a>) 16:09, 17 June 2019 (UTC)
            </p>
          </section>
          <section data-mw-section-id="2" id="mwBg">
            <h2 id="new_topic_2">new topic 2</h2>
            <p id="mwBw">
              Test <a rel="mw:WikiLink" href="./User:TSevener_(WMF)" title="User:TSevener (WMF)" id="mwCA">TSevener (WMF)</a> (<a rel="mw:WikiLink" href="./User_talk:TSevener_(WMF)" title="User talk:TSevener (WMF)" id="mwCQ">talk</a>) 16:09, 17 June 2019 (UTC)
            </p>
          </section>
        `);
        const topics = new TalkPage(doc, 'en').topics;
        assert.equal(topics.length, 3);
        assert.equal(topics[0].id, 0);
        assert.equal(topics[0].html, '');
        assert.equal(topics[0].replies.length, 1);
        assert.equal(topics[0].replies[0].html, 'Hello');
        assert.equal(topics[1].id, 1);
        assert.equal(topics[1].html, 'new topic');
        assert.equal(topics[1].replies.length, 1);
        assert.equal(topics[2].id, 2);
        assert.equal(topics[2].html, 'new topic 2');
        assert.equal(topics[2].replies.length, 1);
      });
      it('h3 section is given it\'s own topic', () => {
        const doc = domino.createDocument(`
          <section data-mw-section-id="0" id="mwAQ">
            <p id="mwAg">Hello</p>
          </section>
          <section data-mw-section-id="1" id="mwAg">
            <h2 id="new_topic">new topic</h2>
            <p id="mwAw">
              Test <a rel="mw:WikiLink" href="./User:TSevener_(WMF)" title="User:TSevener (WMF)" id="mwBA">TSevener (WMF)</a> (<a rel="mw:WikiLink" href="./User_talk:TSevener_(WMF)" title="User talk:TSevener (WMF)" id="mwBQ">talk</a>) 16:09, 17 June 2019 (UTC)
            </p>
            <section data-mw-section-id="2" id="mwBw">
              <h3 id="Subtopic_test">Subtopic test</h3>
              <p id="mwCA">
                Testing subtopic here
                <a rel="mw:WikiLink" href="./User:TSevener_(WMF)" title="User:TSevener (WMF)" id="mwCQ">TSevener (WMF)</a> (<a rel="mw:WikiLink" href="./User_talk:TSevener_(WMF)" title="User talk:TSevener (WMF)" id="mwCg">talk</a>) 16:09, 17 June 2019 (UTC)
              </p>
              </section>
          </section>
          <section data-mw-section-id="3" id="mwBg">
            <h2 id="new_topic_2">new topic 2</h2>
            <p id="mwBw">
              Test <a rel="mw:WikiLink" href="./User:TSevener_(WMF)" title="User:TSevener (WMF)" id="mwCA">TSevener (WMF)</a> (<a rel="mw:WikiLink" href="./User_talk:TSevener_(WMF)" title="User talk:TSevener (WMF)" id="mwCQ">talk</a>) 16:09, 17 June 2019 (UTC)
            </p>
          </section>
        `);
        const topics = new TalkPage(doc, 'en').topics;
        assert.equal(topics.length, 4);
        assert.equal(topics[0].id, 0);
        assert.equal(topics[0].html, '');
        assert.equal(topics[0].replies.length, 1);
        assert.equal(topics[0].replies[0].html, 'Hello');
        assert.equal(topics[1].id, 1);
        assert.equal(topics[1].html, 'new topic');
        assert.equal(topics[1].replies.length, 1);
        assert.equal(topics[2].id, 2);
        assert.equal(topics[2].html, 'Subtopic test');
        assert.equal(topics[2].replies.length, 1);
        assert.equal(topics[3].id, 3);
        assert.equal(topics[3].html, 'new topic 2');
        assert.equal(topics[3].replies.length, 1);
      });
      it('empty h2 with title returns separate topic', () => {
        const doc = domino.createDocument(`
          <section data-mw-section-id="0" id="mwAQ">
            <p id="mwAg">Hello</p>
          </section>
          <section data-mw-section-id="1" id="mwAw">
            <h2 id="new_topic">new topic</h2>
            <p id="mwBA">
              Test <a rel="mw:WikiLink" href="./User:TSevener_(WMF)" title="User:TSevener (WMF)" id="mwBQ">TSevener (WMF)</a> (<a rel="mw:WikiLink" href="./User_talk:TSevener_(WMF)" title="User talk:TSevener (WMF)" id="mwBg">talk</a>) 16:09, 17 June 2019 (UTC)
            </p>
          </section>
          <section data-mw-section-id="2" id="mwBw">
            <h2 id="No_replies_topic">No replies topic</h2>
          </section>
          <section data-mw-section-id="3" id="mwCg">
            <h2 id="new_topic_2">new topic 2</h2>
            <p id="mwCw">
              Test <a rel="mw:WikiLink" href="./User:TSevener_(WMF)" title="User:TSevener (WMF)" id="mwDA">TSevener (WMF)</a> (<a rel="mw:WikiLink" href="./User_talk:TSevener_(WMF)" title="User talk:TSevener (WMF)" id="mwDQ">talk</a>) 16:09, 17 June 2019 (UTC)
            </p>
          </section>
        `);
        const topics = new TalkPage(doc, 'en').topics;
        assert.equal(topics.length, 4);
        assert.equal(topics[0].id, 0);
        assert.equal(topics[0].html, '');
        assert.equal(topics[0].replies.length, 1);
        assert.equal(topics[0].replies[0].html, 'Hello');
        assert.equal(topics[1].id, 1);
        assert.equal(topics[1].html, 'new topic');
        assert.equal(topics[1].replies.length, 1);
        assert.equal(topics[2].id, 2);
        assert.equal(topics[2].html, 'No replies topic');
        assert.equal(topics[2].replies.length, 0);
        assert.equal(topics[3].id, 3);
        assert.equal(topics[3].html, 'new topic 2');
        assert.equal(topics[3].replies.length, 1);
      });
      it('empty h2 without title is filtered out', () => {
        const doc =  domino.createDocument(`
          <section data-mw-section-id="0" id="mwAQ">
            <p id="mwAg">Hello</p>
          </section>
          <section data-mw-section-id="1" id="mwAw">
            <h2 id="new_topic">new topic</h2>
            <p id="mwBA">
              Test <a rel="mw:WikiLink" href="./User:TSevener_(WMF)" title="User:TSevener (WMF)" id="mwBQ">TSevener (WMF)</a> (<a rel="mw:WikiLink" href="./User_talk:TSevener_(WMF)" title="User talk:TSevener (WMF)" id="mwBg">talk</a>) 16:09, 17 June 2019 (UTC)
            </p>
          </section>
          <section data-mw-section-id="2" id="mwBw">
            <h2 id="mwCA"></h2>
          </section>
          <section data-mw-section-id="3" id="mwCQ">
            <h2 id="new_topic_2">new topic 2</h2>
            <p id="mwCg">
              Test <a rel="mw:WikiLink" href="./User:TSevener_(WMF)" title="User:TSevener (WMF)" id="mwCw">TSevener (WMF)</a> (<a rel="mw:WikiLink" href="./User_talk:TSevener_(WMF)" title="User talk:TSevener (WMF)" id="mwDA">talk</a>) 16:09, 17 June 2019 (UTC)
            </p>
          </section>
        `);
        const topics = new TalkPage(doc, 'en').topics;
        assert.equal(topics.length, 3);
        assert.equal(topics[0].id, 0);
        assert.equal(topics[0].html, '');
        assert.equal(topics[0].replies.length, 1);
        assert.equal(topics[0].replies[0].html, 'Hello');
        assert.equal(topics[1].id, 1);
        assert.equal(topics[1].html, 'new topic');
        assert.equal(topics[1].replies.length, 1);
        assert.equal(topics[2].id, 3);
        assert.equal(topics[2].html, 'new topic 2');
        assert.equal(topics[2].replies.length, 1);
      });
      it('handles empty links', () => {
        const doc = domino.createDocument(`
        <section data-mw-section-id="0" id="mwAQ">
          <a href="./File:Information.svg" id="mwjQ"><img resource="./File:Information.svg" src="//upload.wikimedia.org/wikipedia/en/thumb/2/28/Information.svg/25px-Information.svg.png" data-file-width="256" data-file-height="256" data-file-type="drawing" height="25" width="25" srcset="//upload.wikimedia.org/wikipedia/en/thumb/2/28/Information.svg/50px-Information.svg.png 2x, //upload.wikimedia.org/wikipedia/en/thumb/2/28/Information.svg/38px-Information.svg.png 1.5x" id="mwjg"></a>
        </section>
        `);
        const topics = new TalkPage(doc, 'en').topics;
        assert.equal(topics[0].replies[0].html, '<a href="./File:Information.svg">[File:Information.svg]</a>');
      });
      it('removes figures', () => {
        const doc = domino.createDocument(`
<section data-mw-section-id="282" id="mwB44"><h2 id="Bay_Area_WikiSalon_February_reminder">Bay Area WikiSalon February reminder</h2>

<link rel="mw-deduplicated-inline-style" href="mw-data:TemplateStyles:r888971367" about="#mwt224" typeof="mw:Extension/templatestyles mw:Transclusion" data-mw='{"parts":[{"template":{"target":{"wt":"letterhead start","href":"./Template:Letterhead_start"},"params":{},"i":0}},"\n&lt;center>&lt;big>Please join us in downtown San Francisco!&lt;/big>&lt;/center>\n\n[[File:Panel fields questions on Journalism and Wikipedia (cropped).jpg|right|frameless|upright=1|alt=A Wikipedia panel discussion about journalism]]\nWednesday, February 22, 2017 at 6 p.m.\n&lt;hr>\nFor details and to RSVP: &apos;&apos;&apos;[[w:en:Wikipedia:Bay Area WikiSalon February 2017|Wikipedia:Bay Area WikiSalon, February 2017]]&apos;&apos;&apos;\n&lt;hr>\nSee you soon! ",{"template":{"target":{"wt":"u","href":"./Template:U"},"params":{"1":{"wt":"Ben Creasy"}},"i":1}}," and ",{"template":{"target":{"wt":"u","href":"./Template:U"},"params":{"1":{"wt":"Checkingfax"},"2":{"wt":"Wayne"}},"i":2}}," (co-coordinators) | &lt;small>([[Wikipedia:Meetup/San Francisco/Invite|Subscribe/Unsubscribe to this talk page notice here]])&lt;/small> | [[User:MediaWiki message delivery|MediaWiki message delivery]] ([[User talk:MediaWiki message delivery|talk]]) 02:58, 21 February 2017 (UTC)\n",{"template":{"target":{"wt":"letterhead end","href":"./Template:Letterhead_end"},"params":{},"i":3}}]}' id="mwB48"/><div class="letterhead " style="" about="#mwt224" id="mwB5A">
<center><big>Please join us in downtown San Francisco!</big></center>

<figure class="mw-default-size mw-halign-right" typeof="mw:Image/Frameless"><a href="./File:Panel_fields_questions_on_Journalism_and_Wikipedia_(cropped).jpg"><img alt="A Wikipedia panel discussion about journalism" resource="./File:Panel_fields_questions_on_Journalism_and_Wikipedia_(cropped).jpg" src="//upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Panel_fields_questions_on_Journalism_and_Wikipedia_%28cropped%29.jpg/220px-Panel_fields_questions_on_Journalism_and_Wikipedia_%28cropped%29.jpg" data-file-width="2089" data-file-height="1214" data-file-type="bitmap" height="128" width="220" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Panel_fields_questions_on_Journalism_and_Wikipedia_%28cropped%29.jpg/440px-Panel_fields_questions_on_Journalism_and_Wikipedia_%28cropped%29.jpg 2x, //upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Panel_fields_questions_on_Journalism_and_Wikipedia_%28cropped%29.jpg/330px-Panel_fields_questions_on_Journalism_and_Wikipedia_%28cropped%29.jpg 1.5x"/></a><figcaption></figcaption></figure>
<p>Wednesday, February 22, 2017 at 6 p.m.</p>
<hr/>
<p>For details and to RSVP: <b><a rel="mw:WikiLink" href="./Wikipedia:Bay_Area_WikiSalon_February_2017" title="Wikipedia:Bay Area WikiSalon February 2017">Wikipedia:Bay Area WikiSalon, February 2017</a></b></p>
<hr/>
<p>See you soon! <a rel="mw:WikiLink" href="./User:Ben_Creasy" title="User:Ben Creasy">Ben Creasy</a> and <a rel="mw:WikiLink" href="./User:Checkingfax" title="User:Checkingfax">Wayne</a> (co-coordinators) | <small>(<a rel="mw:WikiLink" href="./Wikipedia:Meetup/San_Francisco/Invite" title="Wikipedia:Meetup/San Francisco/Invite">Subscribe/Unsubscribe to this talk page notice here</a>)</small> | <a rel="mw:WikiLink" href="./User:MediaWiki_message_delivery" title="User:MediaWiki message delivery">MediaWiki message delivery</a> (<a rel="mw:WikiLink" href="./User_talk:MediaWiki_message_delivery" title="User talk:MediaWiki message delivery">talk</a>) 02:58, 21 February 2017 (UTC)</p>
</div>
<!-- Message sent by User:Checkingfax@enwiki using the list at https://en.wikipedia.org/w/index.php?title=Wikipedia:Meetup/San_Francisco/Invite&#x26;oldid=760281342 -->

</section>
        `);
        const topics = new TalkPage(doc, 'en').topics;
        assert.equal(topics[0].replies[0].html, '<b>Please join us in downtown San Francisco!</b><br><br><a href="./File:Panel_fields_questions_on_Journalism_and_Wikipedia_(cropped).jpg">[File:Panel_fields_questions_on_Journalism_and_Wikipedia_(cropped).jpg]</a><br><br>Wednesday, February 22, 2017 at 6 p.m.<br><br>For details and to RSVP: <b><a href="./Wikipedia:Bay_Area_WikiSalon_February_2017" title="Wikipedia:Bay Area WikiSalon February 2017">Wikipedia:Bay Area WikiSalon, February 2017</a></b><br><br>See you soon! <a href="./User:Ben_Creasy" title="User:Ben Creasy">Ben Creasy</a> and <a href="./User:Checkingfax" title="User:Checkingfax">Wayne</a> (co-coordinators) | (<a href="./Wikipedia:Meetup/San_Francisco/Invite" title="Wikipedia:Meetup/San Francisco/Invite">Subscribe/Unsubscribe to this talk page notice here</a>) | <a href="./User:MediaWiki_message_delivery" title="User:MediaWiki message delivery">MediaWiki message delivery</a> (<a href="./User_talk:MediaWiki_message_delivery" title="User talk:MediaWiki message delivery">talk</a>) 02:58, 21 February 2017 (UTC)');
      });
      it('does not block the event loop', () => {
        const doc = fixtures.readIntoDocument('User_talk-Koavf.html');
        const talkPagePromise = TalkPage.promise(doc, 'en');
        return perf.measure(talkPagePromise, 150).then(talkPage => {
          const topic = talkPage.topics[2];
          assert.equal(topic.html, '<i>The Midnight Snack</i>');
          const reply = topic.replies[10];
          assert.equal(reply.depth, 10);
          assert.equal(reply.html, '<a href="./User:Rosguill" title="User:Rosguill">Rosguill</a>, There already <i>is</i> a consensus for <a href="./Wikipedia:OR" title="Wikipedia:OR">WP:OR</a>, <a href="./Wikipedia:V" title="Wikipedia:V">WP:V</a>, and <a href="./Wikipedia:SOURCE" title="Wikipedia:SOURCE">WP:SOURCE</a> for the entire encyclopedia project. If we get a consensus at <a href="./Wikipedia:AFD" title="Wikipedia:AFD">WP:AFD</a> or <a href="./Wikipedia_talk:ANIMATION" title="Wikipedia talk:ANIMATION">WT:ANIMATION</a> or any other page, why would they be more likely to listen to that? Why is the onus on me to expend more overhead for these non-articles that we should never have had instead of someone just saying, "Don\'t do this again or you\'ll be blocked"? ―<a href="./User:Koavf" title="User:Koavf">Justin (ko<b>a</b>vf)</a>❤<a href="./User_talk:Koavf" title="User talk:Koavf">T</a>☮<a href="./Special:Contributions/Koavf" title="Special:Contributions/Koavf">C</a>☺<a href="./Special:EmailUser/Koavf" title="Special:EmailUser/Koavf">M</a>☯ 00:08, 25 September 2019 (UTC)');
        });
      });
    });
});
