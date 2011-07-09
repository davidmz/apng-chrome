(function() {
    var global = (function() {
        return this;
    })(), D = Deferred;

    var isEnabled = false, foundCount = 0;

    chrome.extension.onRequest.addListener(function(request, sender, callback) {
        if (request.action == "getInfo") {
            callback({
                "hostname": global.location.hostname,
                "enabled":  isEnabled,
                "found":    foundCount
            });
        }
    });

    chrome.extension.sendRequest({"action": "checkHostname", "data": global.location.hostname},
            function(response) {
                if (!response) return;

                isEnabled = true;
                var allAnimations = [];
                var urlPromises = {};

                var loadAndAnimateUrl = function(url) {
                    if (typeof urlPromises[url] == "undefined") {
                        urlPromises[url] = D.pipeline(url)(
                                loadAndParse,
                                function(apng) { return new Animation(apng); },
                                function(a) {
                                    allAnimations.push(a);
                                    animationFound(a);
                                    return a;
                                }
                        );
                    }
                    return urlPromises[url];
                };


                var animateImage = function(image) {
                    return loadAndAnimateUrl(image.src).done(function(a) {
                        var ctxName = a.getCSSCanvasContext();
                        if (!image.hasAttribute("width") && !image.style.width)
                            image.style.width = global.getComputedStyle(image).width;
                        if (!image.hasAttribute("height") && !image.style.height)
                            image.style.height = global.getComputedStyle(image).height;

                        image.apngContextName = ctxName;
                        image.style.content = "-webkit-canvas(" + ctxName + ")";

                        var event = document.createEvent('Event');
                        event.initEvent('apngCreated', true, true);
                        image.dispatchEvent(event);
                    });
                };

                var ctxNamePrefix = "apng-chrome-ext-css-", ctxNameCounter = 1;

                var Animation = function(apng) {
                    var thisAnimation = this;

                    this.isActive = false;
                    this.nextRenderTime = 0;

                    for (var k in apng) this[k] = apng[k];

                    var readyD = new D();
                    readyD.promise(this);

                    // создаём картинки
                    var loadedImages = 0, frame;
                    for (var f = 0; f < this.frames.length; f++) {
                        var img = new Image();
                        frame = this.frames[f];
                        frame.img = img;
                        img.onload = function() {
                            loadedImages++;
                            if (loadedImages == thisAnimation.frames.length) readyD.resolve(thisAnimation);
                        };
                        img.onerror = function() {
                            readyD.reject("Image creation error");
                        };
                        img.src = frame.url;
                        delete frame.url;
                    }

                    var context = null;
                    var contextName = null;
                    this.getCSSCanvasContext = function() {
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

                var loadAndParse = function(url) {
                    var d = new D();
                    // посылаем сообщение фоновой странице
                    chrome.extension.sendRequest({"action": "loadAndParse", "data": url}, function(response) {
                        if (response.ok) {
                            d.resolve(response.apng);
                        } else {
                            d.reject(response.reason);
                        }
                    });
                    return d.promise();
                };

                var checkImages = function() {
                    for (var i = 0, l = document.images.length; i < l; i++) {
                        var image = document.images[i];
                        if (image.apngContextName && !image.style.content) {
                            if (!image.hasAttribute("width") && !image.style.width)
                                image.style.width = global.getComputedStyle(image).width;
                            if (!image.hasAttribute("height") && !image.style.height)
                                image.style.height = global.getComputedStyle(image).height;

                            image.style.content = "-webkit-canvas(" + image.apngContextName + ")";
                            continue;
                        }
                        if (
                            image.hasAttribute("data-is-apng")
                            ||
                            /\.(gif|jpe?g|bmp|svgz?)($|\?)/i.test(image.src)
                            ||
                            (image.width == 1 && image.height == 1)
                        ) continue;
                        (function(image) {
                            image.setAttribute("data-is-apng", "progress");
                            animateImage(image).done(function(a) {
                                image.setAttribute("data-is-apng", a.isStillImage ? "static" : "yes");
                            }).fail(function() {
                                image.setAttribute("data-is-apng", "no");
                                if (!image.apngListenerAttached) {
                                    image.addEventListener("load", onImageLoad, false);
                                    image.apngListenerAttached = true;
                                }
                            });
                        })(image);
                    }
                };

                // Если картинка сменила src
                var onImageLoad = function(e) { e.target.removeAttribute("data-is-apng"); };
                
                var checkCSSImages = function() {
                    for (var si = 0, sl = document.styleSheets.length; si < sl; si++) {
                        var ss = document.styleSheets[si];
                        if (ss.apngChecked || !ss.rules) continue;
                        ss.apngChecked = true;
                        for (var ri = 0, rl = ss.rules.length; ri < rl; ri++) {
                            var rule = document.styleSheets[si].rules[ri];
                            if (rule.style) {
                                var props = ["backgroundImage", "listStyleImage"], prop;
                                while (prop = props.shift()) {
                                    if (rule.style[prop]) {
                                        var matches = rule.style[prop].match(/url\((['"]?)(.*?)\1\)/g) || [];
                                        for (var mi = 0; mi < matches.length; mi++) {
                                            var url = matches[mi].match(/url\((['"]?)(.*?)\1\)/)[2];
                                            if (!/\.(gif|jpe?g|bmp|svgz?)($|\?)/i.test(url)) {
                                                (function(url, rule, prop, m) {
                                                    loadAndAnimateUrl(url).done(function(a) {
                                                        var ctxName = a.getCSSCanvasContext();
                                                        rule.style[prop] = rule.style[prop].replace(m, "-webkit-canvas(" + ctxName + ")");
                                                    });
                                                })(url, rule, prop, matches[mi]);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                };

                setInterval(function() {
                    checkImages();
                    checkCSSImages();
                }, 1000);
                checkImages();
                checkCSSImages();

                var requestAnimationFrame = global.requestAnimationFrame || global.webkitRequestAnimationFrame;

                // Main animation loop
                var animationTick = function(t) {
                    for (var i = 0; i < allAnimations.length; i++) {
                        var a = allAnimations[i];
                        while (a.isActive && a.nextRenderTime <= t) a.renderFrame(t);
                    }
                    requestAnimationFrame(animationTick);
                };

                var isAnimationFound = false;
                var animationFound = function(a) {
                    if (!isAnimationFound) {
                        isAnimationFound = true;
                        requestAnimationFrame(animationTick);
                    }
                    if (!a.isStillImage) foundCount++;
                    chrome.extension.sendRequest({
                        "action":   "apngFound",
                        "data":     foundCount
                    });
                };

            });
})();

