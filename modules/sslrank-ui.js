var EXPORTED_SYMBOLS = ['ui']

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');

Cu.import('resource://sslrank/utils.js');
Cu.import('resource://sslrank/cipher-suites.js');
Cu.import('resource://sslrank/preferences.js');
Cu.import('resource://sslrank/observer.js');
Cu.import('resource://sslrank/panel.js');
Cu.import('resource://sslrank/windows.js');

var ui = (function () {
    var buttonLocation = {
            URLBAR: 0,
            TOOLBAR: 1
        },
        currentLocation = null,
        // Reference to SSLRank.prefs
        prefs = null;

    var startup = function (_prefs) {
        prefs = _prefs;
        loadStyleSheet();
    };

    var shutdown = function () {
        removeStyleSheet();
    };

    var init = function (win) {
        currentLocation = prefs['notifier.location'];
        var sslrankButton = createButton(win);
        installButton(sslrankButton,
            true,
            win.document);

        createKeyShortcut(win);

        panel(win).init(prefs);

        // TODO : Optimize this handlings. Only when HTTP obs enabled ?
        //        Do init in preferences handler ?
        initDomainsPanel(win);
        initCiphersPanel(win);
        initPanelPreferences(win);
        utils.initLocale();
    };

    var uninit = function (win) {
        // Cleanup everything! 
        // Removing the button deletes the overlay elements as well 
        try {
            removeButton(_sslrankButton(win));
            deleteKeyShortcut(win.document);
        } catch (e) {
            log.error('Error SSLRank UI uninit : ' + e.message);
        }
    };

    var onLocationChange = function (win, winId, urlChanged) {
        // The document elements are not available until a successful init.
        // So we need to add the child panel for the first time 

        // If the user is navigating with the domains tab reload the data.
        // resetDomains(win, winId);
        if (win.document.getElementById('sslrank-paneltab-domains')
            .getAttribute('_selected') === 'true') {
            loadDomainsTab(win, winId);
        }

        // If the user navigates the tabs with the panel open, 
        //  make it appear smooth. 
        var sslrankPanel = panel(win).element;
        if (sslrankPanel.state === 'open') {
            showPanel(sslrankPanel, true, win);
        }

    };

    var protocolChange = function (proto, data, win, winId) {
        var doc = win.document;
        switch (proto) {

        case 'unknown':
            setButtonRank(-1, proto, win);
            setBoxHidden('https', true, win);
            setBoxHidden('http', true, win);
            doc.getElementById('sslrank-img-cipher-rank-star').hidden = true;
            break;

        case 'http':
            setButtonRank('0.0', proto, win);
            setBoxHidden('https', true, win);
            setBoxHidden('http', false, win);
            doc.getElementById('sslrank-img-cipher-rank-star').hidden = true;

            var panelLink = doc.getElementById('sslrank-panel-https-link');
            panelLink.href = data;
            panelLink.setAttribute('value', data);
            break;

        case 'https':
            setBoxHidden('https', false, win);
            setBoxHidden('http', true, win);
            doc.getElementById('sslrank-img-cipher-rank-star').hidden = false;

            try {
                fillPanel(data, win, winId);
            } catch (e) {
                log.debug("Error fillPanel. " + e.message);
            }
            break;
        }

        //log.debug ('Box height -- ' + 
        //  doc.getElementById('sslrank-panel-main-vbox').scrollHeight);

        //  Fixing the height of the panel is a pain. For some strange reasons, 
        //  without setting this twice, the panel height won't be proper.
        doc.getElementById('sslrank-panel-domains-vbox')
            .setAttribute('maxheight', doc.getElementById('sslrank-panel-main-vbox').scrollHeight);
        doc.getElementById('sslrank-panel-domains-vbox')
            .setAttribute('maxheight', doc.getElementById('sslrank-panel-main-vbox').scrollHeight);

    };

    var onStateStop = function (win, tab) {
        showCrossDomainRating(win, tab);
    };

    var prefListener = function (branch, name) {
        preferencesChanged(branch, name);
    };

    var domainsUpdated = function (tab) {
        // Reload the tab, only if user is navigating with domains
        var win = windows.recentWindow;
        if (win.document.getElementById('sslrank-paneltab-domains')
            .getAttribute('_selected') === 'true') {
            loadDomainsTab(win, tab);
        }
    };

    return {
        init: init,
        uninit: uninit,
        buttonLocation: buttonLocation,
        startup: startup,
        shutdown: shutdown,
        domainsUpdated: domainsUpdated,
        prefListener: prefListener,
        onStateStop: onStateStop,
        protocolChange: protocolChange,
        onLocationChange: onLocationChange,
        get currentLocation() {
            return currentLocation;
        },
        get prefs() {
            return prefs;
        },
    }

}());

function _sslrankButton(win) {
    if (ui.currentLocation == ui.buttonLocation.TOOLBAR) {
        return win.document.getElementById('sslrank-tb-button');
    } else if (ui.currentLocation == ui.buttonLocation.URLBAR) {
        return win.document.getElementById('sslrank-box-urlbar');
    }
}

function _sslrankBtnImg(win) {
    if (ui.currentLocation == ui.buttonLocation.TOOLBAR) {
        return win.document.getElementById('sslrank-tb-button');
    } else if (ui.currentLocation == ui.buttonLocation.URLBAR) {
        return win.document.getElementById('sslrank-ub-img');
    }
}

function loadStyleSheet() {
    registerSheet('sslrank.css');
    if (utils.getPlatform() == 'Darwin')
        registerSheet('darwin.css');

    function registerSheet(file) {
        var sss = Cc['@mozilla.org/content/style-sheet-service;1']
            .getService(Ci.nsIStyleSheetService);
        var ios = Cc['@mozilla.org/network/io-service;1']
            .getService(Ci.nsIIOService);
        var uri = ios.newURI('chrome://sslrank/skin/' + file, null, null);
        if (!sss.sheetRegistered(uri, sss.USER_SHEET))
            sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
    }
}

function removeStyleSheet() {
    unregisterSheet('sslrank.css');
    if (utils.getPlatform() == 'Darwin')
        unregisterSheet('darwin.css');

    function unregisterSheet(file) {
        var sss = Cc['@mozilla.org/content/style-sheet-service;1']
            .getService(Ci.nsIStyleSheetService);
        var ios = Cc['@mozilla.org/network/io-service;1']
            .getService(Ci.nsIIOService);
        var uri = ios.newURI('chrome://sslrank/skin/' + file, null, null);
        if (sss.sheetRegistered(uri, sss.USER_SHEET))
            sss.unregisterSheet(uri, sss.USER_SHEET);
    }
}

function installButton(sslrankButton, firstRun, document) {
    try {
        if (ui.currentLocation === ui.buttonLocation.TOOLBAR) {
            var toolbar = document.getElementById('nav-bar');
            var toolbarButton = sslrankButton;
            var buttonId = 'sslrank-tb-button';

            var palette = document.getElementById('navigator-toolbox').palette;
            palette.appendChild(toolbarButton);
            var currentset = toolbar.getAttribute('currentset').split(',');
            var index = currentset.indexOf(buttonId);

            if (index === -1) {
                if (firstRun) {
                    // No button yet so add it to the toolbar.
                    toolbar.appendChild(toolbarButton);
                    toolbar.setAttribute('currentset', toolbar.currentSet);
                    document.persist(toolbar.id, 'currentset');
                }
            } else {
                // The ID is in the currentset, so find the position and
                // insert the button there.
                var before = null;
                for (var i = index + 1; i < currentset.length; i++) {
                    before = document.getElementById(currentset[i]);
                    if (before) {
                        toolbar.insertItem(buttonId, before);
                        break;
                    }
                }
                if (!before) {
                    toolbar.insertItem(buttonId);
                }
            }
        } else if (ui.currentLocation === ui.buttonLocation.URLBAR) {
            var urlbar = document.getElementById('urlbar');
            urlbar.insertBefore(sslrankButton,
                document.getElementById('identity-box'));
        } else {
            log.error('currentLocation undefined! ');
        }
    } catch (ex) {
        log.error('Failed install button : ' + ex.message);
    }
}

function createButton(win) {
    try {
        const doc = win.document;
        var button;
        var panelPosition;

        if (ui.currentLocation == ui.buttonLocation.TOOLBAR) {
            button = create(doc, 'toolbarbutton', {
                id: 'sslrank-tb-button',
                removable: 'true',
                class: 'toolbarbutton-1 chromeclass-toolbar-additional',
                type: '',
                // type: 'button',
                // defaultArea: 'nav-bar',
                rank: 'default'
            });
            panelPosition = 'bottomcenter topright';

        } else if (ui.currentLocation == ui.buttonLocation.URLBAR) {
            button = create(doc, 'box', {
                id: 'sslrank-box-urlbar',
                role: 'button',
                align: 'center',
                width: '40'
            });
            button.appendChild(create(doc, 'image', {
                id: 'sslrank-ub-img',
                rank: 'default'
            }));
            panelPosition = 'bottomcenter topleft';
        }

        button.setAttribute('label', 'SSLRank');
        // button.setAttribute('oncommand', 'null'); 
        button.addEventListener('click', function (event) {
            panelEvent(event, win);
        }, false);
        button.addEventListener('keypress', function (event) {
            panelEvent(event, win);
        }, false);

        button.appendChild(panel(win).create(panelPosition));

        if (ui.currentLocation == ui.buttonLocation.URLBAR) {
            button.appendChild(create(doc, 'description', {
                'id': 'sslrank-ub-rank',
                'class': 'sslrank-text-body-class'
            }));
            button.appendChild(create(doc, 'box', {
                'id': 'sslrank-ub-separator',
                'class': 'sslrank-text-body-class',
                'hidden': true
            }));
        }

    } catch (ex) {
        log.error('Failed create button : ' + ex.message);
    }
    return button;
}

function removeButton(button) {
    try {
        button.parentElement.removeChild(button);
    } catch (ex) {
        log.error('Failed remove button : ' + ex.message);
    }
}

function panelEvent(event, win) {

    if (event.type == 'click' && event.button == 2) {
        /* sslrank.openPreferences(); */
    } else {
        try {
            togglePanel(panel(win).element, win);
        } catch (ex) {
            log.error('Error during panelEvent action : ' + ex.message);
        }
    }
}

function setBoxHidden(protocol, show, win) {
    var doc = win.document;
    switch (protocol) {
    case 'http':
        doc.getElementById('sslrank-panel-box-http').hidden = show;
        break;
    case 'https':
        doc.getElementById('sslrank-panel-vbox-https').hidden = show;
        break;
    default:
    }
}

function showPanel(panel, show, win) {
    if (show) {
        panel.openPopup(_sslrankButton(win));
        panelVisible(win);
    } else {
        panel.hidePopup();
    }
}

function panelVisible(win) {
    // Special case : Firefox does not select menuitems unless the 
    //    panel is visible. Or loadTabs -> loadCiphersTab() ?
    loadCiphersTab(win);
    // Re-enabling to fix window-switch-domains-inconsistent bug
    loadDomainsTab(win, null);
}

function togglePanel(panel, win) {
    if (panel.state == 'closed') {
        showPanel(panel, true, win);
    } else if (panel.state == 'open') {
        showPanel(panel, false, win);
    }
}

function panelConnectionRank(rank, win) {
    var s = [];
    var doc = win.document;

    // I don't see any easy CSS hacks
    // without having to autogenerate spans in html.
    for (var i = 1; i <= 10; i++) {
        s[i] = doc.getElementById('sslrank-img-cipher-rank-star-' + String(i));
        s[i].className = 'sslrank-star';
    }

    for (var i = 1; i <= 10; i++) {
        if (i <= rank) {
            s[i].className = 'sslrank-star-full';
            if (i == rank)
                break;
        }
        if ((i < rank) && (i + 1 > rank)) {
            s[i + 1].className = 'sslrank-star-half';
            break;
        }
    }
    doc.getElementById('sslrank-text-cipher-rank-numeric').textContent = (_fmt(rank) + '/10');
}

function fillPanel(data, win, winId) {

    setButtonRank(data.rating, 'https', win);
    panelConnectionRank(data.rating, win);

    showCipherDetails(data.cipherSuite, win);
    showPFS(data.cipherSuite.pfs, win);
    showFFState(data.state, win);
    showCertDetails(data.cert, data.domMismatch, data.ev, win);
    showTLSVersion(win, winId);
    showCrossDomainRating(win, winId);
}


function setButtonRank(connectionRank, proto, win) {
    var doc = win.document;
    var buttonRank = getRatingClass(connectionRank);

    _sslrankBtnImg(win).setAttribute('rank', buttonRank);

    if (ui.currentLocation == ui.buttonLocation.URLBAR) {
        var ubRank = doc.getElementById('sslrank-ub-rank');
        var ubSeparator = doc.getElementById('sslrank-ub-separator');

        ubRank.setAttribute('rank', buttonRank);

        if (connectionRank != -1) {
            ubRank.textContent = _fmt(Number(connectionRank).toFixed(1));
        } else {
            ubRank.textContent = '';
        }

        ubSeparator.hidden = true;
        if (ui.prefs['ui.notifier.colorize']) {
            _sslrankButton(win).setAttribute('rank', buttonRank);
        } else {
            ubSeparator.hidden = false;
            ubSeparator.setAttribute('rank', buttonRank);
            _sslrankButton(win).setAttribute('rank', 'blank');

        }
    }

    // URL bar background gradient
    doc.getElementById('urlbar').setAttribute('_sslrankrank', (ui.prefs['ui.urlbar.colorize'] ? buttonRank : 'default'));
}

function showCipherDetails(cipherSuite, win) {
    var doc = win.document;
    const cs = ciphersuites;
    const rp = ui.prefs['rating.params'];

    var marginCipherStatus = 'low';
    if (cipherSuite.rank >= cs.strength.HIGH) {
        marginCipherStatus = 'high';
    } else if (cipherSuite.rank > cs.strength.MEDIUM) {
        marginCipherStatus = 'med';
    }

    doc.getElementById('sslrank-img-cipher-rank')
        .setAttribute('status', marginCipherStatus);

    doc.getElementById('sslrank-text-cipher-suite').textContent =
        (cipherSuite.name);

    var rating = Number(cipherSuite.rank * rp.cipherSuite / 10).toFixed(1);
    doc.getElementById('sslrank-cipher-suite-rating').textContent =
        (_fmt(rating) + '/' + _fmt(rp.cipherSuite));

    doc.getElementById('sslrank-text-cipher-suite-kxchange').textContent =
        (cipherSuite.keyExchange.ui + '.');
    doc.getElementById('sslrank-text-cipher-suite-kxchange-notes').textContent =
        utils.getText(cipherSuite.keyExchange.notes);

    doc.getElementById('sslrank-text-cipher-suite-auth').textContent =
        (cipherSuite.authentication.ui + '. ');
    doc.getElementById('sslrank-text-cipher-suite-auth-notes').textContent =
        utils.getText(cipherSuite.authentication.notes);

    doc.getElementById('sslrank-text-cipher-suite-bulkcipher').textContent =
        (cipherSuite.bulkCipher.ui + ' ' + cipherSuite.cipherKeyLen +
            ' ' + utils.getText('general.bits') + '.');
    doc.getElementById('sslrank-text-cipher-suite-bulkcipher-notes').textContent =
        utils.getText(cipherSuite.bulkCipher.notes);
    doc.getElementById('sslrank-text-cipher-suite-hmac').textContent =
        (cipherSuite.HMAC.ui + '. ');
    doc.getElementById('sslrank-text-cipher-suite-hmac-notes').textContent =
        utils.getText(cipherSuite.HMAC.notes);

    const panelInfo = ui.prefs['panel.info'];
    doc.getElementById('sslrank-text-authentication').hidden = !(panelInfo.authAlg);
    doc.getElementById('sslrank-text-bulk-cipher').hidden = !(panelInfo.bulkCipher);
    doc.getElementById('sslrank-text-hmac').hidden = !(panelInfo.HMAC);
    doc.getElementById('sslrank-text-key-exchange').hidden = !(panelInfo.keyExchange);
}

function showPFS(pfs, win) {
    var doc = win.document;
    const rp = ui.prefs['rating.params'];

    const pfsImg = doc.getElementById('sslrank-img-p-f-secrecy');
    const pfsTxt = doc.getElementById('sslrank-text-p-f-secrecy');
    const pfsRating = doc.getElementById('sslrank-p-f-secrecy-rating');

    var rating = Number(pfs * rp.pfs).toFixed(1);
    pfsRating.textContent = _fmt(rating) + '/' + _fmt(rp.pfs);

    if (pfs) {
        pfsTxt.textContent = utils.getText('general.yes');
        pfsImg.setAttribute('status', 'yes');
    } else {
        pfsTxt.textContent = utils.getText('general.no');
        pfsImg.setAttribute('status', 'no');
    }
}

function showFFState(state, win) {
    var doc = win.document;
    const rp = ui.prefs['rating.params'];

    doc.getElementById('sslrank-img-ff-connection-status').setAttribute('state', state);
    doc.getElementById('sslrank-text-ff-connection-status').textContent =
        utils.getText('connectionstatus.text.' + state.toLowerCase());
    const statusRating = doc.getElementById('sslrank-ff-connection-status-rating');
    var brokenText = doc.getElementById('sslrank-text-ff-connection-status-broken');

    var rating = Number(((state == 'Secure') ? 1 : 0) * rp.ffStatus).toFixed(1);
    statusRating.textContent = _fmt(rating) + '/' + _fmt(rp.ffStatus);

    if (state == 'Broken' || state == 'Insecure') {
        brokenText.setAttribute('hidden', 'false');
    } else {
        brokenText.setAttribute('hidden', 'true');
    }
}

function showCertDetails(cert, domMismatch, ev, win) {
    var svCert = cert.serverCert;
    var validity = svCert.validity.QueryInterface(Ci.nsIX509CertValidity);
    var doc = win.document;
    const rp = ui.prefs['rating.params'];
    const panelInfo = ui.prefs['panel.info'];

    doc.getElementById('sslrank-text-cert-common-name').textContent = svCert.commonName;
    var certRating = doc.getElementById('sslrank-cert-status-rating');
    var evRating = doc.getElementById('sslrank-cert-ev-rating');
    var elemEV = doc.getElementById('sslrank-text-cert-extended-validation');
    if (ev) {
        elemEV.textContent = utils.getText('general.yes');
        elemEV.setAttribute('ev', 'Yes');
    } else {
        elemEV.textContent = utils.getText('general.no');
        elemEV.setAttribute('ev', 'No');
    }

    var rating = (Number(ev) * rp.evCert).toFixed(1);
    evRating.textContent = _fmt(rating) + '/' + _fmt(rp.evCert);

    for (var [id, text] in Iterator({
            'sslrank-text-cert-org': svCert.organization,
            'sslrank-text-cert-org-unit': svCert.organizationalUnit,
            'sslrank-text-cert-issuer-org': svCert.issuerOrganization,
            'sslrank-text-cert-issuer-org-unit': svCert.issuerOrganizationUnit
        })) {
        var elem = doc.getElementById(id);
        elem.textContent = text;
        elem.hidden = (text == '');
    }

    var certValidity = doc.getElementById('sslrank-text-cert-validity');
    certValidity.setAttribute('valid', cert.isValid.toString());

    var notBefore = new Date(validity.notBefore / 1000),
        notAfter = new Date(validity.notAfter / 1000);
    if (panelInfo.validityTime) {
        certValidity.textContent = notBefore.toLocaleDateString() + notBefore.toLocaleTimeString() +
            ' -- ' + notAfter.toLocaleDateString() + notAfter.toLocaleTimeString();
    } else {
        certValidity.textContent = notBefore.toLocaleDateString() + ' -- ' + notAfter.toLocaleDateString();
    }

    doc.getElementById('sslrank-text-cert-domain-mismatch').hidden = !domMismatch;

    var rating = (Number(cert.isValid && !domMismatch) * rp.certStatus).toFixed(1);
    certRating.textContent = _fmt(rating) + '/' + _fmt(rp.certStatus);

    if (cert.isValid && !domMismatch) {
        doc.getElementById('sslrank-img-cert-state').setAttribute('state', 'good');
    } else {
        doc.getElementById('sslrank-img-cert-state').setAttribute('state', 'bad');
    }

    doc.getElementById('sslrank-text-cert-pub-key')
        .textContent = (cert.pubKeySize + ' ' + utils.getText('general.bits') + ' ' + cert.pubKeyAlg);
    doc.getElementById('sslrank-text-cert-pub-key')
        .setAttribute('secure', cert.pubKeyMinSecure.toString());

    doc.getElementById('sslrank-text-cert-sigalg')
        .textContent = cert.signatureAlg.hmac + '/' + cert.signatureAlg.enc;
    rating = Number(cert.signatureAlg.rating * rp.signature / 10).toFixed(1);
    doc.getElementById('sslrank-cert-sigalg-rating')
        .textContent = _fmt(rating) + '/' + _fmt(rp.signature);

    doc.getElementById('sslrank-text-cert-fingerprint-1')
        .textContent = svCert.sha256Fingerprint.substring(0, 33);
    doc.getElementById('sslrank-text-cert-fingerprint-2')
        .textContent = svCert.sha256Fingerprint.substring(33, 66);
    doc.getElementById('sslrank-text-cert-fingerprint-3')
        .textContent = svCert.sha256Fingerprint.substring(66);

    doc.getElementById('sslrank-text-cert-validity-box').hidden = !(panelInfo.certValidity);
    doc.getElementById('sslrank-text-cert-fingerprint-box').hidden = !(panelInfo.certFingerprint);
}

function showTLSVersion(win, tab) {
    var doc = win.document;
    var tlsIndex = 'ff_cache';

    if (observer.responseCache[tab].tlsVersion)
        tlsIndex = observer.responseCache[tab].tlsVersion;

    if (tlsIndex == '')
        tlsIndex = 'ff_cache';

    doc.getElementById('sslrank-text-tls-version').textContent =
        tlsVersions[tlsIndex].ui;

    doc.getElementById('sslrank-img-tls-version').setAttribute('state',
        tlsVersions[tlsIndex].state);
}

function showCrossDomainRating(win, tab) {
    var doc = win.document;
    doc.getElementById('sslrank-domains-rating-box').hidden = false;

    var domainsRating = '...';

    var respCache = observer.responseCache[tab];

    if (respCache &&
        respCache.domainsRating &&
        respCache.domainsRating != -1)
        domainsRating = respCache.domainsRating;

    doc.getElementById('sslrank-text-domains-rating-numeric').textContent =
        ' domains : ' + _fmt(domainsRating);

    var ratingClass = getRatingClass(domainsRating);
    if (respCache &&
        respCache.mixedContent)
        ratingClass = 'low';
    doc.getElementById('sslrank-img-domains-rating').setAttribute('rank', ratingClass);
}

function createKeyShortcut(win) {
    var doc = win.document,
        keyset = doc.createElement('keyset');
    const shortcut =
        ui.prefs['ui.keyshortcut'];
    var keys = shortcut.split(' ');
    var len = keys.length;

    // Mozilla, I have no clue, without pointing 'oncommand' to
    // something, the key events won't fire! I already have an 
    // event listener for 'command'.
    var key = create(doc, 'key', {
        id: 'sslrank-panel-keybinding',
        oncommand: 'void(0);',
        key: keys.splice(len - 1, 1),
        modifiers: keys.join(' ')
    });
    key.addEventListener('command', function (event) {
        panelEvent(event, win);
    });
    keyset.appendChild(key);
    doc.documentElement.appendChild(keyset);
}

function deleteKeyShortcut(doc) {
    var keyset = doc.getElementById('sslrank-panel-keybinding').parentElement;
    keyset.parentElement.removeChild(keyset);
}

function readUIPreferences() {
    const prefs = preferences.service,
        branch = preferences.BRANCH;
    ui.currentLocation =
        prefs.getIntPref(BRANCH + 'notifier.location');
}

function resetAllLists() {
    const prefs = preferences.service,
        branch = preferences.BRANCH;

    var csList = prefs.getChildList(preferences.TLS, {});
    for (var i = 0; i < csList.length; i++) {
        prefs.clearUserPref(csList[i]);
    }

    var csTglList = utils.cloneArray(ui.prefs['suites.toggle']);
    for (i = 0; i < csTglList.length; i++) {
        csTglList[i].state = 'default';
    }
    prefs.setCharPref(BRANCH + 'suites.toggle',
        JSON.stringify(csTglList));

}

function forEachOpenWindow(todo) {
    var windows = Services.wm.getEnumerator('navigator:browser');
    while (windows.hasMoreElements())
        todo(windows.getNext()
            .QueryInterface(Ci.nsIDOMWindow));
}

function initDomainsPanel(win) {
    var doc = win.document,
        domainsTab = doc.getElementById('sslrank-paneltab-domains');

    domainsTab.addEventListener('click', function () {
        loadDomainsTab(win, null);
    }, false);
}

function initCiphersPanel(win) {
    var doc = win.document;

    loadCiphersTab(win);
    var btn = doc.getElementById('sslrank-paneltab-ciphers-btn-reset');
    btn.addEventListener('click', resetAllLists, false);
    btn = doc.getElementById('sslrank-paneltab-ciphers-btn-custom');
    btn.addEventListener('click', function (e) {
        preferences.openTab(2);
        togglePanel(panel(win).element, win);
    }, false);
}

function initPanelPreferences(win) {
    var doc = win.document;
    var panelPref = doc.getElementById('sslrank-img-panel-pref-icon');
    panelPref.addEventListener('click', function () {
        preferences.openTab(0);
        togglePanel(panel(win).element, win);
    }, false);

    panelPref = doc.getElementById('sslrank-img-panel-clipboard');
    panelPref.addEventListener('click', function () {
        copyToClipboard(win);
    }, false);

}

function loadDomainsTab(win, winId) {

    listener(win).getFrameMessage(function (msg) {
        try {
            var doc = win.document;

            var tab = msg.id;
            // If this was a callback from observer, only reload if the tab matches.
            if ((winId !== null) && (winId !== tab))
                return;

            resetDomains(doc);

            var respCache = observer.responseCache[tab];
            if (!respCache) return;

            let reqs = respCache['reqs'];
            let rb = doc.getElementById('sslrank-paneltab-domains-list');

            // TODO : Set maxheight to that of the main vbox
            // rb.maxheight = doc.getElementById('sslrank-panel-main-vbox').height;
            // TODO : 1) Problem navigate http page/chrome page back and forth
            //        - Chops off main tab 
            //        2) Navigate https page to http, main tab is big, empty space.
            doc.getElementById('sslrank-panel-domains-vbox')
                .setAttribute('maxheight', doc.getElementById('sslrank-panel-main-vbox').scrollHeight);

            for (var [domain, stats] in Iterator(reqs)) {
                let ri = rb.appendChild(create(doc, 'richlistitem', {
                    class: 'sslrank-paneltab-domains-item'
                }));
                let vb = ri.appendChild(create(doc, 'vbox', {})); {
                    // Domain name + requests hbox
                    let hb = vb.appendChild(create(doc, 'hbox', {})); {
                        let cxRating = '0.0';
                        if (domain.indexOf('https:') != -1) {
                            cxRating = stats['cxRating'];
                        }
                        let str = _fmt(Number(cxRating).toFixed(1));
                        hb.appendChild(create(doc, 'description', {
                            value: str,
                        }));

                        str = domain.substring(domain.indexOf(':') + 1);

                        hb.appendChild(create(doc, 'description', {
                            value: utils.cropText(str),
                            style: 'font-size: 115%; font-weight: bold;'
                        }));
                        str = ' ' + stats['count'] + 'x   ';

                        for (var [ctype, count] in Iterator(stats['ctype'])) {
                            switch (ctype) {
                            case 'text':
                                str += utils.getText('domains.text.short') + ' ';
                                break;
                            case 'image':
                                str += utils.getText('domains.image.short') + ' ';
                                break;
                            case 'application':
                                str += utils.getText('domains.application.short') + ' ';
                                break;
                            case 'audio':
                                str += utils.getText('domains.audio.short') + ' ';
                                break;
                            case 'video':
                                str += utils.getText('domains.video.short') + ' ';
                                break;
                            }
                            str += count + ', ';
                        }
                        hb.appendChild(create(doc, 'description', {
                            value: str
                        }));

                    }

                    let str = '';
                    // Cipher suite hbox
                    hb = vb.appendChild(create(doc, 'hbox', {})); {
                        if (domain.indexOf('https:') != -1) {
                            str = stats['cipherName'];
                            hb.appendChild(create(doc, 'description', {
                                value: str
                            }));

                            let hbCert = vb.appendChild(create(doc, 'hbox', {})); {
                                str = utils.getText('certificate.short.text') +
                                    ' : ' + stats['signature'].hmac + '/' + stats['signature'].enc + '.  ';
                                str += utils.getText('certificate.key.short') + ' : ' + stats['pubKeySize'] + ' ' + utils.getText('general.bits') + ' ' + stats['pubKeyAlg'];
                                hbCert.appendChild(create(doc, 'description', {
                                    value: str
                                }));
                            }
                        } else {
                            str = utils.getText('domains.insecurechannel');
                            // TODO : To stylesheet
                            hb.appendChild(create(doc, 'description', {
                                value: str,
                                style: 'color: #5e0a0a;'
                            }));
                        }
                    }
                }
                var cipherRating = 'low';
                if (domain.indexOf('https:') != -1) {
                    cipherRating = getRatingClass(stats['cxRating']);
                }
                ri.setAttribute('rank', cipherRating);
            }
        } catch (e) {
            log.error('Error loadDomainsTab : ' + e.message);
        }
    });
}


function resetDomains(doc) {
    let rb = doc.getElementById('sslrank-paneltab-domains-list');

    while (rb.hasChildNodes()) {
        rb.removeChild(rb.firstChild);
    }
}

function loadCiphersTab(win) {
    try {
        var doc = win.document;
        var rows = doc.getElementById('sslrank-paneltab-ciphers-rows');

        // Reset anything before.
        while (rows.hasChildNodes()) {
            rows.removeChild(rows.firstChild);
        }

        // This has to be done everytime, as the preferences change.
        var csList = ui.prefs['suites.toggle'];

        for (var i = 0; i < csList.length; i++) {
            var row = rows.appendChild(create(doc, 'row', {
                align: 'baseline'
            }));
            row.appendChild(create(doc, 'description', {
                value: csList[i].name
            }));

            var m_list = row.appendChild(create(doc, 'menulist', {
                // Fix Toolbar button rank image bug
                class: 'sslrank-panel-cipher-menulist'
            }));

            var m_popup = m_list.appendChild(doc.createElement('menupopup'));

            for (var rd of['default', 'enable', 'disable']) {
                var mi = m_popup.appendChild(create(doc, 'menuitem', {
                    label: utils.getText('general.' + rd),
                    value: rd
                }));
                // TODO : Some optimizations here in Firefox. Unless the panel is 
                //        visible, the selected item is not applied??
                if (csList[i].state === rd.toLowerCase()) {
                    m_list.selectedItem = mi;
                }
            }
            m_popup.addEventListener('command', function (event) {
                var m = event.currentTarget.parentNode.parentNode.firstChild;
                var csTglList = utils.cloneArray(
                    ui.prefs['suites.toggle']);
                for (var i = 0; i < csTglList.length; i++) {
                    if (m.value === csTglList[i].name) {
                        csTglList[i].state = event.target.value;
                    }
                }
                preferences.service
                    .setCharPref(preferences.BRANCH + 'suites.toggle',
                        JSON.stringify(csTglList));
            }, false);
        }

    } catch (e) {
        log.error('Error loadCiphersTab ' + e.message);
    }

}

function preferencesChanged(branch, name) {
    switch (name) {
    case 'notifier.location':
        // Changing the notifier location requires tearing down
        // everything. Button, panel.. and the panel overlay!
        ui.prefs[name] = branch.getIntPref(name);
        forEachOpenWindow(function (win) {
            ui.uninit(win);
        });

        forEachOpenWindow(function (win) {
            ui.init(win);
        });
        break;
    case 'panel.fontsize':
        ui.prefs[name] = branch.getIntPref(name);
        forEachOpenWindow(function (win) {
            panel(win).setFont(branch.getIntPref(name));
        });
        break;
    case 'ui.keyshortcut':
        ui.prefs[name] = branch.getCharPref(name);
        forEachOpenWindow(function (win) {
            deleteKeyShortcut(win.document);
            createKeyShortcut(win);
        });
        break;
    case 'panel.info':
        ui.prefs[name] =
            JSON.parse(branch.getCharPref(name));
        break;
    case 'rating.params':
        // Prefs set from main
        break;
    case 'suites.toggle':
        // Prefs set from main
        loadCiphersTab(windows.recentWindow);
        break;
    case 'ui.urlbar.colorize':
        ui.prefs[name] = branch.getBoolPref(name);
        break;
    case 'ui.notifier.colorize':
        ui.prefs[name] = branch.getBoolPref(name);
        break;
    }
}

function copyToClipboard(win) {
    // It's a lot easier to read the values from the UI elements,  
    // than to construct -> format -> localize strings all over again.
    listener(win).getFrameMessage(function (msg) {
        try {
            var scheme = msg.scheme;

            var httpElements = [
                ['sslrank-text-http-1', 'textContent', '\n'],
                ['sslrank-text-http-2', 'textContent', '\n'],
                ['sslrank-panel-https-link', 'href', '\n'],
                ['sslrank-text-http-note', 'textContent', '']
            ];
            var httpsElements = [
                ['sslrank-text-cipher-suite-label', 'value', '\n'],
                ['sslrank-text-cipher-suite', 'textContent', '\n\t'],
                ['sslrank-text-key-exchange-label', 'value', ' '],
                ['sslrank-text-cipher-suite-kxchange', 'textContent', '\n\t'],
                ['sslrank-text-authentication-label', 'value', ' '],
                ['sslrank-text-cipher-suite-auth', 'textContent', '\n\t'],
                ['sslrank-text-bulk-cipher-label', 'value', ' '],
                ['sslrank-text-cipher-suite-bulkcipher', 'textContent', '\n\t'],
                ['sslrank-text-hmac-label', 'value', ' '],
                ['sslrank-text-cipher-suite-hmac', 'textContent', '\n'],
                ['sslrank-text-p-f-secrecy-label', 'value', ' '],
                ['sslrank-text-p-f-secrecy', 'textContent', '\n'],
                ['sslrank-text-tls-version-label', 'value', ' '],
                ['sslrank-text-tls-version', 'textContent', '\n'],
                ['sslrank-text-conn-status', 'value', ' '],
                ['sslrank-text-ff-connection-status', 'textContent', '\n'],
                ['sslrank-text-cert-label', 'value', '\n\t'],
                ['sslrank-text-cert-ev', 'value', ' '],
                ['sslrank-text-cert-extended-validation', 'textContent', '\n\t'],
                ['sslrank-text-cert-sigalg-text', 'value', ' '],
                ['sslrank-text-cert-sigalg', 'textContent', '\n\t'],
                ['sslrank-text-cert-pub-key-text', 'value', ' '],
                ['sslrank-text-cert-pub-key', 'textContent', '\n\t'],
                ['sslrank-text-cert-cn-label', 'value', ' '],
                ['sslrank-text-cert-common-name', 'textContent', '\n\t'],
                ['sslrank-text-cert-issuedto', 'value', ' '],
                ['sslrank-text-cert-org', 'textContent', ' '],
                ['sslrank-text-cert-org-unit', 'textContent', '\n\t'],
                ['sslrank-text-cert-issuedby', 'value', ' '],
                ['sslrank-text-cert-issuer-org', 'textContent', ' '],
                ['sslrank-text-cert-issuer-org-unit', 'textContent', '\n\t'],
                ['sslrank-text-cert-validity-text', 'value', ' '],
                ['sslrank-text-cert-validity', 'textContent', '\n\t'],
                ['sslrank-text-cert-fingerprint-label', 'value', ' '],
                ['sslrank-text-cert-fingerprint-1', 'textContent', ''],
                ['sslrank-text-cert-fingerprint-2', 'textContent', ''],
                ['sslrank-text-cert-fingerprint-3', 'textContent', '']

            ];

            var doc = win.document,
                current = [],
                str = '';

            switch (scheme) {
            case 'http':
                current = httpElements;
                break;
            case 'https':
                current = httpsElements;
                break;
            default:
                current = [];
                break;
            }

            for (var i = 0; i < current.length; i++) {
                row = current[i];
                str += doc.getElementById(row[0])[row[1]] + row[2];
            }

            const clipboardHelper = Cc['@mozilla.org/widget/clipboardhelper;1']
                .getService(Ci.nsIClipboardHelper);
            clipboardHelper.copyString(str);

        } catch (e) {
            log.error('copyToClipboard error ' + e.message);
        }
    });
}

function getRatingClass(rating) {
    var rank = 'default';
    if (rating <= -1) {
        rank = 'default';
    } else if (rating < 5) {
        rank = 'low';
    } else if (rating < 7) {
        rank = 'medium';
    } else if (rating < 9) {
        rank = 'high';
    } else if (rating <= 10) {
        rank = 'vhigh';
    }
    return rank;
}

function _fmt(n) {
    if (isNaN(n)) return n;

    // Check if we need decimals 
    return ((String(n).indexOf('.') != -1) ?
        Number(n).toLocaleString(undefined, {
            minimumFractionDigits: 1
        }) :
        Number(n).toLocaleString());
}

function create(doc, elem, attrs) {
    // createElement() Regex warnings are targeting 'script' elements.
    // https://bugzilla.mozilla.org/show_bug.cgi?id=625690
    // I don't do script here.
    var e = doc.createElement(elem);
    for (var [atr, val] in Iterator(attrs)) {
        e.setAttribute(atr, val);
    }
    return e;
}