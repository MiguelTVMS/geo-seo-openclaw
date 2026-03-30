# Worker: citability

## Task

Analyse the target URL for passage-level AI citation readiness.

1. Run `node {baseDir}/scripts/citability-scorer.mjs --url <url>`.
2. Interpret the JSON output using the scoring rubric in `skills/geo-citability/SKILL.md`.
3. Identify the 3 most critical issues affecting passage extractability.
4. Identify the 3 highest-impact quick wins.

## Return

```json
{
  "score": 0-100,
  "critical_3": ["specific issue with page URL if relevant", "..."],
  "quick_wins_3": ["specific actionable fix", "..."]
}
```

On fatal error (script fails, URL unreachable):
```json
{
  "score": null,
  "critical_3": ["Worker failed: <reason>"],
  "quick_wins_3": []
}
```

## Depth Presets

- **Full:** analyse all sampled pages, score all content blocks
- **Quick:** analyse homepage + 2 key pages only, score H2-level blocks only
