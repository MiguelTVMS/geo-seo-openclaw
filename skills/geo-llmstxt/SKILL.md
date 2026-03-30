---
name: geo-llmstxt
description: >
  llms.txt presence, validity, and generation. Validates an existing llms.txt file or
  generates a new one from scratch by crawling site structure. Generated files are
  displayed as inline code blocks — not written to disk. Invoked directly via
  /geo llmstxt or as a parallel worker in /geo audit.
---

# GEO llms.txt Analyser and Generator

## Purpose

Validate or generate an `llms.txt` file — the emerging standard (proposed by Jeremy Howard,
September 2024) that tells AI systems what content on a site is most useful to understand.

**This worker's domain:** `/llms.txt` and `/llms-full.txt` only.
AI crawler access (robots.txt) is handled by `geo-crawlers`.

---

## Script

```bash
# Validate existing llms.txt
node {baseDir}/scripts/llmstxt-generator.mjs --mode validate --url <url>

# Generate new llms.txt from site structure
node {baseDir}/scripts/llmstxt-generator.mjs --mode generate --url <url>
```

Outputs JSON to stdout:
```json
{
  "status": "found|not_found|error",
  "score": 74,
  "issues": ["Missing Key Facts section", "3 URLs return 404"],
  "generated": "# Site Name\n> Description...\n..."
}
```

---

## llms.txt Format Specification

```markdown
# [Site Name]

> [One sentence: what the site does, who it serves, key value. Under 200 characters.]

## [Section — e.g. Docs, Products, Resources, Blog]

- [Page Title](https://example.com/page): 10–30 word description of what this page covers.
- [Another Page](https://example.com/page-2): What information is here and why it matters.

## Key Facts

- Founded in [year] by [name(s)]
- Headquartered in [City, Country]
- [Specific metric: "Serves 10,000+ businesses in 40 countries"]
- Industry: [Classification]

## Contact

- Website: https://example.com
- Email: contact@example.com
```

### Format Rules

- **Title:** H1 (`#`), first line, official site/business name
- **Description:** Blockquote (`>`), immediately after title, under 200 characters, factual
- **Sections:** H2 (`##`) — Docs, Products, Services, Resources, Blog, About, Legal, Contact
- **Entries:** `- [Title](absolute-URL): description`
- **Entry count:** 10–30 total across all sections
- **Descriptions:** 10–30 words, specific, no marketing language
- **URLs:** Absolute only — never relative paths
- **Length:** 50–150 lines

---

## Validation Checklist

| Element | Severity if absent |
|---|---|
| H1 title | Critical |
| Blockquote description (< 200 chars) | High |
| At least one H2 section | Critical |
| Minimum 5 page entries | High |
| All URLs absolute (https://) | High |
| All URLs return 200 | Medium |
| Descriptions on every entry | Medium |
| Key Facts section | Medium |
| Contact section | Low |
| File length 30–200 lines | Low |
| No broken Markdown | Medium |

---

## Scoring (0–100)

Overall = (Completeness × 0.40) + (Accuracy × 0.35) + (Usefulness × 0.25)

- **Completeness:** Covers all major site sections; includes important pages; Key Facts present
- **Accuracy:** Descriptions match page content; URLs valid; facts verifiable
- **Usefulness:** AI system can understand site purpose from file alone; pages well-differentiated

---

## Page Prioritisation (for generation)

**Always include:**
- Homepage
- About / Company
- Pricing (if exists)
- Top 3–5 product/service pages
- Contact

**Include if high quality:**
- Top blog posts (by depth or recency)
- Case studies
- Key guides / resources
- FAQ page

**Skip:**
- Thin category/tag/pagination pages
- Login/signup pages
- Legal boilerplate (unless specifically relevant)
- Duplicate or near-duplicate content

---

## Worker Return Format

```json
{
  "score": 0,
  "critical_3": [
    "No llms.txt file found at /llms.txt",
    "No llms-full.txt alternative present",
    "AI systems have no structured site overview — must discover by crawling"
  ],
  "quick_wins_3": [
    "Create /llms.txt using generated template below",
    "Include 10–15 most important page entries with specific descriptions",
    "Add Key Facts section with founding date, location, and core products"
  ]
}
```

When a file is generated, emit it as a fenced code block immediately after the worker
summary so the user can copy and deploy it.
