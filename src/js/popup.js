import {parse} from 'url';
import List from './modules/background/hosts-list';
import * as msgTypes from './modules/msg-types';
import {sendMsg} from './modules/common';
import nativeSupport from './modules/native-support';

chrome.tabs.getSelected(null, currentTab => {
    const isNormalPage = /^https?:\/\//.test(currentTab.url);
    const hostName = parse(currentTab.url).hostname;
    const enabled = new List().isEnabled(hostName);

    new Vue({
        el: '#app',
        data: {
            isNormalPage,
            hasNativeSupport: false,
            hostName,
            enabled,
            foundUrls: []
        },
        methods: {
            openSettings: function () {
                chrome.runtime.openOptionsPage();
                window.close();
            },
            toggleEnabled: function () {
                new List().setEnabled(hostName, !this.enabled);
                chrome.tabs.executeScript(currentTab.id, {code: "window.location.reload()"}, null);
                window.close();
            }
        },
        ready: function () {
            this.$el.classList.remove('hidden');

            sendMsg(msgTypes.GET_TAB_ANIMATIONS, currentTab.id).then(urls => this.foundUrls = urls);
            nativeSupport().then(v => this.hasNativeSupport = v);
        }
    });
});


