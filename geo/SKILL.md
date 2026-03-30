---
name: geo
description: >
  GEO analysis tool. Audits websites for AI search visibility across ChatGPT, Claude,
  Perplexity, Gemini, and Google AI Overviews. Scores citability, AI crawler access,
  llms.txt, brand signals, schema markup, technical health, and E-E-A-T content quality.
  Adapted from geo-seo-claude by Zubair Trabzada. Use when user says "geo", "seo",
  "audit", "AI search", "AI visibility", "citability", "llms.txt", "schema", "brand
  mentions", or any URL for analysis.
---

# GEO — Generative Engine Optimization Analysis

> **Philosophy:** GEO-first, SEO-supported. AI search is eating traditional search.
> Optimize for where traffic is going.

---

## Commands

| Command | What It Does | Target Time |
|---|---|---|
| `/geo audit <url>` | Full GEO audit — all 8 workers in parallel, composite score | 3–5 min |
| `/geo quick <url>` | Same methodology, shallower checks — fewer pages, reduced sample sizes | ~60s |
| `/geo citability <url>` | Passage-level AI citation readiness | — |
| `/geo crawlers <url>` | AI crawler access map from robots.txt | — |
| `/geo llmstxt <url>` | Validate existing or generate new llms.txt | — |
| `/geo brands <url>` | Off-site brand presence (YouTube, Reddit, Wikipedia, LinkedIn) | — |
| `/geo schema <url>` | JSON-LD detection, validation, and generation | — |
| `/geo technical <url>` | Core Web Vitals, SSR, mobile, crawlability | — |
| `/geo content <url>` | E-E-A-T, author authority, freshness, topical depth | — |
| `/geo platforms <url>` | AI platform-specific score interpretation | — |

---

## Scoring Methodology

All categories feed the composite GEO Score (0–100):

| Category | Weight | Sub-skill |
|---|---|---|
| AI Citability | 25% | `skills/geo-citability/` |
| Brand Authority | 20% | `skills/geo-brand-mentions/` |
| Content E-E-A-T | 20% | `skills/geo-content/` |
| Technical GEO | 15% | `skills/geo-technical/` |
| Schema & Structured Data | 10% | `skills/geo-schema/` |
| Platform Optimization | 10% | `skills/geo-platform-optimizer/` |

---

## Sub-Skills (9 Components)

| Sub-skill | Directory | Domain |
|---|---|---|
| geo-audit | `skills/geo-audit/` | Orchestration — synthesises all 8 worker outputs |
| geo-citability | `skills/geo-citability/` | Passage-level AI citation readiness |
| geo-crawlers | `skills/geo-crawlers/` | AI crawler access, robots.txt |
| geo-llmstxt | `skills/geo-llmstxt/` | llms.txt presence, validity, generation |
| geo-brand-mentions | `skills/geo-brand-mentions/` | Off-site brand signals (STUB — see issue #3) |
| geo-platform-optimizer | `skills/geo-platform-optimizer/` | AI platform interpretation (STUB — see issue #2) |
| geo-schema | `skills/geo-schema/` | JSON-LD detection, validation, generation |
| geo-technical | `skills/geo-technical/` | Core Web Vitals, SSR, mobile, security |
| geo-content | `skills/geo-content/` | E-E-A-T, author authority, freshness |

---

## Inline Artifact Policy

Generated artefacts (llms.txt, JSON-LD snippets, robots.txt patches) are **displayed as
code blocks in the conversation**. The user copies and deploys them. No file writes to disk
unless explicitly requested.

---

## Market Context

| Metric | Value |
|---|---|
| AI-referred session growth | +527% (Jan–May 2025, SparkToro) |
| AI traffic conversion vs organic | 4.4x higher |
| Google AI Overviews reach | 1.5B users/month |
| ChatGPT weekly active users | 900M+ |
| Perplexity monthly queries | 500M+ |
| Brand mentions vs backlinks for AI | 3x stronger correlation (Ahrefs Dec 2025) |

---

## Quality Gates

- **Crawl limit:** Max 50 pages per audit
- **Timeout:** 30 seconds per page fetch
- **Rate limiting:** 1-second delay between requests
- **Robots.txt:** Always respect
