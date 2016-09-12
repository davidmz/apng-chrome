import {isPNG, isVolatile} from "./check-request";

const statuses = new Map,
    redirects = new Map;

let lastModified = Date.now();

class Status {
    /**
     * Конструктор
     * @param {boolean|undefined} value
     */
    constructor(value = undefined) {
        this.value = value;
        this.isResolved = (value !== undefined);
        if (this.isResolved) {
            this.promise = Promise.resolve(this.value);
        } else {
            this._resolver = null;
            this.promise = new Promise(yes => this._resolver = yes);
        }
    }

    /**
     * Установить новое значение
     * @param {boolean} value
     */
    resolve(value) {
        if (!this.isResolved) {
            this._resolver(value);
            delete this._resolver;
            this.isResolved = true;
            this.value = value;
        } else if (this.value !== value) {
            this.value = value;
            this.promise = Promise.resolve(this.value);
        }
    }
}


/**
 * @param {string} url
 * @param {int} redirectCount
 * @return {Status}
 */
export function getStatus(url, redirectCount = 0) {
    if (redirectCount < 10 && redirects.has(url)) {
        return getStatus(redirects.get(url), redirectCount + 1);
    }

    if (!statuses.has(url)) {
        statuses.set(url, new Status());
    }

    return statuses.get(url);
}

/**
 * @param {string} url
 * @param {boolean} status
 */
export function setStatus(url, status) {
    const st = getStatus(url);
    if (!st.isResolved) {
        lastModified = Date.now();
    }
    st.resolve(status);
}

chrome.webRequest.onCompleted.addListener(
    details => {
        setStatus(details.url, isPNG(details) && !isVolatile(details));
    },
    {urls: ["<all_urls>"], types: ["image", "main_frame", "sub_frame"]},
    ["responseHeaders"]
);

chrome.webRequest.onBeforeRedirect.addListener(
    ({url, redirectUrl}) => redirects.set(url, redirectUrl),
    {urls: ["<all_urls>"], types: ["image", "main_frame", "sub_frame"]}
);

const gcAlarm = "garbage collection";
chrome.alarms.create(gcAlarm, {periodInMinutes: 10});
chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name == gcAlarm) {
        chrome.webRequest.handlerBehaviorChanged();
        lastModified = Date.now();
        statuses.clear();
        redirects.clear();
    }
});