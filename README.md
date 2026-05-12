# Happytimesazv2

Static site (HTML/CSS/JS) in the **`public/`** folder.

## Deploy on Vercel

### Default setup (no Root Directory change)

1. Import this GitHub repo in [Vercel](https://vercel.com).
2. Leave **Root Directory** empty (repository root).
3. **Framework Preset:** Other. No install or build command is required.
4. The root **`vercel.json`** rewrites requests so `/` and paths like `/css/styles.css` are served from **`/public/...`** in the repo.

### Custom domain (`happytimesaz.com`)

1. **Project → Settings → Domains** → add your apex and/or `www` domain.
2. Add the DNS records Vercel shows at your DNS host.
3. Use **`https://happytimesaz.com`** after SSL is active.

### Optional: Root Directory = `public`

If you set **Root Directory** to **`public`** in Vercel, replace the **`rewrites`** block in **`vercel.json`** with only:

```json
"rewrites": [
  { "source": "/article/:path*", "destination": "/article.html" }
]
```

(and remove the `/` and `/(.*)` → `/public/...` rules), since files are then served from `/` directly. Keep the **`redirects`** block as-is.
