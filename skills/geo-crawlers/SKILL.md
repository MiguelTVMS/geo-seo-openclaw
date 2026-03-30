---
name: geo-crawlers
description: >
  AI crawler access analysis. Parses robots.txt and checks meta robots tags and HTTP
  headers to map which AI crawlers can access the site. Produces a crawler access map
  and a ready-to-paste robots.txt recommendation. Invoked directly via /geo crawlers
  or as a parallel worker in /geo audit.
---

# GEO Crawler Access Analyser

## Purpose

Map AI crawler access from robots.txt. A blocked AI crawler means zero visibility on
that platform, regardless of content quality.

**This worker's domain:** robots.txt and page-level crawler directives only.
llms.txt presence and validity is handled by `geo-llmstxt`.

---

## AI Crawler Reference

### Tier 1 — Critical for AI Search (RECOMMEND: ALLOW)

| Crawler | User-Agent | Platform | Impact if blocked |
|---|---|---|---|
| GPTBot | `GPTBot` | ChatGPT Search | Not cited in ChatGPT Search |
| OAI-SearchBot | `OAI-SearchBot` | ChatGPT Search (no training) | Not in ChatGPT search results |
| ChatGPT-User | `ChatGPT-User` | User-initiated ChatGPT browsing | ChatGPT cannot visit page on user request |
| ClaudeBot | `ClaudeBot` | Claude web search | Not accessible to Claude |
| PerplexityBot | `PerplexityBot` | Perplexity AI | Not cited in Perplexity (best AI referral traffic) |

### Tier 2 — Important Ecosystem (RECOMMEND: ALLOW)

| Crawler | User-Agent | Platform |
|---|---|---|
| Google-Extended | `Google-Extended` | Gemini training + AI Overviews (NOT standard search rank) |
| GoogleOther | `GoogleOther` | Google AI research |
| Applebot-Extended | `Applebot-Extended` | Apple Intelligence (2B+ devices) |
| Amazonbot | `Amazonbot` | Alexa + Amazon AI |
| FacebookBot | `FacebookBot` | Meta AI (3B+ app users) |

### Tier 3 — Training Only (context-dependent)

| Crawler | User-Agent | Recommendation |
|---|---|---|
| CCBot | `CCBot` | Context — allow for training presence, block for data control |
| anthropic-ai | `anthropic-ai` | Context — Claude training only, not live search |
| Bytespider | `Bytespider` | BLOCK — aggressive crawling, low benefit for Western markets |
| cohere-ai | `cohere-ai` | Context — low consumer-facing impact |

---

## Analysis Procedure

1. Fetch `[domain]/robots.txt`
2. For each AI crawler above: determine effective access (explicit Allow / explicit
   Disallow / wildcard inheritance)
3. Sample 5 key pages for `<meta name="robots">` and `X-Robots-Tag` headers
4. Check for `noai` and `noimageai` directives
5. Check for `Sitemap:` directive in robots.txt
6. Assess JavaScript rendering requirements for AI crawlers (AI crawlers do NOT execute JS)

---

## Scoring (0–100)

| Component | Weight | Scoring |
|---|---|---|
| Tier 1 crawlers allowed | 50% | 20 pts per allowed Tier 1 crawler (5 max = 100, scaled to 50) |
| Tier 2 crawlers allowed | 25% | 20 pts per allowed Tier 2 crawler (5 max = 100, scaled to 25) |
| No blanket AI blocks | 15% | Full if no `User-agent: *` Disallow: / and no noai meta tags |
| AI-specific files present | 10% | 5 pts for llms.txt accessible, 5 pts for sitemap in robots.txt |

---

## Worker Return Format

```json
{
  "score": 64,
  "critical_3": [
    "GPTBot is blocked via User-agent: * Disallow: /",
    "PerplexityBot explicitly blocked in robots.txt",
    "No Sitemap directive in robots.txt — AI crawlers cannot discover pages"
  ],
  "quick_wins_3": [
    "Add 'User-agent: GPTBot\\nAllow: /' to robots.txt",
    "Remove PerplexityBot Disallow block",
    "Add 'Sitemap: https://example.com/sitemap.xml' to robots.txt"
  ]
}
```

---

## Recommended robots.txt (Maximum AI Visibility)

```
# AI Crawlers — allowed for AI search visibility
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: GoogleOther
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: Amazonbot
Allow: /

User-agent: FacebookBot
Allow: /

# AI Crawlers — blocked (aggressive / low value)
User-agent: Bytespider
Disallow: /

User-agent: CCBot
Disallow: /
```

Emit this as a code block when relevant crawlers are blocked.
