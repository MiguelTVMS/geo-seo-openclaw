---
name: geo-schema
description: >
  JSON-LD structured data detection, validation, and generation. Checks for schema
  completeness, sameAs coverage, and GEO-critical markup. Generated JSON-LD is emitted
  as inline code blocks — not written to disk. Invoked directly via /geo schema or as
  a parallel worker in /geo audit.
---

# GEO Schema & Structured Data

## Purpose

Structured data is how AI models understand what an entity IS and how it connects to
other entities. Strong `sameAs` links and a complete `Organization` schema are the
fastest path to entity recognition across all AI platforms.

**This worker's domain:** JSON-LD detection, validation, and generation.
Platform-specific interpretation of schema scores is handled by `geo-platform-optimizer`.

---

## Detection

Parse `<script type="application/ld+json">` blocks from page HTML (server-rendered only
— JS-injected schema has delayed processing per Google Dec 2025 guidance, flag this).

Also check for Microdata and RDFa — recommend migration to JSON-LD if found exclusively.

---

## GEO-Critical Schema Types

### Organization (every business site — CRITICAL)

**Required:** `@type`, `name`, `url`, `logo`

**Recommended for GEO:**
- `sameAs` — array of all platform URLs (see sameAs strategy below)
- `description` — 1–2 sentences
- `foundingDate` — ISO 8601
- `founder` — Person schema
- `knowsAbout` — array of expertise topics (strong GEO signal)
- `contactPoint`

### Article + Author (publishers — CRITICAL)

Article: `headline`, `datePublished`, `dateModified`, `author`, `publisher`, `image`

Author (Person) for GEO:
- `name`, `url`, `sameAs` (LinkedIn, personal site, Google Scholar)
- `jobTitle`, `worksFor`, `knowsAbout`, `alumniOf`

### Business-type specific

| Type | Schema |
|---|---|
| SaaS | `SoftwareApplication` with `featureList`, `aggregateRating` |
| Local | `LocalBusiness` with `address`, `geo`, `openingHoursSpecification` |
| E-commerce | `Product` with `offers`, `aggregateRating`, `brand` |
| Publisher | `Article`/`NewsArticle` + `Person` (author) + `WebSite` |

### FAQPage

Google restricted FAQPage rich results to health/govt since Aug 2023. Still implement
it — AI platforms parse FAQPage schema for Q&A extraction.

### WebSite + SearchAction (always on homepage)

```json
{
  "@type": "WebSite",
  "url": "https://example.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {"@type": "EntryPoint", "urlTemplate": "https://example.com/search?q={search_term_string}"},
    "query-input": "required name=search_term_string"
  }
}
```

### speakable (articles)

```json
"speakable": {
  "@type": "SpeakableSpecification",
  "cssSelector": [".article-summary", ".key-takeaway"]
}
```

Marks content as suitable for AI assistant voice citation.

---

## sameAs Strategy (CRITICAL for entity recognition)

Priority order:
1. Wikipedia article
2. Wikidata item (`https://www.wikidata.org/wiki/Q...`)
3. LinkedIn company/personal page
4. YouTube channel
5. Twitter/X
6. Crunchbase (tech/startups)
7. GitHub (developer brands)
8. Google Scholar / ORCID (researchers)
9. Industry-specific directories

Verify each URL resolves (200) before including. Audit for inconsistent entity data
(name, founding date, leadership) across platforms.

---

## Deprecated Schemas to Flag

| Schema | Status |
|---|---|
| HowTo rich results | Deprecated Aug 2023 — content still useful for AI parsing |
| SpecialAnnouncement | Deprecated 2023 (COVID) — remove if present |
| VideoObject `contentUrl` | Must point to video file, not page URL (2024) |

---

## Scoring (0–100)

| Criterion | Points |
|---|---|
| Organization/Person schema present and complete | 15 |
| sameAs links (5+ valid platforms) | 15 (3 pts each, max 15) |
| Article schema with full author details | 10 |
| Business-type-specific schema | 10 |
| WebSite + SearchAction | 5 |
| BreadcrumbList on inner pages | 5 |
| JSON-LD format (not Microdata/RDFa) | 5 |
| Server-rendered (not JS-injected) | 10 |
| speakable on articles | 5 |
| Valid JSON + valid Schema.org types | 10 |
| knowsAbout on Organization/Person | 5 |
| No deprecated schemas | 5 |

---

## Worker Return Format

```json
{
  "score": 45,
  "critical_3": [
    "No Organization schema on homepage — AI systems cannot identify the entity",
    "No sameAs links — entity not connected to any external platform",
    "Article pages missing dateModified — AI systems treat content as stale"
  ],
  "quick_wins_3": [
    "Add Organization JSON-LD with sameAs linking to LinkedIn, YouTube, and Wikipedia",
    "Add dateModified to all Article schemas",
    "Add speakable CSS selectors to article schema pointing to intro paragraph"
  ]
}
```

When generating JSON-LD, emit as fenced code block with `json` syntax highlighting.
Use `@graph` pattern to combine multiple schemas in one block. All URLs absolute.
Place in `<head>` — never JS-injected.
