import {parse} from 'url';
import Vue from 'vue';
import List from './modules/background/hosts-list';
import * as msgTypes from './modules/msg-types';
import {sendMsg} from './modules/common';

chrome.tabs.getSelected(null, tab => {
    const isNormalPage = /^https?:\/\//.test(tab.url);
    const currentTab = tab;
    const hostName = parse(tab.url).hostname;
    const enabled = new List().isEnabled(hostName);

    new Vue({
        el: '#app',
        data: {
            isNormalPage,
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
        }
    });
});


