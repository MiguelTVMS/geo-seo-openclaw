# Worker: brand-mentions

## ⚠️ STUB — see issue #3

Detection capabilities are partial. Wikipedia and YouTube are functional.
Reddit and LinkedIn use search fallbacks.

## Task

Measure off-site brand presence on AI-weighted platforms.

1. Extract brand name from site homepage (title, OG tags, or H1).
2. Run `node {baseDir}/scripts/brand-scanner.mjs --url <url> --brand "<name>"`.
3. Score each platform using the rubric in `skills/geo-brand-mentions/SKILL.md`.
4. Compute weighted Brand Authority Score.
5. Identify the 3 most critical gaps.
6. Identify the 3 highest-impact quick wins.

## Return

```json
{
  "score": 0-100,
  "critical_3": ["No Wikipedia article — brand not an AI-recognised entity", "..."],
  "quick_wins_3": ["Create Wikidata entity with official website and LinkedIn", "..."]
}
```

## Depth Presets

- **Full:** all platforms (YouTube, Reddit, Wikipedia, LinkedIn, supplementary)
- **Quick:** Wikipedia + YouTube only (highest correlation with AI citation)
