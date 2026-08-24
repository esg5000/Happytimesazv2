/**
 * Guard against the cache-busting bug that let stale sanity.js keep serving
 * unpublished duplicate posts to returning visitors: every public/*.html
 * page loads sanity.js/radio.js/main.js with a shared ?v=N query string,
 * and a returning visitor's browser only re-fetches a changed file if that
 * string actually changes. It's easy to edit one of the three JS files and
 * forget to bump ?v= everywhere (or bump it inconsistently), which silently
 * reintroduces the stale-cache issue.
 *
 * Checks two things across every public/*.html page:
 *   1. All three script tags on a page carry the SAME version (an
 *      intra-page mismatch, e.g. sanity.js?v=13 next to main.js?v=14, means
 *      a bump was only half-applied).
 *   2. Every page agrees with the site-wide consensus version (a page stuck
 *      on an older ?v= means it was missed during the last bump).
 *
 * Read-only. Run manually (`node tools/check-js-versions.mjs`) after editing
 * any of the three shared JS files, before deploying. Exits non-zero if any
 * page is out of sync, so it can be wired into a pre-deploy step later if
 * this site ever gets one — no build step exists today, so this isn't
 * wired into anything automatically.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

const SHARED_FILES = ["sanity.js", "radio.js", "main.js"];

function extractVersions(html) {
  const found = {};
  for (const file of SHARED_FILES) {
    const re = new RegExp(`${file.replace(".", "\\.")}\\?v=(\\d+)`);
    const m = html.match(re);
    if (m) found[file] = m[1];
  }
  return found;
}

const pages = fs
  .readdirSync(publicDir)
  .filter((f) => f.endsWith(".html"))
  .sort();

const perPage = pages.map((name) => {
  const html = fs.readFileSync(path.join(publicDir, name), "utf8");
  return { name, versions: extractVersions(html) };
});

// Site-wide consensus = the most common version string across every
// script tag on every page (not just page 0's) — robust even if the very
// first page happens to be the stale outlier.
const tally = new Map();
for (const { versions } of perPage) {
  for (const v of Object.values(versions)) {
    tally.set(v, (tally.get(v) || 0) + 1);
  }
}
const consensus = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

let issues = 0;

for (const { name, versions } of perPage) {
  const present = SHARED_FILES.filter((f) => f in versions);
  if (present.length === 0) continue; // page doesn't load any of the three — not this script's concern

  const distinctOnPage = new Set(present.map((f) => versions[f]));
  if (distinctOnPage.size > 1) {
    issues++;
    console.error(
      `[MISMATCH] ${name}: inconsistent versions across its own script tags — ` +
        present.map((f) => `${f}?v=${versions[f]}`).join(", ")
    );
    continue; // already flagged; don't also report it as behind-consensus below
  }

  const missing = SHARED_FILES.filter((f) => !(f in versions));
  if (missing.length > 0) {
    issues++;
    console.error(`[MISSING] ${name}: no version tag found for ${missing.join(", ")}`);
  }

  const pageVersion = versions[present[0]];
  if (pageVersion !== consensus) {
    issues++;
    console.error(
      `[STALE] ${name}: on v=${pageVersion}, rest of the site is on v=${consensus}`
    );
  }
}

if (issues === 0) {
  console.log(`OK — all ${pages.length} pages in sync at v=${consensus}.`);
  process.exit(0);
} else {
  console.error(`\n${issues} issue(s) found. Bump the lagging page(s) to v=${consensus} (or re-sync intentionally).`);
  process.exit(1);
}
