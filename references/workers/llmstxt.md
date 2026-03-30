# Worker: llmstxt

## Task

Validate existing llms.txt or generate a new one.

1. Run `node {baseDir}/scripts/llmstxt-generator.mjs --mode validate --url <url>`.
2. If file not found (score 0), run with `--mode generate` to produce a draft.
3. Validate format against the checklist in `skills/geo-llmstxt/SKILL.md`.
4. Score on Completeness × 0.40 + Accuracy × 0.35 + Usefulness × 0.25.
5. Identify the 3 most critical issues.
6. Quick wins: if file missing, emit generated llms.txt as code block.

## Return

```json
{
  "score": 0-100,
  "critical_3": ["No llms.txt found at /llms.txt", "..."],
  "quick_wins_3": ["Create /llms.txt using the generated template below", "..."]
}
```

Generated llms.txt is emitted as a fenced code block in the orchestrator output,
immediately following the quick wins for this worker.

## Depth Presets

- **Full:** validate + generate if missing, compare against full sitemap
- **Quick:** validate only (or generate if missing), no sitemap cross-check
