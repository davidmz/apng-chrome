import apng2webp from "apng2webp";

import * as msgTypes from "./msg-types";
import {sendMsg} from "./common";

const webpURLs = new Map();

/**
 * Load APNG by url and generate WebP blob url
 * @param {string} url
 * @return {Promise.<string>}
 */
export default function (url) {
    if (!webpURLs.has(url)) {
        const chk = Promise.resolve(url)
            .then(checkStopList)
            .then(isPNG_URL)
            .then(loadImageData)
            .then(apng2webp)
            .then(blob => URL.createObjectURL(blob));
        webpURLs.set(url, chk);
        chk
            .then(() => sendMsg(msgTypes.APNG_FOUND, url))
            .catch(() => sendMsg(msgTypes.NOT_APNG, url));
    }
    return webpURLs.get(url);
}

async function isPNG_URL(url) {
    if (await sendMsg(msgTypes.CHECK_URL, url)) {
        return url;
    }
    throw new Error(`Not a PNG or volatile`);
}

async function loadImageData(url) {
    const wp = await sendMsg(msgTypes.FETCH_IMAGE, url);
    if (typeof wp === 'object') {
        throw new Error(wp.err);
    }

    try {
        const resp = await fetch(wp);
        if (!resp.ok) {
            throw new Error(`Http error ${resp.status}: ${resp.statusText}`);
        }
        return resp.arrayBuffer();
    } finally {
        sendMsg(msgTypes.REVOKE_URL, wp);
    }
}

/**
 * Стоп-лист изображений, которые нельзя парсить как APNG
 * @param {string} url
 */
async function checkStopList(url) {
    const res = [
        /^blob:/,
        /^data:/,
        /^https?:\/\/mts\d\.google\.\w+\//,
        /^https?:\/\/\w+\.gstatic\.\w+\//,
        /^https?:\/\/[\w.]+\.tiles\.virtualearth\.net\//,
        /^https?:\/\/\w+\.maps\.yandex\.net\//
    ];

    if (res.some(re => re.test(url))) {
        throw new Error("URL in stop list");
    }
    return url;
}
