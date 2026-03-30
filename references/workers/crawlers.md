# Worker: crawlers

## Task

Map AI crawler access from robots.txt and page-level directives.

1. Fetch `[domain]/robots.txt`.
2. For each AI crawler in the reference table in `skills/geo-crawlers/SKILL.md`, determine
   effective access: explicit Allow / explicit Disallow / wildcard inheritance.
3. Sample 3 key pages for `<meta name="robots">` and `X-Robots-Tag` headers.
4. Check for `noai`, `noimageai` directives.
5. Check for `Sitemap:` directive.
6. Score using the crawler access rubric.
7. Identify the 3 most critical blocks (Tier 1 crawlers always rank as Critical).
8. Generate specific robots.txt fix lines as quick wins.

## Return

```json
{
  "score": 0-100,
  "critical_3": ["GPTBot blocked via User-agent: * Disallow: /", "..."],
  "quick_wins_3": ["Add 'User-agent: GPTBot\\nAllow: /' to robots.txt", "..."]
}
```

## Depth Presets

- **Full:** full crawler reference table, meta tag + header checks on 3 pages
- **Quick:** Tier 1 crawlers only, robots.txt only (skip meta/header checks)
