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

    slots.forEach(slot => {
      const ad   = results[slot.dataset.placement];
      const size = slot.dataset.size || 'leaderboard';
      if (!ad) return; // no ad → slot stays display:none
      const html = renderAdHTML(ad, size);
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

  /** Extract slug from clean URL /article/my-slug */
  function getArticleSlug() {
    const m = window.location.pathname.match(/\/article\/([^/]+)\/?$/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function imgOrPlaceholder(image, w, h, alt) {
    const url = window.sanityImage && image ? window.sanityImage(image, w, h) : null;
    if (url) return `<img src="${url}" alt="${esc(alt || '')}" loading="lazy">`;
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
      mushroom: '#8b4513', mushrooms: '#8b4513',
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
    const dt  = new Date(event.dateTime || Date.now());
    const day = dt.toLocaleDateString('en-US', { day: 'numeric' });
    const mon = dt.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const time = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const href = event.link || '#';
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
          <h3 class="event-card__title"><a href="${href}" ${href !== '#' ? 'target="_blank" rel="noopener"' : ''}>${esc(event.title)}</a></h3>
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

  async function initHomepage() {
    setMeta('HappyTimes AZ – Arizona Lifestyle Magazine', 'Your guide to Arizona food, cannabis, nightlife, events and more.');

    // Fire all fetches in parallel
    const [settings, posts, events, deals, dispensaries] = await Promise.all([
      window.getHomepageSettings().catch(() => null),
      window.getLatestPosts(12),
      window.getEvents(6).catch(() => null),
      window.getDeals(6).catch(() => null),
      window.getDispensaries().catch(() => null)
    ]);

    renderHeroMosaic(settings, posts);
    renderEditorialGrid(posts);
    renderEventsSection(events);
    renderCannabisSpotlight(deals, dispensaries);
    renderDispensaryHighlights(dispensaries);
  }

  function renderHeroMosaic(settings, posts) {
    const hero = document.getElementById('hero-mosaic');
    if (!hero) return;

    // ── Main tile: update copy; optional Sanity featured image replaces default hero photo ──
    const mainTile = document.getElementById('hero-main-tile');
    if (mainTile) {
      let title, subtitle, ctaLabel, ctaUrl, themeLabel;

      if (settings && settings.featuredHeadline) {
        title      = settings.featuredHeadline;
        subtitle   = settings.featuredSubheadline;
        ctaLabel   = settings.featuredCtaLabel || 'Read More';
        ctaUrl     = settings.featuredCtaUrl   || '#';
        themeLabel = settings.featuredThemeLabel;
        if (settings.featuredImage) {
          const bg = window.sanityImage(settings.featuredImage, 1200, 700);
          if (bg) {
            mainTile.style.backgroundImage = `url(${bg})`;
            mainTile.style.backgroundSize = 'cover';
            mainTile.style.backgroundPosition = 'center';
          }
        }
      } else if (posts && posts.length > 0) {
        const p = posts[0];
        title    = p.title;
        subtitle = p.excerpt;
        ctaLabel = 'Read Story';
        ctaUrl   = `/article/${encodeURIComponent(p.slug)}`;
        themeLabel = (p.categories || [])[0] || 'Latest';
      }

      if (title) {
        mainTile.href = esc(ctaUrl || '#');
        const content = mainTile.querySelector('.hero-tile__content');
        if (content) {
          content.innerHTML = `
            ${themeLabel ? `<div class="hero-theme-label">${esc(themeLabel)}</div>` : ''}
            <h1 class="hero-tile__title">${esc(title)}</h1>
            ${subtitle ? `<p class="hero-tile__sub">${esc(subtitle)}</p>` : ''}
            <span class="hero-tile__cta">${esc(ctaLabel || 'Read More')} <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span>
          `;
        }
      }
    }

    // ── Side tiles: update with posts 1 & 2 if no Sanity settings override ──
    const sideTiles = hero.querySelectorAll('.hero-tile--sm');

    function updateSideTile(tile, post, settingsTile) {
      if (!tile) return;
      let tileTitle, tileUrl, tileCat, tileBg;
      if (settingsTile && settingsTile.title) {
        tileTitle = settingsTile.title;
        tileUrl   = settingsTile.linkUrl || '#';
        tileCat   = settingsTile.categoryTag;
        tileBg    = settingsTile.image ? window.sanityImage(settingsTile.image, 600, 350) : null;
      } else if (post) {
        tileTitle = post.title;
        tileUrl   = `/article/${encodeURIComponent(post.slug)}`;
        tileCat   = (post.categories || [])[0];
        tileBg    = post.heroImage ? window.sanityImage(post.heroImage, 600, 350) : null;
      }
      if (!tileTitle) return;
      tile.href = esc(tileUrl || '#');
      if (tileBg) { tile.style.backgroundImage = `url(${tileBg})`; tile.style.backgroundSize = 'cover'; tile.style.backgroundPosition = 'center'; }
      const content = tile.querySelector('.hero-tile__content');
      if (content) {
        content.innerHTML = `
          ${tileCat ? `<div class="hero-cat-tag">${esc(tileCat)}</div>` : ''}
          <h3 class="hero-tile__title">${esc(tileTitle)}</h3>
        `;
      }
    }

    updateSideTile(sideTiles[0], posts && posts[1], settings && settings.tileTop);
    updateSideTile(sideTiles[1], posts && posts[2], settings && settings.tileBottom);
  }

  function renderEditorialGrid(posts) {
    const grid = document.getElementById('editorial-grid');
    if (!grid) return;
    if (!posts || posts.length === 0) {
      grid.innerHTML = '<p class="empty-msg">No articles found.</p>';
      return;
    }
    // Skip first 3 (used in hero mosaic)
    const gridPosts = posts.slice(3);
    const items = [];
    gridPosts.forEach((p, i) => {
      items.push(renderArticleCard(p));
      // Insert a native sponsored slot after every 6th article card
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
    const el = document.getElementById('dispensary-grid');
    if (!el) return;
    showSkeleton(el, 9, 'card');

    const dispensaries = await window.getDispensaries();
    if (!dispensaries || dispensaries.length === 0) {
      el.innerHTML = '<p class="empty-msg">No dispensaries found.</p>';
      return;
    }

    // Group by city
    const cities = {};
    dispensaries.forEach(d => {
      const city = d.city || 'Other';
      if (!cities[city]) cities[city] = [];
      cities[city].push(d);
    });

    const container = document.getElementById('dispensary-page');
    if (!container) {
      el.innerHTML = dispensaries.map(d => renderDispensaryCard(d)).join('');
      return;
    }

    // Render filter buttons
    const filterBar = document.getElementById('city-filters');
    if (filterBar) {
      const allCities = Object.keys(cities).sort();
      filterBar.innerHTML = `
        <button class="filter-btn active" data-city="all">All Cities</button>
        ${allCities.map(c => `<button class="filter-btn" data-city="${esc(c)}">${esc(c)}</button>`).join('')}
      `;
      filterBar.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const city = btn.dataset.city;
          filterDispensaries(dispensaries, city);
        });
      });
    }

    el.innerHTML = dispensaries.map(d => renderDispensaryCard(d)).join('');
  }

  function filterDispensaries(all, city) {
    const el = document.getElementById('dispensary-grid');
    if (!el) return;
    const filtered = city === 'all' ? all : all.filter(d => d.city === city);
    el.innerHTML = filtered.length ? filtered.map(d => renderDispensaryCard(d)).join('') : '<p class="empty-msg">No dispensaries in this city.</p>';
  }

  // ─── ARTICLE PAGE ─────────────────────────────────────────────────────────────

  async function initArticlePage() {
    const slug = getArticleSlug();
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

    // Related articles
    const related = await window.getRelatedPosts(slug, post.categorySlug, 4);
    const relEl = document.getElementById('related-articles');
    if (relEl && related && related.length > 0) {
      relEl.innerHTML = related.map(p => renderArticleCard(p)).join('');
    } else if (relEl) {
      relEl.closest('.related-section')?.remove();
    }
  }

  // ─── EVENTS PAGE ──────────────────────────────────────────────────────────────

  async function initEventsPage() {
    setMeta('Events – Arizona Events & Shows');
    const el = document.getElementById('events-list');
    if (!el) return;
    showSkeleton(el, 8, 'list');

    const events = await window.getEvents(24);
    if (!events || events.length === 0) {
      el.innerHTML = '<p class="empty-msg">No upcoming events found. Check back soon!</p>';
      return;
    }
    el.innerHTML = events.map(e => renderEventCardFull(e)).join('');
  }

  function renderEventCardFull(event) {
    const dt   = new Date(event.dateTime || Date.now());
    const day  = dt.toLocaleDateString('en-US', { day: 'numeric' });
    const mon  = dt.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const dow  = dt.toLocaleDateString('en-US', { weekday: 'long' });
    const time = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const href = event.link || '#';
    const imgUrl = event.heroImage ? window.sanityImage(event.heroImage, 500, 300) : null;
    return `
      <article class="event-full-card">
        <div class="event-full-date">
          <span class="event-full-day">${day}</span>
          <span class="event-full-mon">${mon}</span>
          <span class="event-full-dow">${dow}</span>
        </div>
        ${imgUrl ? `<div class="event-full-image"><img src="${imgUrl}" alt="${esc(event.title)}" loading="lazy"></div>` : ''}
        <div class="event-full-body">
          <h2 class="event-full-title"><a href="${href}" ${href !== '#' ? 'target="_blank" rel="noopener"' : ''}>${esc(event.title)}</a></h2>
          <div class="event-full-meta">
            <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${time}</span>
            ${event.venueName ? `<span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${esc(event.venueName)}</span>` : ''}
            ${event.city ? `<span>${esc(event.city)}, AZ</span>` : ''}
          </div>
          ${event.excerpt ? `<p class="event-full-desc">${esc(event.excerpt)}</p>` : ''}
          ${href !== '#' ? `<a href="${href}" target="_blank" rel="noopener" class="btn btn--primary btn--sm">Get Tickets / Info</a>` : ''}
        </div>
      </article>
    `;
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

  // ─── CATEGORY PAGE (food / nightlife / mushrooms / classes) ──────────────────

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
    const page = document.body.dataset.page;
    if (!page) return;

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
    };

    const fn = pageInits[page];
    if (fn) {
      // Init static ad slots immediately (leaderboards etc. in the HTML)
      initAds();
      // Run page content fetch, then re-run initAds to catch dynamically injected slots
      fn().then(() => initAds()).catch(() => {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', route);
  } else {
    route();
  }

})();
