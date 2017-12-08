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

You can also read [the documentation](https://www.mediawiki.org/wiki/ServiceTemplateNode).

### Running the service

To start the server hosting the REST API, simply run (inside the repo's directory)

```
npm start
```

This starts an HTTP server listening on `localhost:6927`. There are a few
routes you may query (with a browser, or `curl` and friends):

Swagger spec:
* `http://localhost:6927/?spec`

Info:
* `http://localhost:6927/_info`

The main route you may query (with a browser, or `curl` and friends):
* `http://localhost:6927/{domain}/v1/page/mobile-sections/{title}`

Example:
* `http://localhost:6927/en.wikipedia.org/v1/page/mobile-sections/Cat`

There is also a route for page summaries:
* `http://localhost:6927/{domain}/v1/page/summary/{title}`

Example:
* `http://localhost:6927/en.wikipedia.org/v1/page/summary/Cat`

There is also a route for definitions from Wiktionary:
* `http://localhost:6927/{language code}.wiktionary.org/v1/page/definition/{title}`

Example:
* `http://localhost:6927/en.wiktionary.org/v1/page/definition/present`

A list of language codes can be found [here](https://meta.wikimedia.org/wiki/Special:SiteMatrix).

Feed endpoints:
* http://localhost:6927/en.wikipedia.org/v1/page/featured/2016/05/30
* http://localhost:6927/en.wikipedia.org/v1/media/image/featured/2016/05/30
* http://localhost:6927/en.wikipedia.org/v1/page/news
* http://localhost:6927/en.wikipedia.org/v1/page/most-read/2016/05/30
* http://localhost:6927/en.wikipedia.org/v1/page/random/title
* http://localhost:6927/en.wikipedia.org/v1/onthisday/births/05/30
* http://localhost:6927/en.wikipedia.org/v1/onthisday/deaths/05/30
* http://localhost:6927/en.wikipedia.org/v1/onthisday/events/05/30
* http://localhost:6927/en.wikipedia.org/v1/onthisday/selected/05/30
* http://localhost:6927/en.wikipedia.org/v1/onthisday/holidays/05/30
* http://localhost:6927/en.wikipedia.org/v1/onthisday/all/05/30

Note that day and month need to be 2 digits to be accepted. 0-pad them if necessary.

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

#### HTTP Recording

This project takes advantage of HTTP request recording provided by the
[sepia](https://www.npmjs.com/package/sepia) library to make running the tests much faster.

If no `VCR_MODE` variable is found in the environment or provided at the command line,
the tests will run with `VCR_MODE=cache`. After running for the first time, HTTP interactions
should be cached in the `fixtures/` folder. The next time you run the tests, they should use
the cached fixtures and run faster.

To skip the cached fixtures, provide an unexpected VCR_MODE value from the command line, e.g.:

```
VCR_MODE=off npm test
```

To get fresh fixtures just remove the `fixtures` folder and re-run the tests.

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
