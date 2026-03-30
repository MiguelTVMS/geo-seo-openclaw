# Worker: technical

## Task

Audit technical SEO health with GEO-specific focus.

1. Fetch `[domain]/robots.txt`.
2. Fetch homepage raw HTML using `node {baseDir}/scripts/fetch-page.mjs --url <url>`.
3. Check HTTP response headers for security directives.
4. Assess SSR status: compare raw HTML content to expected rendered output.
5. Estimate Core Web Vitals from page characteristics (LCP element, JS bundle size, image formats, explicit dimensions).
6. Score all 8 categories using the rubric in `skills/geo-technical/SKILL.md`.
7. Identify the 3 most critical issues. SSR failures and AI crawler blocks always rank as Critical.
8. Identify the 3 highest-impact quick wins.

## Return

```json
{
  "score": 0-100,
  "critical_3": ["specific issue", "..."],
  "quick_wins_3": ["specific fix", "..."]
}
```

## Depth Presets

- **Full:** homepage + 3 inner pages, all 8 categories
- **Quick:** homepage only, SSR check + AI crawler access + HTTPS only
