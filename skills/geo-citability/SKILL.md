---
name: geo-citability
description: >
  Passage-level AI citation readiness. Scores content blocks for how likely AI systems
  (ChatGPT, Claude, Perplexity, Gemini) are to extract and cite them verbatim. Produces
  a citability score (0-100) with specific rewrite suggestions per block. Invoked
  directly via /geo citability or as a parallel worker in /geo audit.
---

# GEO Citability Scorer

## Purpose

Score individual content passages for AI citation readiness. A passage is citable when
it is self-contained, answer-first, fact-dense, and within the 134–167 word optimal
extraction range (Bortolato 2025 analysis of AI Overview passages).

**This worker's domain:** passage-level extractability only.
Content quality (E-E-A-T) is handled by `geo-content`.

---

## Script

```bash
node {baseDir}/scripts/citability-scorer.mjs --url <url>
```

Outputs JSON to stdout:
```json
{
  "url": "https://...",
  "overall_score": 72,
  "blocks": [
    {
      "heading": "What is a CDN?",
      "word_count": 58,
      "score": 88,
      "weaknesses": []
    }
  ]
}
```

---

## Scoring Rubric (0–100)

| Category | Weight | What It Measures |
|---|---|---|
| Answer Block Quality | 30% | Direct, answer-first structure |
| Passage Self-Containment | 25% | Can be extracted without surrounding context |
| Structural Readability | 20% | Heading hierarchy, paragraph length, lists, tables |
| Statistical Density | 15% | Specific data points and named sources |
| Uniqueness | 10% | Original insight not available elsewhere |

### Answer Block Quality (30 pts)

Score 90–100: Every section opens with a direct 1–2 sentence answer. Uses "X is..." or
"X refers to..." patterns. First 40–60 words stand alone as a complete answer.

Score 50–69: Some answer-like openings, many bury the answer mid-paragraph.

Score 0–29: No identifiable answer blocks. Entirely narrative or conversational.

**High-citability example:**
> Content delivery networks (CDNs) are distributed server systems that cache and serve
> web content from locations geographically close to end users. A CDN reduces latency
> by 50–70% on average. The three largest CDN providers as of 2025 are Cloudflare
> (~20% of all websites), Amazon CloudFront, and Akamai Technologies.

**Low-citability example:**
> If you've ever wondered why some websites load faster than others, the answer might
> surprise you. There's this amazing technology that has been around for a while now.

### Passage Self-Containment (25 pts)

Checklist per block:
1. Does it explicitly name the subject (not "it", "this", "they")?
2. Can someone understand the main point reading ONLY this passage?
3. Does it contain at least one specific fact, statistic, or named entity?
4. Is it between 50–200 words?
5. Does it avoid starting with conjunctions ("But", "However") that imply prior context?

Score 90–100: 80%+ of blocks pass all 5 checks.
Score 0–29: Under 20% self-contained.

### Structural Readability (20 pts)

- Clean H1 > H2 > H3 hierarchy, no skipped levels
- Question-based headings for informational content
- Paragraphs: 2–4 sentences
- Tables for any comparison of 3+ items
- Ordered lists for sequential processes, unordered for features/options

### Statistical Density (15 pts)

Score 90–100: 5+ specific statistics per 500 words, all claims backed by named sources
or dates, exact numbers not vague quantifiers.

What counts: percentages, dollar amounts, timeframes, named studies, specific counts,
before/after comparisons.

What does NOT count: "Many companies use...", "A significant percentage...",
"Studies show..." (no named source).

### Uniqueness (10 pts)

Score 90–100: Contains first-party research, proprietary data, original surveys, or
analysis not found elsewhere.

---

## Worker Return Format

```json
{
  "score": 72,
  "critical_3": [
    "Homepage hero section buries answer — no direct first sentence in 6 of 8 blocks",
    "Blog posts average 23 words per paragraph (too short; lacks supporting evidence)",
    "Zero statistics with named sources across sampled pages"
  ],
  "quick_wins_3": [
    "Rewrite H2 openings to lead with definition pattern: 'X is...'",
    "Add 3 specific data points with citations to /services page",
    "Convert the 4-paragraph comparison section into a table"
  ]
}
```

---

## Research Reference

- Optimal extraction length: 134–167 words (Bortolato 2025)
- Definition patterns increase citation rate by 2.1x (Georgia Tech 2024)
- Adding statistics to passages increases citation by 40% (Princeton GEO study 2024)
- Fluency optimisation increases visibility by 30% on average (IIT Delhi 2024)
