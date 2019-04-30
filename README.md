# mediawiki-services-mobileapps [![Build Status](https://travis-ci.org/wikimedia/mediawiki-services-mobileapps.svg?branch=master)](https://travis-ci.org/wikimedia/mediawiki-services-mobileapps)

MediaWiki Services in Node.js for Mobile Apps.
This service is a facade the mobile apps can use to improve runtime performance by
* bundling multiple requests,
* performing DOM manipulations once on the server instead of on the clients,
* avoiding downloading of DOM elements that are not displayed in the apps and therefore not needed,
* taking advantage of caching via RESTBase, and
* take advantage of streaming by being able to use WebView.loadUrl() instead of piping every page section by section over the JS bridge.

Furthermore this can also speed up development by
* combining the DOM manipulation code for both apps into a single service,
* simplifying DOM manipulation code by moving it to JavaScript,
* flattening the JSON structure, and
* simplifying code because now the apps can use WebView.loadUrl() instead of piping every page section by section over the JS bridge.

More improvements and more endpoints are possible. We could also consider using streaming on the service side. But I'll leave that as a later exercise.

Note: This is currently in early development and things are going to change without notice.

More information can be found on the [wiki](https://www.mediawiki.org/wiki/Wikimedia_Apps/Team/RESTBase_services_for_apps).

## Getting Started

### Installation

First, clone the repository

```
git clone https://gerrit.wikimedia.org/r/mediawiki/services/mobileapps
```

Install the dependencies

```
cd mobileapps
npm install
```

You are now ready to get to work!

* Inspect/modify/configure `app.js`
* Add routes by placing files in `routes/` (look at the files there for examples)

You can also read [the ServiceTemplateNode documentation](https://www.mediawiki.org/wiki/ServiceTemplateNode).

### Running the service

To start the server hosting the REST API, simply run (inside the repo's directory)

```
npm start
```

This starts an HTTP server listening on `localhost:6927`.

### Endpoints
There are a few routes you may query (with a browser, or `curl` and friends). You can see more documentation at `localhost:6927/?doc`.

#### Page Content Service routes
Next generation routes for page content. See [Page_Content_Service](https://www.mediawiki.org/wiki/Page_Content_Service).

* `http://localhost:6927/{domain}/v1/page/summary/{title}`
* `http://localhost:6927/{domain}/v1/page/metadata/{title}`
* `http://localhost:6927/{domain}/v1/page/media/{title}`
* `http://localhost:6927/{domain}/v1/page/references/{title}`
* `http://localhost:6927/{domain}/v1/page/mobile-compat-html/{title}` (no plans to be exposed
publicly)
* `http://localhost:6927/{domain}/v1/page/mobile-html/{title}`
* `http://localhost:6927/{domain}/v1/data/css/mobile/base`
* `http://localhost:6927/{domain}/v1/data/css/mobile/pagelib`
* `http://localhost:6927/{domain}/v1/data/css/mobile/site`
* `http://localhost:6927/{domain}/v1/data/javascript/mobile/pagelib`

#### Mobile Content Service routes

The first generation mobile content route (mainly for Android app):
* `http://localhost:6927/{domain}/v1/page/mobile-sections/{title}`

* Example: `http://localhost:6927/en.wikipedia.org/v1/page/mobile-sections/Cat`

There is also a endpoint for definitions from Wiktionary the Android app uses:
* `http://localhost:6927/{language code}.wiktionary.org/v1/page/definition/{title}`

Example: `http://localhost:6927/en.wiktionary.org/v1/page/definition/present`

A list of language codes can be found [here](https://meta.wikimedia.org/wiki/Special:SiteMatrix).

#### Feed routes
* `http://localhost:6927/en.wikipedia.org/v1/page/featured/2016/05/30`
* `http://localhost:6927/en.wikipedia.org/v1/media/image/featured/2016/05/30`
* `http://localhost:6927/en.wikipedia.org/v1/page/news`
* `http://localhost:6927/en.wikipedia.org/v1/page/most-read/2016/05/30`
* `http://localhost:6927/en.wikipedia.org/v1/page/random/title`
* `http://localhost:6927/en.wikipedia.org/v1/feed/onthisday/births/05/30`
* `http://localhost:6927/en.wikipedia.org/v1/feed/onthisday/deaths/05/30`
* `http://localhost:6927/en.wikipedia.org/v1/feed/onthisday/events/05/30`
* `http://localhost:6927/en.wikipedia.org/v1/feed/onthisday/selected/05/30`
* `http://localhost:6927/en.wikipedia.org/v1/feed/onthisday/holidays/05/30`
* `http://localhost:6927/en.wikipedia.org/v1/feed/onthisday/all/05/30`
* `http://localhost:6927/en.wikipedia.org/v1/feed/announcements`

Note that day and month need to be 2 digits to be accepted. 0-pad them if necessary.

#### Generic routes
Feed endpoint availability by language:
* `http://localhost:6927/wikimedia.org/v1/feed/availability`

Swagger spec:
* `http://localhost:6927/?spec`

Swagger UI:
* `http://localhost:6927/?doc`

Info:
* `http://localhost:6927/_info`

#### Quick prototyping using static files
You can quickly prototype some static responses by adding the wanted files to the `static` folder.

Example: `static/proto/example1.json` is available as 
http://localhost:6927/static/proto/example1.json.

### Tests

There is also a set of executable tests. To fire them up, simply run:

```
npm test
```

If you haven't changed anything in the code (and you have a working Internet
connection), you should see all the tests passing. As testing most of the code
is an important aspect of service development, there is also a bundled tool
reporting the percentage of code covered. Start it with:

```
npm run-script coverage
```

To just run the unit tests (faster), use:

```
npm run test:unit
```

#### HTTP Recording

This project takes advantage of HTTP request recording provided by the
[sepia](https://www.npmjs.com/package/sepia) library to make running the tests much faster.

To take advantage of HTTP response caching, either set an environment variable
`VCR_MODE=cache`, or specify at the command line when running the tests:

```
VCR_MODE=cache npm test
```

After running for the first time with `VCR_MODE=cache`, HTTP interactions should be cached
in the `fixtures/` folder. The next time you run the tests, they should use the cached
fixtures and run faster.

To skip the cached fixtures, run the tests with an unexpected VCR_MODE value (e.g.,
`VCR_MODE=off`) or just remove the `fixtures` folder and re-run.

See [sepia](https://www.npmjs.com/package/sepia) for more documentation.

### Troubleshooting

In a lot of cases when there is an issue with node it helps to recreate the
`node_modules` directory:

```
rm -r node_modules
npm install
```

This is highly recommended whenever dependencies change.

Go apps!

### Thanks

Big thank you to our services team for providing an awesome
[template](https://github.com/wikimedia/service-template-node)
for this and for supporting us along the way!
