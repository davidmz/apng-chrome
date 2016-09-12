Promise.prototype.finally = function (callback) {
    let p = this.constructor;
    // We don’t invoke the callback in here,
    // because we want then() to handle its exceptions
    return this.then(
        // Callback fulfills: pass on predecessor settlement
        // Callback rejects: pass on rejection (=omit 2nd arg.)
        value => p.resolve(callback()).then(() => value),
        reason => p.resolve(callback()).then(() => { throw reason })
    );
};

/**
 * @param {Document|DocumentFragment|Element} node
 * @param {string} selector
 */
export function selectFrom(node, selector) {
    if (node === null) return [];
    var nodeList = node.querySelectorAll(selector);
    var nodes = nodeList ? [...nodeList] : [];
    if (node.matches(selector)) nodes.unshift(node);
    return nodes;
}

/**
 *
 * @param {string} action
 * @param {*} data
 * @return {Promise}
 */
export function sendMsg(action, data = null) {
    return new Promise(yes => chrome.runtime.sendMessage({action, data}, yes));
}
