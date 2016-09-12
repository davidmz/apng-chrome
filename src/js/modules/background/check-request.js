export function isPNG(details) {
    return details.responseHeaders.some(({name, value}) => {
        return (name.toLowerCase() == "content-type" && value.toLowerCase() == "image/png");
    });
}

function isURLVolatile(url) {
    return url.indexOf("captcha") != -1;
}

function isURLNotVolatile(url) {
    return !!url.match(/^https?:\/\/([^/]+\.)?googlegroups\.com\//);
}

export function isVolatile(details) {
    if (details.method != "GET" || isURLVolatile(details.url)) return true;
    if (details.fromCache || isURLNotVolatile(details.url)) return false;
    return details.responseHeaders.some(({name, value}) => {
        name = name.toLowerCase();
        return (
            name == "cache-control" && /no-cache|no-store|must-revalidate/i.test(value)
            || name == "pragma" && /no-cache/i.test(value)
            || name == "expires" && new Date(value) <= new Date()
        );
    });
}

