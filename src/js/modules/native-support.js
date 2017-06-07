/**
 * Check if this extension is needed or
 * browser can play APNG in native way.
 * see http://eligrey.com/blog/post/apng-feature-detection
 *
 * @return Promise.<boolean>
 */
export default function nativeSupport() {
    return new Promise(resolve => {
        const canvas = document.createElement("canvas");
        if (!("getContext" in canvas)) {
            resolve(false);
            return;
        }

        const img = document.createElement("img");
        img.onload = function () {
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            resolve(ctx.getImageData(0, 0, 1, 1).data[3] === 0);
        };
        // frame 1 (skipped on apng-supporting browsers): [0, 0, 0, 255]
        // frame 2: [0, 0, 0, 0]
        img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACGFjV" +
            "EwAAAABAAAAAcMq2TYAAAANSURBVAiZY2BgYPgPAAEEAQB9ssjfAAAAGmZjVEwAAAAAAAAAAQAAAAEAAA" +
            "AAAAAAAAD6A+gBAbNU+2sAAAARZmRBVAAAAAEImWNgYGBgAAAABQAB6MzFdgAAAABJRU5ErkJggg==";
    });
}
