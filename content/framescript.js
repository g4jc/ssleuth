(function () {
    "use strict";

    const Ci = Components.interfaces;
    var windowId = content.QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIDOMWindowUtils).outerWindowID;

    var scriptId = null;

    var cleanup = function () {
        removeEventListener("unload", onUnload);
        removeMessageListener("sslrank@hyperbola.info:shutdown", onShutdown);
        removeMessageListener("sslrank@hyperbola.info:win-id", sendWindowId);
    };

    var onShutdown = function (msg) {
        // Unload only if the script id matches. Workaround for bug 1202125
        if (msg.data.id === scriptId)
            cleanup();
    };

    var onUnload = function (evt) {

        sendAsyncMessage("sslrank@hyperbola.info:tab-close", {
            id: windowId
        });

        cleanup();

    };

    var onScriptId = function (msg) {
        removeMessageListener("sslrank@hyperbola.info:script-id", onScriptId);
        scriptId = msg.data.id;
    };

    var sendWindowId = function (evt) {
        var url = content.location,
            urlScheme = url.protocol.split(':')[0];

        sendAsyncMessage("sslrank@hyperbola.info:win-id", {
            id: windowId,
            scheme: urlScheme,
            uri: url.toString()
        });

    };

    addEventListener("unload", onUnload);
    addMessageListener("sslrank@hyperbola.info:script-id", onScriptId);
    addMessageListener("sslrank@hyperbola.info:shutdown", onShutdown);
    addMessageListener("sslrank@hyperbola.info:win-id", sendWindowId);

}());