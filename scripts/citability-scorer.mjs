/**
 * citability-scorer.mjs — Passage-level AI citation readiness scorer
 *
 * Analyses content blocks on a page and scores them for AI citability (0-100).
 * Based on research showing optimal AI-cited passages are 134-167 words,
 * self-contained, fact-rich, and structured with clear answer patterns.
 *
 * Usage: node scripts/citability-scorer.mjs --url <url>
 * Output: JSON to stdout. Errors to stderr, exit code 1.
 */

import * as cheerio from 'cheerio';
import { fetchPage } from './fetch-page.mjs';

// ---------------------------------------------------------------------------
// Score a single passage for AI citability (0-100)
// ---------------------------------------------------------------------------

/**
 * @param {string} text
 * @param {string|null} heading
 * @returns {object}
 */
export function scorePassage(text, heading = null) {
  const trimmedText = text.trim();
  const words = trimmedText === '' ? [] : trimmedText.split(/\s+/);
  const wordCount = words.length;

  const scores = {
    answer_block_quality: 0,
    self_containment: 0,
    structural_readability: 0,
    statistical_density: 0,
    uniqueness_signals: 0,
  };

  // === 1. Answer Block Quality (30%) ===
  let abq = 0;

  const definitionPatterns = [
    /\b\w+\s+is\s+(?:a|an|the)\s/i,
    /\b\w+\s+refers?\s+to\s/i,
    /\b\w+\s+means?\s/i,
    /\b\w+\s+(?:can be |are )?defined\s+as\s/i,
    /\bin\s+(?:simple|other)\s+(?:terms|words)\s*,/i,
  ];
  if (definitionPatterns.some((p) => p.test(text))) abq += 15;

  const first60 = words.slice(0, 60).join(' ');
  if (
    [/\b(?:is|are|was|were|means?|refers?)\b/i, /\d+%/, /\$[\d,]+/, /\d+\s+(?:million|billion|thousand)/i].some(
      (p) => p.test(first60)
    )
  )
    abq += 15;

  if (heading && heading.endsWith('?')) abq += 10;

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const shortClear = sentences.filter((s) => {
    const wc = s.trim().split(/\s+/).length;
    return wc >= 5 && wc <= 25;
  }).length;
  if (sentences.length > 0) abq += Math.floor((shortClear / sentences.length) * 10);

  if (
    /(?:according to|research shows|studies? (?:show|indicate|suggest|found)|data (?:shows|indicates|suggests))/i.test(
      text
    )
  )
    abq += 10;

  scores.answer_block_quality = Math.min(abq, 30);

  // === 2. Self-Containment (25%) ===
  let sc = 0;

  if (wordCount >= 134 && wordCount <= 167) sc += 10;
  else if (wordCount >= 100 && wordCount <= 200) sc += 7;
  else if (wordCount >= 80 && wordCount <= 250) sc += 4;
  else if (wordCount < 30 || wordCount > 400) sc += 0;
  else sc += 2;

  const pronounCount = (
    text.match(/\b(?:it|they|them|their|this|that|these|those|he|she|his|her)\b/gi) || []
  ).length;
  if (wordCount > 0) {
    const ratio = pronounCount / wordCount;
    if (ratio < 0.02) sc += 8;
    else if (ratio < 0.04) sc += 5;
    else if (ratio < 0.06) sc += 3;
  }

  const properNouns = (text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || []).length;
  if (properNouns >= 3) sc += 7;
  else if (properNouns >= 1) sc += 4;

  scores.self_containment = Math.min(sc, 25);

  // === 3. Structural Readability (20%) ===
  let sr = 0;

  if (sentences.length > 0) {
    const avg = wordCount / sentences.length;
    if (avg >= 10 && avg <= 20) sr += 8;
    else if (avg >= 8 && avg <= 25) sr += 5;
    else sr += 2;
  }

  if (/(?:first|second|third|finally|additionally|moreover|furthermore)/i.test(text)) sr += 4;
  if (/(?:\d+[\.\)]\s|\b(?:step|tip|point)\s+\d+)/i.test(text)) sr += 4;
  if (/\n/.test(text)) sr += 4;

  scores.structural_readability = Math.min(sr, 20);

  // === 4. Statistical Density (15%) ===
  let sd = 0;

  const pctCount = (text.match(/\d+(?:\.\d+)?%/g) || []).length;
  sd += Math.min(pctCount * 3, 6);

  const dollarCount = (text.match(/\$[\d,]+(?:\.\d+)?(?:\s*(?:million|billion|M|B|K))?/g) || []).length;
  sd += Math.min(dollarCount * 3, 5);

  const numberCount = (
    text.match(
      /\b\d+(?:,\d{3})*(?:\.\d+)?\s+(?:users|customers|pages|sites|companies|businesses|people|percent|times|x\b)/gi
    ) || []
  ).length;
  sd += Math.min(numberCount * 2, 4);

  if (/\b20(?:2[3-6]|1\d)\b/.test(text)) sd += 2;

  const sourcePatterns = [
    /(?:according to|per|from|by)\s+[A-Z]/,
    /(?:Gartner|Forrester|McKinsey|Harvard|Stanford|MIT|Google|Microsoft|OpenAI|Anthropic)/,
    /\([A-Z][a-z]+(?:\s+\d{4})?\)/,
  ];
  for (const p of sourcePatterns) {
    if (p.test(text)) { sd += 2; break; }
  }

  scores.statistical_density = Math.min(sd, 15);

  // === 5. Uniqueness Signals (10%) ===
  let us = 0;

  if (/(?:our (?:research|study|data|analysis|survey|findings)|we (?:found|discovered|analyzed|surveyed|measured))/i.test(text))
    us += 5;
  if (/(?:case study|for example|for instance|in practice|real-world|hands-on)/i.test(text))
    us += 3;
  if (/(?:using|with|via|through)\s+[A-Z][a-z]+/.test(text))
    us += 2;

  scores.uniqueness_signals = Math.min(us, 10);

  // === Total ===
  const total = Object.values(scores).reduce((a, b) => a + b, 0);

  let grade, label;
  if (total >= 80) { grade = 'A'; label = 'Highly Citable'; }
  else if (total >= 65) { grade = 'B'; label = 'Good Citability'; }
  else if (total >= 50) { grade = 'C'; label = 'Moderate Citability'; }
  else if (total >= 35) { grade = 'D'; label = 'Low Citability'; }
  else { grade = 'F'; label = 'Poor Citability'; }

  return {
    heading,
    word_count: wordCount,
    total_score: total,
    grade,
    label,
    breakdown: scores,
    preview: words.slice(0, 30).join(' ') + (wordCount > 30 ? '...' : ''),
  };
}

// ---------------------------------------------------------------------------
// Analyse all content blocks on a page
// ---------------------------------------------------------------------------

/**
 * @param {string} url
 * @param {{ fetchFn?: Function }} options
 * @returns {Promise<object>}
 */
export async function analyzePageCitability(url, { fetchFn } = {}) {
  const pageData = await fetchPage(url, fetchFn ? { fetchFn } : {});

  if (pageData.errors.length > 0 && !pageData.status_code) {
    return { url, error: pageData.errors.join('; ') };
  }

  // Parse HTML again with cheerio for block extraction
  const $ = cheerio.load(pageData.text_content ? await refetchHtml(url, fetchFn) : '');

  // Remove non-content elements
  $('script, style, nav, footer, header, aside, form').each((_, el) => $(el).remove());

  const blocks = [];
  let currentHeading = 'Introduction';
  let currentParagraphs = [];

  $('h1, h2, h3, h4, p, ul, ol, table').each((_, el) => {
    const tag = el.tagName?.toLowerCase() || '';
    if (/^h[1-4]$/.test(tag)) {
      if (currentParagraphs.length > 0) {
        const combined = currentParagraphs.join(' ');
        if (combined.split(/\s+/).length >= 20) {
          blocks.push({ heading: currentHeading, content: combined });
        }
      }
      currentHeading = $(el).text().trim();
      currentParagraphs = [];
    } else {
      const text = $(el).text().trim();
      if (text && text.split(/\s+/).length >= 5) {
        currentParagraphs.push(text);
      }
    }
  });

  if (currentParagraphs.length > 0) {
    const combined = currentParagraphs.join(' ');
    if (combined.split(/\s+/).length >= 20) {
      blocks.push({ heading: currentHeading, content: combined });
    }
  }

  const scoredBlocks = blocks.map((b) => scorePassage(b.content, b.heading));

  const avgScore =
    scoredBlocks.length > 0
      ? scoredBlocks.reduce((a, b) => a + b.total_score, 0) / scoredBlocks.length
      : 0;

  const sorted = [...scoredBlocks].sort((a, b) => b.total_score - a.total_score);
  const topBlocks = sorted.slice(0, 5);
  const bottomBlocks = [...scoredBlocks].sort((a, b) => a.total_score - b.total_score).slice(0, 5);
  const optimalCount = scoredBlocks.filter((b) => b.word_count >= 134 && b.word_count <= 167).length;

  const gradeDist = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const b of scoredBlocks) gradeDist[b.grade]++;

  // Worker return format (for geo-audit integration)
  const overallScore = Math.round(avgScore);

  return {
    url,
    overall_score: overallScore,
    total_blocks_analyzed: scoredBlocks.length,
    average_citability_score: Math.round(avgScore * 10) / 10,
    optimal_length_passages: optimalCount,
    grade_distribution: gradeDist,
    top_5_citable: topBlocks,
    bottom_5_citable: bottomBlocks,
    blocks: scoredBlocks,
  };
}

// Refetch raw HTML for block extraction (separate from fetchPage's text_content)
async function refetchHtml(url, fetchFn) {
  const fn = fetchFn || fetch;
  try {
    const res = await fn(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });
    return await res.text();
  } catch {
    return '';
  }
}

// CLI entrypoint
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const args = process.argv.slice(2);
  const urlIdx = args.indexOf('--url');

  if (urlIdx === -1 || !args[urlIdx + 1]) {
    process.stderr.write('Usage: node scripts/citability-scorer.mjs --url <url>\n');
    process.exit(1);
  }

  analyzePageCitability(args[urlIdx + 1])
    .then((result) => process.stdout.write(JSON.stringify(result, null, 2) + '\n'))
    .catch((err) => {
      process.stderr.write(`Fatal: ${err.message}\n`);
      process.exit(1);
    });
}
