'use strict';

/* eslint-disable max-len */

const assert = require('../../../utils/assert');
const lib = require('../../../../lib/transforms').summarize;

describe('lib:summarize follows spec', () => {
    function tst(done, input, expected, message) {
        lib.summarize(input).then((result) => {
            assert.equal(result.extract_html, expected, message);
            done();
        }).catch((err) => {
            done(err);
        });
    }

    it('keeps spaces before closing spans', (done) => {
        // it.wikipedia.org/api/rest_v1/page/html/Mino_Raiola/93869330
        // Obsolete now since spans are flattened
        tst(done, '<b>Mino Raiola</b><span>, all\'anagrafe </span><b>Carmine Raiola</b>',
            '<b>Mino Raiola</b>, all\'anagrafe <b>Carmine Raiola</b>');
    });
    it('removes really all double spaces, even the ones caused due to unmatched tags', (done) => {
        // https://de.wikipedia.org/api/rest_v1/page/html/Malta/173025214
        tst(done, '<p>Die <b>Republik Malta</b> (englisch <span>Republic of Malta)</span> ist ein südeuropäischer Inselstaat</p>',
            '<p>Die <b>Republik Malta</b> ist ein südeuropäischer Inselstaat</p>');
    });
    it('removes spaces before commas', (done) => {
        // https://en.wikipedia.org/api/rest_v1/page/html/Darth_Vader/822927781
        tst(done, '<b>Darth Vader</b> (some IPA), also',
            '<b>Darth Vader</b>, also');
    });
    it('flattens spans with `&nbsp;` -- removes extra spaces around it, too.', (done) => {
        tst(done, '<b>Niedersachsen</b> <span>&nbsp;</span>   ist',
            '<b>Niedersachsen</b> ist');
    });
    it('flattens spans with multiple `&nbsp;` -- removes extra spaces around it, too.', (done) => {
        tst(done, '<b>Niedersachsen</b> <span>&nbsp;</span><span>&nbsp;</span>   ist',
            '<b>Niedersachsen</b> ist');
    });
    it('flattening spans before the `(` enables this parenthetical to be removed', (done) => {
        // en.wikipedia.org/api/rest_v1/page/html/Kyoto/823102615
        tst(done, '<b>Kyoto</b><span style="font-weight:normal"><span typeof="mw:Entity"> </span>(lots of IPAs)</span> is a</p>',
            '<b>Kyoto</b><span style="font-weight:normal"> </span> is a');
    });
    it('removes audio, video, and track tags', (done) => {
        tst(done, '<p><audio></audio><video><track kind="subtitles"></video></p>',
            '<p></p>');
    });
    it('ignores parens inside attributes by escaping them earlier', (done) => {
        tst(done, '<p>(Keep me) and this (<img src="latin_paren).jpg"></p>',
            '<p>(Keep me) and this (<img src="latin_paren).jpg" /></p>');
    });
    it('ignores parens inside attributes by escaping them earlier (non-latin parentheses)', (done) => {
        tst(done, '<p>(Keep me) and this （<img src="non-latin_paren）.jpg"></p>',
            '<p>(Keep me) and this （<img src="non-latin_paren）.jpg" /></p>');
    });
    it('reduces multiple spaces to single space', (done) => {
        tst(done, '<p>Justice League (both 2017). Justice (is forever)!</p>',
            '<p>Justice League. Justice!</p>');
    });
    it('removes problematic elements including their content', (done) => {
        tst(done, '.<style>f</style><object>o</object><script>o</script>.',
            '..');
    });
    it('removes unwanted attributes', (done) => {
        tst(done, '<span bogus="dummy">f</span><b invalid="whateva">o</b>o',
            'f<b>o</b>o');
    });
    it('keeps white-listed attributes', (done) => {
        tst(done, '<span style="text-align:right">f</span><span class="we-got-class">o</span>o',
            '<span style="text-align:right">f</span><span class="we-got-class">o</span>o');
    });
    it('removes comments', (done) => {
        tst(done, 'foo<!-- a comment -->bar',
            'foobar');
    });
    it('flattens empty nodes', (done) => {
        tst(done, '<span></span><b></b><i></i><p><span>f</span></p>',
            '<p>f</p>');
    });
    it('flattens links', (done) => {
        tst(done, 'This is some content with <a href="#"">a link</a>.',
            'This is some content with a link.');
    });
    it('removes .noexcerpt elements', (done) => {
        tst(done, 'This summary should be nice and clean<span class="noexcerpt"> (elements with class "noexcerpt" will be omitted)</span>.',
            'This summary should be nice and clean.');
    });
    it('removes .noprint elements', (done) => {
        tst(done, 'This summary should be nice and clean<span class="noprint"> (elements with class "noprint" will be omitted)</span>.',
            'This summary should be nice and clean.');
    });
    it('keeps sup elements', (done) => {
        tst(done, '<p>A <b>googolplex</b> is the number 10<sup>googol</sup>, or equivalently, 10<sup>(10<sup>100</sup>)</sup>.</p>',
            '<p>A <b>googolplex</b> is the number 10<sup>googol</sup>, or equivalently, 10<sup>(10<sup>100</sup>)</sup>.</p>');
    });
    it('removes .mw-ref elements', (done) => {
        tst(done, '<p><b>France</b> is a country with territory status in western Europe and several overseas regions and territories.<sup class="mw-ref" id="cite_ref-twelve_21-0"><a href="#cite_note-twelve-21"><span class="mw-reflink-text">[upper-roman 13]</span></a></sup></p>',
            '<p><b>France</b> is a country with territory status in western Europe and several overseas regions and territories.</p>');
    });
    it('removes .reference elements - T176519', (done) => {
        tst(done, '<p><b>Charles Milles Manson</b> <sup class="reference nowrap" about="#mwt6" id="mwDQ">:136–7</sup> is an American convicted mass murderer</p>',
            '<p><b>Charles Milles Manson</b> is an American convicted mass murderer</p>');
    });
    it('removes math elements but any math images are shown', (done) => {
        tst(done, '<p>The Planck–Einstein relation connects the particulate photon energy <span class="texhtml "><i>E</i></span> with its associated wave frequency <span class="texhtml "><i>f</i></span>:</p>\n\n<dl id="mwmQ"><dd id="mwmg"><span class="mwe-math-element"><span class="mwe-math-mathml-inline mwe-math-mathml-a11y" style="display: none;"><math xmlns="http://www.w3.org/1998/Math/MathML">\n  <semantics>\n    <mrow class="MJX-TeXAtom-ORD">\n      <mstyle displaystyle="true" scriptlevel="0">\n        <mi>E</mi>\n        <mo>=</mo>\n        <mi>h</mi>\n        <mi>f</mi>\n      </mstyle>\n    </mrow>\n    <annotation encoding="application/x-tex">{\\displaystyle E=hf}</annotation>\n  </semantics>\n</math></span><img src="https://wikimedia.org/api/rest_v1/media/math/render/svg/f39fac3593bb1e2dec0282c112c4dff7a99007f6" class="mwe-math-fallback-image-inline" aria-hidden="true" style="vertical-align: -0.671ex; width:7.533ex; height:2.509ex"></span></dd></dl>',
            '<p>The Planck–Einstein relation connects the particulate photon energy <span class="texhtml "><i>E</i></span> with its associated wave frequency <span class="texhtml "><i>f</i></span>:</p>\n\n<dl><dd><span class="mwe-math-element"><img src="https://wikimedia.org/api/rest_v1/media/math/render/svg/f39fac3593bb1e2dec0282c112c4dff7a99007f6" class="mwe-math-fallback-image-inline" aria-hidden="true" style="vertical-align:-0.671ex;width:7.533ex;height:2.509ex" /></span></dd></dl>');
    });
    it('keeps elements with style="display:none;"', (done) => {
        // BTW, unneeded spaces are removed but that is just a side-effect we don't care too much about.
        tst(done, '<span style="display: none">I\'m invisible but still here.</span>',
            '<span style="display:none">I\'m invisible but still here.</span>');
    });
    it('removes parentheticals', (done) => {
        tst(done, 'Hello world (this is in brackets and will be stripped) and goodnight.',
            'Hello world and goodnight.');
    });
    it('removes multiple parentheticals', (done) => {
        tst(done, 'Hello world (this is in brackets and will be stripped) and (I will also be stripped) goodnight.',
            'Hello world and goodnight.');
    });
    it('keeps parentheticals without spaces', (done) => {
        tst(done, 'Hello world (HW) and goodnight.',
            'Hello world (HW) and goodnight.');
    });
    it('keeps parentheticals without spaces even if there are spaces in the HTML syntax', (done) => {
        tst(done, '<p>CH<sub id="mwCg">3</sub>(CH<sub id="mwCw">2</sub>)<sub id="mwDA">12</sub>COOH.</p>',
            '<p>CH<sub>3</sub>(CH<sub>2</sub>)<sub>12</sub>COOH.</p>');
    });
    it('keeps parentheticals when they contain more complex formulas or links', (done) => {
        // no space before `(`...
        // https://en.wikipedia.org/api/rest_v1/page/html/Nephrite/822315108
        tst(done, 'is <a rel="mw:WikiLink" href="./Calcium" title="Calcium" id="mwDA">Ca</a><sub id="mwDQ">2</sub>(<a rel="mw:WikiLink" href="./Magnesium" title="Magnesium" id="mwDg">Mg</a>, <a rel="mw:WikiLink" href="./Iron" title="Iron" id="mwDw">Fe</a>)<sub id="mwEA">5</sub><a rel="mw:WikiLink" href="./Silicon" title="Silicon" id="mwEQ">Si</a><sub id="mwEg">8</sub><a rel="mw:WikiLink" href="./Oxygen" title="Oxygen" id="mwEw">O</a><sub id="mwFA">22</sub>(O<a rel="mw:WikiLink" href="./Hydrogen" title="Hydrogen" id="mwFQ">H</a>)<sub id="mwFg">2</sub>.',
            'is Ca<sub>2</sub>(Mg, Fe)<sub>5</sub>Si<sub>8</sub>O<sub>22</sub>(OH)<sub>2</sub>.');
    });
    it('keeps all parentheticals when they contain complex formulas or links', (done) => {
        // make sure no parentheses get stripped when striping of nested parentheticals is skipped
        // https://bg.wikipedia.org/api/rest_v1/page/html/Клетка/8323524
        tst(done, '<p><b>Клетката</b> е структурна и функционална единица на всички живи организми и понякога е наричана <i>„най-малката единица на живот“</i>. Тя може да се самообновява, саморегулира и самовъзпроизвежда. Някои организми, като <a href="./Бактерия" class="mw-redirect">бактериите</a>, са <a href="./Едноклетъчно">едноклетъчни</a> (съставени само от една клетка). Други организми, като <a href="./Човек">човека</a>, са <a href="./Многоклетъчни" class="mw-redirect">многоклетъчни</a>. (Човекът има приблизително 100 трилиона (10<sup>14</sup>) клетки, като нормалната големина на една клетка е 10<span typeof="mw:Entity" id="mwHA">&nbsp;</span> <a rel="mw:WikiLink" href="./Микрометър" title="Микрометър" id="mwHQ" class="mw-redirect">µm</a>, а масата и<span typeof="mw:Entity">̀</span> е около 1<span typeof="mw:Entity">&nbsp;</span> <a href="./Грам">ng</a>). Най-голямата клетка е тази на неоплоденото <a href="./Щраус">щраусово</a> <a href="./Яйце_(зоология)">яйце</a>.</p>',
            '<p><b>Клетката</b> е структурна и функционална единица на всички живи организми и понякога е наричана <i>„най-малката единица на живот“</i>. Тя може да се самообновява, саморегулира и самовъзпроизвежда. Някои организми, като бактериите, са едноклетъчни (съставени само от една клетка). Други организми, като човека, са многоклетъчни. (Човекът има приблизително 100 трилиона (10<sup>14</sup>) клетки, като нормалната големина на една клетка е 10 µm, а масата ѝ е около 1 ng). Най-голямата клетка е тази на неоплоденото щраусово яйце.</p>');
    });
    it('removes empty parentheticals also when nested parenthetical stripping is suspended', (done) => {
        // https://en.wikipedia.org/api/rest_v1/page/html/Switzerland/822990856
        tst(done, '<p><b>Switzerland</b> (), officially the <b>Swiss Confederation</b>. [...] (land area 39,997 km<sup>2</sup></p>',
            '<p><b>Switzerland</b>, officially the <b>Swiss Confederation</b>. [...] (land area 39,997 km<sup>2</sup></p>');
    });
    it('keeps some nested parentheticals with formulas intact', (done) => {
        // https://en.wikipedia.org/api/rest_v1/page/html/Organic_acid_anhydride
        tst(done, 'the formula of the anhydride being (RC(O))<sub id="mwDw">2</sub>O.',
            'the formula of the anhydride being (RC(O))<sub>2</sub>O.');
    });
    it('removes nested parentheticals without spaces', (done) => {
        tst(done, 'Hello world (this is in brackets and will be stripped (HW) it will all go (trust me)) and goodnight.',
            'Hello world and goodnight.');
    });
    it('removes nested parentheticals without other characters between the ()', (done) => {
        tst(done, '<p>Wazz ((listen) this will be removed) up (and this)</p>',
            '<p>Wazz up</p>');
    });
    it('removes nested parentheticals with leading &nbsp; (or space)', (done) => {
        // The whitespace character is retained.
        // https://es.wikipedia.org/api/rest_v1/page/html/Grecia/105177728
        tst(done, 'República Helénica (some IPA)',
            'República Helénica ');
    });
    it('removes trailing spaces after punctuation before closing tag', (done) => {
        tst(done, '<p>Wazz\'up? </p>',
            '<p>Wazz\'up?</p>');
    });
    it('flattens nested empty spans', (done) => {
        // Should remove nested empty spans
        tst(done, 'Hello (<span><span><span></span></span><span></span></span>) darkness',
            'Hello darkness');
    });
    it('removes some IPAs in nested partentheses', (done) => {
        tst(done, '<p><b>Azerbaijan</b> (<small>æ(listen)</small> <i>AZ</i>; <span>Azerbaijani:</span><span>  Azərbaycan</span>, officially the <b>Republic of Azerbaijan</b> (Azerbaijani: Azərbaycan Respublikası)), is a country.</p>',
            '<p><b>Azerbaijan</b>, is a country.</p>');
    });
    it('ignores parentheticals inside a data-mw attribute', (done) => {
        tst(done, '<p><b>Shakira Isabel Mebarak Ripoll</b> (<small data-mw="(t) <!--Arabic (Spanish pronunciation)">pronounced<span>&nbsp;</span></small><span class="IPA"><span>[(t)ʃaˈkiɾa isaˈβel meβaˈɾak riˈpol]</span></span>; <span><span class="ipa_button"></span><span class="nowrap mcs-ipa"><small>English: </small><span class="IPA nopopups noexcerpt"><span>/<span style="border-bottom:1px dotted"><span>ʃ</span><span>ə</span><span>ˈ</span><span>k</span><span>iː</span><span>r</span><span>ə</span></span>/</span></span></span></span>; born 2 February 1977) is a Colombian singer, songwriter, dancer.</p>',
            '<p><b>Shakira Isabel Mebarak Ripoll</b> is a Colombian singer, songwriter, dancer.</p>');
    });
    it('removes content in parentheticals + double spaces', (done) => {
        tst(done, '<p><b>Epistemology</b> (<span class="nowrap"><span class="IPA nopopups noexcerpt"><span>/<span style="border-bottom:1px dotted"><span title="/ɪ/ or /ə/ \'e\' in \'roses\'">ᵻ</span><span title="/ˌ/ secondary stress follows">ˌ</span><span title="\'p\' in \'pie\'">p</span><span title="/ɪ/ short \'i\' in \'bid\'">ɪ</span><span title="\'s\' in \'sigh\'">s</span><span title="\'t\' in \'tie\'">t</span><span title="/ɪ/ or /ə/ \'e\' in \'roses\'">ᵻ</span><span title="/ˈ/ primary stress follows">ˈ</span><span title="\'m\' in \'my\'">m</span><span title="/ɒ/ short \'o\' in \'body\'">ɒ</span><span title="\'l\' in \'lie\'">l</span><span title="/ə/ \'a\' in \'about\'">ə</span><span title="/dʒ/ \'j\' in \'jam\'">dʒ</span><span title="/i/ \'y\' in \'happy\'">i</span></span>/</span></span><small class="nowrap metadata">&nbsp;(<span class="unicode haudio"><span class="fn"><span style="white-space:nowrap"><span><img alt="About this sound" src="//upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Loudspeaker.svg/11px-Loudspeaker.svg.png" width="11" height="11" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Loudspeaker.svg/17px-Loudspeaker.svg.png 1.5x, //upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Loudspeaker.svg/22px-Loudspeaker.svg.png 2x" data-file-width="20" data-file-height="20"></span>&nbsp;</span><span>listen</span></span></span>)</small></span>; from <span>Greek</span> <span lang="gre" xml:lang="gre"><span >ἐπιστήμη</span><i>, epistēmē</i></span>, meaning \'knowledge\', and <span lang="" xml:lang=""><span>λόγος</span><i>, <span>logos</span></i></span>, meaning \'logical discourse\') is the <span>branch</span> of <span>philosophy</span> concerned with the theory of <span>knowledge</span>.</p>',
            '<p><b>Epistemology</b> is the branch of philosophy concerned with the theory of knowledge.</p>');
    });
    it('removes birth and death dates inside parentheticals', (done) => {
        tst(done, 'William Shakespeare (/ˈʃeɪkspɪər/;[1] 26 April 1564 (baptised) – 23 April 1616) was an English poet, playwright, and actor, widely regarded as the greatest writer in the English language and the world\'s pre-eminent dramatist. He is often called England\'s national poet, and the "Bard of Avon". His extant works, including collaborations, consist of approximately 38 plays, 154 sonnets, two long narrative poems, and a few other verses, some of uncertain authorship. His plays have been translated into every major living language and are performed more often than those of any other playwright.',
            'William Shakespeare was an English poet, playwright, and actor, widely regarded as the greatest writer in the English language and the world\'s pre-eminent dramatist. He is often called England\'s national poet, and the "Bard of Avon". His extant works, including collaborations, consist of approximately 38 plays, 154 sonnets, two long narrative poems, and a few other verses, some of uncertain authorship. His plays have been translated into every major living language and are performed more often than those of any other playwright.');
    });
    it('removes parentheticals contain \'*\' symbols', (done) => {
        tst(done, 'Marek Eben (* 18. prosince 1957 Praha) je český herec, moderátor, hudební skladatel, písničkář a zpěvák.',
            'Marek Eben je český herec, moderátor, hudební skladatel, písničkář a zpěvák.');
    });
    it('removes content inside Chinese parentheticals', (done) => {
        tst(done, '<p><b>台北101</b>（<b>TAIPEI 101</b>）是位於的，樓高509.2米（1,671英尺），樓層共有101層、另有5層，總樓地板面積37萬4千，由設計，團隊、韩国等承造，於1999年動工，2004年12月31日完工啟用；最初名稱為<b>台北國際金融中心</b>（<span lang="en">Taipei World Financial Center</span>），2003年改為現名，亦俗稱為<b>101大樓</b>。興建與經營機構為。其為，曾於2004年12月31日至2010年1月4日間擁有的紀錄，目前為以及環最高，完工以來即成為重要之一。此外，大樓內擁有全球第二大的（僅次）、全球唯二開放遊客觀賞的巨型阻尼器（另一個為上海中心之「上海慧眼」），以及全球起降速度第四快的，僅次於、與。</p>',
            '<p><b>台北101</b> 是位於的，樓高509.2米（1,671英尺），樓層共有101層、另有5層，總樓地板面積37萬4千，由設計，團隊、韩国等承造，於1999年動工，2004年12月31日完工啟用；最初名稱為<b>台北國際金融中心</b>，2003年改為現名，亦俗稱為<b>101大樓</b>。興建與經營機構為。其為，曾於2004年12月31日至2010年1月4日間擁有的紀錄，目前為以及環最高，完工以來即成為重要之一。此外，大樓內擁有全球第二大的（僅次）、全球唯二開放遊客觀賞的巨型阻尼器（另一個為上海中心之「上海慧眼」），以及全球起降速度第四快的，僅次於、與。</p>');
    });
    it('removes content inside Japanese parentheticals', (done) => {
        tst(done, '<p><b>台湾</b>（たいわん、: <span lang="zh" xml:lang="zh">臺灣 / 台灣</span>、: Tâi-oân）は、のである。</p>',
            '<p><b>台湾</b> は、のである。</p>');
    });
    it('removes content inside Cantonese parentheticals', (done) => {
        tst(done, '<p><b>蔡英文</b>（<b>Tsai Ing-wen</b>，<a>1956年</a><a>8月31號</a>—）係現任<a>中華民國總統</a>，<a>臺灣</a>學者同埋<a>政治</a>人，<a>民主進步黨</a><a>主席</a>。</p>',
            '<p><b>蔡英文</b> 係現任中華民國總統，臺灣學者同埋政治人，民主進步黨主席。</p>');
    });
    it('removes content inside parentheticals written in `wuu` language variant', (done) => {
        tst(done, '<p><b>东亚</b>（日文：東アジア ‧ 東亜，韩文：東아시아，西文：Asia Oriental）是一个比较笼统个地理概念，立在弗同个语境当中有弗一样个含义。东亚个概念来自<a>欧洲</a>人对东方个定位，拿<a>博斯普鲁斯海峡</a>、<a class="new">乌拉尔山脉</a>东面个广大欧亚大陆地区侪通称亚洲，拿西太平洋沿岸、欧亚大陆东端个地区就叫做<a class="mw-selflink selflink">东亚</a>。</p>',
            '<p><b>东亚</b> 是一个比较笼统个地理概念，立在弗同个语境当中有弗一样个含义。东亚个概念来自欧洲人对东方个定位，拿博斯普鲁斯海峡、乌拉尔山脉东面个广大欧亚大陆地区侪通称亚洲，拿西太平洋沿岸、欧亚大陆东端个地区就叫做<span class="mw-selflink selflink">东亚</span>。</p>');
    });
    it('removes content inside parentheticals written in `gan` language variant', (done) => {
        tst(done, '<p><b>亞細亞洲</b>（古希臘文：Ασία），又簡稱<b>亞洲</b>，絕大部分都位到北半球，係全世界上最大，最多人嗰一隻<a class="mw-redirect">洲</a>。佢東頭一徑到白令海峽嗰傑日尼奧夫角（西經169度40分，北緯60度5分），南頭一徑到努沙登加拉群島（東經103度30分，南緯11度7分），西頭一徑到巴巴角（東經26度3分，北緯39度27分），北頭一徑到切柳斯金角（東經104度18分，北緯77度43分），最高嗰山係<a>珠穆朗瑪峰</a>。亞洲東西嗰時差係11小時。佢西首連到<a>歐洲</a>，箇就係世界上最大嗰大陸-<a class="new">歐亞大陸</a>。</p>',
            '<p><b>亞細亞洲</b>，又簡稱<b>亞洲</b>，絕大部分都位到北半球，係全世界上最大，最多人嗰一隻洲。佢東頭一徑到白令海峽嗰傑日尼奧夫角，南頭一徑到努沙登加拉群島，西頭一徑到巴巴角，北頭一徑到切柳斯金角，最高嗰山係珠穆朗瑪峰。亞洲東西嗰時差係11小時。佢西首連到歐洲，箇就係世界上最大嗰大陸-歐亞大陸。</p>');
    });
    it('keeps parentheticals if it doesn\'t include any spaces', (done) => {
        tst(done, '<p>Der <b>Deutsche Orden</b>, auch <b>Deutschherrenorden</b> oder <b>Deutschritterorden</b> genannt, ist eine römisch-katholische <a>Ordensgemeinschaft</a>. Mit dem <a>Johanniter-</a> und dem <a>Malteserorden</a> steht er in der (Rechts-)Nachfolge der <a>Ritterorden</a> aus der Zeit der <a>Kreuzzüge</a>. Die Mitglieder des Ordens sind seit der Reform der Ordensregel 1929 <a>regulierte Chorherren</a>. Der Orden hat gegenwärtig 1100 Mitglieder, darunter 100 <a>Priester</a> und 200 Ordensschwestern, die sich vorwiegend karitativen Aufgaben widmen. Der Hauptsitz befindet sich heute in <a>Wien</a>.</p>',
            '<p>Der <b>Deutsche Orden</b>, auch <b>Deutschherrenorden</b> oder <b>Deutschritterorden</b> genannt, ist eine römisch-katholische Ordensgemeinschaft. Mit dem Johanniter- und dem Malteserorden steht er in der (Rechts-)Nachfolge der Ritterorden aus der Zeit der Kreuzzüge. Die Mitglieder des Ordens sind seit der Reform der Ordensregel 1929 regulierte Chorherren. Der Orden hat gegenwärtig 1100 Mitglieder, darunter 100 Priester und 200 Ordensschwestern, die sich vorwiegend karitativen Aufgaben widmen. Der Hauptsitz befindet sich heute in Wien.</p>');
    });
    it('keeps parentheticals with single word and leading space inside and out', (done) => {
        tst(done, '<p>Pilot error was ( sic) the cause of the crash</p>',
            '<p>Pilot error was ( sic) the cause of the crash</p>');
    });
    it('removes parentheticals with multiple words and leading space inside and out', (done) => {
        tst(done, '<p>The golden age ( 1917 to 1980) saw lots of inventions.</p>',
            '<p>The golden age saw lots of inventions.</p>');
    });
    it('removes empty parentheticals with leading comma', (done) => {
        tst(done, '<p><b>Cape Verde</b> (), or <b>Cabo Verde</b> (, ), is an island country.</p>',
            '<p><b>Cape Verde</b>, or <b>Cabo Verde</b>, is an island country.</p>');
    });
    it('removes parentheticals beginning and ending with spaces', (done) => {
        tst(done, '<p>The <b>Scythian languages</b> ( or ) are a group of Eastern Iranian languages.</p>',
            '<p>The <b>Scythian languages</b> are a group of Eastern Iranian languages.</p>');
    });
    it('removes nested parentheticals for non-Latin parens', (done) => {
        tst(done, '<p><b>羽生 結弦</b>（はにゅう ゆづる、1994年（平成6年）12月7日 - ）は、宮城県仙台市泉区出身のフィギュアスケート選手（男子シングル）。</p>',
            '<p><b>羽生 結弦</b> は、宮城県仙台市泉区出身のフィギュアスケート選手（男子シングル）。</p>');
    });
    it('removes parentheticals with multiple words and leading &nbsp;', (done) => {
        // Content inside parentheticals with multiple words and leading &nbsp; is stripped
        // https://en.wikipedia.org/api/rest_v1/page/html/Ottoman_Empire/822890778
        tst(done, '<p>The Ottoman Empire&nbsp;(/ˈɒtəmən/; Ottoman Turkish: ...) was</p>',
            '<p>The Ottoman Empire was</p>');
    });
    it('parentheticals stripping is not greedy', (done) => {
        tst(done, '<p>Spain (Spanish: España [esˈpaɲa]), officially the Kingdom of Spain (Spanish: Reino de España), is a sovereign state located on the Iberian Peninsula in southwestern Europe, with two large archipelagoes, the Balearic Islands in the Mediterranean Sea and the Canary Islands off the North African Atlantic coast, two cities, Ceuta and Melilla, in the North African mainland and several small islands in the Alboran Sea near the Moroccan coast. The country\'s mainland is bordered to the south and east by the Mediterranean Sea except for a small land boundary with Gibraltar; to the north and northeast by France, Andorra, and the Bay of Biscay; and to the west and northwest by Portugal and the Atlantic Ocean. It is the only European country to have a border with an African country (Morocco) and its African territory accounts for nearly 5% of its population, mostly in the Canary Islands but also in Ceuta and Melilla</p>',
            '<p>Spain, officially the Kingdom of Spain, is a sovereign state located on the Iberian Peninsula in southwestern Europe, with two large archipelagoes, the Balearic Islands in the Mediterranean Sea and the Canary Islands off the North African Atlantic coast, two cities, Ceuta and Melilla, in the North African mainland and several small islands in the Alboran Sea near the Moroccan coast. The country\'s mainland is bordered to the south and east by the Mediterranean Sea except for a small land boundary with Gibraltar; to the north and northeast by France, Andorra, and the Bay of Biscay; and to the west and northwest by Portugal and the Atlantic Ocean. It is the only European country to have a border with an African country (Morocco) and its African territory accounts for nearly 5% of its population, mostly in the Canary Islands but also in Ceuta and Melilla</p>');
    });
    it('full stops do not impact the summary length (T173640)', (done) => {
        tst(done, '<p><a href="./Armádní_generál" title="Armádní generál">Arm. gen.</a> <a href="./Inženýr" title="Inženýr">Ing.</a> <b>Petr Pavel</b>, <span class="new">M.A.</span>, (*<span>&nbsp;</span><a href="./1._listopad" title="1. listopad">1.<span>&nbsp;</span>listopadu</a> <a href="./1961" title="1961">1961</a> <a href="./Planá" title="Planá">Planá</a>) je <a href="./Česko" title="Česko">český</a> <a href="./Voják" title="Voják">voják</a>, <a href="./Generál" title="Generál">generál</a> <a href="./Armáda_České_republiky" title="Armáda České republiky">Armády České republiky</a> a<span> </span>od června 2015 <a href="./Předseda_vojenského_výboru_NATO" title="Předseda vojenského výboru NATO">předseda vojenského výboru NATO</a>. Jako první zástupce zemí bývalé <a href="./Varšavská_smlouva" title="Varšavská smlouva">Varšavské smlouvy</a> tak nastoupil do nejvyšší vojenské funkce <a href="./Severoatlantická_aliance" title="Severoatlantická aliance">Severoatlantické aliance</a>.<sup class="mw-ref" id="cite_ref-nastup_NATO_1-0"><a href="./Petr_Pavel#cite_note-nastup_NATO-1" style="counter-reset: mw-Ref 1;"><span class="mw-reflink-text">[1]</span></a></sup><sup class="mw-ref" id="cite_ref-ihned_2-0"><a href="./Petr_Pavel#cite_note-ihned-2" style="counter-reset: mw-Ref 2;"><span class="mw-reflink-text">[2]</span></a></sup></p>',
            '<p>Arm. gen. Ing. <b>Petr Pavel</b>, <span class="new">M.A.</span>, je český voják, generál Armády České republiky a od června 2015 předseda vojenského výboru NATO. Jako první zástupce zemí bývalé Varšavské smlouvy tak nastoupil do nejvyšší vojenské funkce Severoatlantické aliance.</p>');
    });
    it('keeps bold elements', (done) => {
        tst(done, '<p><b>Vladimír Dlouhý</b> (*<span>&nbsp;</span><a href="./31._červenec" title="31. červenec">31. července</a> <a href="./1953" title="1953">1953</a> <a href="./Praha" title="Praha">Praha</a>) je <a href="./Češi" title="Češi">český</a> <a href="./Ekonom" title="Ekonom">ekonom</a> a <a href="./Politik" title="Politik">politik</a>, bývalý místopředseda strany <a href="./Občanská_demokratická_aliance" title="Občanská demokratická aliance">ODA</a> a ministr průmyslu a obchodu v letech <a href="./1992" title="1992">1992</a>–<a href="./1997" title="1997">1997</a> ve <a href="./První_vláda_Václava_Klause" title="První vláda Václava Klause">vládě Václava Klause</a>. V<span>&nbsp;</span>letech <a href="./1989" title="1989">1989</a>–<a href="./1992" title="1992">1992</a> byl ministrem hospodářství <a href="./Česká_a_Slovenská_Federativní_Republika" title="Česká a Slovenská Federativní Republika">ČSFR</a>. Nyní působí v&nbsp;soukromé sféře a věnuje se poradenské a pedagogické činnosti, v <a href="./Květen" title="Květen">květnu</a> <a href="./2014" title="2014">2014</a> byl zvolen prezidentem <a href="./Hospodářská_komora_České_republiky" title="Hospodářská komora České republiky">Hospodářské komory ČR</a>.</p>',
            '<p><b>Vladimír Dlouhý</b> je český ekonom a politik, bývalý místopředseda strany ODA a ministr průmyslu a obchodu v letech 1992–1997 ve vládě Václava Klause. V letech 1989–1992 byl ministrem hospodářství ČSFR. Nyní působí v soukromé sféře a věnuje se poradenské a pedagogické činnosti, v květnu 2014 byl zvolen prezidentem Hospodářské komory ČR.</p>');
    });
    it('reduces multiple spaces to single space', (done) => {
        tst(done, '<p>The <b>.NET Foundation</b> is an independent organization, incorporated on March 31, 2014,<sup class="mw-ref" id="cite_ref-corp_1-1"><a href="./.NET_Foundation#cite_note-corp-1" style="counter-reset: mw-Ref 1;"><span class="mw-reflink-text">[1]</span></a></sup> by <a href="./Microsoft" title="Microsoft">Microsoft</a>, to improve <a href="./Open-source_software" title="Open-source software">open-source software</a> development and collaboration around the <a href="./.NET_Framework" title=".NET Framework">.NET Framework</a>.<sup class="mw-ref" id="cite_ref-tc2014_4-0"><a href="./.NET_Foundation#cite_note-tc2014-4" style="counter-reset: mw-Ref 4;"><span class="mw-reflink-text">[4]</span></a></sup> It was launched at the annual <a href="./Build_(developer_conference)#2014" title="Build (developer conference)">Build 2014</a> conference held by Microsoft.<sup class="mw-ref" id="cite_ref-msot1_5-0"><a href="./.NET_Foundation#cite_note-msot1-5" style="counter-reset: mw-Ref 5;"><span class="mw-reflink-text">[5]</span></a></sup> The foundation is license-agnostic, and projects that come to the foundation are free to choose any <a href="./Open-source_license" title="Open-source license">open-source license</a>, as defined by the <a href="./Open_Source_Initiative" title="Open Source Initiative">Open Source Initiative</a> (OSI).<sup class="mw-ref" id="cite_ref-faq_6-0"><a href="./.NET_Foundation#cite_note-faq-6" style="counter-reset: mw-Ref 6;"><span class="mw-reflink-text">[6]</span></a></sup> The foundation uses <a href="./GitHub" title="GitHub">GitHub</a> to host the open-source projects it manages.<sup class="mw-ref" id="cite_ref-gh_7-0"><a href="./.NET_Foundation#cite_note-gh-7" style="counter-reset: mw-Ref 7;"><span class="mw-reflink-text">[7]</span></a></sup></p>',
            '<p>The <b>.NET Foundation</b> is an independent organization, incorporated on March 31, 2014, by Microsoft, to improve open-source software development and collaboration around the .NET Framework. It was launched at the annual Build 2014 conference held by Microsoft. The foundation is license-agnostic, and projects that come to the foundation are free to choose any open-source license, as defined by the Open Source Initiative (OSI). The foundation uses GitHub to host the open-source projects it manages.</p>');
    });
    it('strip space before punctuation followed by tags', (done) => {
        tst(done, '<p><b>Brasília</b> (<small about="#mwt10" typeof="mw:Transclusion" data-mw="{&quot;parts&quot;:[{&quot;template&quot;:{&quot;target&quot;:{&quot;wt&quot;:&quot;IPA-pt&quot;,&quot;href&quot;:&quot;./Template:IPA-pt&quot;},&quot;params&quot;:{&quot;1&quot;:{&quot;wt&quot;:&quot;bɾaˈziljɐ&quot;}},&quot;i&quot;:0}}]}" id="mwCg">Portuguese pronunciation:<span>&nbsp;</span></small><span class="IPA"><a href="./Help:IPA/Portuguese" title="Help:IPA/Portuguese">[bɾaˈziljɐ]</a></span>) is the <a href="./Federal_capital" title="Federal capital">federal capital</a> of <a href="./Brazil" title="Brazil">Brazil</a> and <a href="./Seat" title="Seat">seat</a> of <a href="./Forms_of_government" title="Forms of government" class="mw-redirect">government</a> of the <a href="./Federal_District_(Brazil)" title="Federal District (Brazil)">Federal District</a>. The city is located atop the <a href="./Brazilian_highlands" title="Brazilian highlands" class="mw-redirect">Brazilian highlands</a> in the country\'s <a href="./Central-West_Region,_Brazil" title="Central-West Region, Brazil">center-western</a> region. It was founded on April 21, 1960, to serve as the new national capital. Brasília were estimated to be Brazil\'s <a href="./List_of_largest_cities_in_Brazil" title="List of largest cities in Brazil">3rd most populous city</a>.<sup class="mw-ref" id="cite_ref-pop_3-1"><a href="./Brasília#cite_note-pop-3" style="counter-reset: mw-Ref 2;"><span class="mw-reflink-text">[2]</span></a></sup> Among major <a href="./Latin_America" title="Latin America">Latin</a> American cities, Brasília has the highest <a href="./Gross_domestic_product" title="Gross domestic product">GDP</a> per capita at <span style="white-space: nowrap">R$61,915</span> (<span style="white-space: nowrap">US$36,175</span>).<sup class="mw-ref" id="cite_ref-4"><a href="./Brasília#cite_note-4" style="counter-reset: mw-Ref 3;"><span class="mw-reflink-text">[3]</span></a></sup><sup class="mw-ref" id="cite_ref-5"><a href="./Brasília#cite_note-5" style="counter-reset: mw-Ref 4;"><span class="mw-reflink-text">[4]</span></a></sup></p>',
            '<p><b>Brasília</b> is the federal capital of Brazil and seat of government of the Federal District. The city is located atop the Brazilian highlands in the country\'s center-western region. It was founded on April 21, 1960, to serve as the new national capital. Brasília were estimated to be Brazil\'s 3rd most populous city. Among major Latin American cities, Brasília has the highest GDP per capita at <span>R$61,915</span>.</p>');
    });
});

describe('lib:summarize regex fun', () => {
    it('detects complex chemical formulas', () => {
        assert.ok(lib.testing.reProbableFormulaPresent.test('(RC(O))<sub>2</sub>O'));
        assert.ok(lib.testing.reProbableFormulaPresent.test('(CO<sub>3</sub>)<sup>2-</sup>'));
        assert.ok(lib.testing.reProbableFormulaPresent.test('Zn<sup>+</sup>'));
        assert.ok(lib.testing.reProbableFormulaPresent.test('10<sup>14</sup>'));
    });
    it('but skips areas', () => {
        assert.ok(!lib.testing.reProbableFormulaPresent.test('km<sub>2</sub>'));
    });
    // it doesn't detect simple atoms but that's ok since those are covered by the single word rule
});
