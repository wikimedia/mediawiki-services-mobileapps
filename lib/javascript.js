'use strict';

const fs = require('fs');
const mUtil = require('./mobile-util');
const path = require('path');

function respond(res, js) {
    res.status(200);
    mUtil.setContentType(res, mUtil.CONTENT_TYPES.javascript);
    mUtil.setETag(res, mUtil.hashCode(js));
    res.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.end(js);
}

function fetchPageLibJs(res) {
    const filePath = path.resolve(require.resolve('wikimedia-page-library'),
        '../wikimedia-page-library-pcs.js');
    fs.readFile(filePath, { encoding: 'utf8' }, (err, data) => respond(res, data));
}

function fetchPageLibBodyStartJs(res) {
    const pageLibBodyStartJs = `
        if (typeof pcsClient !== 'undefined' && pcsClient.getSetupSettings) {
          const setupJSON = pcsClient.getSetupSettings();
          document.pcsSetupSettings = JSON.parse(setupJSON);
        }
        if (typeof pcsClient !== 'undefined' && pcsClient.onReceiveMessage) {
          document.pcsActionHandler = (action) => {
            pcsClient.onReceiveMessage(JSON.stringify(action));
          };
        }
        if (document && document.pcsActionHandler) {
          pagelib.c1.InteractionHandling.setInteractionHandler(document.pcsActionHandler);
        }
        let remainingContentTimeout = 100;
        if (document && document.pcsSetupSettings) {
          const preSettings = {
            theme: document.pcsSetupSettings.theme,
            margins: document.pcsSetupSettings.margins,
            loadImages: false
          };
          pagelib.c1.Page.setup(preSettings, () => {
            if (document && document.pcsActionHandler) {
              setTimeout(() => {
                document.pcsActionHandler({action: 'setup'});
              }, 1);
            }
          });
          remainingContentTimeout = document.pcsSetupSettings.remainingTimeout || remainingContentTimeout;
        }`;
    respond(res, pageLibBodyStartJs);
}

function fetchPageLibBodyEndJs(res) {
    const pageLibBodyEndJs = `
        if (document && document.pcsSetupSettings) {
          const postSettings = document.pcsSetupSettings;
          delete postSettings.theme;
          delete postSettings.margins;
          pagelib.c1.Page.setup(postSettings, () => {
            if (document && document.pcsActionHandler) {
              setTimeout(() => {
                document.pcsActionHandler({action: 'load_complete'});
              }, 1);
            }
          });
        } else {
          pagelib.c1.Page.setup({});
        }
        setTimeout(() => {
          const sections = document.querySelectorAll('section');
          for (var i = 1; i < sections.length; i++) {
            sections[i].style.display = '';
          }
        }, remainingContentTimeout);`;
    respond(res, pageLibBodyEndJs);
}

module.exports = {
    fetchPageLibJs,
    fetchPageLibBodyStartJs,
    fetchPageLibBodyEndJs
};
