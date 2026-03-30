---
name: geo-content
description: >
  E-E-A-T content quality assessment. Evaluates Experience, Expertise, Authoritativeness,
  and Trustworthiness signals at page level. Also assesses content freshness, topical
  authority, and AI content quality. Invoked directly via /geo content or as a parallel
  worker in /geo audit.
---

# GEO Content Quality & E-E-A-T Assessor

## Purpose

AI search platforms evaluate whether content deserves to be cited. E-E-A-T (Experience,
Expertise, Authoritativeness, Trustworthiness) per Google's Dec 2025 Quality Rater
Guidelines update now applies to ALL competitive queries.

**This worker's domain:** page-level E-E-A-T, author authority, content freshness,
topical depth, and content structure quality.
Passage-level citability scoring (extractability) is handled by `geo-citability`.

---

## E-E-A-T Scoring (0–100)

| Dimension | Weight |
|---|---|
| Experience | 25% |
| Expertise | 25% |
| Authoritativeness | 25% |
| Trustworthiness | 25% |

Topical Authority Modifier: +10 (dominant) to −5 (thin). Final score capped at 100.

### Experience (25 pts)

Signals of first-hand knowledge:

| Signal | Max pts |
|---|---|
| First-person accounts ("I tested...", "We implemented...") | 5 |
| Original research or data not available elsewhere | 5 |
| Case studies with specific results and numbers | 4 |
| Screenshots, photos, or evidence of direct use | 3 |
| Specific examples from personal experience | 4 |
| Demonstrations of process (not just outcome) | 4 |

**Weak Experience flags:** only summarises other sources, generic advice applicable to
any situation, no mention of direct usage, hedging language ("reportedly", "some say").

### Expertise (25 pts)

| Signal | Max pts |
|---|---|
| Author credentials visible (bio, degrees, certs) | 5 |
| Technical depth appropriate to topic | 5 |
| Methodology explanation (how conclusions were reached) | 4 |
| Data-backed claims with named sources | 4 |
| Industry-specific terminology used correctly | 3 |
| Author page with detailed professional background | 4 |

**Weak Expertise flags:** claims without evidence, surface-level coverage, no visible
author, misuse of technical terms.

### Authoritativeness (25 pts)

| Signal | Max pts |
|---|---|
| Inbound citations from authoritative sources | 5 |
| Author quoted or cited in press/media | 4 |
| Industry awards or recognition | 3 |
| Speaker credentials (conferences, events) | 3 |
| Published in peer-reviewed or respected outlets | 4 |
| Comprehensive topic coverage (topical authority) | 3 |
| Brand mentioned on Wikipedia or authoritative refs | 3 |

### Trustworthiness (25 pts)

| Signal | Max pts |
|---|---|
| Contact information visible (address, phone, email) | 4 |
| Privacy policy present and linked | 2 |
| Terms of service present | 1 |
| HTTPS with valid cert | 2 |
| Editorial standards or corrections policy | 3 |
| Transparent about business model and conflicts | 3 |
| Verified reviews/testimonials | 3 |
| Accurate claims (no detectable misinformation) | 4 |
| Clear affiliate/sponsorship disclosures | 3 |

---

## Content Quality Checks

### Word Count Benchmarks (floors, not targets)

| Page Type | Minimum | Ideal |
|---|---|---|
| Homepage | 500 | 500–1,500 |
| Blog post | 1,500 | 1,500–3,000 |
| Pillar / ultimate guide | 2,000 | 2,500–5,000 |
| Service page | 500 | 800–2,000 |
| About page | 300 | 500–1,000 |

### Paragraph Structure for AI Parsing

- 2–4 sentences per paragraph
- One idea per paragraph
- Lead with key claim in first sentence
- Each paragraph quotable in isolation

### Heading Structure

- One H1 per page
- H2 for major sections, H3 for subsections
- No skipped levels
- Question-based headings where appropriate ("How does X work?")

### Content Freshness

| Currency | Status |
|---|---|
| Updated within 3 months | Excellent |
| Updated within 6 months | Good |
| Updated within 12 months | Acceptable |
| 12–24 months ago | Warning |
| No date or 24+ months | Critical |

---

## AI-Generated Content Quality

AI-produced content is acceptable (Google March 2024) when it shows genuine E-E-A-T.

**Low-quality AI content flags:**
- Generic phrasing: "In today's fast-paced world...", "It's important to note..."
- No original insight — only rephrases widely available information
- Perfect structure with shallow content beneath headings
- Repetitive conclusions, hedging overload ("generally speaking", "it depends on factors")
- Zero first-person examples, no data, no named sources

**High-quality signals regardless of production method:**
- Original data (surveys, benchmarks, experiments)
- Named specific examples (companies, dates, numbers)
- Contrarian or nuanced views backed by reasoning
- Practical, specific recommendations with acknowledged trade-offs

---

## Topical Authority Modifier

| Level | Criteria | Modifier |
|---|---|---|
| Authority | 20+ pages covering topic comprehensively, strong internal linking clusters | +10 |
| Developing | 10–20 pages, some clustering | +5 |
| Emerging | 5–10 pages, limited clustering | +0 |
| Thin | < 5 pages, no clustering | −5 |

---

## Score Interpretation

| Range | Rating |
|---|---|
| 85–100 | Exceptional — strong AI citation candidate |
| 70–84 | Good — solid foundation |
| 55–69 | Average — multiple E-E-A-T gaps |
| 40–54 | Below Average — significant content issues |
| 0–39 | Poor — fundamental overhaul needed |

---

## Worker Return Format

```json
{
  "score": 44,
  "critical_3": [
    "No author attribution on any content page — AI systems cannot assess expertise",
    "All blog posts lack publication dates — treated as stale by freshness-sensitive AI platforms",
    "About page 87 words — insufficient for trust signals or expertise demonstration"
  ],
  "quick_wins_3": [
    "Add author byline with credentials to all blog posts",
    "Add datePublished and dateModified to every content page (visible + schema)",
    "Expand About page to 500+ words: founding story, team credentials, mission"
  ]
}
```
