/**
 * @property {string[]} items
 */
export default class List {
    /** @type {boolean} */
    isBlack = true;
    /** @type {string[]} */
    blackItems = [];
    /** @type {string[]} */
    whiteItems = [];

    constructor() {
        const mode = localStorage['mode'];
        this.isBlack = (mode != 'white');
        for (const m of ['black', 'white']) {
            const list = localStorage[`${m}List`];
            this[`${m}Items`] = list ? list.toLowerCase().split(/[^a-z0-9.*-]+/) : [];
        }
    }

    get items() {
        return this[`${this.isBlack ? 'black' : 'white'}Items`]
    }

    /**
     * @param {string} hostName
     * @return {boolean}
     */
    inList(hostName) {
        return this.items.some(h => {
            if (h.substr(0, 2) == '*.') {
                return (hostName.substr(-h.length + 1) == h.substr(1));
            } else {
                return hostName == h;
            }
        });
    }

    /**
     * @param {string} hostName
     * @return {boolean}
     */
    isEnabled(hostName) {
        return (this.isBlack !== this.inList(hostName));
    }

    /**
     * @param {string} hostName
     * @param {boolean} value
     */
    setEnabled(hostName, value) {
        if (value === this.isEnabled(hostName)) {
            return;
        }
        if (this.isBlack !== value) {
            this.items.push(hostName);
        } else {
            const p = this.items.indexOf(hostName);
            if (p >= 0) {
                this.items.splice(p, 1);
            }
        }
        this.save();
    }

    save() {
        localStorage['mode'] = this.isBlack ? 'black' : 'white';
        localStorage["blackList"] = this.blackItems.join("\n");
        localStorage["whiteList"] = this.whiteItems.join("\n");
    }
}
