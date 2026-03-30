# Worker: content

## Task

Evaluate E-E-A-T content quality at page level.

1. Fetch homepage + 3 key content pages using `node {baseDir}/scripts/fetch-page.mjs --url <url>`.
2. Score each page across Experience, Expertise, Authoritativeness, and Trustworthiness
   using the rubric in `skills/geo-content/SKILL.md`.
3. Assess topical authority modifier.
4. Identify the 3 most critical E-E-A-T failures.
5. Identify the 3 highest-impact quick wins.

## Return

```json
{
  "score": 0-100,
  "critical_3": ["specific issue with page URL if relevant", "..."],
  "quick_wins_3": ["specific actionable fix", "..."]
}
```

## Depth Presets

- **Full:** homepage + 5 content pages, full E-E-A-T rubric, topical authority modifier
- **Quick:** homepage + 1 blog post, Experience and Expertise dimensions only
