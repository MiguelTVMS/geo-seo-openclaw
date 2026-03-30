# geo-seo-openclaw — Worker Contract (OpenClaw / Codex)

## What This File Is

This file defines the **runtime worker contract** for the geo-seo-openclaw skill. It describes how OpenClaw orchestrates parallel analysis workers, what each worker returns, and what the orchestrator does with those results.

For developer setup, tooling, git workflow, and coding conventions — see `CLAUDE.md`.

---

## Worker Architecture

`/geo audit` launches 8 parallel analysis workers. Each worker is independent, analyses the target URL, and returns a standardised result. The `geo-audit` orchestrator waits for all workers then synthesises a composite GEO score and prioritised action list.

### Worker Output Contract

Every worker returns exactly this structure:

```json
{
  "score": 72,
  "critical_3": [
    "GPTBot is blocked in robots.txt",
    "No llms.txt file found",
    "No author credentials on any content page"
  ],
  "quick_wins_3": [
    "Add Allow: /GPTBot in robots.txt",
    "Create /llms.txt pointing to top 10 content pages",
    "Add author bio with credentials to 3 key blog posts"
  ]
}
```

- `score`: integer 0-100
- `critical_3`: top 3 highest-severity issues — be specific, include page URLs where relevant
- `quick_wins_3`: top 3 low-effort, high-impact fixes — actionable, single-sentence

If a worker encounters a fatal error (timeout, blocked, parse failure), it returns:

```json
{
  "score": null,
  "critical_3": ["Worker failed: <reason>"],
  "quick_wins_3": []
}
```

---

## Worker Roster

| Worker | Sub-skill directory | Owns |
|---|---|---|
| `citability` | `skills/geo-citability/` | Passage-level extractability — scores content blocks for AI citation readiness |
| `content` | `skills/geo-content/` | E-E-A-T — expertise signals, author authority, freshness, topical depth |
| `technical` | `skills/geo-technical/` | Core Web Vitals, HTTPS, mobile, SSR/CSR detection |
| `crawlers` | `skills/geo-crawlers/` | robots.txt parsing — AI bot allow/block map |
| `schema` | `skills/geo-schema/` | JSON-LD detection, validation, generation |
| `llmstxt` | `skills/geo-llmstxt/` | llms.txt presence, validity, and generation |
| `platform-optimizer` | `skills/geo-platform-optimizer/` | AI platform-specific score interpretation (**STUB** — see issue #2) |
| `brand-mentions` | `skills/geo-brand-mentions/` | Off-site brand presence detection (**STUB** — see issue #3) |

---

## Orchestrator Behaviour (geo-audit)

`geo-audit` is the only worker that does not analyse directly. It:

1. Accepts the target URL
2. Launches all 8 workers in parallel
3. Waits for all results (or timeout)
4. Computes the composite GEO score using weighted average:

| Worker | Weight |
|---|---|
| citability | 25% |
| brand-mentions | 20% |
| content | 20% |
| technical | 15% |
| schema | 10% |
| platform-optimizer | 10% |

5. Merges all `critical_3` arrays, deduplicates, re-ranks by severity
6. Merges all `quick_wins_3` arrays, deduplicates, re-ranks by impact/effort ratio
7. Outputs composite score, merged critical issues, merged quick wins, and per-worker score breakdown

---

## Depth Presets

| Command | Preset | Target time | Behaviour |
|---|---|---|---|
| `/geo audit <url>` | Full | 3-5 min | All workers, full checks |
| `/geo quick <url>` | Quick | ~60s | Same workers, shallower checks — fewer pages crawled, lower citability sample size, skip slow external lookups |

Quick and Full use identical output structure. The only difference is check depth.

---

## Script Invocation

Workers call Node.js scripts for analysis. Scripts output JSON to `stdout`.

```bash
# Fetch a page (used by multiple workers)
node {baseDir}/scripts/fetch-page.mjs --url <url>

# Score passage citability
node {baseDir}/scripts/citability-scorer.mjs --url <url>

# Validate or generate llms.txt
node {baseDir}/scripts/llmstxt-generator.mjs --mode validate --url <url>
node {baseDir}/scripts/llmstxt-generator.mjs --mode generate --url <url>

# Brand detection (STUB — issue #3)
node {baseDir}/scripts/brand-scanner.mjs --url <url>
```

`{baseDir}` is resolved by OpenClaw at runtime to the skill root directory.

---

## Inline Artifact Policy

Workers that generate artefacts (llms.txt files, JSON-LD snippets, robots.txt patches) **display them as code blocks in the conversation**. The user copies them. Workers do not write files to disk unless explicitly instructed by the user.

---

## Deferred Workers

Two workers are stubs pending design decisions:

- **`platform-optimizer`**: Currently returns placeholder score. Full implementation requires defining what inputs from the other 7 workers feed platform-specific analysis. See issue #2.
- **`brand-mentions`**: Script architecture defined but detection feasibility per platform not yet confirmed (Wikipedia API vs Reddit auth vs YouTube slug pattern). See issue #3.

Do not implement these beyond stub level until the design issues are resolved.
