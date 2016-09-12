import "babel-polyfill";
import "./modules/common";
import * as msgTypes from "./modules/msg-types";
import * as observer from "./modules/observer";
import {sendMsg} from "./modules/common";

if (/^https?:$/.test(window.location.protocol)) {
    sendMsg(msgTypes.CHECK_HOST)
        .then(response => {
            if (response) {
                observer.onStart();
                new MutationObserver(observer.onMutation).observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ["src", "style", "class"]
                });
            }
        });
}

