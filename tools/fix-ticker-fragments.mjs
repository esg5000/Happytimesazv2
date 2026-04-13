import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

const files = [
  "food.html",
  "cannabis.html",
  "nightlife.html",
  "health-wellness.html",
  "events.html",
  "news.html",
  "dispensaries.html",
  "about.html",
  "contact.html",
  "privacy-policy.html",
  "terms-of-service.html",
  "disclosure.html",
  "article.html",
];

const TICKER_BLOCK = `  <div class="headline-ticker headline-ticker--fixed" id="headline-ticker" aria-label="Latest headlines">
    <div class="headline-ticker__viewport">
      <div class="headline-ticker__label">Latest</div>
      <div class="headline-ticker__scroll-wrap">
        <div class="headline-ticker__track" id="headline-ticker-track"></div>
      </div>
    </div>
  </div>`;

/** Orphan inner ticker markup left after a bad regex (no outer .headline-ticker wrapper). */
const orphan =
  /<\/header>\s*<div class="headline-ticker__scroll-wrap">\s*<div class="headline-ticker__track" id="headline-ticker-track"><\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*/;

/** Orphan immediately followed by a complete fixed ticker — drop orphan, keep ticker. */
const orphanThenTicker = new RegExp(
  orphan.source +
    String.raw`(<div class="headline-ticker headline-ticker--fixed"[^>]*>[\s\S]*?<div class="headline-ticker__track" id="headline-ticker-track"><\/div>\s*<\/div>\s*<\/div>\s*<\/div>)`,
);

/** Orphan then mobile overlay — insert full ticker between header and overlay. */
const orphanThenOverlay = new RegExp(
  orphan.source + String.raw`(?=<div id="mobile-nav-overlay">)`,
);

for (const name of files) {
  const fp = path.join(publicDir, name);
  let t = fs.readFileSync(fp, "utf8");
  const before = t;

  t = t.replace(orphanThenTicker, "</header>\n\n$1");
  t = t.replace(orphanThenOverlay, `</header>\n\n${TICKER_BLOCK}\n\n`);

  if (t !== before) {
    fs.writeFileSync(fp, t, "utf8");
    console.log("fixed", name);
  } else {
    console.log("no match", name);
  }
}
