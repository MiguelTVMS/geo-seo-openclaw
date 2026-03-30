---
name: geo-audit
description: >
  Full GEO audit orchestrator. Launches 8 parallel analysis workers, collects their
  results, computes a composite GEO Score (0-100), and outputs a prioritised action
  plan. Use for /geo audit and /geo quick. Does NO direct analysis — delegates everything
  to specialised workers.
---

# GEO Audit Orchestrator

## Purpose

This skill is the orchestration layer. It runs all 8 analysis workers in parallel and
synthesises their outputs into a single composite GEO Score with a prioritised action plan.
It never performs analysis itself.

---

## Orchestration Flow

### Phase 1: Discovery (Sequential)

1. Fetch homepage HTML using `scripts/fetch-page.mjs`.
2. Detect business type from page signals:

| Type | Signals |
|---|---|
| SaaS | Pricing page, "Sign up" / "Free trial" CTAs, `/app` or `/dashboard` subdomain |
| Local | Physical address, Google Maps embed, service area pages |
| E-commerce | Product listings, shopping cart, price displays |
| Publisher | Blog-heavy nav, article schema, author pages, bylines |
| Agency | Case studies, portfolio, team page, client logos |
| Other | Default |

3. Extract up to 50 page URLs from `/sitemap.xml` or internal links. Priority:
   - Homepage (always)
   - Top-level navigation pages
   - Key service/product/pricing pages
   - 5–10 most recent blog posts
4. Respect `robots.txt` — do not fetch disallowed paths.

### Phase 2: Parallel Workers

Launch all 8 workers simultaneously. Worker task specs are in `references/workers/`.

| Worker | Worker spec file | Domain |
|---|---|---|
| citability | `references/workers/citability.md` | Passage-level citation readiness |
| content | `references/workers/content.md` | E-E-A-T, author authority, freshness |
| technical | `references/workers/technical.md` | Core Web Vitals, SSR, mobile |
| crawlers | `references/workers/crawlers.md` | robots.txt AI crawler access |
| schema | `references/workers/schema.md` | JSON-LD detection, validation |
| llmstxt | `references/workers/llmstxt.md` | llms.txt presence, validity |
| platform-optimizer | `references/workers/platform-optimizer.md` | Platform score interpretation (STUB) |
| brand-mentions | `references/workers/brand-mentions.md` | Off-site brand signals (STUB) |

Each worker returns:
```json
{
  "score": 0-100,
  "critical_3": ["issue 1", "issue 2", "issue 3"],
  "quick_wins_3": ["win 1", "win 2", "win 3"]
}
```

If a worker fails (timeout, blocked, parse error):
```json
{
  "score": null,
  "critical_3": ["Worker failed: <reason>"],
  "quick_wins_3": []
}
```

### Phase 3: Synthesis

**Composite GEO Score:**
```
GEO_Score = (citability * 0.25) + (brand * 0.20) + (content * 0.20)
          + (technical * 0.15) + (schema * 0.10) + (platform * 0.10)
```

Workers with `score: null` are excluded from the weighted average; weights are
redistributed proportionally across available scores.

**Merged critical issues:** Combine all `critical_3` arrays, deduplicate, re-rank by
severity. Output top 5.

**Merged quick wins:** Combine all `quick_wins_3` arrays, deduplicate, re-rank by
impact-to-effort ratio. Output top 5.

---

## Depth Presets

| Command | Preset | Behaviour |
|---|---|---|
| `/geo audit <url>` | Full | All workers, full checks, up to 50 pages |
| `/geo quick <url>` | Quick | Same workers, shallower: max 5 pages, 3 citability samples, skip slow external lookups |

Same output structure for both. Quick omits the 30-day action plan section.

---

## Score Interpretation

| Range | Rating |
|---|---|
| 90–100 | Excellent — top-tier GEO; highly likely to be cited by AI |
| 75–89 | Good — strong foundation, specific gaps to address |
| 60–74 | Fair — moderate GEO presence, significant opportunities |
| 40–59 | Poor — weak signals; AI may not recognise the site as citable |
| 0–39 | Critical — minimal optimisation; largely invisible to AI |

---

## Output Format (inline, no file writes)

```
# GEO Audit: [Site Name]
Date: [Date] | URL: [URL] | Business Type: [Type] | Pages analysed: [N]

## Overall GEO Score: [X]/100 ([Rating])

[2-3 sentence executive summary]

### Score Breakdown
| Category        | Score   | Weight | Weighted |
|---|---|---|---|
| AI Citability   | [X]/100 | 25%    | [X]      |
| Brand Authority | [X]/100 | 20%    | [X]      |
| Content E-E-A-T | [X]/100 | 20%    | [X]      |
| Technical GEO   | [X]/100 | 15%    | [X]      |
| Schema          | [X]/100 | 10%    | [X]      |
| Platform Optim. | [X]/100 | 10%    | [X]      |
| **Overall**     |         |        | **[X]**  |

## Top Critical Issues
1. [Issue — specific, with page URL where relevant]
2. [Issue]
3. [Issue]
4. [Issue]
5. [Issue]

## Top Quick Wins
1. [Specific, actionable, single-sentence]
2. [Win]
3. [Win]
4. [Win]
5. [Win]

## 30-Day Action Plan (Full audit only)
### Week 1: [Theme]
- [ ] Action
- [ ] Action

### Week 2: [Theme]
...
```
