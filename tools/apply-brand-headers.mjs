import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

/** Category hubs: masthead + nav only (no headline ticker bar). */
const CATEGORY_NO_TICKER = new Set([
  "food.html",
  "cannabis.html",
  "nightlife.html",
  "health-wellness.html",
  "events.html",
  "news.html",
  "dispensaries.html",
]);

const FILES = [
  "index.html",
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

/** Which nav href gets class="active" (match full href string) */
const ACTIVE = {
  "index.html": null,
  "food.html": "food.html",
  "cannabis.html": "cannabis.html",
  "nightlife.html": "nightlife.html",
  "health-wellness.html": "health-wellness.html",
  "events.html": "events.html",
  "news.html": "news.html",
  "dispensaries.html": "cannabis.html",
  "about.html": null,
  "contact.html": null,
  "privacy-policy.html": null,
  "terms-of-service.html": null,
  "disclosure.html": null,
  "article.html": null,
};

const SEARCH_PLACEHOLDERS = {
  "food.html": "Search food…",
  "cannabis.html": "Search cannabis…",
  "nightlife.html": "Search nightlife…",
  "health-wellness.html": "Search…",
  "events.html": "Search events…",
  "news.html": "Search news…",
  "dispensaries.html": "Search AZ…",
  default: "Search AZ…",
};

function p(file) {
  return file === "article.html" ? "/" : "";
}

function navLink(file, href, label, svgPath) {
  const pre = p(file);
  const full = pre + href;
  const act = ACTIVE[file] === href ? ' class="nav-link active"' : ' class="nav-link"';
  return `        <a href="${full}"${act}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${svgPath}</svg>${label}</a>`;
}

function buildNav(file) {
  const links = [
    navLink(file, "food.html", "Food", `<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>`),
    navLink(file, "news.html", "News", `<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6z"/>`),
    navLink(file, "cannabis.html", "Cannabis", `<path d="M12 2a10 10 0 0 1 10 10c0 2.8-1.2 5.4-3 7.2C17.5 20.8 12 22 12 22s-5.5-1.2-7-2.8C3.2 17.4 2 14.8 2 12A10 10 0 0 1 12 2z"/><path d="M12 22V12"/>`),
    navLink(file, "nightlife.html", "Nightlife", `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`),
    navLink(file, "health-wellness.html", "Health &amp; Wellness", `<path d="M12 2a8 8 0 0 1 8 8H4a8 8 0 0 1 8-8z"/><path d="M9 10v4a3 3 0 0 0 6 0v-4"/>`),
    navLink(file, "events.html", "Events", `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`),
    navLink(file, "classes.html", "Classes", `<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>`),
  ];
  return links.join("\n");
}

function mobileCatTabsNav(file) {
  const pre = p(file);
  const a = (href, label) =>
    `        <a href="${pre}${href}" class="site-header__mobile-cat-tab">${label}</a>`;
  return `
    <nav class="site-header__mobile-cat-tabs" aria-label="Sections">
      <div class="site-header__mobile-cat-tabs-track">
${a("food.html", "Food")}
${a("news.html", "News")}
${a("cannabis.html", "Cannabis")}
${a("nightlife.html", "Nightlife")}
${a("health-wellness.html", "Health &amp; Wellness")}
${a("events.html", "Events")}
${a("classes.html", "Classes")}
      </div>
    </nav>`;
}

function tickerBlock(file, fixed) {
  const pre = p(file);
  const fx = fixed ? " headline-ticker--fixed" : "";
  return `  <div class="headline-ticker${fx}" id="headline-ticker" aria-label="Latest headlines">
    <div class="headline-ticker__viewport">
      <div class="headline-ticker__label">Latest</div>
      <div class="headline-ticker__scroll-wrap">
        <div class="headline-ticker__track" id="headline-ticker-track"></div>
      </div>
    </div>
  </div>`;
}

function headerBlock(file) {
  const pre = p(file);
  const ix = pre + "index.html";
  const img = pre + "images/TextV2.png";
  const ph = SEARCH_PLACEHOLDERS[file] || SEARCH_PLACEHOLDERS.default;

  const inner = `  <header id="site-header" class="site-header--brand">
    <div class="site-masthead">
      <div class="site-masthead__inner">
        <div class="site-masthead__meta">
          <span class="site-masthead__date" id="home-masthead-date"></span>
          <span class="site-masthead__weather is-loading" id="home-weather" aria-live="polite">Phoenix — …</span>
        </div>
        <a href="${ix}" class="site-wordmark" aria-label="HappyTimes AZ home">
          <img src="${img}" alt="HappyTimes AZ" class="site-wordmark__img" width="1200" height="200" decoding="async">
        </a>
        <div class="site-masthead__radio">
          <div id="radio-header-mini" class="radio-header-mini" aria-label="GTA Radio mini player"></div>
        </div>
      </div>
    </div>
    <div class="site-nav-bar">
      <div class="site-nav-bar__inner">
        <div class="site-nav-bar__dateline" aria-live="polite">
          <span class="js-mobile-nav-dateline"></span>
        </div>
        <nav class="site-nav" aria-label="Main navigation">
${buildNav(file)}
        </nav>
        <div class="header-actions">
          <div id="search-bar"><input type="text" id="search-input" placeholder="${ph}" aria-label="Search"></div>
          <button type="button" id="search-toggle" aria-label="Toggle search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button>
          <button type="button" id="mobile-nav-toggle" aria-label="Open menu"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
        </div>
      </div>
    </div>${mobileCatTabsNav(file)}`;

  if (file === "index.html") {
    return `${inner}
    <div class="headline-ticker" id="headline-ticker" aria-label="Latest headlines">
      <div class="headline-ticker__viewport">
        <div class="headline-ticker__label">Latest</div>
        <div class="headline-ticker__scroll-wrap">
          <div class="headline-ticker__track" id="headline-ticker-track"></div>
        </div>
      </div>
    </div>
  </header>`;
  }
  if (CATEGORY_NO_TICKER.has(file)) {
    return `${inner}
  </header>`;
  }
  /* Ticker is injected after </header> in replaceHeader (after stripping legacy copy). */
  return `${inner}
  </header>`;
}

/** Remove fixed headline ticker blocks (exact layout from tickerBlock). */
function stripOuterHeadlineTicker(html) {
  const fullTicker =
    /\n\s*<div class="headline-ticker headline-ticker--fixed"[^>]*>\s*\n\s*<div class="headline-ticker__viewport">\s*\n\s*<div class="headline-ticker__label">Latest<\/div>\s*\n\s*<div class="headline-ticker__scroll-wrap">\s*\n\s*<div class="headline-ticker__track"[^>]*><\/div>\s*\n\s*<\/div>\s*\n\s*<\/div>\s*\n\s*<\/div>\s*\n/g;
  let s = html;
  /* Orphan inner ticker nodes only when they appear immediately after </header> */
  s = s.replace(
    /(<\/header>\s*)\n+\s*<div class="headline-ticker__scroll-wrap">\s*\n\s*<div class="headline-ticker__track"[^>]*><\/div>\s*\n\s*<\/div>\s*\n\s*<\/div>\s*\n\s*<\/div>\s*\n/g,
    "$1\n\n"
  );
  s = s.replace(fullTicker, "\n");
  return s;
}

function replaceHeader(html, file) {
  const re = /<header id="site-header"[\s\S]*?<\/header>/;
  if (!re.test(html)) throw new Error("No header in " + file);
  let next = html.replace(re, headerBlock(file));

  if (file !== "index.html" && !CATEGORY_NO_TICKER.has(file)) {
    next = stripOuterHeadlineTicker(next);
    if (!next.includes('id="headline-ticker"')) {
      next = next.replace(/<\/header>\s*\n/, `</header>\n\n${tickerBlock(file, true)}\n`);
    }
  }
  return next;
}

for (const name of FILES) {
  const fp = path.join(publicDir, name);
  let html = fs.readFileSync(fp, "utf8");
  html = replaceHeader(html, name);
  fs.writeFileSync(fp, html, "utf8");
  console.log("OK", name);
}
