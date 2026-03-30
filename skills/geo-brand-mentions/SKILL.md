---
name: geo-brand-mentions
description: >
  Off-site brand presence scanner. Checks brand visibility across YouTube, Reddit,
  Wikipedia/Wikidata, and LinkedIn — the platforms AI systems weight most for entity
  recognition and citation decisions. STUB: Wikipedia API and YouTube detection are
  functional; Reddit and LinkedIn require search fallbacks. See issue #3.
---

# GEO Brand Mentions Scanner

## Purpose

Measure off-site brand signals that AI systems use for entity recognition and citation
decisions. Brand mentions on high-signal platforms (YouTube, Reddit, Wikipedia) correlate
3× more strongly with AI visibility than traditional backlinks (Ahrefs Dec 2025, 75K brands).

**This worker's domain:** off-site brand signals only.
On-site E-E-A-T and author authority are handled by `geo-content`.
Platform-specific AI search optimisation is handled by `geo-platform-optimizer`.

---

## ⚠️ STUB STATUS

This worker is partially implemented. Current detection capabilities:

| Platform | Detection Method | Status |
|---|---|---|
| Wikipedia | Wikipedia API + Wikidata API | ✅ Functional |
| YouTube | Channel URL pattern check | ✅ Functional |
| Reddit | Web search fallback | ⚠️ Approximate |
| LinkedIn | Web search fallback | ⚠️ Approximate |

See issue #3 for the full detection model design decision.

---

## Script

```bash
node {baseDir}/scripts/brand-scanner.mjs --url <url> --brand "<brand name>"
```

Outputs JSON to stdout:
```json
{
  "brand": "Acme Corp",
  "platforms": {
    "youtube": { "status": "confirmed|inconclusive|not_found", "url": "...", "notes": "..." },
    "reddit": { "status": "confirmed|inconclusive|not_found", "url": "...", "notes": "..." },
    "wikipedia": { "status": "confirmed|inconclusive|not_found", "url": "...", "notes": "..." },
    "linkedin": { "status": "confirmed|inconclusive|not_found", "url": "...", "notes": "..." }
  }
}
```

Status values:
- `confirmed` — HTTP check or API returned positive match
- `inconclusive` — search indicates presence but could not verify directly
- `not_found` — no presence detected

---

## Platform Weights

| Platform | Weight | Correlation with AI citation |
|---|---|---|
| YouTube | 25% | ~0.737 (Ahrefs Dec 2025) — strongest signal |
| Reddit | 25% | High — heavily indexed in AI training data |
| Wikipedia | 20% | High — primary entity recognition source |
| LinkedIn | 15% | Moderate — professional authority |
| Other (Quora, GitHub, news, HN) | 15% | Supplementary |

---

## Scoring (0–100)

Brand_Authority_Score = (YouTube × 0.25) + (Reddit × 0.25) + (Wikipedia × 0.20)
                       + (LinkedIn × 0.15) + (Other × 0.15)

### Per-Platform Score Guide

**YouTube (0–100):**
- 90–100: Active channel 10K+ subscribers, 20+ third-party mentions
- 50–69: Channel exists, 5–9 third-party mentions
- 0–9: No YouTube presence

**Reddit (0–100):**
- 90–100: Frequently recommended in subreddits, positive sentiment, active official presence
- 50–69: Mentioned in several threads, brand recognised by community
- 0–9: No Reddit presence

**Wikipedia (0–100):**
- 90–100: Detailed article (B-class+), Wikidata entry with complete properties
- 50–69: Article exists (stub), basic Wikidata entry
- 0–9: No Wikipedia or Wikidata presence

**LinkedIn (0–100):**
- 90–100: 10K+ followers, leadership posts thought leadership, frequent third-party mentions
- 50–69: 1K+ followers, irregular posting
- 0–9: No company page

---

## Worker Return Format

```json
{
  "score": 38,
  "critical_3": [
    "No Wikipedia article — AI systems may not recognise brand as a distinct entity",
    "No Wikidata entry — missing from AI knowledge graphs",
    "YouTube channel not found — strongest AI citation signal absent"
  ],
  "quick_wins_3": [
    "Create Wikidata entity with official website, founding date, and LinkedIn URL",
    "Launch YouTube channel with 3 explainer videos on core topics",
    "Ensure brand is mentioned authentically in 2-3 relevant subreddits"
  ]
}
```
