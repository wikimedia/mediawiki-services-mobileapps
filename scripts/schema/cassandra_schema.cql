// Storage of various representations of MediaWiki content that must
// be pre-generated on page change.
CREATE KEYSPACE IF NOT EXISTS pregenerated_cache
    WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}; // NTS & 3-per DC in production

// PCS (née mobileapps)
CREATE TABLE IF NOT EXISTS pregenerated_cache.media_list (
    project  text,
    key      text,
    headers  map<text,text>,
    cached   timestamp,
    value    blob,
    PRIMARY KEY ((project, key))
) WITH comment = 'Data about media items appearing on a given page';

CREATE TABLE IF NOT EXISTS pregenerated_cache.mobile_html (
    project  text,
    key      text,
    headers  map<text,text>,
    cached   timestamp,
    value    blob,
    PRIMARY KEY ((project, key))
) WITH comment = 'Page content optimized for mobile applications';

CREATE TABLE IF NOT EXISTS pregenerated_cache.page_summary (
    project  text,
    key      text,
    headers  map<text,text>,
    cached   timestamp,
    value    blob,
    PRIMARY KEY ((project, key))
) WITH comment = 'Page content summary';
