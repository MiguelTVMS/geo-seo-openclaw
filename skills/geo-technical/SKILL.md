---
name: geo-technical
description: >
  Technical SEO audit with GEO-specific checks. Covers crawlability, indexability,
  security, URL structure, mobile, Core Web Vitals, server-side rendering (critical for
  AI crawlers), and page performance. Invoked directly via /geo technical or as a
  parallel worker in /geo audit.
---

# GEO Technical SEO Auditor

## Purpose

Technical health is the foundation of AI visibility. AI crawlers do not execute JavaScript.
A client-side-rendered site is invisible to every AI crawler regardless of content quality.

**This worker's domain:** Core Web Vitals, HTTPS, mobile, SSR/CSR detection, crawlability,
security headers, URL structure, and page performance.
AI crawler access in robots.txt is handled by `geo-crawlers`.
llms.txt is handled by `geo-llmstxt`.

---

## Scoring (0–100, 8 categories)

| Category | Max Points |
|---|---|
| Crawlability | 15 |
| Indexability | 12 |
| Security | 10 |
| URL Structure | 8 |
| Mobile Optimization | 10 |
| Core Web Vitals | 15 |
| Server-Side Rendering | 15 |
| Page Speed & Server | 15 |

---

## Category Detail

### 1. Crawlability (15 pts)

- robots.txt valid and complete (3 pts)
- AI crawlers allowed — check GPTBot, ClaudeBot, PerplexityBot, Google-Extended (5 pts)
- XML sitemap present, valid, referenced in robots.txt (3 pts)
- Key pages reachable within 3 clicks of homepage (2 pts)
- No erroneous noindex on indexable pages (2 pts)

Note: `Google-Extended` controls AI training/AI Overviews — NOT standard search rank.

### 2. Indexability (12 pts)

- Canonical tags: self-referencing, no chains, no conflicts with HTTP header (3 pts)
- No duplicate content: www/non-www redirect, HTTP→HTTPS redirect, trailing-slash consistency (3 pts)
- Pagination handled (2 pts)
- Hreflang valid if international site (2 pts)
- No index bloat from thin/parameter pages (2 pts)

### 3. Security (10 pts)

- HTTPS enforced, valid cert, no mixed content (4 pts)
- HSTS header present (2 pts)
- X-Content-Type-Options: nosniff (1 pt)
- X-Frame-Options: DENY or SAMEORIGIN (1 pt)
- Referrer-Policy (1 pt)
- Content-Security-Policy (1 pt)

### 4. URL Structure (8 pts)

- Human-readable URLs, lowercase, hyphens, no session IDs (2 pts)
- Logical hierarchy reflecting site architecture (2 pts)
- No redirect chains — max 1 hop (2 pts)
- Parameter handling configured (2 pts)

### 5. Mobile Optimization (10 pts)

Critical: Google crawls all sites exclusively with mobile Googlebot (since July 2024).

- `<meta name="viewport" content="width=device-width, initial-scale=1">` (3 pts)
- Responsive layout — no horizontal scroll (3 pts)
- Tap targets ≥ 48×48 CSS pixels (2 pts)
- Font sizes legible without zoom (2 pts)

### 6. Core Web Vitals (15 pts)

| Metric | Good | Needs Improvement | Poor |
|---|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s | 2.5–4.0s | > 4.0s |
| INP (Interaction to Next Paint) | < 200ms | 200–500ms | > 500ms |
| CLS (Cumulative Layout Shift) | < 0.1 | 0.1–0.25 | > 0.25 |

INP replaced FID in March 2024. Measures all interactions, not just first.

5 pts per metric. Estimate from page characteristics when CrUX data unavailable:
- LCP: check largest above-fold element, TTFB
- INP: check for heavy JS, long tasks >50ms, third-party scripts
- CLS: check for images without explicit dimensions, dynamically inserted content

### 7. Server-Side Rendering — CRITICAL FOR GEO (15 pts)

**AI crawlers do NOT execute JavaScript.** If content is client-side rendered, AI crawlers
see an empty page.

Assessment: fetch raw HTML with no JS execution. Compare to rendered DOM.

| Check | Points |
|---|---|
| Main content (headings, body text) in raw HTML | 8 |
| Meta tags + JSON-LD structured data in raw HTML | 4 |
| Internal navigation links in raw HTML | 3 |

If client-side rendered, recommend: Next.js/Remix (React), Nuxt (Vue), SvelteKit,
or Prerender.io for existing apps.

### 8. Page Speed & Server (15 pts)

- TTFB < 800ms (3 pts) — measure: `curl -o /dev/null -s -w 'TTFB: %{time_starttransfer}s\n' <url>`
- Page weight < 2MB, key pages < 1MB (2 pts)
- Images: WebP/AVIF, explicit dimensions, lazy load below fold (3 pts)
- JS bundles < 200KB compressed (2 pts)
- Compression: gzip/brotli enabled (2 pts)
- Cache-Control headers on static assets (2 pts)
- CDN in use (1 pt)

---

## Score Interpretation

| Range | Rating |
|---|---|
| 90–100 | Excellent — technically sound for SEO and GEO |
| 70–89 | Good — minor issues |
| 50–69 | Needs Work — significant technical debt |
| 30–49 | Poor — major issues blocking visibility |
| 0–29 | Critical — fundamental failures |

---

## Worker Return Format

```json
{
  "score": 51,
  "critical_3": [
    "Site is client-side rendered — AI crawlers see empty HTML body",
    "GPTBot blocked via User-agent: * Disallow: /",
    "LCP estimated at 4.2s — hero image 1.2MB uncompressed JPEG"
  ],
  "quick_wins_3": [
    "Enable SSR or prerendering — Next.js if already on React",
    "Add explicit GPTBot Allow: / to robots.txt",
    "Convert hero image to WebP, add width/height attributes, preload with rel=preload"
  ]
}
```
