'use strict';

var assert = require('../../utils/assert');
var mUtil = require('../../../lib/mobile-util');
var preq  = require('preq');

var obj1 = { hello: true, world: true };
var obj2 = { goodbye: true, sea: true, again: false };
var obj3 = { hello: true, world: true, again: false };
var obj4 = { goodbye: true, sea: true };
var obj5 = { goodbye: true, sea: true, world: true, again: true };
var obj6 = { goodbye: true, sea: true, again: true };

var arr1 = [ obj1, obj3 ];
var arr2 = [ obj4, obj6 ];
var arr3 = [ obj4, obj5 ];
var arr4 = [ obj5, obj5 ];
var arr5 = [ obj1, obj3, obj6 ];
var arr6 = [ obj1, obj3 ];
var arr7 = [ obj4, obj2 ];

// If a news story string breaks the regex in mUtil.stripMarkup, fix the regex,
// then add the offending string here for use in future unit testing!
var newsHtml1 = '<!--June 20 --> In <a rel="mw:WikiLink" href="./Basketball" title="Basketball" id="mwBA">basketball</a>, the <a rel="mw:WikiLink" href="./Cleveland_Cavaliers" title="Cleveland Cavaliers" id="mwBQ">Cleveland Cavaliers</a> defeat the <a rel="mw:WikiLink" href="./Golden_State_Warriors" title="Golden State Warriors" id="mwBg">Golden State Warriors</a> to win the <b id="mwBw"><a rel="mw:WikiLink" href="./2016_NBA_Finals" title="2016 NBA Finals" id="mwCA">NBA Finals</a></b> <i id="mwCQ">(<a rel="mw:WikiLink" href="./Bill_Russell_NBA_Finals_Most_Valuable_Player_Award" title="Bill Russell NBA Finals Most Valuable Player Award" id="mwCg">MVP</a> <a rel="mw:WikiLink" href="./LeBron_James" title="LeBron James" id="mwCw">LeBron James</a> pictured)</i>.';
var newsHtml2 = '<!--June 18--> The <a rel="mw:WikiLink" href="./United_Nations" title="United Nations" id="mwDQ">United Nations</a> reports 80,000 civilians have fled <a rel="mw:WikiLink" href="./Fallujah" title="Fallujah" id="mwDg">Fallujah</a>, as <a rel="mw:WikiLink" href="./Iraqi_Armed_Forces" title="Iraqi Armed Forces" id="mwDw">Iraqi Army</a> and <a rel="mw:WikiLink" href="./Popular_Mobilization_Forces_(Iraq)" title="Popular Mobilization Forces (Iraq)" id="mwEA">Shia militias</a> <b id="mwEQ"><a rel="mw:WikiLink" href="./Battle_of_Fallujah_(2016)" title="Battle of Fallujah (2016)" id="mwEg">retake most of the city</a></b> from <a rel="mw:WikiLink" href="./Islamic_State_of_Iraq_and_the_Levant" title="Islamic State of Iraq and the Levant" id="mwEw">ISIL</a>.';
var newsHtml3 = '<!--June 16--> British <a rel="mw:WikiLink" href="./Member_of_parliament" title="Member of parliament" id="mwFQ">Member of Parliament</a> <b id="mwFg"><a rel="mw:WikiLink" href="./Jo_Cox" title="Jo Cox" id="mwFw">Jo Cox</a></b> dies after being <a rel="mw:WikiLink" href="./Killing_of_Jo_Cox" title="Killing of Jo Cox" id="mwGA">shot and stabbed</a> in <a rel="mw:WikiLink" href="./Birstall,_West_Yorkshire" title="Birstall, West Yorkshire" id="mwGQ">Birstall, West Yorkshire</a>.';
var newsHtml4 = '<!--June 14--> In <a rel="mw:WikiLink" href="./Association_football" title="Association football" id="mwGw">association football</a>, <b id="mwHA"><a rel="mw:WikiLink" href="./Violence_at_UEFA_Euro_2016" title="Violence at UEFA Euro 2016" id="mwHQ">fan violence</a></b> at <a rel="mw:WikiLink" href="./UEFA_Euro_2016" title="UEFA Euro 2016" id="mwHg">UEFA Euro 2016</a> results in arrests and deportation of fans, and fines for the <a rel="mw:WikiLink" href="./Croatian_national_football_team" title="Croatian national football team" id="mwHw">Croatian</a>, <a rel="mw:WikiLink" href="./Hungarian_national_football_team" title="Hungarian national football team" id="mwIA">Hungarian</a> and <a rel="mw:WikiLink" href="./Russia_national_football_team" title="Russia national football team" id="mwIQ">Russian</a> teams.';

var newsText1 = 'In basketball, the Cleveland Cavaliers defeat the Golden State Warriors to win the NBA Finals (MVP LeBron James pictured).';
var newsText2 = 'The United Nations reports 80,000 civilians have fled Fallujah, as Iraqi Army and Shia militias retake most of the city from ISIL.';
var newsText3 = 'British Member of Parliament Jo Cox dies after being shot and stabbed in Birstall, West Yorkshire.';
var newsText4 = 'In association football, fan violence at UEFA Euro 2016 results in arrests and deportation of fans, and fines for the Croatian, Hungarian and Russian teams.';

describe('lib:mobile-util', function() {
    this.timeout(20000);

    it('removeTLD should remove TLD', function() {
        assert.deepEqual(mUtil.removeTLD('ru.wikipedia.org'), 'ru.wikipedia');
    });

    it('mergeByProp should merge two objects by shared property', function() {
        mUtil.mergeByProp(arr1, arr2, 'again', true)
        assert.deepEqual(arr1, arr5);
    });

    it('adjustMemberKeys should make the specified adjustments', function() {
        mUtil.adjustMemberKeys(arr6, [['goodbye', 'hello'], ['sea', 'world']]);
        assert.deepEqual(arr6, arr7);

        mUtil.adjustMemberKeys(arr3, [['goodbye', 'hello'], ['sea', 'world']]);
        assert.deepEqual(arr3, arr2);
    });

    it('fillInMemberKeys should make the specified adjustments', function() {
        mUtil.fillInMemberKeys(arr3, [['world', 'goodbye'], ['again', 'sea']]);
        assert.deepEqual(arr3, arr4);
    })

    it('HTML stripping regex should strip HTML as expected', function() {
        assert.deepEqual(mUtil.stripMarkup(newsHtml1).trim(), newsText1);
        assert.deepEqual(mUtil.stripMarkup(newsHtml2).trim(), newsText2);
        assert.deepEqual(mUtil.stripMarkup(newsHtml3).trim(), newsText3);
        assert.deepEqual(mUtil.stripMarkup(newsHtml4).trim(), newsText4);
    })
});
