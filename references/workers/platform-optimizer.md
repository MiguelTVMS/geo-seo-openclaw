# Worker: platform-optimizer

## ⚠️ STUB — see issue #2

This worker's input contract is not yet defined. It currently returns estimated
scores based on available worker inputs.

## Task (when fully implemented)

Interpret the combined scores from all other workers to produce per-platform readiness
assessments for:
- Google AI Overviews
- ChatGPT Web Search
- Perplexity AI
- Google Gemini
- Bing Copilot

## Return

```json
{
  "score": 0-100,
  "critical_3": ["platform-specific critical issue", "..."],
  "quick_wins_3": ["platform-specific quick win", "..."]
}
```

Score is the average of the 5 platform scores.

## Depth Presets

- **Full:** all 5 platforms
- **Quick:** Google AIO + ChatGPT only (highest traffic impact)
