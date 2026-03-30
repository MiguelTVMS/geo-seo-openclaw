# Worker: schema

## Task

Detect, validate, and assess JSON-LD structured data.

1. Fetch homepage + 2 inner pages raw HTML using
   `node {baseDir}/scripts/fetch-page.mjs --url <url>`.
2. Parse all `<script type="application/ld+json">` blocks.
3. Validate each block: valid JSON, valid `@type`, required properties present,
   sameAs links resolve.
4. Flag JS-injected schema (not in server-rendered HTML).
5. Flag deprecated schemas (SpecialAnnouncement, HowTo rich results, old VideoObject).
6. Assess sameAs coverage: how many platform URLs are linked?
7. Score using the rubric in `skills/geo-schema/SKILL.md`.
8. Identify the 3 most critical gaps.
9. Generate missing JSON-LD as quick wins.

## Return

```json
{
  "score": 0-100,
  "critical_3": ["specific gap with page URL", "..."],
  "quick_wins_3": ["Add Organization JSON-LD with sameAs...", "..."]
}
```

Quick wins that include generated JSON-LD: emit the code block inline in the
orchestrator output, after the score summary.

## Depth Presets

- **Full:** homepage + 3 pages, all schema types, sameAs audit
- **Quick:** homepage only, Organization + Article presence check
