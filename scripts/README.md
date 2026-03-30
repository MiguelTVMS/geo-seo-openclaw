# scripts/

Node.js ESM analysis scripts for geo-seo-openclaw.

## Requirements

- Node >= 22.14.0
- Run `npm install` from the skill root before using any script

## Scripts

| Script | Purpose | Input | Output |
|---|---|---|---|
| `fetch-page.mjs` | Fetch a URL and assess SSR status | `--url <url>` | JSON: `{ html, structured_data[], headers, ssr_score }` |
| `citability-scorer.mjs` | Score passage-level AI citation readiness | `--url <url>` | JSON: `{ url, overall_score, blocks[] }` |
| `llmstxt-generator.mjs` | Validate or generate llms.txt | `--url <url> --mode validate\|generate` | JSON: `{ status, score, issues[], generated }` |
| `brand-scanner.mjs` | Off-site brand presence detection | `--url <url> --brand "<name>"` | JSON: `{ brand, platforms: { youtube, reddit, wikipedia, linkedin } }` |

## Invocation

All scripts output JSON to stdout. Errors are written to stderr with exit code 1.

```bash
node scripts/fetch-page.mjs --url https://example.com
node scripts/citability-scorer.mjs --url https://example.com
node scripts/llmstxt-generator.mjs --url https://example.com --mode validate
node scripts/llmstxt-generator.mjs --url https://example.com --mode generate
node scripts/brand-scanner.mjs --url https://example.com --brand "Acme Corp"
```

## OpenClaw path resolution

In skill SKILL.md files, scripts are referenced as:
```
node {baseDir}/scripts/<script-name>.mjs
```

`{baseDir}` is injected by OpenClaw at runtime as the absolute path to the skill root directory.

## Tests

```bash
npm test
# or directly:
node --test tests/**/*.test.mjs
```

Tests use the Node 22 built-in test runner (`node:test`). No Jest, no Mocha.
