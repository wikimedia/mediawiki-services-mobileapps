# CSS

PCS provides three CSS endpoints:
* base
* pagelib
* site

## Base CSS
In [April 2019](https://gerrit.wikimedia.org/r/c/mediawiki/services/mobileapps/+/500962/4), we've
 moved away from loading CSS from live ResourceLoader requests to serving them directly from 
 compiled `.less` files in this repo.

### Less/CSS modules

The latest and full list can be found in private/styles/main.less.
In general we're trying to get content styles but not UI styles.

* Reset: `reset.css`
* MinervaNeue: `minerva/*`
  * **Uses `.pre-content`, `.content`, `.mw-content-ltr`, `.mw-content-rtl`, `.post-content`, 
  `.header`, `.page-header-bar`**
* Mediawiki Core: `mediawiki/externallinks`, `mediawiki/pagegallery.css`
* Mediawiki Parsoid: `mediawiki/parsoid`
  * **Uses `.mw-parser-output`** 
* Mediawiki Extensions:
  * [Extension:Cite](https://www.mediawiki.org/wiki/Extension:Cite): `cite/style.css`
  * [Extension:Math](https://www.mediawiki.org/wiki/Extension:Math) : `math/style.css`
  * [Extension:SyntaxHighlight](https://www.mediawiki.org/wiki/Extension:SyntaxHighlight): 
  `pygments/generated.css`, `pygments/wrapper.css`
  * [Extension:EasyTimeline](https://www.mediawiki.org/wiki/Extension:EasyTimeline): 
`timeline/style.css`
  * [Extension:MobileApp](https://www.mediawiki.org/wiki/Extension:MobileApp): `mobileapp/imageOverflow.css`, `mobileapp/ipa.css`, `mobileapp/figure`

### Previous RL modules
* `skins.minerva.base.styles` ([T214728](https://phabricator.wikimedia.org/T214728))
* `skins.minerva.content.styles`
* `mediawiki.page.gallery.styles`
* `mediawiki.skinning.content.parsoid`
* `ext.cite.style`
* `ext.math.styles`
* `ext.pygments`
* `ext.timeline.styles`
* `mobile.app`
* `mobile.app.parsoid`

## Pagelib CSS
Additional styles developed by the apps teams, usually specific to certain DOM transformations.
See the [wikimedia-page-library repo](https://github.com/wikimedia/wikimedia-page-library).

## Site CSS
Site specific CSS. This is the only CSS endpoint that still uses live ResourceLoader requests.

## Update process

TBD. Compare files that have changed in the original locations since the previous update up to
the most recent released version and pull the needed changes in.

The most recent update or check was:
* MinervaNeue: 23a0f5f

### Build
npm run build:css