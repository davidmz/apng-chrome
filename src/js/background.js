import {parse} from 'url';
import {getStatus, setStatus} from './modules/background/url-tracker';
import * as msgTypes from './modules/msg-types';
import List from './modules/background/hosts-list';

const iconOn = {'19': 'icons/apng-logo-19-on.png', '38': 'icons/apng-logo-38-on.png'};
const iconOff = {'19': 'icons/apng-logo-19-off.png', '38': 'icons/apng-logo-38-off.png'};
const iconFound = {'19': 'icons/apng-logo-19-found.png', '38': 'icons/apng-logo-38-found.png'};

const animationsInTabs = new Map();

chrome.browserAction.setBadgeBackgroundColor({color: '#000'});

chrome.runtime.onMessage.addListener(({action, data}, sender, callback) => {
    if (action === msgTypes.CHECK_URL) {
        getStatus(data).promise.then(callback);
        return true; // чтобы callback сохранился для асинхронного вызова

    } else if (action === msgTypes.NOT_APNG) {
        setStatus(data, false);
        callback();

    } else if (action === msgTypes.CHECK_HOST) {
        const hostName = parse(sender.tab.url).hostname;
        const enabled = new List().isEnabled(hostName);
        chrome.browserAction.setIcon({
            tabId: sender.tab.id,
            path: enabled ? iconOn : iconOff
        }, () => chrome.runtime.lastError);
        callback(enabled);

    } else if (action === msgTypes.APNG_FOUND) {
        const tabId = sender.tab.id;
        const urls = animationsInTabs.get(tabId) || [];
        if (urls.indexOf(data) < 0) {
            urls.push(data);
            chrome.browserAction.setIcon({tabId, path: iconFound}, () => {
                if (!chrome.runtime.lastError) {
                    animationsInTabs.set(tabId, urls);
                    chrome.browserAction.setBadgeText({tabId, text: urls.length.toString(10)});
                }
            });
        }
        callback();

    } else if (action === msgTypes.FETCH_IMAGE) {
        fetch(data)
            .then(resp => {
                if (!resp.ok) throw new Error(`Http error ${resp.status}: ${resp.statusText}`);
                return resp.blob();
            })
            .then(blob => URL.createObjectURL(blob))
            .then(callback)
            .catch(err => callback({'err': err.toString()}));
        return true;

    } else if (action === msgTypes.REVOKE_URL) {
        URL.revokeObjectURL(data);
        callback();

    } else if (action === msgTypes.GET_TAB_ANIMATIONS) {
        callback(animationsInTabs.get(data) || []);

    }
    return false;
});

chrome.tabs.onRemoved.addListener(tabId => animationsInTabs.delete(tabId));
