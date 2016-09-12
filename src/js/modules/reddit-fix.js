import loadAPNG from "./loader";

export default function () {
    for (let sheet of [...document.styleSheets]) {
        if (!/\.thumbs\.redditmedia\.com\//.test(sheet.href)) {
            continue;
        }
        let getRules = Promise.resolve(sheet.cssRules);
        if (sheet.cssRules === null) {
            const sheetNode = sheet.ownerNode;
            getRules = fetch(sheet.href)
                .then(resp => resp.text())
                .then(text => {
                    const styleElement = document.createElement('style');
                    if (sheetNode.hasAttribute('media')) {
                        styleElement.setAttribute('media', sheetNode.getAttribute('media'));
                    }
                    styleElement.setAttribute('data-apng-original-href', sheetNode.getAttribute('href'));
                    styleElement.textContent = text;
                    styleElement.classList.add('--apng-checked');
                    sheetNode.parentNode.insertBefore(styleElement, sheetNode);
                    sheetNode.parentNode.removeChild(sheetNode);
                    return styleElement.sheet.cssRules;
                });
        }

        getRules.then(rules => {
            for (let rule of [...rules]) {
                ['backgroundImage', 'listStyleImage'].forEach(prop => {
                    if (!('style' in rule) || !(prop in rule.style)) {
                        return;
                    }
                    (rule.style[prop].match(/url\((['"]?)(.*?)\1\)/g) || []).forEach(m => {
                        var url = m.match(/url\((['"]?)(.*?)\1\)/)[2];
                        if (/^\/\//.test(url)) {
                            url = location.protocol + url;
                        }
                        loadAPNG(url)
                            .then(webp => rule.style[prop] = rule.style[prop].replace(m, `url(${webp})`))
                            .catch(() => {});
                    });
                });
            }
        });
    }
}