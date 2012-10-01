/**
 * URL, которые не проверяем ни при каких условиях
 *
 * @param url
 * @return {Boolean}
 */
var inStopList = function (url) {
    var res = [
        /^https?:\/\/mts\d\.google\.\w+\//,
        /^https?:\/\/\w+\.gstatic\.\w+\//,
        /^https?:\/\/[\w.]+\.tiles\.virtualearth\.net\//,
        /^https?:\/\/\w+\.maps\.yandex\.net\//
    ];
    for (var i = 0, l = res.length; i < l; i++) {
        if (res[i].test(url)) return true;
    }
    return false;
};

