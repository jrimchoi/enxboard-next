import { Html, Head, Main, NextScript } from "next/document";

var queueScript = [
    "(function () {",
    "var queued = [];",
    "var live = null;",
    "window.__enxTakeWidgetQueue = function (onLive) {",
    "var copy = queued.slice();",
    "queued.length = 0;",
    "live = onLive;",
    "return copy;",
    "};",
    "window.addEventListener('message', function (event) {",
    "var payload = event.data || {};",
    "if (!payload || payload.source !== '3DDashboard') return;",
    "if (live) live(payload);",
    "else queued.push(payload);",
    "});",
    "})();",
].join("");

export default function Document() {
    return (
        <Html lang="ko">
            <Head>
                <link rel="stylesheet" href="/core/wux-3ds-fonticons.css" />
                <script dangerouslySetInnerHTML={{ __html: queueScript }} />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
