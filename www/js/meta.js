var bridge = require('./bridge');

sendAppMetaData = function( cbName, id ) {
    bridge.sendMessage( cbName, JSON.parse(document.querySelector( '#' + id ).innerHTML) );
};

document.addEventListener( 'DOMContentLoaded', function(event) {
    sendAppMetaData( 'onGetAppMeta1', 'app_meta1' );
});

bridge.registerListener( 'getAppMeta2', function() {
    sendAppMetaData( 'onGetAppMeta2', 'app_meta2' );
});
