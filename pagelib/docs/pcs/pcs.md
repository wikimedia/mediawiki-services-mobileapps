# PCS

The wikimedia-page-library-pcs output is an abstraction layer of the page library transforms. It includes the transforms implementation JS and CSS. It's meant to be used together with the HTML from [Page Content Service] mobile-html responses.

### What wikimedia-page-library-pcs is for

- is an adapter of client side to server side mobile-html functionality
- providing an interface for manipulating the presentation of page content (theme, dim images, margins, ...)
- providing an interface for setting up expected event handling on the client side to complement server side DOM transformations (lazy loading, table collapsing, ...)
- providing an interface for retrieving metadata directly from the PCS page (lead image URL, page revision, description, ...)
- to be hosted server-side for clients of PCS mobile-html
- to be run on a client inside a WebView or web browser
- a high level abstraction layer of wikimedia-page-library
- A specific major version knows which DOM transformations have been applied server side on a given page (by including the version in the URL for this adapter) and executes the corresponding client side functionality if and when needed (registering events).
  Examples:
  - Lazy Loading: server side we replace `<img>` tags with `<span>` placeholder elements. Then on the client side (here) we need to replace the placeholders back to the original `<img>` tags when appropriate.
  - Collapse / expand tables

### What wikimedia-page-library-pcs is not for

- not to be bundled with native app versions

### Versions

There are two kinds of versions we are concerned about, client side and server side. Either side could be released and updated at different times than the other.

- Client PCS version: version coupled to clients. Some clients, like native app versions that cannot be or simply have not been updated. It's important to not break older or future clients of this library. These will be prefixed with a `c`, e.g. `c1`. The client-side version will be reflected in the folder/package structure of the exported JS modules.
- Server PCS version: version coupled to server-side mobile-html output. We may have different DOM transformations or different metadata encoded inside HTML in the future. These will be prefixed with a `s`, e.g. `s1`. The server-side version will be reflected in the URL to it when this library is referenced by mobile-html.

### Guidelines

- We plan to host multiple major versions server-side.
- Be liberal with what your API accepts!
  - Consider adding object parameters to functions and set sensible defaults to allow for future arguments to be passed without breaking older clients.
  - Apply some defaults where it’s reasonable to do so. Be prepared for nulls, undefined, or empty string values. Don’t bail when the backend returns additional unexpected properties - just ignore it. Enums: expect unexpected and ignore it.
  - Do not return primitive values. Return JS objects with only one field instead. If you want to return something in addition to the primitive value you won’t need a new API version.
- Identify clients using the `platform` and `clientVersion` preferences. This information is useful to be able to patch things server side if the need arises. This list may not be complete yet. Potentially other device- or user preference specific info might be useful in the future (locale?).
- Only create a new API version when you really have to. You can add new stuff to the current version if it doesn’t affect existing clients.
- Prepare for phasing out an API version. Some old versions you can’t afford to maintain. So define a process for informing clients that you may later not support their version.

## Interface

Clients can set `document.pcsSetupSettings` to an object with the parameters for `pcs.c1.Page.setup()`. The page will apply theme and margin changes from this settings object in `onBodyStart()` before first paint and the rest of the settings after the page fully loads in `onBodyEnd()`. By applying theme and margin changes immediately, the page will no longer need to be hidden during loading by the clients.

Clients can also set `document.pcsActionHandler` to a function that takes a single parameter - an action object. The page call this function with `{action: 'setup'}` after initial setup completes and `{action: 'load_complete'}` when final setup is complete after all content has loaded. It will also make it the interaction handler for the page.

Alternatively, clients can set a `pcsClient` variable that will populate the aforementioned document properties by reading a JSON string from `pcsClient.getSetupSettings()` and passing a JSON string to `pcsClient.onReceiveMessage()`. This is for compatibility with `@JavascriptInterface` on Android.

### Page

#### onBodyStart() and onBodyEnd()

These should not be called directly by the clients. They will be invoked automatically at the start and end of the `body` tag.

#### setup()

Combination of the following calls, changing multiple settings in one single call. The settings are kept in an object. Calling this directly is not required if you set `document.pcsSetupSettings` or a `pcsClient` as defined above.

Setting parameter object fields:

- platform: possible values are 'ios' and 'android'
- clientVersion: string of client version (platform specific)
- l10n: object of localized user visible strings: { addTitleDescription, tableInfobox, tableOther, tableClose }
- loadImages: will images be loaded (defaults to true if omitted)
- theme: possible values are 'default', 'sepia', 'dark', and 'black'
- dimImages: boolean
- margins: object with { top, right, bottom, left }
- leadImageHeight: string that is conditionally added to margins.top if there's a lead image on the page. Units should match margins.top if provided
- areTablesInitiallyExpanded: boolean (Default: tables are collapsed)
- scrollTop: number of pixel for highest position to scroll to. Use this to adjust for any decor overlaying the viewport.
  (The first four fields don't have any equivalent separate call since those don't make sense to change after the fact.)
- userGroups: list of strings of user roles to determine which edit pencils to show example: ['autoconfirmed']

Callback parameter:
Function called after all settings are applied.

Example:

```
pcs.c1.Page.setup({
  platform: 'ios',
  clientVersion: '6.2.1',
  l10n: {
    addTitleDescription: 'Titelbeschreibung bearbeiten',
    tableInfobox: 'Schnelle Fakten',
    tableOther: 'Weitere Informationen',
    tableClose: 'Schließen'
  },
  theme: 'sepia',
  dimImages: true,
  margins: { top: '32px', right: '32px', bottom: '32px', left: '32px' },
  leadImageHeight: '100px',
  areTablesInitiallyExpanded: true,
  textSizeAdjustmentPercentage: '100%',
  scrollTop: 64,
  loadImages: true,
  userGroups: ['autoconfirmed']
},
callback) // optional callback function to be called after all settings are applied
```

#### setTheme()

Sets the theme. See possible values listed in `setup()`.

Example:

```
pcs.c1.Page.setTheme(pcs.c1.Themes.SEPIA)
```

#### setDimImages()

Turns on or off dimming of images.

Example:

```
pcs.c1.Page.setDimImages(true)
```

#### setMargins()

Sets the margins on the `<body>` tag.

Example:

```
pcs.c1.Page.setMargins({ top: '128px', right: '32px', bottom: '16px', left: '32px' })
```

#### setScrollTop()

Sets the top-most vertical position to scroll to in pixel. Use this to adjust for any decor overlaying the top of the viewport. Default: 0

Example:

```
pcs.c1.Page.setScrollTop(64)
```

#### getProtection()

Gets the edit protections of the current page.

Example:

```
pcs.c1.Page.getProtection()
```

Returns a map with protection status:

```
{edit: "autoconfirmed", move: "sysop"}
```

#### getRevision()

Gets the revision of the current page as a string.

Example:

```
pcs.c1.Page.getRevision()
```

returns '907165344'

#### getTableOfContents()

Gets the table of contents of the current page.

Example:

```
pcs.c1.Page.getTableOfContents()
```

Returns an array of objects that correspond to sections in the article. An example JSON representation (with some sections removed for brevity) would be:

```
[
  {
    "level": 1,
    "id": 1,
    "number": "1",
    "anchor": "Terminology",
    "title": "Terminology"
  },
  {
    "level": 1,
    "id": 2,
    "number": "2",
    "anchor": "Taxonomy",
    "title": "Taxonomy"
  },
  ...
  {
    "level": 2,
    "id": 5,
    "number": "4.1",
    "anchor": "Anatomy",
    "title": "Anatomy"
  },
  ...
  {
    "level": 1,
    "section": 45,
    "number": "14",
    "anchor": "External_links",
    "title": "External links"
  }
]
```

#### setTextSizeAdjustmentPercentage(percentageString)

Sets the text-adjust-size property percentage allowing native clients to adjust the font-size. This CSS property is not supported in all browsers, you can check which browsers support it in the following link, https://caniuse.com/#feat=text-size-adjust

The input needs to be a string like '10%'. Example:

```
pcs.c1.Page.setTextSizeAdjustmentPercentage('10%')
```

#### setEditButtons(isEditable, isProtected, onSuccess)

Enables or disables the edit buttons on the page. The default is edit buttons are off but it's probably best to not assume that.
The second boolean is whether to show the protected edit pencils.

All parameters are optional. Default is false, false.

Example:

```
pcs.c1.Page.setEditButtons(true, false)
```

### Sections

A set of utilities to handle Sections properties.

#### getOffsets()

Gets Section Offsets object to handle quick scrolling in the table of contents.

Example:

```
pcs.c1.Sections.getOffsets()
```

### Footer

#### add()

Adds a footer to the page showing metadata of the page, like how many other languages it's available in, when it was last edited, links to history, talk pages, read more, view in browser, license text, reference list.

Example:

```
pcs.c1.Footer.add({
  platform: pcs.c1.Platforms.IOS,
  clientVersion: '6.2.1',
  title: 'Knight Lore',
  menu: {
    items: [pcs.c1.Footer.MenuItemType.languages, pcs.c1.Footer.MenuItemType.lastEdited, pcs.c1.Footer.MenuItemType.pageIssues, pcs.c1.Footer.MenuItemType.disambiguation, pcs.c1.Footer.MenuItemType.talkPage, pcs.c1.Footer.MenuItemType.referenceList],
    fragment: "pcs-menu"
  },
  l10n: {
    'readMoreHeading': 'Read more',
    'menuDisambiguationTitle': 'Similar pages',
    'menuLanguagesTitle': 'Available in 9 other languages',
    'menuHeading': 'About this article',
    'menuLastEditedSubtitle': 'Full edit history',
    'menuLastEditedTitle': 'Edited today',
    'licenseString': 'Content is available under $1 unless otherwise noted.',
    'menuTalkPageTitle': 'View talk page',
    'menuPageIssuesTitle': 'Page issues',
    'viewInBrowserString': 'View article in browser',
    'licenseSubstitutionString': 'CC BY-SA 3.0',
    'menuCoordinateTitle': 'View on a map',
    'menuReferenceListTitle': 'References'
  },
  readMore: {
    itemCount: 3,
    baseURL: 'https://en.wikipedia.org/api/rest_v1',
    fragment: "pcs-read-more"
  }
})
```

readMoreBaseURL:

- production: `'https://en.wikipedia.org/api/rest_v1'`
- local RB: `'http://localhost:7231/en.wikipedia.org/v1'`

### InteractionHandling

Calling this directly is not required if you set `document.pcsActionHandler` or a `pcsClient` as defined above.

#### setInteractionHandler()

Sets up callbacks for select events originating from the WebView.

Example for testing:

```
pcs.c1.InteractionHandling.setInteractionHandler((interaction) => { console.log(JSON.stringify(interaction)) })
```

iOS:

```
pcs.c1.InteractionHandling.setInteractionHandler((interaction) => { window.webkit.messageHandlers.interaction.postMessage(interaction) })
```

Android:

```
pcs.c1.InteractionHandling.setInteractionHandler((interaction) => { window.InteractionWebInterface.post(interaction) })
```

Currently the following actions can be emitted:

```
const Actions = {
  LinkClicked
  ImageClicked,
  ReferenceClicked,
  EditSection,
  AddTitleDescription,
  PronunciationClicked,

  /* Footer related actions: */
  FooterItemSelected,
  SaveOtherPage,
  ReadMoreTitlesRetrieved,
  ViewLicense,
  ViewInBrowser,
}
```

#### getSelectionInfo()

Gets information about the currently selected text.

Example for testing:

```
pcs.c1.InteractionHandling.getSelectionInfo()
```

Should return something along the lines of:

```
{
  text: "selected text here",
  section: "1", // section id or null if outside of a section
  isTitleDescription: false // true if the selection starts in the title description
}
```

[Page Content Service]: https://www.mediawiki.org/wiki/Page_Content_Service
