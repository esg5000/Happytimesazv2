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

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function imgOrPlaceholder(image, w, h, alt) {
    const url = window.sanityImage && image ? window.sanityImage(image, w, h) : null;
    if (url) return `<img src="${esc(url)}" alt="${esc(alt || '')}" loading="lazy">`;
    return `<div class="img-placeholder" style="background:linear-gradient(135deg,#f3ede6 0%,#e8ddd4 100%)"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c9b8a8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;
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
    // Use clean URLs for Vercel rewrites: /article/:slug → /article.html
    const url  = `/article/${encodeURIComponent(post.slug)}`;
    const date = window.formatDateShort ? window.formatDateShort(post.publishedAt) : '';
    const mins = post.readTime ? `${post.readTime} min read` : '';
    return `
      <article class="article-card article-card--${size}">
        <a href="${url}" class="article-card__image-link">
          <div class="article-card__image">
            ${imgOrPlaceholder(post.heroImage, size === 'large' ? 800 : 400, size === 'large' ? 500 : 280, post.title)}
          </div>
          ${categoryBadge(post.categories)}
        </a>
        <div class="article-card__body">
          <h3 class="article-card__title"><a href="${url}">${esc(post.title)}</a></h3>
          ${post.excerpt ? `<p class="article-card__excerpt">${esc(post.excerpt)}</p>` : ''}
          <div class="article-card__meta">
            ${date ? `<span>${date}</span>` : ''}
            ${mins ? `<span>${mins}</span>` : ''}
            ${post.author ? `<span>${esc(post.author)}</span>` : ''}
          </div>
        </div>
      </article>
    `;
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
          <div class="dispensary-card__image">
            ${imgOrPlaceholder(d.heroImage, 520, 390, name)}
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

  function renderHomeMastheadDate() {
    const el = document.getElementById('home-masthead-date');
    if (!el) return;
    const d = new Date();
    el.textContent = d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  async function fetchPhoenixWeather() {
    const el = document.getElementById('home-weather');
    if (!el) return;
    try {
      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=33.4484&longitude=-112.0740&current=temperature_2m&temperature_unit=fahrenheit&timezone=America%2FPhoenix'
      );
      const data = await res.json();
      const t = data?.current?.temperature_2m;
      el.textContent = t != null ? `Phoenix ${Math.round(t)}°F` : 'Phoenix';
    } catch (e) {
      el.textContent = 'Phoenix';
    }
    el.classList.remove('is-loading');
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
        const url = `/article/${encodeURIComponent(p.slug)}`;
        return `<a href="${esc(url)}">${esc(p.title)}</a>`;
      })
      .join(sep);
    track.innerHTML = block + sep + block;
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
      featuredUrl = `/article/${encodeURIComponent(p.slug)}`;
      featuredCat = (p.categories || [])[0] || 'Latest';
      featuredImage = p.heroImage;
    } else {
      featuredTitle = 'HappyTimes AZ';
      featuredCat = 'Arizona Lifestyle';
    }

    if (!featuredImage && posts && posts[0] && posts[0].heroImage) {
      featuredImage = posts[0].heroImage;
    }

    const secondaryPosts = [1, 2, 3].map(i => posts && posts[i]).filter(Boolean);
    const secondaryBlock =
      secondaryPosts.length > 0
        ? `<div class="home-hero__secondary">
            <div class="home-hero__secondary-title">Also in the news</div>
            <ul>${secondaryPosts
              .map(
                p =>
                  `<li><a href="/article/${encodeURIComponent(p.slug)}">${esc(p.title)}</a></li>`
              )
              .join('')}</ul>
          </div>`
        : '';

    leadWrap.innerHTML = `
      <span class="home-hero__lead-tag">${esc(featuredCat)}</span>
      <h1 class="home-hero__headline"><a href="${esc(featuredUrl)}">${esc(featuredTitle)}</a></h1>
      ${secondaryBlock}
    `;

    featuredLink.href = featuredUrl;
    const imgUrl =
      featuredImage && window.sanityImage
        ? window.sanityImage(featuredImage, 1200, 750)
        : null;
    featuredImg.innerHTML = imgUrl
      ? `<img src="${esc(imgUrl)}" alt="${esc(featuredTitle)}" width="1200" height="750" loading="eager">`
      : `<img src="assets/heroes/homepage.png" alt="" width="1200" height="750" loading="eager">`;

    const trendingPosts = (posts || []).slice(4, 9);
    if (trendingPosts.length === 0) {
      trendingList.innerHTML =
        '<p class="empty-msg" style="margin:0;font-size:.875rem">More stories coming soon.</p>';
      return;
    }
    trendingList.innerHTML = trendingPosts
      .map(p => {
        const url = `/article/${encodeURIComponent(p.slug)}`;
        return `
      <a href="${url}" class="home-trending__item">
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

    renderHomeMastheadDate();
    fetchPhoenixWeather();
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
    renderCannabisSpotlight(deals, dispensaries);
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

  function renderCannabisSpotlight(deals, dispensaries) {
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
    console.log('[Dispensaries] init start');
    console.log('[Dispensaries] document.readyState =', document.readyState);

    const el = document.getElementById('dispensary-grid');
    if (!el) {
      console.error('[Dispensaries] #dispensary-grid not found');
      return;
    }
    console.log('[Dispensaries] #dispensary-grid found');
    showSkeleton(el, 9, 'card');

    console.log('[Dispensaries] fetching from', window.getActiveDispensaries ? 'getActiveDispensaries' : 'getDispensaries');
    const dispensariesRaw = await (window.getActiveDispensaries ? window.getActiveDispensaries() : window.getDispensaries());
    console.log('[Dispensaries] raw result type =', Array.isArray(dispensariesRaw) ? 'array' : typeof dispensariesRaw);
    const dispensaries = Array.isArray(dispensariesRaw) ? dispensariesRaw.filter(Boolean) : [];
    console.log('[Dispensaries] count =', dispensaries.length);
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
      console.log('[Dispensaries] cities populated =', cities.length);
    } else {
      console.warn('[Dispensaries] #disp-city not found (filters will still render cards)');
    }

    function passesCategory(d, cat) {
      if (!cat || cat === 'all') return true;
      const tags = getDispensaryCategoryTags(d).map(t => t.label.toLowerCase());
      return tags.includes(cat);
    }

    function applyFilters() {
      try {
        console.log('[Dispensaries] applyFilters');
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

        console.log('[Dispensaries] filtered count =', filtered.length, { q, city, cat });
        if (countEl) countEl.textContent = `${filtered.length} result${filtered.length === 1 ? '' : 's'}`;
        const html = filtered.length
          ? filtered.map(d => renderDispensaryDirectoryCard(d)).join('')
          : '<p class="empty-msg" style="grid-column:1/-1">No dispensaries match your filters.</p>';
        console.log('[Dispensaries] setting grid innerHTML (len chars)=', html.length);
        el.innerHTML = html;
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
    console.log('[Dispensaries] init end');
  }

  function filterDispensaries(all, city) {
    const el = document.getElementById('dispensary-grid');
    if (!el) return;
    const filtered = city === 'all' ? all : all.filter(d => d.city === city);
    el.innerHTML = filtered.length ? filtered.map(d => renderDispensaryCard(d)).join('') : '<p class="empty-msg">No dispensaries in this city.</p>';
  }

  // ─── ARTICLE PAGE ─────────────────────────────────────────────────────────────

  async function initArticlePage() {
    const slug = window.location.pathname.split('/').filter(Boolean).pop();
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
        ${post.author ? `<span>By ${esc(post.author)}</span>` : ''}
      `;
    }

    // Title
    const titleEl = document.getElementById('article-title');
    if (titleEl) titleEl.textContent = post.title;

    // Excerpt
    const excEl = document.getElementById('article-excerpt');
    if (excEl && post.excerpt) {
      excEl.textContent = post.excerpt;
      excEl.style.display = 'block';
    }

    // Body
    const bodyEl = document.getElementById('article-body');
    if (bodyEl) {
      if (post.body && Array.isArray(post.body)) {
        // Group list items
        let html = '';
        let listType = null;
        post.body.forEach(block => {
          if (block.listItem) {
            if (block.listItem !== listType) {
              if (listType) html += listType === 'bullet' ? '</ul>' : '</ol>';
              listType = block.listItem;
              html += listType === 'bullet' ? '<ul class="article-list">' : '<ol class="article-list">';
            }
          } else {
            if (listType) { html += listType === 'bullet' ? '</ul>' : '</ol>'; listType = null; }
          }
          html += window.renderPortableText([block]);
        });
        if (listType) html += listType === 'bullet' ? '</ul>' : '</ol>';
        bodyEl.innerHTML = html;
      } else {
        bodyEl.innerHTML = '<p class="empty-msg">Article content coming soon.</p>';
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
    const el = document.getElementById('events-list');
    const tabRoot = document.getElementById('events-date-tabs');
    if (!el) return;
    showSkeleton(el, 8, 'card');

    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const events = await window.getActiveEventsFrom(d.toISOString(), 150).catch(() => null);
    if (!events || events.length === 0) {
      el.innerHTML = '<p class="empty-msg">No upcoming events found. Check back soon!</p>';
      if (tabRoot) tabRoot.style.display = 'none';
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

    function renderRange(range) {
      const filtered = filterEventsByRange(events, range);
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
          setActiveTab(range);
          renderRange(range);
        });
      });
    }

    setActiveTab('week');
    renderRange('week');
  }

  // ─── CANNABIS PAGE ────────────────────────────────────────────────────────────

  async function initCannabisPage() {
    setMeta('Cannabis – Arizona Dispensaries & Deals');
    const [deals, dispensaries, posts] = await Promise.all([
      window.getDeals ? window.getDeals(12).catch(() => null) : Promise.resolve(null),
      window.getDispensaries ? window.getDispensaries().catch(() => null) : Promise.resolve(null),
      window.getPostsByCategory('cannabis', 6)
    ]);

    const dealsEl = document.getElementById('cannabis-deals-grid');
    if (dealsEl) {
      if (!deals || deals.length === 0) {
        dealsEl.innerHTML = '<p class="empty-msg">No active deals right now.</p>';
      } else {
        dealsEl.innerHTML = deals.map(d => renderDealCard(d)).join('');
      }
    }

    const dispEl = document.getElementById('cannabis-dispensary-grid');
    if (dispEl) {
      if (!dispensaries || dispensaries.length === 0) {
        dispEl.innerHTML = '<p class="empty-msg">No dispensaries listed yet.</p>';
      } else {
        dispEl.innerHTML = dispensaries.map(d => renderDispensaryCard(d)).join('');
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
    setMeta('News – HappyTimes AZ', 'Breaking stories and headlines from NewsAPI and our News desk.');
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

  // ─── CATEGORY PAGE (food / nightlife / health-wellness / classes) ───────────

  async function initCategoryPage() {
    const cat   = document.body.dataset.category || '';
    const gridEl = document.getElementById('category-grid');
    if (!gridEl) return;
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

  // ─── Router ───────────────────────────────────────────────────────────────────

  function route() {
    let page = document.body.dataset.page;
    if (!page) return;

    // Defensive routing: if the HTML has the wrong data-page attribute (or a host rewrite
    // serves the wrong shell), try to infer the intended page from the URL / DOM.
    const href = String(window.location?.href || '');
    const path = String(window.location?.pathname || '').toLowerCase();
    try {
      const hasDispGrid = !!document.getElementById('dispensary-grid');
      if (hasDispGrid || path.endsWith('/dispensaries.html') || path.endsWith('dispensaries.html') || path.includes('/dispensaries')) {
        page = 'dispensaries';
      }
    } catch (e) {}

    console.log('[Route] href =', href);
    console.log('[Route] pathname =', path);
    console.log('[Route] body[data-page] =', document.body.dataset.page);
    console.log('[Route] effective page =', page);

    initMobileNav();
    initStickyHeader();
    initSearch();

    // Run page init then wire up any ad slots that were in the static HTML.
    // Dynamic ad slots (injected by render functions) are picked up by initAds
    // which is called again after async content settles.
    const pageInits = {
      home:         initHomepage,
      dispensaries: initDispensariesPage,
      article:      initArticlePage,
      events:       initEventsPage,
      cannabis:     initCannabisPage,
      listing:      initListingPage,
      category:     initCategoryPage,
      news:         initNewsPage,
    };

    const fn = pageInits[page];
    if (fn) {
      console.log('[Route] init fn found for', page);
      // Init static ad slots immediately (leaderboards etc. in the HTML)
      initAds();
      // Run page content fetch, then re-run initAds to catch dynamically injected slots
      fn()
        .then(() => {
          console.log('[Route] init complete for', page);
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
