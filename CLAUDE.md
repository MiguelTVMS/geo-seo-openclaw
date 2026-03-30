# geo-seo-openclaw — Developer Instructions

## Repository Purpose

This is an OpenClaw skill for Generative Engine Optimization (GEO) analysis. It audits websites for AI search visibility across ChatGPT, Claude, Perplexity, Gemini, and Google AI Overviews, producing citability scores, crawler access maps, llms.txt files, schema markup, and actionable improvement plans.

Adapted from [`geo-seo-claude`](https://github.com/zubairtrabzada/geo-seo-claude) by Zubair Trabzada. Original Claude Code skill rewritten as a native OpenClaw skill with Node.js scripts, parallel worker architecture, and strict sub-skill domain separation.

---

## Runtime and Tooling

- **Node.js**: 22.14.0 minimum (matches OpenClaw engine; native `fetch` available — no `node-fetch`)
- **Module system**: `"type": "module"` — all scripts are ESM (`.mjs` extension)
- **Only npm dependency**: `cheerio` for HTML parsing
- **`package.json` location**: skill root (`/`) — not `scripts/`
- **Install**: `npm install` from skill root

---

## Project Structure

```
geo-seo-openclaw/
├── geo/
│   └── SKILL.md                    # Root skill — command surface and orchestration
├── skills/
│   ├── geo-audit/SKILL.md          # Orchestrator — no direct analysis
│   ├── geo-citability/SKILL.md     # Passage-level citation readiness
│   ├── geo-crawlers/SKILL.md       # robots.txt + AI crawler access
│   ├── geo-llmstxt/SKILL.md        # llms.txt presence, validity, generation
│   ├── geo-brand-mentions/SKILL.md # Off-site brand signals (STUB — see issue #3)
│   ├── geo-schema/SKILL.md         # JSON-LD detection and generation
│   ├── geo-technical/SKILL.md      # Core Web Vitals, SSR, mobile
│   ├── geo-content/SKILL.md        # E-E-A-T, author authority, freshness
│   └── geo-platform-optimizer/SKILL.md  # AI platform interpretation (STUB — see issue #2)
├── scripts/
│   ├── fetch-page.mjs              # Page fetcher + SSR heuristic (migrated from fetch_page.py)
│   ├── citability-scorer.mjs       # Passage scoring (migrated from citability_scorer.py)
│   ├── llmstxt-generator.mjs       # llms.txt validator + generator (migrated from llmstxt_generator.py)
│   └── brand-scanner.mjs           # Platform brand detection (STUB — see issue #3)
├── references/
│   ├── agents/                     # Original Claude Code agent files — source material only, do not use
│   └── workers/                    # Active worker task specs (one file per sub-skill)
├── tests/
│   └── fetch-page.test.mjs         # SSR heuristic test suite (Node 22 built-in runner)
├── examples/                       # Example audit outputs
├── schema/                         # JSON-LD schema templates
├── package.json                    # Node engine declaration + cheerio
├── CLAUDE.md                       # This file
└── AGENTS.md                       # Worker contract for OpenClaw/Codex runtime
```

---

## Sub-Skill Domain Boundaries

Each sub-skill owns a non-overlapping domain. Do not duplicate logic across boundaries.

| Sub-skill | Owns | Does NOT own |
|---|---|---|
| `geo-citability` | Passage-level extractability scoring | Page-level content quality |
| `geo-content` | E-E-A-T, author authority, freshness, topical depth | Passage scoring |
| `geo-technical` | Core Web Vitals, HTTPS, mobile, SSR/CSR detection | robots.txt |
| `geo-crawlers` | robots.txt parsing, AI bot access map | llms.txt |
| `geo-schema` | JSON-LD detection, validation, generation | Platform interpretation of schema |
| `geo-platform-optimizer` | AI platform-specific interpretation of worker scores (STUB) | Detection logic belonging to other workers |
| `geo-llmstxt` | llms.txt presence, validity, generation | robots.txt |
| `geo-brand-mentions` | Off-site brand signals (STUB) | On-site entity signals |
| `geo-audit` | Orchestration — synthesises 8 worker outputs into composite score | Any direct analysis |

---

## Script Conventions

- **Output**: JSON to `stdout` only. Debug output goes to `stderr`. Never mix.
- **Errors**: Non-zero exit code + `{"error": "..."}` on `stdout` for fatal failures.
- **`--help`**: Every script must accept a `--help` flag and print usage.
- **Paths**: Use `import.meta.url` + `path.resolve()` for all relative file references. Scripts must work when invoked as `node scripts/fetch-page.mjs` directly and when called by OpenClaw via `{baseDir}`.
- **No `console.log`**: Use `process.stderr.write()` for debug output. JSON goes to `process.stdout.write()`.
- **HTTP**: Use `globalThis.fetch` (Node 22 built-in). No axios, no node-fetch.

---

## Worker Contract

Each parallel analysis worker (citability, content, technical, crawlers, schema, platform-optimizer, llmstxt, brand-mentions) returns this structure:

```json
{
  "score": 0-100,
  "critical_3": ["issue 1", "issue 2", "issue 3"],
  "quick_wins_3": ["win 1", "win 2", "win 3"]
}
```

The `geo-audit` orchestrator synthesises all worker outputs into:
- Composite GEO score (weighted average, see scoring weights below)
- Unified prioritised action list
- Per-category score breakdown

**Scoring weights:**

| Category | Weight |
|---|---|
| AI Citability | 25% |
| Brand Authority | 20% |
| Content E-E-A-T | 20% |
| Technical GEO | 15% |
| Schema & Structured Data | 10% |
| Platform Optimization | 10% |

---

## Inline Artifact Policy

Generated artefacts (llms.txt files, JSON-LD snippets, robots.txt recommendations) are **displayed as code blocks in conversation**. The user copies them. No file writes to disk unless explicitly instructed.

---

## Testing

- **Test runner**: Node 22 built-in (`node:test` + `node:assert`)
- **Run**: `node --test tests/fetch-page.test.mjs`
- **Coverage requirement**: Every SSR heuristic branch in `fetch-page.mjs` must have a test case
- **Gate**: All tests must pass before deleting `scripts/fetch_page.py` (Phase 2 is blocked on Phase 4 completion)
- Do not use Jest, Vitest, or any test framework — Node 22 built-in only

---

## Git Workflow

This repo uses **GitFlow** as its branching strategy.

| Branch | Purpose |
|---|---|
| `main` | Production — tagged releases only |
| `develop` | Integration branch — all feature work merges here |
| `feature/<name>` | New features — branch off `develop`, merge back to `develop` |
| `fix/<name>` | Bug fixes — branch off `develop`, merge back to `develop` |
| `hotfix/<name>` | Urgent production fixes — branch off `main`, merge to both `main` and `develop` |
| `release/<version>` | Release prep — branch off `develop`, merge to `main` and `develop` |

**Rules:**
- Never commit directly to `develop` or `main`
- Branch names must use the prefixes above — no exceptions
- **Commit messages**: Imperative, present tense — `Add fetch-page.mjs`, not `Added fetch-page.mjs`
- **Identity**: `git config user.name "Director Krennic"` and `git config user.email "krennic@miguel.ms"` — set locally in the repo, never rely on global config
- **Push policy**: Commit freely. Never push — the orchestrator (Krennic) pushes.

---

## Pre-Commit Checklist

Before every commit, verify:

- [ ] `node --test` passes (when test files exist)
- [ ] No `allowed-tools:` key in any `SKILL.md` (not a valid OpenClaw frontmatter field)
- [ ] No hardcoded absolute paths in scripts — use `import.meta.url` + `path.resolve()`
- [ ] `package.json` is at skill root, not inside `scripts/`
- [ ] Scripts output JSON to `stdout`, never to `stderr`
- [ ] No `.py` files in `scripts/` after Phase 2 completes (check migration status before deleting)

---

## Deferred Items (do not implement without separate design decisions)

| Item | Tracking Issue | Status |
|---|---|---|
| `geo-platform-optimizer` full scope | #2 | Blocked — redesign required |
| `brand-scanner.mjs` platform detection model | #3 | Blocked — feasibility matrix needed |
| SSR heuristic Node migration with test coverage | #4 | In progress — do not delete `fetch_page.py` until tests pass |

---

## Commands

| Command | Sub-skill | Depth |
|---|---|---|
| `/geo audit <url>` | `geo-audit` (orchestrates all) | Full (3-5 min) |
| `/geo quick <url>` | `geo-audit` | Quick preset (~60s, same methodology) |
| `/geo citability <url>` | `geo-citability` | — |
| `/geo crawlers <url>` | `geo-crawlers` | — |
| `/geo llmstxt <url>` | `geo-llmstxt` | — |
| `/geo brands <url>` | `geo-brand-mentions` | — |
| `/geo schema <url>` | `geo-schema` | — |
| `/geo technical <url>` | `geo-technical` | — |
| `/geo content <url>` | `geo-content` | — |
| `/geo platforms <url>` | `geo-platform-optimizer` | — |
