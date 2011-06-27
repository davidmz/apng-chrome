function parseQueryString(qs) {
    var result = {};
    if(qs.charAt(0) == "?" || qs.charAt(0) == "#") qs = qs.substr(1);
    qs.split("&").forEach(function(pair) {
        var p = pair.split("=");
        if(p.length == 1) p[1] = ""; else p[1] = decodeURIComponent(p[1].replace(/\+/g, '%20'));
        if(p[0].substr(p[0].length - 2) == "[]") {
            p[0] = p[0].substr(0, p[0].length - 2);
            if(typeof result[p[0]] == "undefined" || result[p[0]].constructor != Array) result[p[0]] = [];
            result[p[0]].push(p[1]);
        } else {
            result[p[0]] = p[1];
        }
    });
    return result;
}
