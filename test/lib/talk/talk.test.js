'use strict';

const assert = require('../../utils/assert.js');
const talk = require('../../../lib/talk/parser');
const domino = require('domino');
const reply = require('../../../lib/talk/TalkReply');
const topic = require('../../../lib/talk/TalkTopic');
const relationships = require('../../../lib/talk/parser-relationships');
const removal = require('../../../lib/talk/parser-removal');

describe('lib:talk', () => {
    describe('createSha256', () => {
        it('generates expected sha for string', () => {
            assert.equal(
                topic.createSha256('Some string'),
                '2beaf0548e770c4c392196e0ec8e7d6d81cc9280ac9c7f3323e4c6abc231e95a'
            );
        });
    });
    describe('getFamilyTree', () => {
        it('gets expected family tree', () => {
          const LI = domino.createDocument(`
            <html>
              <body>
                <div>
                  <ul>
                    <li id='yo'>Hi
                  </ul>
                </div>
              </body>
            </html>`).querySelector('#yo');
          const tree = relationships.getFamilyTree(LI);
          assert.deepEqual(
              tree.map(e => e.tagName), ['LI', 'UL', 'DIV', 'BODY', 'HTML']
          );
        });
    });
    describe('getReplyDepth', () => {
        it('expected depth in list', () => {
          const el = domino.createDocument(`
            <html>
              <body>
                <div>
                  <ul>
                    <li><div id='sought'>Hi</div>
                  </ul>
                </div>
              </body>
            </html>`).querySelector('#sought');
          const depth = reply.getReplyDepth(el);
          assert.equal(
              depth, 1
          );
        });
        it('expected depth in list nested in list', () => {
          const el = domino.createDocument(`
            <html>
              <body>
                <div>
                  <ol>
                    <li>
                      <ul>
                        <li><div id='sought'>Hi</div>
                      </ul>
                  </ol>
                </div>
              </body>
            </html>`).querySelector('#sought');
          const depth = reply.getReplyDepth(el);
          assert.equal(
              depth, 2
          );
        });
        it('expected depth in div', () => {
          const el = domino.createDocument(`
            <html>
              <body>
                <div id='sought'>Hi</div>
              </body>
            </html>`).querySelector('#sought');
          const depth = reply.getReplyDepth(el);
          assert.equal(
              depth, 0
          );
        });
        it('expected depth in dl', () => {
          const el = domino.createDocument(`
            <html>
              <body>
                <div>
                  <dl>
                    <dt>Coffee</dt>
                    <dd id='sought'>Black</dd>
                    <dt>Milk</dt>
                    <dd>White</dd>
                  </dl>
                </div>
              </body>
            </html>`).querySelector('#sought');
          const depth = reply.getReplyDepth(el);
          assert.equal(
              depth, 1
          );
        });
        it('expected depth in list nested in list nested in dl', () => {
          const el = domino.createDocument(`
            <html>
              <body>
                <div>
                  <dl>
                    <dt>Coffee</dt>
                    <dd>
                      <ol>
                        <li>
                          <ul>
                            <li><div id='sought'>Hi</div>
                          </ul>
                      </ol>
                    </dd>
                    <dt>Milk</dt>
                    <dd>White</dd>
                  </dl>
                </div>
              </body>
            </html>`).querySelector('#sought');
          const depth = reply.getReplyDepth(el);
          assert.equal(
              depth, 3
          );
        });
    });

    describe('timestampRegex', () => {
      describe('ends in year followed by time zone code', () => {
        it('succeeds if string ends in year followed by time zone code', () => {
          assert.ok(reply.timestampRegex.test('02:13, 4 July 2009 (UTC)'));
        });
        it('fails if string time zone code not valid because too short', () => {
          assert.ok(!reply.timestampRegex.test('02:13, 4 July 2009 (U)'));
        });
        it('fails if string time zone code not valid because too long', () => {
          assert.ok(!reply.timestampRegex.test('02:13, 4 July 2009 (UTCUTC)'));
        });
        it('fails for non capitalized time zone code', () => {
          assert.ok(!reply.timestampRegex.test('oh hi 2009 (utc)'));
        });
        it('fails if year too short', () => {
          assert.ok(!reply.timestampRegex.test('02:13, 4 July 200 (UTC)'));
        });
        it('fails if year too long', () => {
          assert.ok(!reply.timestampRegex.test('02:13, 4 July 20000 (UTC)'));
        });
        it('fails if year before 2000 - Wikipedia did not exist yet :)', () => {
          assert.ok(!reply.timestampRegex.test('02:13, 4 July 1999 (UTC)'));
        });
      });
      describe('ends in "dd:dd" formatted time followed by time zone code', () => {
        it('succeeds if string ends in time followed by time zone code', () => {
          assert.ok(reply.timestampRegex.test('15 août 2007 à 17:24 (CEST)'));
        });
        it('fails if string time is not valid because not "dd:dd" format', () => {
          assert.ok(!reply.timestampRegex.test('15 août 2007 à 17:2 (CEST)'));
          assert.ok(!reply.timestampRegex.test('15 août 2007 à 1724 (CEST)'));
        });
        it('fails if string time zone code not valid because too short', () => {
          assert.ok(!reply.timestampRegex.test('15 août 2007 à 17:24 (C)'));
        });
        it('fails if string time zone code not valid because too long', () => {
          assert.ok(!reply.timestampRegex.test('15 août 2007 à 17:24 (UTCUTC)'));
        });
        it('fails if string time zone code not valid because hour too high', () => {
          assert.ok(!reply.timestampRegex.test('15 août 2007 à 37:24 (UTC)'));
        });
      });
    });

    describe('escapeLessThanGreaterThanAndAmpersand', () => {
        it('escapes tags', () => {
            const sha = 'This <i>is</i> fine.';
            assert.equal(
                removal.escapeLessThanGreaterThanAndAmpersand(sha),
                'This &lt;i&gt;is&lt;/i&gt; fine.'
            );
        });
        it('escapes ampersands', () => {
            const sha = 'This&nbsp;is&nbsp;fine.';
            assert.equal(
                removal.escapeLessThanGreaterThanAndAmpersand(sha),
                'This&amp;nbsp;is&amp;nbsp;fine.'
            );
        });
        it('does not escape apostrophes or quotes', () => {
            const sha = 'I\'ve got "quotes"';
            assert.equal(
                removal.escapeLessThanGreaterThanAndAmpersand(sha),
                'I\'ve got "quotes"'
            );
        });
    });
    describe('pruneUnwantedAttributes', () => {
      const el = domino.createDocument(`
        <html>
          <body>
            <div style='a' id='b' class='c' rel='d' about='e' data-mw='f' typeof='g' bleep='h' bloop='i'>Hi</div>
          </body>
        </html>`).querySelector('div');

        removal.pruneUnwantedAttributes(el);

        it('removes style', () => {
            assert.equal(el.hasAttribute('style'), false);
        });
        it('removes id', () => {
            assert.equal(el.hasAttribute('id'), false);
        });
        it('removes class', () => {
            assert.equal(el.hasAttribute('class'), false);
        });
        it('removes rel', () => {
            assert.equal(el.hasAttribute('rel'), false);
        });
        it('removes about', () => {
            assert.equal(el.hasAttribute('about'), false);
        });
        it('removes data-mw', () => {
            assert.equal(el.hasAttribute('data-mw'), false);
        });
        it('removes typeof', () => {
            assert.equal(el.hasAttribute('typeof'), false);
        });
        it('leaves bleep', () => {
            assert.equal(el.hasAttribute('bleep'), true);
        });
        it('leaves bloop', () => {
            assert.equal(el.hasAttribute('bloop'), true);
        });
    });
    describe('textFromTextNode', () => {
      const doc = domino.createDocument('');
      it('gets text', () => {
        const node = doc.createTextNode('Hi there');
        assert.equal(
            removal.textFromTextNode(node),
            'Hi there'
        );
      });
      it('escapes tags and ampersands', () => {
        const node = doc.createTextNode('Some <i>tags</i> and&nbsp;ampersands.');
        assert.equal(
            removal.textFromTextNode(node),
            'Some &lt;i&gt;tags&lt;/i&gt; and&amp;nbsp;ampersands.'
        );
      });
    });
    describe('textFromPreservedElementNode', () => {
      it('preserve nested bold, italic and anchor', () => {
        const elementHTML = '' +
        '<b>' + // bold is a preserved element
          'keep nested <b>bold</b> and <i>italic</i> and <a href="test">anchor</a> tags' +
        '</b>';
        const el = domino.createDocument(elementHTML).querySelector('b');

        const expectedOutput = '' +
        '<b>' +
          'keep nested <b>bold</b> and <i>italic</i> and <a href="test">anchor</a> tags' +
        '</b>';

        assert.equal(removal.textFromPreservedElementNode(el), expectedOutput);
      });
      it('removes img and other tags', () => {
        const elementHTML = '' +
        '<b>' +
          'do not keep image tags <img src="">' +
          '<other>do not keep other tags, but keep their text content</other>' +
        '</b>';
        const el = domino.createDocument(elementHTML).querySelector('b');
        const expectedOutput = '' +
        '<b>' +
          'do not keep image tags ' +
          'do not keep other tags, but keep their text content' +
        '</b>';
        assert.equal(removal.textFromPreservedElementNode(el), expectedOutput);
      });
      it('handle deep nesting', () => {
        const elementHTML = '' +
        '<b>' +
          'handle deep nesting' +
          '<i>italic' +
            '<a href="test">anchor' +
              '<other>' +
                'other' +
                '<b>' +
                  'bold' +
                '</b>' +
              '</other>' +
              '<img src="">' +
              'bla' +
            '</a>' +
          '</i>' +
        '</b>';
        const el = domino.createDocument(elementHTML).querySelector('b');
        const expectedOutput = '' +
        '<b>' +
          'handle deep nesting' +
          '<i>italic' +
            '<a href="test">anchor' +
                'other' +
                '<b>' +
                  'bold' +
                '</b>' +
              'bla' +
            '</a>' +
          '</i>' +
        '</b>';
        assert.equal(removal.textFromPreservedElementNode(el), expectedOutput);
      });
      it('shows file name from href in brackets if anchor has no text', () => {
        const elementHTML = '' +
        '<a href="test/someFileName">' +
        '</a>';
        const el = domino.createDocument(elementHTML).querySelector('a');
        const expectedOutput = '' +
        '<a href="test/someFileName">' +
        '[someFileName]' +
        '</a>';
        assert.equal(removal.textFromPreservedElementNode(el), expectedOutput);
      });
    });
    describe('remove elements non-destructively', () => {
      it('remove element preserving nested text', () => {
        const doc = domino.createDocument(
          '<html><head></head><body><b>hi</b></body></html>'
        );
        removal.removeElementsNonDestructively([doc.querySelector('b')]);
        assert.equal(doc.innerHTML, '<html><head></head><body>hi</body></html>');
      });
      it('remove element preserving nested text and tag', () => {
        const doc = domino.createDocument(
          '<html><head></head><body><b>hi <i>there</i></b></body></html>'
        );
        removal.removeElementsNonDestructively([doc.querySelector('b')]);
        assert.equal(doc.innerHTML, '<html><head></head><body>hi <i>there</i></body></html>');
      });
      it('remove element preserving nested texts and tags', () => {
        const doc = domino.createDocument(
          '<html><head></head><body><b>hi <i>how <b>are</b></i></b> you</body></html>'
        );
        removal.removeElementsNonDestructively([doc.querySelector('b')]);
        assert.equal(doc.innerHTML, '<html><head></head><body>hi <i>how <b>are</b></i> you</body></html>');
      });
      it('remove multiple elements preserving nested texts and tags', () => {
        const doc = domino.createDocument(
          '<html><head></head><body><b>hi <i>how <b>are</b></i></b> you</body></html>'
        );
        removal.removeElementsNonDestructively([doc.querySelector('b'), doc.querySelector('i')]);
        assert.equal(doc.innerHTML, '<html><head></head><body>hi how <b>are</b> you</body></html>');
      });
      it('remove multiple elements (in reverse order of occurence) preserving nested texts and tags', () => {
        const doc = domino.createDocument(
          '<html><head></head><body><b>hi <i>how <b>are</b></i></b> you</body></html>'
        );
        removal.removeElementsNonDestructively([doc.querySelector('i'), doc.querySelector('b')]);
        assert.equal(doc.innerHTML, '<html><head></head><body>hi how <b>are</b> you</body></html>');
      });
    });
    describe('get clone with non-anchor elements removed non-destructively', () => {
      it('remove non-anchors from complex element', () => {
        const doc = domino.createDocument(
          '<html><head></head><body><b>hi there <i>how</i> <sub><a href="a"><b>are</b></a> <a href="a">you</a></sub> <sup>doing</sup></b></body></html>'
        );
        const anchorsOnlyBodyClone = removal.getCloneWithAnchorsAndTextNodesOnly(doc.querySelector('body'));
        assert.equal(anchorsOnlyBodyClone.innerHTML, 'hi there how <a href="a">are</a> <a href="a">you</a> doing');
      });
    });
    describe('customTextContent', () => {
      it('preserves expected tags only: ["A", "B", "I", "SUP", "SUB"]', () => {
        const doc = domino.createDocument(
          '<html><head></head><body><b>hi <h1>there</h1> <i><h2>how</h2></i> <img src="someimg.png"><sub><a href="a"><b>are</b></a> <a href="a">you</a></sub> <sup>doing</sup></b></body></html>'
        );
        const text = removal.customTextContent(doc.querySelector('body'), doc);
        assert.equal(text, '<b>hi there <i>how</i> <sub><a href="a"><b>are</b></a> <a href="a">you</a></sub> <sup>doing</sup></b>');
      });
      it('replaces expected tags with bold: ["CODE", "BIG", "DT"]', () => {
        const doc = domino.createDocument(
          '<html><head></head><body>Here is <code>code</code>, <big>big</big> and <dt>dt</dt>.</body></html>'
        );
        const text = removal.customTextContent(doc.querySelector('body'), doc);
        assert.equal(text, 'Here is <b>code</b>, <b>big</b> and <b>dt</b>.');
      });
    });
    describe('replaceElementsContainingOnlyOneBreakWithBreak', () => {
      it('removes element containing only a break', () => {
        const doc = domino.createDocument(
          '<html><head></head><body><b><br></b></body></html>'
        );
        removal.replaceElementsContainingOnlyOneBreakWithBreak(doc);
        assert.equal(doc.innerHTML, '<html><head></head><body><br></body></html>');
      });
      it('removes nothing if element contains something other than a break', () => {
        const doc = domino.createDocument(
          '<html><head></head><body><b>hi<br></b></body></html>'
        );
        removal.replaceElementsContainingOnlyOneBreakWithBreak(doc);
        assert.equal(doc.innerHTML, '<html><head></head><body><b>hi<br></b></body></html>');
      });
      it('removes all elements containing only a break regardless of nesting', () => {
        const doc = domino.createDocument(
          '<html><head></head><body><b><br></b><div><i><br></i><i><br></i><span><b><br></b><b><br><img></b></span></div></body></html>'
        );
        removal.replaceElementsContainingOnlyOneBreakWithBreak(doc);
        assert.equal(doc.innerHTML, '<html><head></head><body><br><div><br><br><span><br><b><br><img></b></span></div></body></html>');
      });
    });
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
        const topics = talk.parseUserTalkPageDocIntoTopicsWithReplies(doc, 'en').topics;
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
        const topics = talk.parseUserTalkPageDocIntoTopicsWithReplies(doc, 'en').topics;
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
        const topics = talk.parseUserTalkPageDocIntoTopicsWithReplies(doc, 'en').topics;
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
        const topics = talk.parseUserTalkPageDocIntoTopicsWithReplies(doc, 'en').topics;
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
            <h2 id="mwCA"></h2>
          </section>
          <section data-mw-section-id="3" id="mwCQ">
            <h2 id="new_topic_2">new topic 2</h2>
            <p id="mwCg">
              Test <a rel="mw:WikiLink" href="./User:TSevener_(WMF)" title="User:TSevener (WMF)" id="mwCw">TSevener (WMF)</a> (<a rel="mw:WikiLink" href="./User_talk:TSevener_(WMF)" title="User talk:TSevener (WMF)" id="mwDA">talk</a>) 16:09, 17 June 2019 (UTC)
            </p>
          </section>
        `);
        const topics = talk.parseUserTalkPageDocIntoTopicsWithReplies(doc, 'en').topics;
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
    });
});
