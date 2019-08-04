var EXPORTED_SYMBOLS = ['panel'];

const Cu = Components.utils;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://sslrank/utils.js');

var panel = function (win) {
    const PANEL_ID = 'sslrank-panel';

    var create = function (position) {
        var aPanel = win.document.createElement('panel');
        aPanel.setAttribute('id', PANEL_ID);
        aPanel.setAttribute('position', position);
        aPanel.setAttribute('type', 'arrow');

        // Clicking on panel should retain the panel
        aPanel.addEventListener('click', function (e) {
            e.stopPropagation();
        }, false);
        return aPanel;
    }

    var setFont = function (panelFont) {
        var doc = win.document,
            bodyFontClass = 'sslrank-text-body-class',
            titleFontClass = 'sslrank-text-title-class',
            imgStateClass = 'sslrank-img-state';

        // 0 = default, 1 = medium, 2 = large
        var configBody = ['sslrank-text-body-small', 'sslrank-text-body-medium',
          'sslrank-text-body-large'],
            configTitle = ['sslrank-text-title-small', 'sslrank-text-title-medium',
          'sslrank-text-title-large'],
            configImg = ['sslrank-img-state-small', 'sslrank-img-state-medium',
          'sslrank-img-state-large'];
        try {
            var bodyText = doc.getElementsByClassName(bodyFontClass),
                titleText = doc.getElementsByClassName(titleFontClass),
                stateImg = doc.getElementsByClassName(imgStateClass),
                i;

            for (i = 0; i < bodyText.length; i++) {
                bodyText[i].className = bodyFontClass + ' ' + configBody[panelFont];
            }
            for (i = 0; i < titleText.length; i++) {
                titleText[i].className = titleFontClass + ' ' + configTitle[panelFont];
            }
            for (i = 0; i < stateImg.length; i++) {
                stateImg[i].className = imgStateClass + ' ' +
                    configImg[panelFont];
            }

        } catch (e) {
            log.error('setPanelFont error : ' + e.message);
        }
    };

    var panelElement = function () {
        return win.document.getElementById(PANEL_ID);
    };

    var init = function (prefs) {
        panelElement().appendChild(panelbox(win));
        setFont(prefs['panel.fontsize']);
    };

    return {
        get element() {
            return panelElement();
        },
        init: init,
        create: create,
        setFont: setFont
    };
}

var panelbox = function (win) {
    var doc = win.document;
    // With the new tabbed panel, the actual width is determined
    // by the tabs width. So these are just relics. 
    // Check : This might help with the flex for right-side ratings text.
    const HTTPS_PANEL_WIDTH = '300';
    const HTTP_PANEL_WIDTH = '330';

    const IMG_MARGIN_WIDTH = '25';

    var elem = function (type, attrs) {
        // createElement() Regex warnings are targeting 'script' elements.
        // https://bugzilla.mozilla.org/show_bug.cgi?id=625690
        // I don't do script here.
        var e = doc.createElement(type);
        for (var [atr, val] in Iterator(attrs)) {
            e.setAttribute(atr, val);
        }
        return e;
    };

    /* 
     * There are a hell lot of UI elements for the panel.
     * And an XUL overlay file is the right way to do these kind of stuff.
     * But now that overlays are not allowed for restartless addons,
     * and that loadOverlay() is buggy, there must be an intuitive way to do this in js.
     * With XUL xml indentations, it is very easy to identify elements.
     * Here I rely on javascript local scoping and re-use variable names to give
     * that 'intuitiveness'. This is kind of nasty.
     */
    var create = function () {
        try {
            function panelMain() {
                let mainVbox = elem('vbox', {
                    id: 'sslrank-panel-main-vbox',
                    flex: '2'
                }); {
                    let httpsBox = mainVbox.appendChild(elem('vbox', {
                        id: 'sslrank-panel-vbox-https',
                        flex: '2',
                        width: HTTPS_PANEL_WIDTH,
                        // height: '250',
                        hidden: 'true'
                    })); {
                        let hb = httpsBox.appendChild(elem('hbox', {
                            align: 'top',
                            width: HTTPS_PANEL_WIDTH,
                            flex: '2'
                        })); {
                            let vb = hb.appendChild(elem('vbox', {
                                align: 'left',
                                width: IMG_MARGIN_WIDTH
                            }));
                            vb.appendChild(elem('image', {
                                id: 'sslrank-img-cipher-rank',
                                class: 'sslrank-img-state'
                            }));
                        } {
                            let vb = hb.appendChild(elem('vbox', {
                                flex: '2'
                            }));
                            vb.appendChild(elem('description', {
                                id: 'sslrank-text-cipher-suite-label',
                                value: utils.getText('ciphersuite.text'),
                                class: 'sslrank-text-title-class'
                            })); {
                                let hb = vb.appendChild(elem('hbox', {
                                    id: 'sslrank-text-cipher-suite-name',
                                    align: 'baseline'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-cipher-suite',
                                    class: 'sslrank-text-body-class'
                                })); {
                                    let chb = hb.appendChild(elem('hbox', {
                                        flex: '2',
                                        align: 'right'
                                    }));
                                    chb.appendChild(elem('description', {
                                        id: 'sslrank-cipher-suite-rating',
                                        class: 'sslrank-text-body-rating'
                                    }));
                                }
                            } {
                                let hb = vb.appendChild(elem('hbox', {
                                    id: 'sslrank-text-key-exchange',
                                    hidden: 'true'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-key-exchange-label',
                                    value: utils.getText('keyexchange.text'),
                                    class: 'sslrank-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-cipher-suite-kxchange',
                                    class: 'sslrank-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-cipher-suite-kxchange-notes',
                                    class: 'sslrank-text-body-class'
                                }));
                            } {
                                let hb = vb.appendChild(elem('hbox', {
                                    id: 'sslrank-text-authentication'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-authentication-label',
                                    value: utils.getText('authentication.text'),
                                    class: 'sslrank-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-cipher-suite-auth',
                                    class: 'sslrank-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-cipher-suite-auth-notes',
                                    class: 'sslrank-text-body-class'
                                }));
                            } {
                                let hb = vb.appendChild(elem('hbox', {
                                    id: 'sslrank-text-bulk-cipher'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-bulk-cipher-label',
                                    value: utils.getText('bulkcipher.text'),
                                    class: 'sslrank-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-cipher-suite-bulkcipher',
                                    class: 'sslrank-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-cipher-suite-bulkcipher-notes',
                                    class: 'sslrank-text-body-class'
                                }));
                            } {
                                let hb = vb.appendChild(elem('hbox', {
                                    id: 'sslrank-text-hmac'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-hmac-label',
                                    value: utils.getText('hmac.text'),
                                    class: 'sslrank-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-cipher-suite-hmac',
                                    class: 'sslrank-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-cipher-suite-hmac-notes',
                                    class: 'sslrank-text-body-class'
                                }));
                            }
                        }
                    } {
                        let hb = httpsBox.appendChild(elem('hbox', {
                            id: 'sslrank-hbox-2',
                            align: 'top'
                        })); {
                            let chb = hb.appendChild(elem('hbox', {
                                align: 'left',
                                width: IMG_MARGIN_WIDTH
                            }));
                            chb.appendChild(elem('image', {
                                id: 'sslrank-img-p-f-secrecy',
                                class: 'sslrank-img-state'
                            }));
                        } {
                            let chb = hb.appendChild(elem('hbox', {
                                align: 'baseline',
                                flex: '2'
                            }));
                            chb.appendChild(elem('description', {
                                id: 'sslrank-text-p-f-secrecy-label',
                                value: utils.getText('pfs.text'),
                                class: 'sslrank-text-title-class'
                            }));
                            chb.appendChild(elem('description', {
                                id: 'sslrank-text-p-f-secrecy',
                                class: 'sslrank-text-title-class'
                            })); {
                                let cchb = chb.appendChild(elem('hbox', {
                                    flex: '2',
                                    align: 'right'
                                }));
                                cchb.appendChild(elem('description', {
                                    id: 'sslrank-p-f-secrecy-rating',
                                    class: 'sslrank-text-body-rating'
                                }));
                            }
                        }
                    } {
                        let hb = httpsBox.appendChild(elem('hbox', {
                            id: 'sslrank-hbox-3',
                            align: 'top'
                        })); {
                            let chb = hb.appendChild(elem('hbox', {
                                align: 'left',
                                width: IMG_MARGIN_WIDTH
                            }));
                            chb.appendChild(elem('image', {
                                id: 'sslrank-img-tls-version',
                                class: 'sslrank-img-state'
                            }));
                        } {
                            let chb = hb.appendChild(elem('hbox', {
                                align: 'baseline',
                                flex: '2'
                            }));
                            chb.appendChild(elem('description', {
                                id: 'sslrank-text-tls-version-label',
                                value: utils.getText('ssltlsversion.text'),
                                class: 'sslrank-text-title-class'
                            }));
                            chb.appendChild(elem('description', {
                                id: 'sslrank-text-tls-version',
                                class: 'sslrank-text-title-class'
                            }));
                            /* {
                                         let cchb = chb.appendChild(elem('hbox', {
                                           flex: '2',
                                           align: 'right'
                                         }));
                                         cchb.appendChild(elem('description', {
                                           id: 'sslrank-tls-version-rating',
                                           class: 'sslrank-text-body-rating'
                                         }));
                                       } */
                        }
                    } {
                        let hb = httpsBox.appendChild(elem('hbox', {
                            id: 'sslrank-ff-connection-status',
                            flex: '2'
                        })); {
                            let vb = hb.appendChild(elem('vbox', {
                                align: 'left',
                                width: IMG_MARGIN_WIDTH
                            }));
                            vb.appendChild(elem('image', {
                                id: 'sslrank-img-ff-connection-status',
                                class: 'sslrank-img-state'
                            }));
                        } {
                            let vb = hb.appendChild(elem('vbox', {
                                id: 'sslrank-ff-connection-status-text-vbox',
                                flex: '1'
                            })); {
                                let hb = vb.appendChild(elem('hbox', {
                                    id: 'sslrank-ff-connection-status-text-hbox',
                                    align: 'baseline'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-conn-status',
                                    value: utils.getText('connectionstatus.text'),
                                    class: 'sslrank-text-title-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-ff-connection-status',
                                    class: 'sslrank-text-title-class'
                                })); {
                                    let chb = hb.appendChild(elem('hbox', {
                                        flex: '2',
                                        align: 'right'
                                    }));
                                    chb.appendChild(elem('description', {
                                        id: 'sslrank-ff-connection-status-rating',
                                        class: 'sslrank-text-body-rating'
                                    }));
                                }
                            }
                            let desc1 = vb.appendChild(elem('description', {
                                id: 'sslrank-text-ff-connection-status-broken',
                                hidden: true,
                                class: 'sslrank-text-body-class'
                            }));
                            desc1.textContent = utils.getText('connectionstatus.insecure');
                        }
                    } {
                        let hb = httpsBox.appendChild(elem('hbox', {
                            height: '100',
                            flex: '2'
                        })); {
                            let chb = hb.appendChild(elem('hbox', {
                                align: 'left',
                                width: IMG_MARGIN_WIDTH
                            }));
                            chb.appendChild(elem('image', {
                                id: 'sslrank-img-cert-state',
                                class: 'sslrank-img-state'
                            }));
                        } {
                            let vb = hb.appendChild(elem('vbox', {
                                flex: '2'
                            })); {
                                let hb = vb.appendChild(elem('hbox', {
                                    align: 'baseline'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-cert-label',
                                    value: utils.getText('certificate.text'),
                                    class: 'sslrank-text-title-class'
                                })); {
                                    let chb = hb.appendChild(elem('hbox', {
                                        flex: '2',
                                        align: 'right'
                                    }));
                                    chb.appendChild(elem('description', {
                                        id: 'sslrank-cert-status-rating',
                                        class: 'sslrank-text-body-rating'
                                    }));
                                }
                            }
                            vb.appendChild(elem('description', {
                                id: 'sslrank-text-cert-domain-mismatch',
                                value: utils.getText('certificate.dommismatch'),
                                class: 'sslrank-text-body-class'
                            })); {
                                let hb = vb.appendChild(elem('hbox', {
                                    align: 'baseline'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-cert-ev',
                                    value: utils.getText('extendedvalidation.text'),
                                    class: 'sslrank-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-cert-extended-validation',
                                    class: 'sslrank-text-body-class'
                                })); {
                                    let chb = hb.appendChild(elem('hbox', {
                                        flex: '2',
                                        align: 'right'
                                    }));
                                    chb.appendChild(elem('description', {
                                        id: 'sslrank-cert-ev-rating',
                                        class: 'sslrank-text-body-rating'
                                    }));
                                }
                            } {
                                let hb = vb.appendChild(elem('hbox', {
                                    align: 'baseline'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-cert-sigalg-text',
                                    value: utils.getText('signature.text'),
                                    class: 'sslrank-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-cert-sigalg',
                                    class: 'sslrank-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-cert-pub-key-text',
                                    value: utils.getText('certificate.key'),
                                    class: 'sslrank-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-cert-pub-key',
                                    class: 'sslrank-text-body-class'
                                })); {
                                    let chb = hb.appendChild(elem('hbox', {
                                        flex: '2',
                                        align: 'right'
                                    }));
                                    chb.appendChild(elem('description', {
                                        id: 'sslrank-cert-sigalg-rating',
                                        class: 'sslrank-text-body-rating'
                                    }));
                                }
                            } {
                                let hb = vb.appendChild(elem('hbox', {
                                    align: 'baseline'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-cert-cn-label',
                                    value: utils.getText('certificate.commonname'),
                                    class: 'sslrank-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-cert-common-name',
                                    class: 'sslrank-text-body-class'
                                }));
                            } {
                                let hb = vb.appendChild(elem('hbox', {
                                    align: 'baseline'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-cert-issuedto',
                                    value: utils.getText('certificate.issuedto'),
                                    class: 'sslrank-text-body-class'
                                })); {
                                    let vb = hb.appendChild(elem('vbox', {
                                        align: 'baseline',
                                        flex: '1'
                                    }));
                                    vb.appendChild(elem('description', {
                                        id: 'sslrank-text-cert-org',
                                        class: 'sslrank-text-title-class'
                                    }));
                                    vb.appendChild(elem('description', {
                                        id: 'sslrank-text-cert-org-unit',
                                        class: 'sslrank-text-body-class'
                                    }));
                                }
                            } {
                                let hb = vb.appendChild(elem('hbox', {
                                    align: 'baseline'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-cert-issuedby',
                                    value: utils.getText('certificate.issuedby'),
                                    class: 'sslrank-text-body-class'
                                })); {
                                    let vb = hb.appendChild(elem('vbox', {
                                        align: 'baseline',
                                        flex: '1'
                                    }));
                                    vb.appendChild(elem('description', {
                                        id: 'sslrank-text-cert-issuer-org',
                                        class: 'sslrank-text-title-class'
                                    }));
                                    vb.appendChild(elem('description', {
                                        id: 'sslrank-text-cert-issuer-org-unit',
                                        class: 'sslrank-text-body-class'
                                    }));
                                }
                            } {
                                let hb = vb.appendChild(elem('hbox', {
                                    id: 'sslrank-text-cert-validity-box',
                                    align: 'baseline'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-cert-validity-text',
                                    value: utils.getText('certificate.validity'),
                                    class: 'sslrank-text-body-class'
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-cert-validity',
                                    class: 'sslrank-text-body-class'
                                }));
                            } {
                                let hb = vb.appendChild(elem('hbox', {
                                    id: 'sslrank-text-cert-fingerprint-box',
                                    align: 'baseline',
                                }));
                                hb.appendChild(elem('description', {
                                    id: 'sslrank-text-cert-fingerprint-label',
                                    value: utils.getText('certificate.fingerprint'),
                                    class: 'sslrank-text-body-class'
                                })); {
                                    let vb = hb.appendChild(elem('vbox', {
                                        align: 'baseline',
                                        flex: '1'
                                    }));
                                    vb.appendChild(elem('description', {
                                        id: 'sslrank-text-cert-fingerprint-1',
                                        class: 'sslrank-text-body-class'
                                    }));
                                    vb.appendChild(elem('description', {
                                        id: 'sslrank-text-cert-fingerprint-2',
                                        class: 'sslrank-text-body-class'
                                    }));
                                    vb.appendChild(elem('description', {
                                        id: 'sslrank-text-cert-fingerprint-3',
                                        class: 'sslrank-text-body-class'
                                    }));
                                }
                            }
                        }
                    }

                } {
                    let httpBox = mainVbox.appendChild(elem('hbox', {
                        id: 'sslrank-panel-box-http',
                        align: 'baseline',
                        flex: '2',
                        width: HTTP_PANEL_WIDTH,
                        //height: '100',
                        hidden: 'true'
                    })); {
                        let vb = httpBox.appendChild(elem('vbox', {
                            align: 'left',
                            width: IMG_MARGIN_WIDTH
                        }));
                        vb.appendChild(elem('image', {
                            id: 'sslrank-img-http-omg',
                            class: 'sslrank-img-state'
                        }));
                    } {
                        let vb = httpBox.appendChild(elem('vbox', {
                            flex: '1'
                        }));
                        let h1 = vb.appendChild(elem('description', {
                            id: 'sslrank-text-http-1',
                            class: 'sslrank-text-title-class'
                        }));
                        h1.textContent = utils.getText('http.unencrypted');
                        let h2 = vb.appendChild(elem('description', {
                            id: 'sslrank-text-http-2',
                            class: 'sslrank-text-title-class'
                        }));

                        h2.textContent = utils.getText('http.connectattempt');
                        vb.appendChild(elem('label', {
                            id: 'sslrank-panel-https-link',
                            class: 'text-link',
                            crop: 'center',
                            focus: 'true'
                        }));
                        let d1 = vb.appendChild(elem('description', {
                            id: 'sslrank-text-http-note',
                            class: 'sslrank-text-body-class'
                        }));
                        d1.textContent = utils.getText('http.link.disclaimer');
                    }
                }

                return mainVbox;
            }

            function panelDomains() {
                // Fix richlistbox maxheight when loading the content ?
                // Or follow something like this : 
                //  http://mike.kaply.com/2011/08/05/richlistbox-tricks-for-your-add-on/
                let domainsVb = elem('vbox', {
                    id: 'sslrank-panel-domains-vbox',
                    width: HTTPS_PANEL_WIDTH,
                    flex: '1'
                });

                let rb = domainsVb.appendChild(elem('richlistbox', {
                    id: 'sslrank-paneltab-domains-list',
                    // TODO : Fix. css in sheet is not working! 
                    style: '-moz-appearance: none; background-color: rgba(0, 0, 0, 0);',
                    flex: '1',
                    // maxheight: '150'
                })); {
                    //flex: '1'})); {//, maxheight: '150'})); {
                }

                return domainsVb;
            }

            function panelCipherSuites() {
                let csVb = elem('vbox', {
                    id: 'sslrank-paneltab-ciphers',
                    width: HTTPS_PANEL_WIDTH,
                    flex: '1'
                });
                let desc = csVb.appendChild(elem('description', {}));
                desc.textContent = utils.getText('tab.ciphersuites.note');
                let grid = csVb.appendChild(elem('grid', {})); {
                    let cols = grid.appendChild(elem('columns', {}));
                    cols.appendChild(elem('column', {}));
                    cols.appendChild(elem('column', {}));
                } {
                    grid.appendChild(elem('rows', {
                        id: 'sslrank-paneltab-ciphers-rows'
                    }));
                }
                csVb.appendChild(elem('separator', {
                    class: 'groove-thin',
                    orient: 'horizontal'
                }));
                let hb = csVb.appendChild(elem('hbox', {})); {
                    hb.appendChild(elem('button', {
                        label: utils.getText('menu.resetall'),
                        id: 'sslrank-paneltab-ciphers-btn-reset',
                    }));
                    hb.appendChild(elem('button', {
                        label: utils.getText('menu.customlist'),
                        id: 'sslrank-paneltab-ciphers-btn-custom',
                    }));
                }

                return csVb;
            }

            // Box container for the panel. 
            let panelvbox = elem('vbox', {
                id: 'sslrank-panel-vbox'
            }); {
                {
                    let hb = panelvbox.appendChild(elem('hbox', {
                        id: 'sslrank-img-cipher-rank-star',
                        align: 'baseline',
                        height: '20'
                    }));

                    for (var i = 1; i <= 10; i++) {
                        hb.appendChild(elem('image', {
                            id: 'sslrank-img-cipher-rank-star-' + i,
                            class: 'sslrank-star'
                        }));
                    }

                    hb.appendChild(elem('description', {
                        id: 'sslrank-text-cipher-rank-numeric',
                        class: 'sslrank-text-title-class'
                    })); {
                        let chb = hb.appendChild(elem('hbox', {
                            id: 'sslrank-domains-rating-box',
                            align: 'baseline',
                        }));

                        chb.appendChild(elem('description', {
                            id: 'sslrank-text-domains-rating-separator',
                            value: ' | ',
                        }));
                        chb.appendChild(elem('image', {
                            id: 'sslrank-img-domains-rating',
                            width: '8',
                        }));
                        chb.appendChild(elem('description', {
                            id: 'sslrank-text-domains-rating-numeric',
                        }));
                    }
                } {
                    // Why not just use tabs ? Why this mess ?
                    // tabs - gives poor rendering on the panel with unneccesary paddings. 
                    //        - Margins can't be corrected
                    //        - They look heavy and bloated.
                    //        - Advantage is, it is a standard approach + user can navigate. But..
                    // A horizontal listitem/toolbar radio mode buttons doesn't behave well as expected.
                    // Then the remaining option is to hack up tabs on my own.
                    let hb = panelvbox.appendChild(elem('hbox', {
                        class: 'sslrank-paneltab-box'
                    })); {
                        let chb = hb.appendChild(elem('hbox', {
                            id: 'sslrank-paneltab-main',
                            _selected: 'true',
                            class: 'sslrank-paneltab-tab'
                        })); {
                            chb.appendChild(elem('description', {
                                value: utils.getText('tab.primary')
                            }));
                        }

                        // TODO : 'true' 'false' to boolean? _selected is needed for css. 
                        //          CSS can't check boolean ?
                        chb.addEventListener('click', function () {
                            doc.getElementById('sslrank-panel-deck').selectedIndex = 0;
                            doc.getElementById('sslrank-paneltab-domains').setAttribute('_selected', 'false');
                            doc.getElementById('sslrank-paneltab-cipher').setAttribute('_selected', 'false');
                            doc.getElementById('sslrank-paneltab-main').setAttribute('_selected', 'true');
                        }, false);
                        chb = hb.appendChild(elem('hbox', {
                            id: 'sslrank-paneltab-domains',
                            _selected: 'false',
                            class: 'sslrank-paneltab-tab'
                        })); {
                            chb.appendChild(elem('description', {
                                value: utils.getText('tab.domains')
                            }));
                        }
                        chb.addEventListener('click', function () {
                            doc.getElementById('sslrank-panel-deck').selectedIndex = 1;
                            doc.getElementById('sslrank-paneltab-main').setAttribute('_selected', 'false');
                            doc.getElementById('sslrank-paneltab-cipher').setAttribute('_selected', 'false');
                            doc.getElementById('sslrank-paneltab-domains').setAttribute('_selected', 'true');
                        }, false);
                        chb = hb.appendChild(elem('hbox', {
                            id: 'sslrank-paneltab-cipher',
                            _selected: 'false',
                            class: 'sslrank-paneltab-tab'
                        })); {
                            chb.appendChild(elem('description', {
                                value: utils.getText('tab.ciphersuites')
                            }));
                        }
                        chb.addEventListener('click', function () {
                            doc.getElementById('sslrank-panel-deck').selectedIndex = 2;
                            doc.getElementById('sslrank-paneltab-main').setAttribute('_selected', 'false');
                            doc.getElementById('sslrank-paneltab-domains').setAttribute('_selected', 'false');
                            doc.getElementById('sslrank-paneltab-cipher').setAttribute('_selected', 'true');
                        }, false);

                        chb = hb.appendChild(elem('hbox', {
                            class: 'sslrank-paneltab-tab',
                            align: 'baseline',
                            _selected: 'false'
                        })); {
                            phb = chb.appendChild(elem('hbox', {
                                id: 'sslrank-paneltab-pref-box',
                                style: 'margin-left: 50px;'
                            }));
                            var clipboard = phb.appendChild(elem('image', {
                                id: 'sslrank-img-panel-clipboard',
                                tooltiptext: utils.getText('panel.tooltip.clipboard'),
                            }));
                            phb.appendChild(elem('image', {
                                id: 'sslrank-img-panel-pref-icon',
                                tooltiptext: utils.getText('panel.tooltip.preferences'),
                            }));
                        }
                    }
                } {
                    let deck = panelvbox.appendChild(elem('deck', {
                        id: 'sslrank-panel-deck'
                    }));
                    deck.appendChild(panelMain());
                    deck.appendChild(panelDomains());
                    deck.appendChild(panelCipherSuites());
                }
            }

            return panelvbox;

        } catch (e) {
            log.error('Error sslrank panel : ' + e.message);
        }
    };

    return create();
};