/**
 * HappyTimesAZ – Main Application JS
 * Handles all page rendering, navigation, and interactivity.
 */

(function() {
  'use strict';

  // ─── Ad Engine ────────────────────────────────────────────────────────────────

  /** Build HTML for a single ad object at a given size variant */
  function renderAdHTML(ad, size) {
    if (!ad) return null;

    const label    = `<div class="ad-label">Sponsored</div>`;
    const href     = esc(ad.url || '#');
    const target   = ad.url ? ' target="_blank" rel="noopener sponsored"' : '';
    const headline = esc(ad.headline || ad.advertiser || '');
    const cta      = esc(ad.cta || 'Learn More');

    // Raw HTML ad (advertiser-supplied creative)
    if (ad.adType === 'html' && ad.html) {
      return `<div class="ad-inner">${label}${ad.html}</div>`;
    }

    // Image ad
    const imgUrl  = ad.image ? window.sanityImage(ad.image, 800, 200) : null;
    const imgTag  = imgUrl ? `<img src="${imgUrl}" alt="${headline}" loading="lazy">` : null;

    if (size === 'native') {
      const nativeImgUrl = ad.image ? window.sanityImage(ad.image, 400, 260) : null;
      return `
        <article class="ad-native-card">
          ${label}
          <a href="${href}"${target}>
            <div class="ad-native-image">
              ${nativeImgUrl ? `<img src="${nativeImgUrl}" alt="${headline}" loading="lazy">` : `<div class="img-placeholder" style="background:linear-gradient(135deg,#f3ede6,#e8ddd4);aspect-ratio:16/10"></div>`}
            </div>
            <div class="ad-native-body">
              <div class="ad-native-advertiser">${esc(ad.advertiser || 'Partner')}</div>
              <div class="ad-native-headline">${headline}</div>
              <span class="ad-native-cta">${cta} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span>
            </div>
          </a>
        </article>`;
    }

    if (size === 'partner-mid') {
      const partnerImg = ad.image ? window.sanityImage(ad.image, 200, 200) : null;
      return `
        <div class="ad-inner">
          ${label}
          <a href="${href}"${target}>
            <div style="display:flex;align-items:center;gap:1.25rem;padding:1.25rem;background:var(--cream-dark);border-radius:var(--radius-md)">
              ${partnerImg ? `<img src="${partnerImg}" alt="${headline}" style="width:100px;height:100px;object-fit:cover;border-radius:var(--radius-md);flex-shrink:0" loading="lazy">` : ''}
              <div class="ad-partner-text">
                <div style="font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--terracotta);margin-bottom:.25rem">Partner Content</div>
                <h4 style="font-family:var(--font-display);font-size:1rem;font-weight:700;color:var(--ink);margin:0 0 .5rem">${headline}</h4>
                <span class="btn btn--sm btn--outline">${cta}</span>
              </div>
            </div>
          </a>
        </div>`;
    }

    // Leaderboard / inline / footer — wide banner
    const textFallback = `
      <div class="ad-text-fallback">
        <span class="ad-headline">${headline}</span>
        <span class="btn btn--sm btn--primary">${cta}</span>
      </div>`;

    return `
      <div class="ad-inner">
        ${label}
        <a href="${href}"${target}>${imgTag || textFallback}</a>
      </div>`;
  }

  /** Find all [data-placement] slots in the DOM and populate them in parallel */
  async function initAds() {
    const slots = Array.from(document.querySelectorAll('[data-placement]'));
    if (!slots.length) return;

    // Deduplicate placements so we don't make duplicate Sanity requests
    const placements = [...new Set(slots.map(s => s.dataset.placement))];
    const results    = {};

    await Promise.all(placements.map(async p => {
      results[p] = await window.getAdByPlacement(p).catch(() => null);
    }));

    // Optional fallback: category-based ads (new "advertisement" document type)
    const categorySlug = document.body?.dataset?.category || '';
    let categoryAd = null;
    if (categorySlug && typeof window.getCategoryAdvertisement === 'function') {
      categoryAd = await window.getCategoryAdvertisement(categorySlug).catch(() => null);
    }

    slots.forEach(slot => {
      const ad   = results[slot.dataset.placement];
      const size = slot.dataset.size || 'leaderboard';
      const finalAd = ad || (categoryAd ? {
        adType: 'image',
        image: categoryAd.image,
        headline: categoryAd.title,
        cta: 'Learn More',
        url: categoryAd.linkUrl,
        advertiser: 'Partner'
      } : null);

      if (!finalAd) return; // no ad → slot stays display:none

      const html = renderAdHTML(finalAd, size);
      if (!html) return;
      slot.innerHTML = html;
      slot.classList.add('loaded');
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function authorDisplayName(post) {
    if (!post || post.author == null) return '';
    const a = post.author;
    if (typeof a === 'string') return a.trim();
    if (typeof a === 'object') {
      if (typeof a.name === 'string' && a.name.trim()) return a.name.trim();
      if (typeof a.title === 'string' && a.title.trim()) return a.title.trim();
    }
    return '';
  }

  function formatArticleByline(post) {
    const name = authorDisplayName(post) || 'HappyTimesAZ AI Desk';
    return `By ${esc(name)}`;
  }

  function isScannerArticle(post) {
    const s = String(post && post.source != null ? post.source : '').toLowerCase().trim();
    return s === 'scanner';
  }

  function scannerDisclaimerText(post) {
    if (!post || post.disclaimer == null) return '';
    if (typeof post.disclaimer !== 'string') return '';
    return post.disclaimer.trim();
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  /** Full article page URL (static-friendly; no server rewrite required). */
  function articleUrl(slug) {
    if (!slug) return '/article.html';
    return `/article.html?slug=${encodeURIComponent(slug)}`;
  }

  /** Slug from ?slug= or legacy /article/:slug (if host rewrites to article.html). */
  function getArticleSlugFromLocation() {
    const q = new URLSearchParams(window.location.search).get('slug');
    if (q != null && String(q).trim() !== '') return String(q).trim();
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0] === 'article') {
      return decodeURIComponent(parts.slice(1).join('/'));
    }
    return '';
  }

  function imgOrPlaceholder(image, w, h, alt, imgClass) {
    const url = window.sanityImage && image ? window.sanityImage(image, w, h) : null;
    const cls = imgClass ? ` class="${esc(imgClass)}"` : '';
    if (url) return `<img src="${esc(url)}" alt="${esc(alt || '')}"${cls} loading="lazy">`;
    return `<div class="img-placeholder" style="background:linear-gradient(135deg,#f3ede6 0%,#e8ddd4 100%)"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c9b8a8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;
  }

  /** Dispensary directory hero: default logo-style; wide landscape images get cover treatment (see setupDispensaryDirectoryImages). */
  function classifyDispensaryHeroImage(nw, nh) {
    if (!nw || !nh) return 'logo';
    const ratio = nw / nh;
    const maxDim = Math.max(nw, nh);
    if (maxDim < 260) return 'logo';
    if (nh >= nw * 1.05) return 'logo';
    if (ratio >= 1.4) return 'photo';
    if (ratio >= 1.22 && nw >= 420) return 'photo';
    return 'logo';
  }

  function setupDispensaryDirectoryImages(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('.dispensary-card__image--directory img.dispensary-card__img').forEach(img => {
      const wrap = img.closest('.dispensary-card__image--directory');
      if (!wrap) return;
      const apply = () => {
        const kind = classifyDispensaryHeroImage(img.naturalWidth, img.naturalHeight);
        wrap.classList.toggle('dispensary-card__image--cover', kind === 'photo');
      };
      if (img.complete && img.naturalWidth) apply();
      else img.addEventListener('load', apply, { once: true });
    });
  }

  function categoryBadge(cats) {
    const cat = Array.isArray(cats) ? cats[0] : (cats || '');
    if (!cat) return '';
    const color = getCategoryColor(cat);
    return `<span class="badge" style="--badge-color:${color}">${esc(cat)}</span>`;
  }

  function getCategoryColor(cat) {
    const map = {
      cannabis: '#2d7a3a', marijuana: '#2d7a3a', dispensary: '#2d7a3a',
      food: '#e85d2a', restaurant: '#e85d2a',
      nightlife: '#6b2fa0', bar: '#6b2fa0', club: '#6b2fa0',
      'health-wellness': '#8b4513', 'health & wellness': '#8b4513',
      mushroom: '#8b4513', mushrooms: '#8b4513', wellness: '#8b4513',
      news: '#1a6fa0',
      sports: '#1a6fa0',
      events: '#d4a03c', event: '#d4a03c',
      classes: '#1a6fa0', class: '#1a6fa0', education: '#1a6fa0',
      music: '#c94a1f',
    };
    return map[cat.toLowerCase()] || '#4a4039';
  }

  function setMeta(title, desc) {
    document.title = title ? `${title} | HappyTimes AZ` : 'HappyTimes AZ – Arizona Lifestyle Magazine';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && desc) metaDesc.setAttribute('content', desc);
  }

  function showSkeleton(el, count, type = 'card') {
    if (!el) return;
    el.innerHTML = Array(count).fill('').map(() =>
      type === 'card' ? `<div class="skeleton-card"><div class="skeleton-img"></div><div class="skeleton-line w-20"></div><div class="skeleton-line w-80"></div><div class="skeleton-line w-60"></div></div>` :
      type === 'list' ? `<div class="skeleton-list-item"><div class="skeleton-sq"></div><div class="skeleton-text"><div class="skeleton-line w-80"></div><div class="skeleton-line w-50"></div></div></div>` :
      `<div class="skeleton-card"><div class="skeleton-img tall"></div><div class="skeleton-line w-30"></div><div class="skeleton-line w-100"></div></div>`
    ).join('');
  }

  // ─── Article Card ────────────────────────────────────────────────────────────

  function renderArticleCard(post, size = 'normal') {
    const url = articleUrl(post.slug);
    const date = window.formatDateShort ? window.formatDateShort(post.publishedAt) : '';
    const mins = post.readTime ? `${post.readTime} min read` : '';
    return `
      <article class="article-card article-card--${size}">
        <a href="${esc(url)}" class="article-card__image-link">
          <div class="article-card__image">
            ${imgOrPlaceholder(post.heroImage, size === 'large' ? 800 : 400, size === 'large' ? 500 : 280, post.title)}
          </div>
          ${categoryBadge(post.categories)}
        </a>
        <div class="article-card__body">
          <h3 class="article-card__title"><a href="${esc(url)}">${esc(post.title)}</a></h3>
          <p class="article-card__byline">${formatArticleByline(post)}</p>
          ${post.excerpt ? `<p class="article-card__excerpt">${esc(post.excerpt)}</p>` : ''}
          <div class="article-card__meta">
            ${date ? `<span>${date}</span>` : ''}
            ${mins ? `<span>${mins}</span>` : ''}
          </div>
        </div>
      </article>
    `;
  }

  // ─── Food page — Top 25 restaurant row ───────────────────────────────────────

  const FOOD_TOP25_CITIES = ['Phoenix', 'Scottsdale', 'Tempe', 'Mesa', 'Glendale', 'Chandler', 'Surprise'];
  const FOOD_GEO_RACE_TIMEOUT = '__food_geo_race_timeout__';

  function matchFoodCityFromString(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const t = raw.trim().toLowerCase();
    for (const c of FOOD_TOP25_CITIES) {
      if (t === c.toLowerCase()) return c;
    }
    for (const c of FOOD_TOP25_CITIES) {
      if (t.includes(c.toLowerCase())) return c;
    }
    return null;
  }

  function fetchCityFromGeolocation() {
    return new Promise(resolve => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async pos => {
          try {
            const { latitude, longitude } = pos.coords;
            const geoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&localityLanguage=en`;
            const res = await fetch(geoUrl);
            if (!res.ok) throw new Error('reverse geocode');
            const data = await res.json();
            const cityRaw = data.city || data.locality || (data.localityInfo && data.localityInfo.localityName) || '';
            resolve(matchFoodCityFromString(String(cityRaw || '')));
          } catch (e) {
            resolve(null);
          }
        },
        () => resolve(null),
        { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 }
      );
    });
  }

  async function resolveInitialFoodTabCity() {
    const geo = fetchCityFromGeolocation();
    const winner = await Promise.race([
      geo,
      sleep(3500).then(() => FOOD_GEO_RACE_TIMEOUT)
    ]);
    if (winner !== FOOD_GEO_RACE_TIMEOUT && winner && FOOD_TOP25_CITIES.includes(winner)) {
      return winner;
    }
    const geoCity = await geo.catch(() => null);
    if (geoCity && FOOD_TOP25_CITIES.includes(geoCity)) return geoCity;
    return 'Phoenix';
  }

  function normalizeRestaurantWebsiteHref(raw) {
    const u = String(raw || '').trim();
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    if (/^\/\//.test(u)) return `https:${u}`;
    if (/^www\./i.test(u)) return `https://${u}`;
    return `https://${u}`;
  }

  function restaurantSpotlightViewHref(r) {
    const web = normalizeRestaurantWebsiteHref(r.website);
    if (web) return web;
    if (r.slug) return `listing?slug=${encodeURIComponent(r.slug)}`;
    return '#';
  }

  function formatRestaurantPriceLevel(pl) {
    if (pl == null || pl === '') return '';
    const s = String(pl).trim();
    if (/^\$+$/.test(s)) return s;
    const n = Number(s);
    if (Number.isFinite(n) && n >= 1 && n <= 4) return '$'.repeat(Math.round(n));
    return s;
  }

  /** Top 25 card media: external `thumbnail` URL or dark monogram placeholder. */
  function restaurantCardThumbnailHTML(r) {
    const name = r.name || 'Restaurant';
    const thumb = String(r.thumbnail || '').trim();
    if (thumb && /^https?:\/\//i.test(thumb)) {
      return `<img src="${esc(thumb)}" alt="${esc(name)}" loading="lazy">`;
    }
    let letter = '';
    for (let i = 0; i < name.length; i++) {
      const ch = name.charAt(i);
      if (/[a-zA-Z]/.test(ch)) {
        letter = ch.toUpperCase();
        break;
      }
    }
    if (!letter) letter = '?';
    return `<div class="food-spot-card__monogram" role="img" aria-label="${esc(name)}">${esc(letter)}</div>`;
  }

  function renderRestaurantStarRow(starRating, rating) {
    let n = Number(starRating);
    if (!Number.isFinite(n)) n = Number(rating);
    if (!Number.isFinite(n)) n = 0;
    n = Math.max(0, Math.min(5, Math.round(n)));
    if (n <= 0) {
      return '<span class="food-spot-card__stars food-spot-card__stars--none">No rating yet</span>';
    }
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += `<span class="food-spot-card__star${i <= n ? ' is-on' : ''}" aria-hidden="true">★</span>`;
    }
    return `<span class="food-spot-card__stars" role="img" aria-label="${esc(n + ' out of 5 stars')}">${stars}</span>`;
  }

  function renderRestaurantSpotlightCard(r) {
    if (!r) return '';
    const feat = !!r.isFeatured;
    const href = restaurantSpotlightViewHref(r);
    const isHttp = /^https?:\/\//i.test(href);
    const cuisine = String(r.cuisine || r.cuisineType || '').trim();
    const priceDisp = formatRestaurantPriceLevel(r.priceLevel);
    const name = r.name || 'Restaurant';
    const cardClass = `food-spot-card${feat ? ' food-spot-card--featured' : ''}`;
    const badge = feat ? '<span class="food-spot-card__badge">Featured</span>' : '';
    const priceHtml = priceDisp ? `<span class="food-spot-card__price">${esc(priceDisp)}</span>` : '';
    return `
      <article class="${cardClass}">
        <div class="food-spot-card__media">
          ${restaurantCardThumbnailHTML(r)}
          ${badge}
        </div>
        <div class="food-spot-card__body">
          <h3 class="food-spot-card__name">${esc(name)}</h3>
          ${cuisine ? `<p class="food-spot-card__cuisine">${esc(cuisine)}</p>` : ''}
          <div class="food-spot-card__meta">
            ${renderRestaurantStarRow(r.starRating, r.rating)}
            ${priceHtml}
          </div>
          <a href="${esc(href)}" class="btn btn--sm btn--outline food-spot-card__cta"${isHttp ? ' target="_blank" rel="noopener"' : ''}>View</a>
        </div>
      </article>
    `;
  }

  async function initFoodTop25Section() {
    const tabsRoot = document.querySelector('.food-top25__tabs');
    const row = document.getElementById('food-top25-row');
    if (!tabsRoot || !row) return;

    row.innerHTML = '<p class="food-top25__loading">Finding restaurants near you…</p>';

    const setActiveTab = city => {
      FOOD_TOP25_CITIES.forEach(c => {
        const btn = tabsRoot.querySelector(`[data-city="${c}"]`);
        if (!btn) return;
        const on = c === city;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    };

    const loadCity = async city => {
      setActiveTab(city);
      row.innerHTML = '<p class="food-top25__loading">Loading…</p>';
      const data = await (window.getRestaurantsByCity ? window.getRestaurantsByCity(city, 25) : Promise.resolve(null));
      const list = Array.isArray(data) ? data.filter(Boolean) : [];
      if (!list.length) {
        row.innerHTML = `<p class="food-top25__empty">No restaurants listed for ${esc(city)} yet.</p>`;
        return;
      }
      row.innerHTML = list.map(renderRestaurantSpotlightCard).join('');
    };

    tabsRoot.addEventListener('click', e => {
      const btn = e.target.closest('.food-top25__tab[data-city]');
      if (!btn) return;
      const c = btn.getAttribute('data-city');
      if (c) void loadCity(c);
    });

    const initial = await resolveInitialFoodTabCity();
    await loadCity(initial);
  }

  async function initFoodPage() {
    setMeta('Food & Dining – HappyTimes AZ', "Arizona's best restaurants, food pop-ups, chef profiles, and dining guides.");
    const gridEl = document.getElementById('category-grid');
    const featuredWrap = document.getElementById('food-featured-wrap');
    const featuredEl = document.getElementById('food-featured');

    if (gridEl) showSkeleton(gridEl, 9, 'card');

    let foodPosts = await window.getPostsByCategory('food', 13).catch(() => []);
    if (!Array.isArray(foodPosts)) foodPosts = [];

    if (featuredEl && featuredWrap) {
      if (foodPosts.length > 0) {
        featuredEl.innerHTML = renderArticleCard(foodPosts[0], 'large');
        featuredWrap.hidden = false;
      } else {
        featuredEl.innerHTML = '';
        featuredWrap.hidden = true;
      }
    }

    const gridPosts = foodPosts.length > 1 ? foodPosts.slice(1) : [];
    if (gridEl) {
      if (!gridPosts.length) {
        const msg = foodPosts.length === 0
          ? 'No articles found yet.'
          : 'More food stories coming soon.';
        gridEl.innerHTML = `<p class="empty-msg" style="grid-column:1/-1">${esc(msg)}</p>`;
      } else {
        gridEl.innerHTML = gridPosts.map(p => renderArticleCard(p)).join('');
      }
    }

    await initFoodTop25Section();
  }

  // ─── Event Card ──────────────────────────────────────────────────────────────

  function renderEventCard(event) {
    const dt  = new Date(event.dateTime || event.date || Date.now());
    const day = dt.toLocaleDateString('en-US', { day: 'numeric' });
    const mon = dt.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const time = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const href = ((event.ticketUrl || '').trim() || (event.link || '').trim() || '#');
    return `
      <article class="event-card">
        <div class="event-card__date-badge">
          <span class="event-card__day">${day}</span>
          <span class="event-card__mon">${mon}</span>
        </div>
        <div class="event-card__image">
          ${imgOrPlaceholder(event.heroImage, 300, 200, event.title)}
        </div>
        <div class="event-card__body">
          <h3 class="event-card__title"><a href="${esc(href)}" ${href !== '#' && /^https?:/i.test(href) ? 'target="_blank" rel="noopener"' : ''}>${esc(event.title)}</a></h3>
          <div class="event-card__meta">
            ${event.venueName ? `<span class="event-venue">${esc(event.venueName)}</span>` : ''}
            ${event.city ? `<span class="event-city">${esc(event.city)}</span>` : ''}
            <span class="event-time">${time}</span>
          </div>
        </div>
      </article>
    `;
  }

  // ─── Deal Card ───────────────────────────────────────────────────────────────

  function renderDealCard(deal) {
    const href = deal.link || '#';
    const end  = deal.endDate ? `Ends ${window.formatDateShort(deal.endDate)}` : '';
    return `
      <article class="deal-card ${deal.featured ? 'deal-card--featured' : ''}">
        <div class="deal-card__image">
          ${imgOrPlaceholder(deal.heroImage, 400, 240, deal.title)}
          ${deal.featured ? '<span class="deal-featured-badge">Featured Deal</span>' : ''}
        </div>
        <div class="deal-card__body">
          ${deal.brandName ? `<div class="deal-brand">${esc(deal.brandName)}</div>` : ''}
          <h3 class="deal-card__title">${esc(deal.title)}</h3>
          ${deal.dispensaryName ? `<div class="deal-dispensary">${esc(deal.dispensaryName)}</div>` : ''}
          <div class="deal-card__footer">
            ${end ? `<span class="deal-expiry">${end}</span>` : ''}
            <a href="${href}" class="btn btn--sm btn--cannabis" ${href !== '#' ? 'target="_blank" rel="noopener"' : ''}>Get Deal</a>
          </div>
        </div>
      </article>
    `;
  }

  // ─── Dispensary Card ─────────────────────────────────────────────────────────

  function renderDispensaryCard(d) {
    const url  = `listing?slug=${encodeURIComponent(d.slug)}`;
    const open = getOpenStatus(d.hours);
    return `
      <article class="dispensary-card ${d.featured ? 'dispensary-card--featured' : ''}">
        <a href="${url}" class="dispensary-card__image-link">
          <div class="dispensary-card__image">
            ${imgOrPlaceholder(d.heroImage, 400, 260, d.name)}
          </div>
          ${d.featured ? '<span class="featured-ribbon">Featured</span>' : ''}
        </a>
        <div class="dispensary-card__body">
          <h3 class="dispensary-card__name"><a href="${url}">${esc(d.name)}</a></h3>
          ${d.city ? `<div class="dispensary-card__city"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${esc(d.city)}, AZ</div>` : ''}
          ${d.address ? `<div class="dispensary-card__address">${esc(d.address)}</div>` : ''}
          ${open !== null ? `<div class="dispensary-card__status ${open ? 'open' : 'closed'}">${open ? 'Open Now' : 'Closed'}</div>` : ''}
          <div class="dispensary-card__actions">
            ${d.website ? `<a href="${esc(d.website)}" target="_blank" rel="noopener" class="btn btn--sm btn--outline">Visit Site</a>` : ''}
            ${d.phone ? `<a href="tel:${esc(d.phone)}" class="btn btn--sm btn--ghost">${esc(d.phone)}</a>` : ''}
          </div>
        </div>
      </article>
    `;
  }

  function getDispensaryCategoryTags(d) {
    const tags = [];
    const arr = Array.isArray(d?.categoryTags) ? d.categoryTags : [];
    const normArr = arr.map(x => String(x || '').toLowerCase());
    const medical = d?.medical === true || normArr.includes('medical');
    const recreational = d?.recreational === true || normArr.includes('recreational') || normArr.includes('rec');
    if (medical) tags.push({ label: 'Medical', color: '#2d7a3a' });
    if (recreational) tags.push({ label: 'Recreational', color: '#d4a03c' });
    return tags;
  }

  function getDispensaryInitials(name) {
    const s = String(name || '').trim();
    if (!s) return '?';
    const parts = s.split(/\s+/).filter(Boolean);
    const skip = new Set(['the', 'a', 'an']);
    const meaningful = parts.filter(p => !skip.has(p.toLowerCase()));
    const use = meaningful.length ? meaningful : parts;
    if (use.length >= 2) {
      const a = use[0][0] || '';
      const b = use[1][0] || '';
      return (a + b).toUpperCase();
    }
    const w = use[0] || s;
    if (w.length >= 2) return w.slice(0, 2).toUpperCase();
    return w.charAt(0).toUpperCase();
  }

  function formatHoursCompact(hours) {
    if (!hours || typeof hours !== 'object') return '';
    const order = [
      ['monday', 'Mon'],
      ['tuesday', 'Tue'],
      ['wednesday', 'Wed'],
      ['thursday', 'Thu'],
      ['friday', 'Fri'],
      ['saturday', 'Sat'],
      ['sunday', 'Sun'],
    ];
    const rows = [];
    order.forEach(([k, label]) => {
      const v = hours[k];
      if (!v) return;
      rows.push(`${label}: ${String(v)}`);
    });
    return rows.length ? rows.join(' · ') : '';
  }

  function renderDispensaryDirectoryCard(d) {
    if (!d) return '';
    const name = d.name || d.dispensaryName || 'Dispensary';
    const slug = (d.slug && typeof d.slug === 'object') ? d.slug.current : d.slug;
    const url = slug ? `listing?slug=${encodeURIComponent(slug)}` : '#';
    const tags = getDispensaryCategoryTags(d);
    const hours = formatHoursCompact(d.hours);
    return `
      <article class="dispensary-card">
        <a href="${url}" class="dispensary-card__image-link">
          <div class="dispensary-card__image dispensary-card__image--directory">
            ${imgOrPlaceholder(d.heroImage, 960, 720, name, 'dispensary-card__img')}
          </div>
        </a>
        <div class="dispensary-card__body">
          <h3 class="dispensary-card__name"><a href="${url}">${esc(name)}</a></h3>
          ${d.address ? `<div class="dispensary-card__address">${esc(d.address)}</div>` : ''}
          ${d.city ? `<div class="dispensary-card__city"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${esc(d.city)}, AZ</div>` : ''}
          ${tags.length ? `<div class="dispensary-card__tags">${tags.map(t => `<span class="badge" style="--badge-color:${t.color}">${esc(t.label)}</span>`).join('')}</div>` : ''}
          ${hours ? `<div class="dispensary-card__hours"><strong>Hours</strong><div>${esc(hours)}</div></div>` : ''}
          <div class="dispensary-card__actions">
            ${d.website ? `<a href="${esc(d.website)}" target="_blank" rel="noopener" class="btn btn--sm btn--outline">Website</a>` : ''}
            ${d.phone ? `<a href="tel:${esc(d.phone)}" class="btn btn--sm btn--ghost">${esc(d.phone)}</a>` : ''}
          </div>
        </div>
      </article>
    `;
  }

  /** Cannabis hub horizontal row — monogram avatar, no hero image (directory page unchanged). */
  function renderDispensaryCannabisRowCard(d) {
    if (!d) return '';
    const name = d.name || d.dispensaryName || 'Dispensary';
    const slug = (d.slug && typeof d.slug === 'object') ? d.slug.current : d.slug;
    const url = slug ? `listing?slug=${encodeURIComponent(slug)}` : '#';
    const tags = getDispensaryCategoryTags(d);
    const hours = formatHoursCompact(d.hours);
    const initials = getDispensaryInitials(name);
    return `
      <article class="dispensary-card dispensary-card--cannabis-row">
        <a href="${url}" class="dispensary-card__monogram" aria-label="${esc(name)} — view listing">${esc(initials)}</a>
        <div class="dispensary-card__body">
          <h3 class="dispensary-card__name"><a href="${url}">${esc(name)}</a></h3>
          ${d.address ? `<div class="dispensary-card__address">${esc(d.address)}</div>` : ''}
          ${d.city ? `<div class="dispensary-card__city"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${esc(d.city)}, AZ</div>` : ''}
          ${tags.length ? `<div class="dispensary-card__tags">${tags.map(t => `<span class="badge" style="--badge-color:${t.color}">${esc(t.label)}</span>`).join('')}</div>` : ''}
          ${hours ? `<div class="dispensary-card__hours"><strong>Hours</strong><div>${esc(hours)}</div></div>` : ''}
          <div class="dispensary-card__actions">
            ${d.website ? `<a href="${esc(d.website)}" target="_blank" rel="noopener" class="btn btn--sm btn--outline">Website</a>` : ''}
            ${d.phone ? `<a href="tel:${esc(d.phone)}" class="btn btn--sm btn--ghost">${esc(d.phone)}</a>` : ''}
          </div>
        </div>
      </article>
    `;
  }

  function getOpenStatus(hours) {
    if (!hours) return null;
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const today = days[new Date().getDay()];
    const h = hours[today];
    if (!h || h === 'closed' || h === 'Closed') return false;
    // Simple open check – just return true if hours exist and aren't "closed"
    return true;
  }

  // ─── HOMEPAGE ─────────────────────────────────────────────────────────────────

  const HOME_HERO_TAKE = 9;

  let lastMobileTempF = null;

  function updateMobileNavDateline() {
    document.querySelectorAll('.js-mobile-nav-dateline').forEach(node => {
      const d = new Date();
      const datePart = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      const tempPart =
        lastMobileTempF != null ? `${Math.round(lastMobileTempF)}°F` : '…';
      node.textContent = `${datePart} · ${tempPart}`;
    });
  }

  function renderHomeMastheadDate() {
    const el = document.getElementById('home-masthead-date');
    if (el) {
      const d = new Date();
      el.textContent = d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
    updateMobileNavDateline();
  }

  async function fetchPhoenixWeather() {
    const el = document.getElementById('home-weather');
    try {
      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=33.4484&longitude=-112.0740&current=temperature_2m&temperature_unit=fahrenheit&timezone=America%2FPhoenix'
      );
      const data = await res.json();
      const t = data?.current?.temperature_2m;
      if (t != null) lastMobileTempF = t;
      if (el) {
        el.textContent = t != null ? `Phoenix ${Math.round(t)}°F` : 'Phoenix';
      }
    } catch (e) {
      if (el) el.textContent = 'Phoenix';
    }
    if (el) el.classList.remove('is-loading');
    updateMobileNavDateline();
  }

  function renderHeadlineTicker(posts) {
    const track = document.getElementById('headline-ticker-track');
    if (!track || !posts || posts.length === 0) {
      if (track) {
        track.innerHTML =
          '<span class="headline-ticker__sep"> · </span><span>HappyTimes AZ — Arizona lifestyle &amp; culture</span>';
      }
      return;
    }
    const slice = posts.slice(0, 28);
    const sep = '<span class="headline-ticker__sep"> · </span>';
    const block = slice
      .map(p => {
        const url = articleUrl(p.slug);
        return `<a href="${esc(url)}">${esc(p.title)}</a>`;
      })
      .join(sep);
    track.innerHTML = block + sep + block;
  }

  /** Headline ticker on inner pages (homepage fills this inside initHomepage). Article pages omit the ticker. */
  async function initHeadlineTickerGlobal() {
    const track = document.getElementById('headline-ticker-track');
    if (!track || document.body.dataset.page === 'home' || document.body.dataset.page === 'article') return;
    try {
      const posts = await window.getLatestPosts(28);
      renderHeadlineTicker(posts);
    } catch (e) {
      renderHeadlineTicker(null);
    }
  }

  function renderHomeHero(settings, posts) {
    const leadWrap = document.getElementById('home-hero-lead');
    const featuredLink = document.getElementById('home-hero-featured-link');
    const featuredImg = document.getElementById('home-hero-featured-img');
    const trendingList = document.getElementById('home-trending-list');
    if (!leadWrap || !featuredLink || !featuredImg || !trendingList) return;

    let featuredTitle;
    let featuredUrl = 'index.html';
    let featuredCat = 'Arizona Lifestyle';
    let featuredImage = null;

    if (settings && settings.featuredHeadline) {
      featuredTitle = settings.featuredHeadline;
      featuredUrl = settings.featuredCtaUrl || featuredUrl;
      featuredCat = settings.featuredThemeLabel || 'Featured';
      featuredImage = settings.featuredImage || null;
    } else if (posts && posts[0]) {
      const p = posts[0];
      featuredTitle = p.title;
      featuredUrl = articleUrl(p.slug);
      featuredCat = (p.categories || [])[0] || 'Latest';
      featuredImage = p.heroImage;
    } else {
      featuredTitle = 'HappyTimes AZ';
      featuredCat = 'Arizona Lifestyle';
    }

    if (!featuredImage && posts && posts[0] && posts[0].heroImage) {
      featuredImage = posts[0].heroImage;
    }

    leadWrap.innerHTML = `
      <span class="home-hero__lead-tag">${esc(featuredCat)}</span>
      <h1 class="home-hero__headline"><a href="${esc(featuredUrl)}">${esc(featuredTitle)}</a></h1>
    `;

    featuredLink.href = featuredUrl;
    const imgUrl =
      featuredImage && window.sanityImage
        ? window.sanityImage(featuredImage, 1200, 750)
        : null;
    featuredImg.innerHTML = imgUrl
      ? `<img src="${esc(imgUrl)}" alt="${esc(featuredTitle)}" width="1200" height="750" loading="eager">`
      : `<img src="assets/heroes/homepage.png" alt="" width="1200" height="750" loading="eager">`;

    const trendingPosts = (posts || []).slice(4, 7);
    if (trendingPosts.length === 0) {
      trendingList.innerHTML =
        '<p class="empty-msg" style="margin:0;font-size:.875rem">More stories coming soon.</p>';
      return;
    }
    trendingList.innerHTML = trendingPosts
      .map(p => {
        const url = articleUrl(p.slug);
        return `
      <a href="${esc(url)}" class="home-trending__item">
        <div class="home-trending__thumb">${imgOrPlaceholder(p.heroImage, 200, 200, p.title)}</div>
        <div class="home-trending__headline">${esc(p.title)}</div>
      </a>`;
      })
      .join('');
  }

  function initNewsletterForm() {
    const form = document.getElementById('newsletter-form');
    const msg = document.getElementById('newsletter-form-msg');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (msg) msg.textContent = 'Thanks! We will be in touch.';
      form.reset();
    });
  }

  async function initHomepage() {
    setMeta('HappyTimes AZ – Arizona Lifestyle Magazine', 'Your guide to Arizona food, cannabis, nightlife, events and more.');

    initNewsletterForm();

    // Fire all fetches in parallel
    const [settings, posts, events, deals, dispensaries] = await Promise.all([
      window.getHomepageSettings().catch(() => null),
      window.getLatestPosts(48),
      window.getEvents(6).catch(() => null),
      window.getDeals(6).catch(() => null),
      window.getDispensaries().catch(() => null)
    ]);

    renderHeadlineTicker(posts);
    renderHomeHero(settings, posts);
    renderEditorialGrid(pickPostsForEditorialGrid(posts, HOME_HERO_TAKE, 12));
    renderEventsSection(events);
    renderCannabisSpotlight(deals);
    renderDispensaryHighlights(dispensaries);
  }

  /** Mix categories in the homepage grid so one vertical (e.g. news) does not dominate. */
  function pickPostsForEditorialGrid(posts, heroTake, gridLimit) {
    if (!posts || posts.length === 0) return [];
    const heroSlugs = new Set(posts.slice(0, heroTake).map(p => p.slug).filter(Boolean));
    const pool = posts.filter(p => p.slug && !heroSlugs.has(p.slug));
    const byCat = new Map();
    pool.forEach(p => {
      const k = String(p.categorySlug || 'other').toLowerCase();
      if (!byCat.has(k)) byCat.set(k, []);
      byCat.get(k).push(p);
    });
    const out = [];
    const used = new Set();
    let progress = true;
    while (out.length < gridLimit && progress) {
      progress = false;
      for (const arr of byCat.values()) {
        const next = arr.find(p => !used.has(p.slug));
        if (next) {
          out.push(next);
          used.add(next.slug);
          progress = true;
          if (out.length >= gridLimit) break;
        }
      }
    }
    for (const p of pool) {
      if (out.length >= gridLimit) break;
      if (p.slug && !used.has(p.slug)) {
        out.push(p);
        used.add(p.slug);
      }
    }
    return out.slice(0, gridLimit);
  }

  function renderEditorialGrid(gridPosts) {
    const grid = document.getElementById('editorial-grid');
    if (!grid) return;
    if (!gridPosts || gridPosts.length === 0) {
      grid.innerHTML = '<p class="empty-msg">No articles found.</p>';
      return;
    }
    const items = [];
    gridPosts.forEach((p, i) => {
      items.push(renderArticleCard(p));
      if ((i + 1) % 6 === 0) {
        items.push(`<div class="ad-slot ad-slot--native" data-placement="homepage_grid_sponsored" data-size="native"></div>`);
      }
    });
    grid.innerHTML = items.join('');
  }

  function renderEventsSection(events) {
    const el = document.getElementById('events-grid');
    if (!el) return;
    if (!events || events.length === 0) {
      el.closest('section')?.style && (el.closest('section').style.display = 'none');
      return;
    }
    el.innerHTML = events.map(e => renderEventCard(e)).join('');
  }

  function renderCannabisSpotlight(deals) {
    const dealsEl = document.getElementById('cannabis-deals-grid');
    if (!dealsEl) return;
    if (!deals || deals.length === 0) {
      // Hide the whole section when no deals exist
      dealsEl.closest('section')?.style && (dealsEl.closest('section').style.display = 'none');
      return;
    }
    dealsEl.innerHTML = deals.slice(0, 4).map(d => renderDealCard(d)).join('');
  }

  function renderDispensaryHighlights(dispensaries) {
    const el = document.getElementById('dispensary-highlights');
    if (!el) return;
    if (!dispensaries || dispensaries.length === 0) {
      el.closest('section')?.style && (el.closest('section').style.display = 'none');
      return;
    }
    const featured = dispensaries.filter(d => d.featured).slice(0, 3);
    const display  = featured.length ? featured : dispensaries.slice(0, 3);
    el.innerHTML   = display.map(d => renderDispensaryCard(d)).join('');
  }

  // ─── DISPENSARIES PAGE ────────────────────────────────────────────────────────

  async function initDispensariesPage() {
    setMeta('Dispensaries – Arizona Cannabis Directory');

    const el = document.getElementById('dispensary-grid');
    if (!el) {
      console.error('[Dispensaries] #dispensary-grid not found');
      return;
    }
    showSkeleton(el, 9, 'card');

    const dispensariesRaw = await (window.getActiveDispensaries ? window.getActiveDispensaries() : window.getDispensaries());
    const dispensaries = Array.isArray(dispensariesRaw) ? dispensariesRaw.filter(Boolean) : [];
    if (!dispensaries || dispensaries.length === 0) {
      el.innerHTML = '<p class="empty-msg">No dispensaries found.</p>';
      return;
    }

    // Populate city dropdown
    const citySelect = document.getElementById('disp-city');
    const searchInput = document.getElementById('disp-search');
    const catSelect = document.getElementById('disp-category');
    const clearBtn = document.getElementById('disp-clear-filters');
    const countEl = document.getElementById('disp-results-count');

    if (citySelect) {
      const cities = [...new Set(dispensaries.map(d => (d.city || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      citySelect.innerHTML =
        `<option value="all">All cities</option>` + cities.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    }

    function passesCategory(d, cat) {
      if (!cat || cat === 'all') return true;
      const tags = getDispensaryCategoryTags(d).map(t => t.label.toLowerCase());
      return tags.includes(cat);
    }

    function applyFilters() {
      try {
        const q = (searchInput?.value || '').trim().toLowerCase();
        const city = citySelect?.value || 'all';
        const cat = catSelect?.value || 'all';

        const filtered = dispensaries.filter(d => {
          if (!d) return false;
          const cityOk = city === 'all' ? true : String(d.city || '').trim() === city;
          const catOk = passesCategory(d, cat);
          const hay = `${d.name || d.dispensaryName || ''} ${d.address || ''} ${d.city || ''}`.toLowerCase();
          const qOk = q ? hay.includes(q) : true;
          return cityOk && catOk && qOk;
        });

        if (countEl) countEl.textContent = `${filtered.length} result${filtered.length === 1 ? '' : 's'}`;
        const html = filtered.length
          ? filtered.map(d => renderDispensaryDirectoryCard(d)).join('')
          : '<p class="empty-msg" style="grid-column:1/-1">No dispensaries match your filters.</p>';
        el.innerHTML = html;
        setupDispensaryDirectoryImages(el);
      } catch (e) {
        console.error('[Dispensaries] render error', e);
        el.innerHTML = '<p class="empty-msg" style="grid-column:1/-1">Could not render dispensaries. Please refresh.</p>';
      }
    }

    searchInput?.addEventListener('input', applyFilters);
    citySelect?.addEventListener('change', applyFilters);
    catSelect?.addEventListener('change', applyFilters);
    clearBtn?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (citySelect) citySelect.value = 'all';
      if (catSelect) catSelect.value = 'all';
      applyFilters();
    });

    applyFilters();
  }

  // ─── ARTICLE PAGE ─────────────────────────────────────────────────────────────

  const ARTICLE_GALLERY_AFTER_PARAS = 2;
  const ARTICLE_VIDEO_TEXT_FRACTION = 0.6;

  function portableBlockTextLength(block) {
    if (!block || block._type !== 'block' || !Array.isArray(block.children)) return 0;
    return block.children.reduce((n, ch) => n + (ch && ch.text ? String(ch.text).length : 0), 0);
  }

  function sumPortableBodyTextLength(blocks) {
    if (!blocks || !Array.isArray(blocks)) return 0;
    return blocks.reduce((sum, b) => sum + portableBlockTextLength(b), 0);
  }

  function renderFeaturedVideoHtml(post) {
    const fv = post && post.featuredVideo;
    const fileUrl = fv && fv.asset && fv.asset.url ? String(fv.asset.url).trim() : '';
    const mimeType = (fv && fv.asset && fv.asset.mimeType && String(fv.asset.mimeType).trim()) || 'video/mp4';
    if (!fileUrl) return '';
    return `<div class="article-featured-video article-featured-video--in-body">
            <video class="article-featured-video__el" controls playsinline preload="metadata" width="1280" height="720">
              <source src="${esc(fileUrl)}" type="${esc(mimeType)}">
              Your browser does not support embedded video.
            </video>
          </div>`;
  }

  function renderArticleAdditionalImages(images) {
    if (!images || !Array.isArray(images) || images.length === 0) return '';
    const single = images.length === 1;
    const mod = single ? 'article-additional-images--single' : 'article-additional-images--grid';
    const items = images
      .map(img => {
        if (!img || !window.sanityImage) return '';
        const url = single
          ? window.sanityImage(img, 1100, 620, 'crop')
          : window.sanityImage(img, 700, 440, 'crop');
        if (!url) return '';
        const alt = img.alt || '';
        return `<figure class="article-additional-images__item">
          <img src="${esc(url)}" alt="${esc(alt)}" loading="lazy" width="700" height="440">
          <figcaption class="article-additional-images__caption">${esc(alt)}</figcaption>
        </figure>`;
      })
      .filter(Boolean)
      .join('');
    if (!items) return '';
    return `<div class="article-additional-images ${mod}" aria-label="Article images">${items}</div>`;
  }

  /**
   * Renders portable-text body; after ARTICLE_GALLERY_AFTER_PARAS normal paragraphs,
   * inserts galleryHtml. Inserts videoHtml after ~ARTICLE_VIDEO_TEXT_FRACTION of text
   * (by character count), only between top-level blocks (not inside lists / mid-paragraph).
   */
  function buildArticleBodyHtmlWithGallery(blocks, galleryHtml, videoHtml) {
    const tailGallery = galleryHtml || '';
    const tailVideo = videoHtml || '';
    if (!blocks || !Array.isArray(blocks)) {
      return tailGallery + tailVideo;
    }

    const totalText = sumPortableBodyTextLength(blocks);
    const videoThreshold =
      totalText > 0 ? Math.max(1, Math.ceil(totalText * ARTICLE_VIDEO_TEXT_FRACTION)) : Infinity;

    let html = '';
    let listType = null;
    let paraCount = 0;
    let galleryInserted = false;
    let videoInserted = false;
    let cumText = 0;

    function closeListIfNeeded() {
      if (listType) {
        html += listType === 'bullet' ? '</ul>' : '</ol>';
        listType = null;
      }
    }

    function tryInsertVideoAfterBlock(block) {
      if (!tailVideo || videoInserted || listType !== null) return;
      const t = portableBlockTextLength(block);
      cumText += t;
      if (cumText < videoThreshold) return;
      const okTopLevel =
        (block._type === 'block' && !block.listItem) || block._type === 'image';
      if (okTopLevel) {
        html += tailVideo;
        videoInserted = true;
      }
    }

    blocks.forEach(block => {
      if (block.listItem) {
        if (block.listItem !== listType) {
          closeListIfNeeded();
          listType = block.listItem;
          html += listType === 'bullet' ? '<ul class="article-list">' : '<ol class="article-list">';
        }
      } else {
        closeListIfNeeded();
      }

      html += window.renderPortableText([block]);

      if (
        tailGallery &&
        !galleryInserted &&
        block &&
        block._type === 'block' &&
        !block.listItem &&
        (!block.style || block.style === 'normal')
      ) {
        paraCount += 1;
        if (paraCount >= ARTICLE_GALLERY_AFTER_PARAS) {
          html += tailGallery;
          galleryInserted = true;
        }
      }

      tryInsertVideoAfterBlock(block);
    });

    closeListIfNeeded();
    if (tailGallery && !galleryInserted) html += tailGallery;
    if (tailVideo && !videoInserted) html += tailVideo;
    return html;
  }

  async function initArticlePage() {
    const slug = getArticleSlugFromLocation();
    if (!slug) {
      document.getElementById('article-main').innerHTML = '<div class="error-state"><h1>Article not found</h1><a href="index.html" class="btn btn--primary">Go Home</a></div>';
      return;
    }

    const [post, ] = await Promise.all([
      window.getPostBySlug(slug),
    ]);

    if (!post) {
      document.getElementById('article-main').innerHTML = `<div class="error-state"><h1>Article not found</h1><p>The article you're looking for doesn't exist or may have been removed.</p><a href="index.html" class="btn btn--primary">Go Home</a></div>`;
      return;
    }

    setMeta(post.seoTitle || post.title, post.seoDescription || post.excerpt);

    // Hero
    const heroEl = document.getElementById('article-hero');
    if (heroEl && post.heroImage) {
      const url = window.sanityImage(post.heroImage, 1200, 600);
      if (url) {
        heroEl.style.backgroundImage = `url(${url})`;
        heroEl.classList.add('has-image');
      }
    }

    // Meta info
    const metaEl = document.getElementById('article-meta');
    if (metaEl) {
      metaEl.innerHTML = `
        ${categoryBadge(post.categories)}
        ${post.publishedAt ? `<span>${window.formatDate(post.publishedAt)}</span>` : ''}
        ${post.readTime ? `<span>${post.readTime} min read</span>` : ''}
      `;
    }

    // Title
    const titleEl = document.getElementById('article-title');
    if (titleEl) titleEl.textContent = post.title;

    const bylineEl = document.getElementById('article-byline');
    if (bylineEl) bylineEl.innerHTML = formatArticleByline(post);

    // Excerpt
    const excEl = document.getElementById('article-excerpt');
    if (excEl && post.excerpt) {
      excEl.textContent = post.excerpt;
      excEl.style.display = 'block';
    }

    // Body (+ gallery after lead paras; featured video ~60% through text, between blocks)
    const bodyEl = document.getElementById('article-body');
    if (bodyEl) {
      const galleryHtml = renderArticleAdditionalImages(post.additionalImages);
      const videoHtml = renderFeaturedVideoHtml(post);
      if (post.body && Array.isArray(post.body)) {
        bodyEl.innerHTML = buildArticleBodyHtmlWithGallery(post.body, galleryHtml, videoHtml);
      } else {
        bodyEl.innerHTML =
          (videoHtml || '') +
          (galleryHtml || '') +
          '<p class="empty-msg">Article content coming soon.</p>';
      }
      const disc = scannerDisclaimerText(post);
      if (isScannerArticle(post) && disc) {
        const p = document.createElement('p');
        p.className = 'article-disclaimer';
        p.textContent = disc;
        bodyEl.appendChild(p);
      }
    }

    // Affiliate ads (2-3) after article body, matching the article category slug
    if (post.categorySlug && typeof window.getAffiliateAdsByCategory === 'function') {
      const aff = await window.getAffiliateAdsByCategory(post.categorySlug, 3).catch(() => null);
      if (aff && aff.length) {
        const wrap = document.createElement('section');
        wrap.className = 'affiliate-ads';
        wrap.innerHTML = `
          <div class="affiliate-ads__header">
            <h3 class="affiliate-ads__title">Recommended</h3>
          </div>
          <div class="affiliate-ads__grid">
            ${aff.map(a => renderAffiliateAdCard(a)).join('')}
          </div>
        `;
        bodyEl?.parentElement?.appendChild(wrap);
      }
    }

    // Related articles
    const related = await window.getRelatedPosts(slug, post.categorySlug, 4);
    const relEl = document.getElementById('related-articles');
    if (relEl && related && related.length > 0) {
      relEl.innerHTML = related.map(p => renderArticleCard(p)).join('');
    } else if (relEl) {
      relEl.closest('.related-section')?.remove();
    }
  }

  function renderAffiliateAdCard(ad) {
    if (!ad) return '';
    const href = esc(ad.linkUrl || '#');
    const img = ad.image ? window.sanityImage(ad.image, 640, 400) : null;
    return `
      <article class="affiliate-card">
        <a class="affiliate-card__link" href="${href}" target="_blank" rel="noopener sponsored">
          <div class="affiliate-card__image">
            ${img ? `<img src="${img}" alt="${esc(ad.title || '')}" loading="lazy">` : `<div class="img-placeholder" style="background:linear-gradient(135deg,#f3ede6,#e8ddd4);aspect-ratio:16/10"></div>`}
          </div>
          <div class="affiliate-card__body">
            <div class="badge" style="--badge-color: var(--terracotta);">Affiliate</div>
            <h4 class="affiliate-card__title">${esc(ad.title || '')}</h4>
            ${ad.description ? `<p class="affiliate-card__desc">${esc(ad.description)}</p>` : ''}
            <span class="affiliate-card__cta">Shop now</span>
          </div>
        </a>
      </article>
    `;
  }

  // ─── EVENTS PAGE ──────────────────────────────────────────────────────────────

  function eventOccurrenceTime(ev) {
    const raw = ev.dateTime || ev.date;
    if (!raw) return NaN;
    return new Date(raw).getTime();
  }

  function startOfDayLocal(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function endOfDayLocal(d) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  }

  function startOfWeekMondayLocal(ref) {
    const d = startOfDayLocal(ref);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  }

  function endOfWeekSundayLocal(ref) {
    const s = startOfWeekMondayLocal(ref);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return e;
  }

  function thisWeekendRangeLocal(ref = new Date()) {
    const r = new Date(ref);
    const day = r.getDay();
    const sat = startOfDayLocal(r);
    let daysToSat;
    if (day === 0) daysToSat = -1;
    else if (day === 6) daysToSat = 0;
    else daysToSat = 6 - day;
    sat.setDate(r.getDate() + daysToSat);
    const end = new Date(sat);
    end.setDate(sat.getDate() + 1);
    end.setHours(23, 59, 59, 999);
    return { start: sat, end };
  }

  function thisMonthRangeLocal(ref = new Date()) {
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  function filterEventsByRange(events, rangeKey) {
    const now = new Date();
    let start;
    let end;
    if (rangeKey === 'today') {
      start = startOfDayLocal(now);
      end = endOfDayLocal(now);
    } else if (rangeKey === 'week') {
      start = startOfWeekMondayLocal(now);
      end = endOfWeekSundayLocal(now);
    } else if (rangeKey === 'weekend') {
      const w = thisWeekendRangeLocal(now);
      start = w.start;
      end = w.end;
    } else if (rangeKey === 'month') {
      const m = thisMonthRangeLocal(now);
      start = m.start;
      end = m.end;
    } else {
      return events;
    }
    const t0 = start.getTime();
    const t1 = end.getTime();
    return events.filter(ev => {
      const t = eventOccurrenceTime(ev);
      if (Number.isNaN(t)) return false;
      return t >= t0 && t <= t1;
    });
  }

  function normalizeCityName(raw) {
    if (!raw) return '';
    return String(raw)
      .replace(/,\s*az\b/i, '')
      .trim()
      .toLowerCase();
  }

  function filterEventsByCity(events, city) {
    const want = normalizeCityName(city);
    if (!want) return events;
    return events.filter(ev => normalizeCityName(ev && ev.city) === want);
  }

  function sanitizeExternalUrl(raw) {
    const u = String(raw || '').trim();
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    if (/^\/\//.test(u)) return `https:${u}`;
    return '';
  }

  function cannabisLeafPlaceholderSvg() {
    return `
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2c3.3 1.8 6.3 5.1 6.3 9.3 0 4.5-3 8.2-6.3 10.7-3.3-2.5-6.3-6.2-6.3-10.7C5.7 7.1 8.7 3.8 12 2Z" stroke="currentColor" stroke-width="1.8" />
        <path d="M12 6v14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M9 10c1 .7 2 .9 3 1 1-.1 2-.3 3-1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M8.2 13.5c1.1.9 2.4 1.3 3.8 1.5 1.4-.2 2.7-.6 3.8-1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
    `;
  }

  function renderDispensaryDealCard(d) {
    if (!d) return '';
    const name = d.name || 'Dispensary';
    const city = d.city ? String(d.city).trim() : '';
    const dealsUrl = sanitizeExternalUrl(d.dealsUrl);
    const logoUrl = (window.sanityImage && d.logo) ? window.sanityImage(d.logo, 240, 240, 'fit') : '';
    const scrapedUrl = sanitizeExternalUrl(d.scrapedImage);

    const imgHtml = logoUrl
      ? `<img src="${esc(logoUrl)}" alt="${esc(name)} logo" loading="lazy" width="120" height="120">`
      : scrapedUrl
        ? `<img src="${esc(scrapedUrl)}" alt="${esc(name)}" loading="lazy" width="120" height="120" referrerpolicy="no-referrer">`
        : `<div class="cannabis-deals-card__placeholder" aria-hidden="true">${cannabisLeafPlaceholderSvg()}</div>`;

    return `
      <article class="cannabis-deals-card">
        <div class="cannabis-deals-card__logo">${imgHtml}</div>
        <div class="cannabis-deals-card__body">
          <h3 class="cannabis-deals-card__name">${esc(name)}</h3>
          ${city ? `<div class="cannabis-deals-card__city">${esc(city)}, AZ</div>` : ''}
          <div class="cannabis-deals-card__actions">
            ${dealsUrl ? `<a class="btn btn--sm btn--cannabis" href="${esc(dealsUrl)}" target="_blank" rel="noopener">View Deals</a>` : `<span class="btn btn--sm btn--ghost" aria-disabled="true">No Deals Link</span>`}
          </div>
        </div>
      </article>
    `;
  }

  function cityFilterOptionsFromDispensaries(list) {
    const map = new Map(); // normalized -> label
    (Array.isArray(list) ? list : []).forEach(d => {
      const raw = d && d.city != null ? String(d.city) : '';
      const norm = normalizeCityName(raw);
      if (!norm) return;
      if (!map.has(norm)) {
        // Prefer the original city string (minus ", AZ") as display label.
        const label = String(raw).replace(/,\s*az\b/i, '').trim();
        map.set(norm, label || norm);
      }
    });

    return [...map.entries()]
      .map(([norm, label]) => ({ value: label, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  function eventOutboundUrl(event) {
    const t = (event.ticketUrl || '').trim();
    const l = (event.link || '').trim();
    return t || l || '';
  }

  function isUsableOutboundHref(u) {
    if (!u || u === '#') return false;
    return /^https?:\/\//i.test(u) || u.startsWith('/') || /^mailto:/i.test(u) || /^tel:/i.test(u);
  }

  function formatEventDetailWhen(event) {
    const dt = new Date(event.dateTime || event.date || Date.now());
    return dt.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function eventDetailAddressLines(event) {
    const lines = [];
    if (event.venueName) lines.push(String(event.venueName));
    const street = [event.streetAddress, event.venueAddress, event.address].filter(Boolean).join(', ');
    if (street) lines.push(street);
    if (event.city) {
      const c = String(event.city);
      lines.push(/az$/i.test(c.trim()) ? c : `${c}, AZ`);
    }
    return lines.filter(Boolean);
  }

  function descriptionBlocksHtml(text) {
    if (!text || !String(text).trim()) return '';
    return String(text)
      .trim()
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  function renderEventPageCard(event, index) {
    const dt = new Date(event.dateTime || event.date || Date.now());
    const dateStr = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const outUrl = eventOutboundUrl(event);
    const hasOutbound = isUsableOutboundHref(outUrl);
    const slugKey = event.slug ? String(event.slug).replace(/[^a-zA-Z0-9_-]/g, '-') : `i-${index}`;
    const expandId = `event-expand-${slugKey}-${index}`;
    const img = imgOrPlaceholder(event.heroImage, 960, 600, event.title);
    const venue = [event.venueName, event.city].filter(Boolean).join(' · ');
    const addrLines = eventDetailAddressLines(event);
    const descHtml = descriptionBlocksHtml(event.descriptionText);

    const targetBlank = hasOutbound && /^https?:\/\//i.test(outUrl) ? ' target="_blank" rel="noopener"' : '';

    const cta = hasOutbound
      ? `<a href="${esc(outUrl)}" class="btn btn--sm btn--primary event-page-card__cta"${targetBlank}>Details</a>`
      : `<button type="button" class="btn btn--sm btn--primary event-page-card__cta event-page-card__toggle" aria-expanded="false" aria-controls="${esc(expandId)}">Details</button>`;

    const expandSection = hasOutbound ? '' : `
        <div class="event-page-card__expand" id="${esc(expandId)}" hidden>
          <div class="event-page-card__expand-inner">
            <dl class="event-page-card__details">
              <dt>When</dt>
              <dd>${esc(formatEventDetailWhen(event))}</dd>
              ${addrLines.length ? `<dt>Where</dt><dd>${addrLines.map(l => esc(l)).join('<br>')}</dd>` : ''}
            </dl>
            ${descHtml ? `<div class="event-page-card__description">${descHtml}</div>` : '<p class="event-page-card__nodesc">No additional description for this event.</p>'}
          </div>
        </div>`;

    return `
      <article class="event-page-card${hasOutbound ? '' : ' event-page-card--expandable'}"${hasOutbound ? '' : ' data-expandable="true"'}>
        <div class="event-page-card__image">${img}</div>
        <div class="event-page-card__body">
          <span class="badge" style="--badge-color:#d4a03c">Event</span>
          <h3 class="event-page-card__title">${esc(event.title)}</h3>
          <div class="event-page-card__meta">
            <span>${esc(dateStr)} · ${esc(timeStr)}</span>
            ${venue ? `<span class="event-page-card__venue">${esc(venue)}</span>` : ''}
          </div>
          ${cta}
        </div>${expandSection}
      </article>`;
  }

  async function initEventsPage() {
    setMeta('Events – Arizona Events & Shows');
    const coverageEl = document.getElementById('events-coverage-grid');
    const el = document.getElementById('events-list');
    const tabRoot = document.getElementById('events-date-tabs');
    const cityRoot = document.getElementById('events-city-tabs');
    if (!el) return;
    if (coverageEl) showSkeleton(coverageEl, 6, 'card');
    showSkeleton(el, 8, 'card');

    if (coverageEl && typeof window.getPostsByCategory === 'function') {
      const posts = await window.getPostsByCategory('events', 12).catch(() => null);
      if (!posts || !posts.length) {
        coverageEl.innerHTML = '<p class="empty-msg">No event coverage articles yet.</p>';
      } else {
        coverageEl.innerHTML = posts.map(p => renderArticleCard(p)).join('');
      }
    }

    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const events = await window.getActiveEventsFrom(d.toISOString(), 150).catch(() => null);
    if (!events || events.length === 0) {
      el.innerHTML = '<p class="empty-msg">No upcoming events found. Check back soon!</p>';
      if (tabRoot) tabRoot.style.display = 'none';
      if (cityRoot) cityRoot.style.display = 'none';
      return;
    }

    if (!el.dataset.eventExpandBound) {
      el.dataset.eventExpandBound = '1';
      el.addEventListener('click', (e) => {
        const card = e.target.closest('.event-page-card[data-expandable="true"]');
        if (!card) return;
        if (e.target.closest('.event-page-card__expand')) return;
        if (e.target.closest('a[href]:not([href="#"])')) return;
        const btn = card.querySelector('.event-page-card__toggle');
        const panel = card.querySelector('.event-page-card__expand');
        if (!btn || !panel) return;
        e.preventDefault();
        const open = !card.classList.contains('is-expanded');
        card.classList.toggle('is-expanded', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        panel.hidden = !open;
      });
    }

    function setActiveTab(range) {
      if (!tabRoot) return;
      tabRoot.querySelectorAll('.events-filter-tab').forEach(btn => {
        const on = btn.dataset.range === range;
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }

    function setActiveCity(city) {
      if (!cityRoot) return;
      cityRoot.querySelectorAll('.events-city-tab').forEach(btn => {
        const on = normalizeCityName(btn.dataset.city) === normalizeCityName(city);
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }

    let currentRange = 'week';
    let currentCity = '';

    function renderFiltered() {
      const byRange = filterEventsByRange(events, currentRange);
      const filtered = filterEventsByCity(byRange, currentCity);
      if (!filtered.length) {
        el.innerHTML = '<p class="empty-msg">No events in this time range.</p>';
        return;
      }
      el.innerHTML = filtered.map((ev, i) => renderEventPageCard(ev, i)).join('');
    }

    if (tabRoot) {
      tabRoot.querySelectorAll('.events-filter-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          const range = btn.dataset.range;
          if (!range) return;
          currentRange = range;
          setActiveTab(currentRange);
          renderFiltered();
        });
      });
    }

    if (cityRoot) {
      cityRoot.querySelectorAll('.events-city-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          currentCity = btn.dataset.city || '';
          setActiveCity(currentCity);
          renderFiltered();
        });
      });
    }

    setActiveTab(currentRange);
    setActiveCity(currentCity);
    renderFiltered();
  }

  // ─── CANNABIS PAGE ────────────────────────────────────────────────────────────

  async function initCannabisPage() {
    setMeta('Cannabis – Arizona Dispensaries & Deals');
    const [dispensariesRaw, posts] = await Promise.all([
      (window.getActiveDispensaries ? window.getActiveDispensaries() : window.getDispensaries()).catch(() => null),
      window.getPostsByCategory('cannabis', 6)
    ]);
    const dispensaries = Array.isArray(dispensariesRaw) ? dispensariesRaw.filter(Boolean) : [];

    const dispEl = document.getElementById('cannabis-dispensary-grid');
    if (dispEl) {
      if (!dispensaries || dispensaries.length === 0) {
        dispEl.innerHTML = '<p class="empty-msg">No dispensaries found.</p>';
      } else {
        dispEl.innerHTML = dispensaries.map(d => renderDispensaryCannabisRowCard(d)).join('');
      }
    }

    const postsEl = document.getElementById('cannabis-posts-grid');
    if (postsEl) {
      if (!posts || posts.length === 0) {
        postsEl.innerHTML = '<p class="empty-msg">No cannabis articles yet.</p>';
      } else {
        postsEl.innerHTML = posts.map(p => renderArticleCard(p)).join('');
      }
    }
  }

  async function initCannabisDealsPage() {
    setMeta(
      'Cannabis Deals – Dispensary Deals by City',
      'Browse Arizona dispensary deals by city. Click to view current deals directly from dispensaries.'
    );

    const gridEl = document.getElementById('cannabis-deals-dispensary-grid');
    const cityRoot = document.getElementById('cannabis-deals-city-tabs');
    if (!gridEl) return;
    showSkeleton(gridEl, 9, 'card');

    const list = await (window.getActiveDispensaryDeals ? window.getActiveDispensaryDeals() : Promise.resolve(null)).catch(() => null);
    const dispensaries = Array.isArray(list) ? list.filter(Boolean) : [];

    if (!dispensaries.length) {
      gridEl.innerHTML = '<p class="empty-msg">No active dispensary deals found.</p>';
      if (cityRoot) cityRoot.style.display = 'none';
      return;
    }

    const allCities = cityFilterOptionsFromDispensaries(dispensaries);
    let currentCity = '';

    function setActiveCity(city) {
      if (!cityRoot) return;
      cityRoot.querySelectorAll('.events-city-tab').forEach(btn => {
        const on = normalizeCityName(btn.dataset.city) === normalizeCityName(city);
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }

    function renderFiltered() {
      const filtered = filterEventsByCity(dispensaries, currentCity);
      if (!filtered.length) {
        gridEl.innerHTML = '<p class="empty-msg">No dispensary deals found for this city.</p>';
        return;
      }
      gridEl.innerHTML = filtered.map(d => renderDispensaryDealCard(d)).join('');
    }

    if (cityRoot) {
      const cityButtons = [
        { label: 'All Cities', city: '' },
        ...allCities.map(c => ({ label: c.label, city: c.value }))
      ];
      cityRoot.innerHTML = cityButtons.map((c, i) => `
        <button type="button" class="filter-btn events-city-tab${i === 0 ? ' active' : ''}" data-city="${esc(c.city)}" role="tab" aria-selected="${i === 0 ? 'true' : 'false'}">${esc(c.label)}</button>
      `).join('');

      cityRoot.querySelectorAll('.events-city-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          currentCity = btn.dataset.city || '';
          setActiveCity(currentCity);
          renderFiltered();
        });
      });
    }

    setActiveCity(currentCity);
    renderFiltered();
  }

  // ─── LISTING PAGE (single dispensary/venue) ───────────────────────────────────

  async function initListingPage() {
    const slug = getParam('slug');
    if (!slug) return;

    const listing = await window.getListingBySlug(slug);
    if (!listing) {
      document.getElementById('listing-main').innerHTML = `<div class="error-state"><h1>Listing not found</h1><a href="dispensaries.html" class="btn btn--primary">View All Dispensaries</a></div>`;
      return;
    }

    setMeta(listing.name, listing.description);

    const heroEl = document.getElementById('listing-hero');
    if (heroEl && listing.heroImage) {
      const url = window.sanityImage(listing.heroImage, 1200, 500);
      if (url) { heroEl.style.backgroundImage = `url(${url})`; heroEl.classList.add('has-image'); }
    }

    const nameEl = document.getElementById('listing-name');
    if (nameEl) nameEl.textContent = listing.name;

    const metaEl = document.getElementById('listing-meta');
    if (metaEl) {
      metaEl.innerHTML = `
        ${listing.city ? `<span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${esc(listing.city)}, AZ</span>` : ''}
        ${listing.address ? `<span>${esc(listing.address)}</span>` : ''}
        ${listing.phone ? `<a href="tel:${esc(listing.phone)}">${esc(listing.phone)}</a>` : ''}
        ${listing.website ? `<a href="${esc(listing.website)}" target="_blank" rel="noopener" class="btn btn--primary btn--sm">Visit Website</a>` : ''}
      `;
    }

    const descEl = document.getElementById('listing-description');
    if (descEl && listing.description) descEl.textContent = listing.description;

    // Hours
    const hoursEl = document.getElementById('listing-hours');
    if (hoursEl && listing.hours) {
      const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
      const labels = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' };
      hoursEl.innerHTML = days.map(d => listing.hours[d] ? `
        <div class="hours-row">
          <span class="hours-day">${labels[d]}</span>
          <span class="hours-time">${esc(listing.hours[d])}</span>
        </div>` : ''
      ).join('');
    }

    // Amenities
    const amenEl = document.getElementById('listing-amenities');
    if (amenEl && listing.amenities && listing.amenities.length) {
      amenEl.innerHTML = listing.amenities.map(a => `<span class="amenity-tag">${esc(a)}</span>`).join('');
    }

    // Socials
    const socialEl = document.getElementById('listing-socials');
    if (socialEl && listing.socials) {
      const s = listing.socials;
      const links = [];
      if (s.instagram) links.push(`<a href="${esc(s.instagram)}" target="_blank" rel="noopener" class="social-link" aria-label="Instagram"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></a>`);
      if (s.twitter) links.push(`<a href="${esc(s.twitter)}" target="_blank" rel="noopener" class="social-link" aria-label="Twitter/X"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>`);
      if (s.tiktok) links.push(`<a href="${esc(s.tiktok)}" target="_blank" rel="noopener" class="social-link" aria-label="TikTok"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/></svg></a>`);
      socialEl.innerHTML = links.join('');
    }
  }

  // ─── Mobile Nav ───────────────────────────────────────────────────────────────

  function initMobileNav() {
    const toggle = document.getElementById('mobile-nav-toggle');
    const drawer = document.getElementById('mobile-nav-drawer');
    const close  = document.getElementById('mobile-nav-close');
    const overlay = document.getElementById('mobile-nav-overlay');

    if (!toggle || !drawer) return;

    function openDrawer()  { drawer.classList.add('open'); overlay?.classList.add('visible'); document.body.style.overflow = 'hidden'; }
    function closeDrawer() { drawer.classList.remove('open'); overlay?.classList.remove('visible'); document.body.style.overflow = ''; }

    toggle.addEventListener('click', openDrawer);
    close?.addEventListener('click', closeDrawer);
    overlay?.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
    });

    // Active nav item
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(a => {
      if (a.getAttribute('href') === path) a.classList.add('active');
    });
  }

  // ─── Sticky Header ────────────────────────────────────────────────────────────

  function initStickyHeader() {
    const header = document.getElementById('site-header');
    if (!header) return;
    let lastY = 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      header.classList.toggle('scrolled', y > 10);
      header.classList.toggle('hidden', y > lastY && y > 200);
      lastY = y;
    }, { passive: true });
  }

  // ─── Search ───────────────────────────────────────────────────────────────────

  function initSearch() {
    const input  = document.getElementById('search-input');
    const btn    = document.getElementById('search-btn');
    const toggle = document.getElementById('search-toggle');
    const bar    = document.getElementById('search-bar');

    toggle?.addEventListener('click', () => {
      bar?.classList.toggle('open');
      if (bar?.classList.contains('open')) input?.focus();
    });

    function doSearch() {
      const q = input?.value?.trim();
      if (q) window.location.href = `https://www.google.com/search?q=${encodeURIComponent(q + ' site:happytimesaz.com')}`;
    }

    btn?.addEventListener('click', doSearch);
    input?.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
  }

  // ─── NEWS PAGE ───────────────────────────────────────────────────────────────

  async function initNewsPage() {
    setMeta('News – HappyTimes AZ', 'Local stories and headlines from across the Valley.');
    const gridEl = document.getElementById('category-grid');
    if (!gridEl) return;
    showSkeleton(gridEl, 9, 'card');

    const posts = await window.getNewsPosts(24).catch(() => null);
    if (!posts || posts.length === 0) {
      gridEl.innerHTML = '<p class="empty-msg" style="grid-column:1/-1">No news articles found yet.</p>';
      return;
    }
    gridEl.innerHTML = posts.map(p => renderArticleCard(p)).join('');
  }

  // ─── CATEGORY PAGE (food / nightlife / health-wellness / sports / classes) ─

  async function initCategoryPage() {
    const cat   = document.body.dataset.category || '';
    const gridEl = document.getElementById('category-grid');
    if (!gridEl) return;

    if (cat === 'food') {
      await initFoodPage();
      return;
    }

    showSkeleton(gridEl, 9, 'card');

    let posts = await window.getPostsByCategory(cat, 12);
    if (!posts || posts.length === 0) {
      posts = await window.getLatestPosts(12);
    }
    if (!posts || posts.length === 0) {
      gridEl.innerHTML = '<p class="empty-msg" style="grid-column:1/-1">No articles found yet.</p>';
      return;
    }
    gridEl.innerHTML = posts.map(p => renderArticleCard(p)).join('');
  }

  // ─── STATIC PAGES (about / contact / policies) ─────────────────────────────

  async function initStaticPage() {
    const form = document.getElementById('contact-form');
    const msg = document.getElementById('contact-form-msg');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (msg) msg.textContent = 'Thanks — we received your message.';
      form.reset();
    });
  }

  // ─── Router ───────────────────────────────────────────────────────────────────

  function route() {
    let page = document.body.dataset.page;
    if (!page) return;

    // Defensive routing: if the HTML has the wrong data-page attribute (or a host rewrite
    // serves the wrong shell), try to infer the intended page from the URL / DOM.
    const path = String(window.location?.pathname || '').toLowerCase();
    try {
      const hasDispGrid = !!document.getElementById('dispensary-grid');
      if (hasDispGrid || path.endsWith('/dispensaries.html') || path.endsWith('dispensaries.html') || path.includes('/dispensaries')) {
        page = 'dispensaries';
      }
    } catch (e) {}

    initMobileNav();
    initStickyHeader();
    initSearch();
    renderHomeMastheadDate();
    void fetchPhoenixWeather();
    void initHeadlineTickerGlobal();

    // Run page init then wire up any ad slots that were in the static HTML.
    // Dynamic ad slots (injected by render functions) are picked up by initAds
    // which is called again after async content settles.
    const pageInits = {
      home:         initHomepage,
      dispensaries: initDispensariesPage,
      article:      initArticlePage,
      events:       initEventsPage,
      cannabis:     initCannabisPage,
      'cannabis-deals': initCannabisDealsPage,
      listing:      initListingPage,
      category:     initCategoryPage,
      news:         initNewsPage,
      static:       initStaticPage,
    };

    const fn = pageInits[page];
    if (fn) {
      // Init static ad slots immediately (leaderboards etc. in the HTML)
      initAds();
      // Run page content fetch, then re-run initAds to catch dynamically injected slots
      fn()
        .then(() => {
          initAds();
        })
        .catch((e) => {
          console.error('[Route] init failed for', page, e);
        });
    } else {
      console.warn('[Route] no init fn for', page);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', route);
  } else {
    route();
  }

})();
