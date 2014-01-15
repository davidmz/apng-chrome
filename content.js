(function () {
    var global = (function() {
        return this;
    })(), D = Deferred;

    var isEnabled = false;

    var requestAnimationFrame = global.requestAnimationFrame || global.webkitRequestAnimationFrame;

    var NOT_AN_APNG = "*NOT_AN_APNG*";

    var loadBytes = function (url) {
        var d = D();
        if (inStopList(url)) {
            d.reject("Url in stop list");
        } else if (url.substr(0, 5) == "blob:") {
            d.reject("BLOB's not supported");
        } else if (url.substr(0, 5) == "data:") {
            var parts = url.substr(5).split(",", 2);
            parts[0] = parts[0].split(";");
            var data = parts[1], mime = parts[0][0], enc = parts[0][parts[0].length - 1];

            if (mime.indexOf("image/png") !== 0) {
                d.reject("not a PNG data");
            } else {
                var str = (enc == "base64") ? atob(data) : unescape(data);
                var bytes = new Uint8Array(str.length);
                for (var i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
                d.resolve(bytes);
            }
        } else {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = "arraybuffer";
            xhr.onload = function () {
                if (this.status == 200) {
                    d.resolve(new Uint8Array(this.response));
                } else {
                    d.reject(xhr.statusText);
                }
            };
            xhr.send();
        }
        return d.promise();
    };

    var checkUrl = function(url) {
        var d = D();
        chrome.extension.sendRequest(
                {"action":"checkUrl", "url":url},
                function (resp) {
                    if (resp) {
                        d.resolve(url);
                    } else {
                        d.reject(NOT_AN_APNG);
                    }
                }
        );
        return d.promise();
    };

    var urlPromises = {};
    var allAnimations = [];
    var loadAndParseURL = function (url) {
        if (!(url in urlPromises)) {
            urlPromises[url] = D.pipeline(url)(
                    checkUrl,
                    loadBytes,
                    parseAPNG,
                    function (apng) {
                        return new Animation(apng);
                    },
                    function (a) {
                        allAnimations.push(a);
                        animationFound();
                        return a;
                    }
            );
        }
        return urlPromises[url];
    };

    var ctxNamePrefix = "apng-chrome-ext-css-", ctxNameCounter = 1;
    var Animation = function(apng) {
        this.isActive = false;
        this.nextRenderTime = 0;

        for (var k in apng) if (apng.hasOwnProperty(k)) this[k] = apng[k];

        var context = null;
        var contextName = null;
        this.getCanvasName = function() {
            if (!context) {
                contextName = ctxNamePrefix + (ctxNameCounter++);
                context = document.getCSSCanvasContext("2d", contextName, this.width, this.height);
                this.isActive = true;
            }
            return contextName;
        };

        var fNum = 0;
        var prevF = null;
        this.renderFrame = function(now) {
            if (!context) return;
            var f = fNum++ % this.frames.length;
            var frame = this.frames[f];

            if (f == 0) {
                context.clearRect(0, 0, this.width, this.height);
                prevF = null;
                if (frame.disposeOp == 2) frame.disposeOp = 1;
            }

            if (prevF && prevF.disposeOp == 1) {
                context.clearRect(prevF.left, prevF.top, prevF.width, prevF.height);
            } else if (prevF && prevF.disposeOp == 2) {
                context.putImageData(prevF.iData, prevF.left, prevF.top);
            }
            prevF = frame;
            prevF.iData = null;
            if (prevF.disposeOp == 2) {
                prevF.iData = context.getImageData(frame.left, frame.top, frame.width, frame.height);
            }
            if (frame.blendOp == 0) context.clearRect(frame.left, frame.top, frame.width, frame.height);
            context.drawImage(frame.img, frame.left, frame.top);

            if (this.numPlays == 0 || fNum / this.frames.length < this.numPlays) {
                if (this.nextRenderTime == 0) this.nextRenderTime = now;
                while (now > this.nextRenderTime + this.playTime) this.nextRenderTime += this.playTime;
                this.nextRenderTime += frame.delay;
            } else {
                this.isActive = false;
            }
        };
    };

    var onImageLoad = function () {
        var image = this, w = image.width, h = image.height;
        loadAndParseURL(image.src)
                .done(function (a) {
                    if (!image.hasAttribute("width") && (!image.style.width || image.style.width == "auto")) {
                        image.style.width = w + "px";
                        image.style.cssText = image.style.cssText.replace(/\bwidth:\s*\d+px/, "$& !important");
                    }
                    if (!image.hasAttribute("height") && (!image.style.height || image.style.height == "auto")) {
                        image.style.height = h + "px";
                        image.style.cssText = image.style.cssText.replace(/\bheight:\s*\d+px/, "$& !important");
                    }
                    var ctxName = a.getCanvasName();
                    image.apngContextName = ctxName;
                    image.style.content = "-webkit-canvas(" + ctxName + ")";
                })
                .fail(function (err) {
                    chrome.extension.sendRequest({
                        "action":"isAnAPNG",
                        "url":image.src,
                        "isIt":false
                    });
                    if (err == NOT_AN_APNG) {
                        image.style.content = "";
                        delete(image.apngContextName);
                    }
                });
    };
    var checkImages = function () {
        for (var i = 0, l = document.images.length; i < l; i++) {
            var image = document.images[i];
            if (image.apngContextName && !image.style.content) {
                image.style.content = "-webkit-canvas(" + image.apngContextName + ")";
                continue;
            }
            if ("apngStatus" in image) continue;

            image.apngStatus = true;
            image.addEventListener("load", onImageLoad, false);
            if (image.complete) onImageLoad.apply(image);
        }
    };

    var checkInlineCSSImages = function () {
        var els = document.querySelectorAll("*[style*='url(']");
        for (var i = 0, l = els.length; i < l; i++) {
            var el = els[i];
            if ("apngStatus" in el) continue;
            el.apngStatus = true;
            var props = ["backgroundImage", "listStyleImage"], prop;
            while (prop = props.shift()) {
                if (prop in el.style) {
                    var matches = el.style[prop].match(/url\((['"]?)(.*?)\1\)/g) || [];
                    for (var mi = 0; mi < matches.length; mi++) {
                        var url = matches[mi].match(/url\((['"]?)(.*?)\1\)/)[2];
                        (function (url, el, prop, m) {
                            loadAndParseURL(url)
                                    .done(function (a) {
                                        el.style[prop] = el.style[prop]
                                                .replace(m, "-webkit-canvas(" + a.getCanvasName() + ")");
                                    });
                        })(url, el, prop, matches[mi]);
                    }
                }
            }
        }
    };

    var fixRedditStyles = function () {
        for (var i = 0, l = document.styleSheets.length; i < l; i++) {
            var sheet = document.styleSheets[i];
            if (/\.thumbs\.redditmedia\.com\//.test(sheet.href)) {
                var d = D();
                if (sheet.cssRules === null) {
                    var sheetNode = sheet.ownerNode;
                    var xhr = new XMLHttpRequest();
                    xhr.open('GET', sheet.href, true);
                    xhr.responseType = "text";
                    xhr.onload = (function (sheetNode, d) {
                        return function () {
                            if (this.status != 200) return;
                            var styleElement = document.createElement("style");
                            if (sheetNode.hasAttribute("media")) styleElement.setAttribute("media", sheetNode.getAttribute("media"));
                            styleElement.setAttribute("data-apng-original-href", sheetNode.getAttribute("href"));
                            styleElement.textContent = this.response;
                            sheetNode.parentNode.insertBefore(styleElement, sheetNode);
                            sheetNode.parentNode.removeChild(sheetNode);
                            d.resolve(styleElement.sheet.cssRules);
                        };
                    })(sheetNode, d);
                    xhr.send();
                } else {
                    d.resolve(sheet.cssRules);
                }
                d.promise().done(function (rules) {
                    for (var i = 0; i < rules.length; i++) {
                        var rule = rules[i];
                        ["backgroundImage", "listStyleImage"].forEach(function (prop) {
                            if (!(prop in rule.style)) return;
                            (rule.style[prop].match(/url\((['"]?)(.*?)\1\)/g) || []).forEach(function (m) {
                                (function (m, rule, prop) {
                                    var url = m.match(/url\((['"]?)(.*?)\1\)/)[2];
                                    loadAndParseURL(url).done(function (a) {
                                        rule.style[prop] = rule.style[prop].replace(m, "-webkit-canvas(" + a.getCanvasName() + ")");
                                    });
                                })(m, rule, prop);
                            });
                        });
                    }
                });
            }
        }
    };


    chrome.extension.sendRequest(
            {"action":"checkHostname", "data":global.location.hostname},
            function (response) {
                if (response) {
                    isEnabled = true;

                    if (location.hostname == "www.reddit.com") fixRedditStyles();
                    // main check loop
                    (function () {
                        checkImages();
                        checkInlineCSSImages();
                        setTimeout(arguments.callee, 1000);
                    })();
                }
            }
    );

    // Main animation loop
    var animationTick = function (t) {
        for (var i = 0; i < allAnimations.length; i++) {
            var a = allAnimations[i];
            while (a.isActive && a.nextRenderTime <= t) a.renderFrame(t);
        }
        requestAnimationFrame(animationTick);
    };

    var foundCount = 0;
    chrome.extension.onRequest.addListener(function(request, sender, callback) {
        if (request.action == "getInfo") {
            callback({
                "hostname": global.location.hostname,
                "enabled":  isEnabled,
                "found":    foundCount
            });
        }
    });

    var isAnimationFound = false;
    var animationFound = function() {
        if (!isAnimationFound) {
            isAnimationFound = true;
            requestAnimationFrame(animationTick);
        }
        foundCount++;
        chrome.extension.sendRequest({
            "action":   "apngFound",
            "data":     foundCount
        });

        if (document.images.length == 1 && document.images[0].src == location.href) {

            var link = document.createElement("link");
            link.href = "about:blank";
            link.type = "text/css";
            link.rel = "stylesheet";
            document.body.appendChild(link);

            var a = allAnimations[0];
            var cont = document.body.appendChild(document.createElement("div"));
            var cont2 = document.body.appendChild(document.createElement("div"));
            cont.className = "apng-frames-list";
            cont.innerHTML = "<span>Show APNG frames</span>";

            cont2.className = "apng-frames-list";
            cont2.style.display = "none";
            for (var i = 0, l = a.frames.length; i< l; i++) {
                var frame = a.frames[i], img = frame.img;
                var fc = cont2.appendChild(document.createElement("div"));
                fc.style.width = a.width + "px";
                fc.style.height = a.height + "px";
                img.style.left = frame.left+"px";
                img.style.top  = frame.top+"px";
                fc.appendChild(img);
            }

            var isHidden = true;
            cont.querySelector("span").addEventListener("click", function(e) {
                var tgt = e.target;
                isHidden = !isHidden;
                if (isHidden) {
                    tgt.innerHTML = "Show APNG frames";
                    tgt.className = "";
                    cont2.style.display = "none";
                } else {
                    tgt.innerHTML = "Hide APNG frames";
                    tgt.className = "shown";
                    cont2.style.display = "block";
                }
            });
        }
    };

})();
