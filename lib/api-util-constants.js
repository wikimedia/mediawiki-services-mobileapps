/**
 * Gets the externally visible REST API URI for the supplied domain.
 * Do not use this for actual requests made inside the DC.
 * @param {!string} domain the domain to issue the request for
 * @return {!string} the URI for externally visible RESTBase endpoints for the given domain
 */
function getExternalRestApiUri(domain) {
    return `//${domain}/api/rest_v1/`;
}

module.exports = { getExternalRestApiUri };
