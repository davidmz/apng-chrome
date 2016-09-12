import {selectFrom} from './common';
import loadAPNG from './loader';
import redditFix from './reddit-fix';

// начальный обход
export function onStart() {
    selectFrom(document.body, 'img').forEach(animateImage);
    selectFrom(document.body, '*[style*="url("]').forEach(animateStyle);
    animatePageStyles();
    if (location.hostname == "www.reddit.com") {
        redditFix();
    }

    setInterval(animatePageStyles, 2000);
}

export function onMutation(mutations) {
    mutations.forEach(mut => {
        if (mut.type === "attributes") {
            if (mut.target.tagName == "IMG" && (mut.attributeName == "src" || mut.attributeName == "class" || mut.attributeName == "style" )) {
                animateImage(mut.target);
            }
        } else if (mut.addedNodes.length > 0) {
            [...mut.addedNodes].forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    selectFrom(node, 'img').forEach(animateImage);
                    selectFrom(node, '*[style*="url("]').forEach(animateStyle);
                }
            });
        }
    });
}

async function animateImage(image) {
    try {
        const wu = await loadAPNG(image.currentSrc || image.src);
        image.style.content = `url(${wu})`;
    } catch (e) {
    }
}

function animateStyle(el) {
    for (const prop of ["backgroundImage", "listStyleImage"]) {
        if (!(prop in el.style)) {
            return;
        }
        const propVal = el.style[prop];
        const matches = propVal.match(/url\((['"]?)(.*?)\1\)/g) || [];
        for (const match of matches) {
            const url = match.match(/url\((['"]?)(.*?)\1\)/)[2];
            loadAPNG(url)
                .then(webp => el.style[prop] = propVal.replace(match, `url(${webp})`))
                .catch(() => {});
        }
    }
}

function animatePageStyles() {
    for (const sheet of [...document.styleSheets]) {
        const node = sheet.ownerNode;
        if (node) {
            if (node.classList.contains('--apng-checked')) {
                continue;
            }
            node.classList.add('--apng-checked');
        }
        const rules = sheet.cssRules || [];
        for (const rule of [...rules]) {
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
    }
}