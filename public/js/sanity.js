/**
 * HappyTimesAZ – Sanity CMS Client
 * Pure vanilla JS, no dependencies.
 */

const SANITY_PROJECT_ID = '7nd2gpk6';
const SANITY_DATASET    = 'production';
const SANITY_API_VER    = '2025-01-01';
const SANITY_CDN        = `https://cdn.sanity.io/images/${SANITY_PROJECT_ID}/${SANITY_DATASET}`;
const SANITY_API        = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VER}/data/query/${SANITY_DATASET}`;

/** Resolve image asset _ref from common Sanity image field shapes */
function sanityImageRef(image) {
  if (!image) return null;
  if (typeof image === 'string' && image.startsWith('image-')) return image;
  if (image._ref && String(image._ref).startsWith('image-')) return image._ref;
  if (image.asset) {
    if (typeof image.asset === 'string' && image.asset.startsWith('image-')) return image.asset;
    if (image.asset._ref) return image.asset._ref;
  }
  return null;
}

/** Build a Sanity CDN image URL from an image field or raw asset _ref */
window.sanityImage = function(image, w = 800, h = 600, mode = 'crop') {
  const ref = sanityImageRef(image);
  if (!ref) return null;
  const parts = ref.split('-');
  const ext   = parts[parts.length - 1];
  const dims  = parts[parts.length - 2];
  const id    = parts.slice(1, parts.length - 2).join('-');
  return `${SANITY_CDN}/${id}-${dims}.${ext}?w=${w}&h=${h}&fit=${mode}&auto=format&q=80`;
};

/** Execute a GROQ query against the Sanity API */
window.sanityFetch = async function(query, params = {}) {
  try {
    const encoded  = encodeURIComponent(query);
    const paramStr = Object.keys(params).length
      ? '&' + Object.entries(params).map(([k,v]) => `$${k}=${encodeURIComponent(JSON.stringify(v))}`).join('&')
      : '';
    const res = await fetch(`${SANITY_API}?query=${encoded}${paramStr}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.result ?? null;
  } catch (err) {
    console.warn('[Sanity] fetch error:', err.message);
    return null;
  }
};

/** Format a Sanity datetime string */
window.formatDate = function(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

window.formatDateShort = function(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ─── GROQ Queries ─────────────────────────────────────────────────────────────

window.getHomepageSettings = () => sanityFetch(`
  *[_type == "homepageSettings"][0]{
    featuredThemeLabel,
    featuredHeadline,
    featuredSubheadline,
    "featuredImage": featuredImage{ asset{ _ref }, alt },
    featuredCtaLabel,
    featuredCtaUrl,
    tileTop{ title, categoryTag, "image": image{ asset{ _ref }, alt }, linkUrl },
    tileBottom{ title, categoryTag, "image": image{ asset{ _ref }, alt }, linkUrl }
  }
`);

window.getLatestPosts = (limit = 12) => sanityFetch(`
  *[_type == "post"] | order(_createdAt desc) [0...${limit}]{
    title,
    "slug": slug.current,
    excerpt,
    "publishedAt": _createdAt,
    readTime,
    "categories": [category->title],
    "categorySlug": category->slug.current,
    "heroImage": heroImage{ asset{ _ref }, alt }
  }
`);

window.getPostsByCategory = (cat, limit = 12) => sanityFetch(`
  *[_type == "post" && category->slug.current == $cat] | order(_createdAt desc) [0...${limit}]{
    title,
    "slug": slug.current,
    excerpt,
    "publishedAt": _createdAt,
    readTime,
    "categories": [category->title],
    "categorySlug": category->slug.current,
    "heroImage": heroImage{ asset{ _ref }, alt }
  }
`, { cat });

/** News: posts syndicated from NewsAPI or filed under News category */
window.getNewsPosts = (limit = 24) => sanityFetch(`
  *[
    _type == "post" &&
    (source == "newsapi" || category->slug.current == "news")
  ] | order(_createdAt desc) [0...${limit}]{
    title,
    "slug": slug.current,
    excerpt,
    "publishedAt": _createdAt,
    readTime,
    source,
    "categories": [category->title],
    "categorySlug": category->slug.current,
    "heroImage": heroImage{ asset{ _ref }, alt }
  }
`);

window.getPostBySlug = (slug) => sanityFetch(`
  *[_type == "post" && slug.current == $slug][0]{
    title,
    "slug": slug.current,
    excerpt,
    "publishedAt": _createdAt,
    readTime,
    source,
    "categories": [category->title],
    "categorySlug": category->slug.current,
    "heroImage": heroImage{ asset{ _ref }, alt },
    "additionalImages": additionalImages[]{ asset{ _ref }, alt },
    "featuredVideo": featuredVideo{
      asset->{
        url,
        mimeType
      }
    },
    body,
    seoTitle,
    seoDescription
  }
`, { slug });

window.getRelatedPosts = (slug, categorySlug, limit = 4) => sanityFetch(`
  *[_type == "post" && slug.current != $slug && category->slug.current == $categorySlug] | order(_createdAt desc) [0...${limit}]{
    title,
    "slug": slug.current,
    excerpt,
    "publishedAt": _createdAt,
    readTime,
    "categories": [category->title],
    "heroImage": heroImage{ asset{ _ref }, alt }
  }
`, { slug, categorySlug: categorySlug || '' });

window.getDispensaries = () => sanityFetch(`
  *[_type == "listing" && listingType == "dispensary"] | order(featured desc, name asc){
    name,
    "slug": slug.current,
    isActive,
    featured,
    city,
    address,
    phone,
    website,
    "heroImage": heroImage{ asset{ _ref }, alt },
    description,
    hours,
    medical,
    recreational,
    categoryTags,
    amenities,
    socials
  }
`);

// Active dispensaries for the public directory
window.getActiveDispensaries = () => sanityFetch(`
  *[
    _type == "dispensary" &&
    isActive == true
  ] | order(name asc){
    name,
    "slug": slug.current,
    featured,
    city,
    address,
    phone,
    website,
    "heroImage": coalesce(heroImage, image){ asset{ _ref }, alt },
    hours,
    medical,
    recreational,
    categoryTags
  }
`);

/** Top 25 restaurants by tab city (`searchCity` must match selected tab label, e.g. Phoenix). */
window.getRestaurantsByCity = (city, limit = 25) => {
  const n = Math.min(Math.max(1, limit), 50);
  return sanityFetch(`
    *[_type == "restaurant" && searchCity == $city] | order(coalesce(isFeatured, featured) desc, name asc) [0...${n}]{
      name,
      "slug": slug.current,
      website,
      thumbnail,
      city,
      cuisine,
      cuisineType,
      starRating,
      rating,
      priceLevel,
      "isFeatured": coalesce(isFeatured, featured)
    }
  `, { city: String(city || '').trim() });
};

window.getListingBySlug = (slug) => sanityFetch(`
  *[_type == "listing" && slug.current == $slug][0]{
    name,
    "slug": slug.current,
    listingType,
    featured,
    city,
    address,
    phone,
    website,
    "heroImage": heroImage{ asset{ _ref }, alt },
    description,
    hours,
    amenities,
    socials,
    location
  }
`, { slug });

window.getDeals = (limit = 12) => sanityFetch(`
  *[_type == "deal"] | order(priority desc, startDate desc) [0...${limit}]{
    title,
    "slug": slug.current,
    featured,
    brandName,
    dispensaryName,
    city,
    startDate,
    endDate,
    link,
    "heroImage": heroImage{ asset{ _ref }, alt }
  }
`);

/**
 * Active events on or after local midnight passed as ISO (client-computed).
 * Uses coalesce(dateTime, date) so either field can drive scheduling.
 */
window.getActiveEventsFrom = (dayStartISO, limit = 120) => {
  const n = Math.min(Math.max(1, limit), 200);
  return sanityFetch(`
    *[
      _type == "event" &&
      isActive == true &&
      defined(coalesce(dateTime, date)) &&
      dateTime(coalesce(dateTime, date)) >= dateTime($dayStart)
    ] | order(dateTime(coalesce(dateTime, date)) asc) [0...${n}]{
      title,
      "slug": slug.current,
      dateTime,
      date,
      city,
      venueName,
      venueAddress,
      streetAddress,
      address,
      link,
      ticketUrl,
      "descriptionText": pt::text(description),
      "excerpt": pt::text(description)[0...200],
      "heroImage": coalesce(heroImage, image, poster, coverImage) {
        asset { _ref },
        alt
      }
    }
  `, { dayStart: dayStartISO });
};

window.getEvents = (limit = 12) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return window.getActiveEventsFrom(d.toISOString(), limit);
};

window.getRadioStations = () => sanityFetch(`
  *[_type == "station" && active == true] | order(order asc){
    title,
    streamUrl,
    "coverImage": coverImage{ asset{ _ref }, alt },
    genre
  }
`);

/** Fetch a single active ad for a named placement (highest priority wins) */
window.getAdByPlacement = (placement) => sanityFetch(`
  *[
    _type == "ad" &&
    active == true &&
    placement == $placement &&
    (!defined(startDate) || dateTime(startDate) <= now()) &&
    (!defined(endDate)   || dateTime(endDate)   >= now())
  ] | order(priority desc) [0] {
    advertiser,
    adType,
    "image": image{ asset{ _ref }, alt },
    html,
    headline,
    cta,
    url
  }
`, { placement });

// ─── New ad models (category-based) ───────────────────────────────────────────

/** Fetch the best active category advertisement for a category slug (e.g. "food") */
window.getCategoryAdvertisement = (categorySlug) => sanityFetch(`
  *[
    _type == "advertisement" &&
    isActive == true &&
    (!defined(startDate) || dateTime(startDate) <= now()) &&
    (!defined(endDate)   || dateTime(endDate)   >= now()) &&
    (
      $categorySlug in targetCategories ||
      "all" in targetCategories
    )
  ] | order(coalesce(startDate, _createdAt) desc) [0]{
    title,
    linkUrl,
    targetCategories,
    startDate,
    endDate,
    "image": image{ asset{ _ref }, alt }
  }
`, { categorySlug });

/** Fetch active affiliate ads for a category slug */
window.getAffiliateAdsByCategory = (categorySlug, limit = 3) => sanityFetch(`
  *[
    _type == "affiliateAd" &&
    isActive == true &&
    (
      $categorySlug in categories ||
      "all" in categories
    )
  ] | order(_createdAt desc) [0...${limit}]{
    title,
    linkUrl,
    description,
    categories,
    "image": image{ asset{ _ref }, alt }
  }
`, { categorySlug });

// ─── Portable Text renderer (vanilla JS) ─────────────────────────────────────

window.renderPortableText = function(blocks) {
  if (!blocks || !Array.isArray(blocks)) return '';
  return blocks.map(block => renderBlock(block)).join('');
};

function renderBlock(block) {
  if (!block) return '';

  if (block._type === 'image') {
    const url = sanityImage(block, 900, 500, 'max');
    if (!url) return '';
    return `<figure class="article-image"><img src="${url}" alt="${block.alt || ''}" loading="lazy"><figcaption>${block.caption || ''}</figcaption></figure>`;
  }

  if (block._type !== 'block') return '';

  const style = block.style || 'normal';
  const content = (block.children || []).map(span => renderSpan(span, block.markDefs || [])).join('');

  const tag = {
    h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4',
    blockquote: 'blockquote',
    normal: 'p'
  }[style] || 'p';

  if (block.listItem === 'bullet') return `<li>${content}</li>`;
  if (block.listItem === 'number') return `<li>${content}</li>`;

  return `<${tag} class="body-${style}">${content}</${tag}>`;
}

function renderSpan(span, markDefs) {
  if (!span || span._type !== 'span') return '';
  let text = span.text || '';

  // Escape HTML
  text = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  (span.marks || []).forEach(mark => {
    if (mark === 'strong')    text = `<strong>${text}</strong>`;
    else if (mark === 'em')   text = `<em>${text}</em>`;
    else if (mark === 'underline') text = `<u>${text}</u>`;
    else if (mark === 'code') text = `<code>${text}</code>`;
    else {
      const def = markDefs.find(d => d._key === mark);
      if (def && def._type === 'link') {
        const rel = def.href && def.href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : '';
        text = `<a href="${def.href}"${rel}>${text}</a>`;
      }
    }
  });
  return text;
}
