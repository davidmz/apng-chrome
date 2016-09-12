import Vue from 'vue';
import List from './modules/background/hosts-list';

const list = new List();

new Vue({
    el: '#app',
    data: {
        isBlack: list.isBlack,
        blackList: list.blackItems.join("\n"),
        whiteList: list.whiteItems.join("\n")
    },
    computed: {
        mode: {
            get: function () { return this.isBlack ? 'black' : 'white'; },
            set: function (x) { this.isBlack = (x !== 'white'); }
        },
        listText: {
            get: function () { return this[`${this.mode}List`]; },
            set: function (x) { this[`${this.mode}List`] = x; }
        }
    },
    methods: {
        save: function () {
            const list = new List();
            list.isBlack = this.isBlack;
            list.blackItems = this.blackList.toLowerCase().split(/[^a-z0-9.*-]+/) || [];
            list.whiteItems = this.whiteList.toLowerCase().split(/[^a-z0-9.*-]+/) || [];
            list.save();
            window.close();
        }
    },
    ready: function () { this.$el.style.display = 'block'; }
});
