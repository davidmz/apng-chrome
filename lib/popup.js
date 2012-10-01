document.addEventListener("DOMContentLoaded", function() {
    var isEnabled = false;
    var hostName = null;
    var currentTab = null;
    chrome.tabs.getSelected(null, function (tab) {
        currentTab = tab;
        chrome.tabs.sendRequest(tab.id, {"action":"getInfo"}, function (info) {
            isEnabled = info.enabled;
            hostName = info.hostname.toLowerCase();
            document.getElementById("domain").innerText = hostName;
            if (isEnabled) document.body.className = "";
            document.getElementById("change-link").style.display = "block";
            if (info.found > 0) {
                var fi = document.getElementById("found-images");
                fi.style.display = "block";
                fi.querySelector("span").innerText = info.found;
            }
        });
    });

    document.getElementById("settings-link").addEventListener("click", function () {
        chrome.tabs.create({url:chrome.extension.getURL("options.html")});
        window.close();
    });

    document.getElementById("change-link").addEventListener("click", function () {
        var mode = localStorage["mode"];
        if (mode != "white") mode = "black";
        var list = localStorage[mode + "List"];
        var hostNames = list ? list.toLowerCase().split(/[^a-z0-9.-]+/) : [];
        if (mode == "black" && isEnabled || mode == "white" && !isEnabled) {
            hostNames.push(hostName);
        } else {
            hostNames.splice(hostNames.indexOf(hostName), 1);
        }
        localStorage[mode + "List"] = hostNames.join("\n");
        chrome.tabs.executeScript(currentTab.id, {code:"window.location.reload()"}, null);
        window.close();
    });
});
