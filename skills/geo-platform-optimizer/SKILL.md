---
name: geo-platform-optimizer
description: >
  AI platform-specific optimization analysis. Interprets the combined scores from other
  workers to produce per-platform readiness assessments for Google AI Overviews, ChatGPT,
  Perplexity, Gemini, and Bing Copilot. STUB: returns placeholder scores pending
  issue #2 redesign (input contract definition).
---

# GEO Platform Optimizer

## Purpose

Interpret how the other 7 worker scores translate to readiness on each AI search platform.
Each platform uses a different index, ranking logic, and source preference — a score
optimal for Google AI Overviews may be invisible on ChatGPT.

**This worker's domain:** AI platform-specific interpretation of worker outputs.
It does NOT re-run detection logic that belongs to other workers.

---

## ⚠️ STUB STATUS

This worker is a placeholder pending issue #2 resolution.

Issue #2 defines: which inputs from the 8 workers feed platform-specific analysis, and
how to avoid duplicating detection logic already owned by `geo-crawlers`, `geo-schema`,
`geo-brand-mentions`, etc.

**Current behaviour:** Returns estimated scores based on available worker inputs.
Platform-specific checklists below are reference methodology for the full implementation.

---

## Platform Priorities Reference

| Platform | #1 Signal | #2 Signal | #3 Signal |
|---|---|---|---|
| Google AI Overviews | Top-10 organic rank + Q&A structure | Tables/lists | Featured snippet readiness |
| ChatGPT Web Search | Wikipedia entity | Bing index coverage | Reddit mentions |
| Perplexity AI | Reddit presence | Original research | Content freshness |
| Google Gemini | YouTube content | Knowledge Panel | Schema.org |
| Bing Copilot | IndexNow | Bing WMT | LinkedIn |

---

## Input Contract (locked in issue #2)

This worker receives the outputs of the other 7 workers:

```json
{
  "citability": { "score": 72, "critical_3": [...], "quick_wins_3": [...] },
  "content": { "score": 55, ... },
  "technical": { "score": 68, ... },
  "crawlers": { "score": 80, ... },
  "schema": { "score": 45, ... },
  "llmstxt": { "score": 0, ... },
  "brand_mentions": { "score": 38, ... }
}
```

Platform scores are derived from these inputs — no additional HTTP requests.

---

## Worker Return Format

```json
{
  "score": 42,
  "critical_3": [
    "ChatGPT: No Wikipedia/Wikidata entity — brand not in ChatGPT knowledge graph",
    "Perplexity: No Reddit presence — top citation source for Perplexity missing",
    "Gemini: No YouTube channel — Gemini's primary differentiated citation source absent"
  ],
  "quick_wins_3": [
    "Create Wikidata entity to unlock ChatGPT entity recognition",
    "Engage authentically in 2-3 relevant subreddits for Perplexity visibility",
    "Launch YouTube channel with topic explainers for Gemini citation eligibility"
  ]
}
```
