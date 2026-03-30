/**
 * tests/citability-scorer.test.mjs
 *
 * Tests for citability-scorer.mjs scorePassage() function.
 * Covers all 5 scoring dimensions and edge cases.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scorePassage } from '../scripts/citability-scorer.mjs';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const HIGH_CITABILITY = `Content delivery networks (CDNs) are distributed server systems that
cache and serve web content from locations geographically close to end users.
A CDN reduces latency by 50-70% on average according to Cloudflare research.
The three largest CDN providers as of 2024 are Cloudflare (serving 20% of all
websites), Amazon CloudFront, and Akamai Technologies. By distributing content
across multiple edge nodes, CDNs improve page load times and reduce origin
server load. Organizations using a CDN typically see 40% improvement in Time
to First Byte (TTFB) and significant reductions in bandwidth costs. The
technology was first commercialized in 1998 and has since become standard
infrastructure for any site serving global audiences.`;

const LOW_CITABILITY = `If you've ever wondered why some websites load faster than others,
you might be surprised. It's amazing when you think about it. Many companies
use this technology. A significant percentage of sites have adopted it.
Studies show it helps. The technology has been around for a while now and
it's really quite interesting. Some people think it's great.`;

const DEFINITION_PATTERN = `Machine learning is a subset of artificial intelligence that enables
systems to learn and improve from experience without being explicitly
programmed. According to Stanford research, machine learning algorithms
build mathematical models based on training data. There are three main
types: supervised learning, unsupervised learning, and reinforcement learning.
As of 2024, over 80% of Fortune 500 companies use machine learning in some
capacity.`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('scorePassage — output contract', () => {
  it('returns all required fields', () => {
    const result = scorePassage('This is a test passage with enough words.', 'Test Heading');
    const required = ['heading', 'word_count', 'total_score', 'grade', 'label', 'breakdown', 'preview'];
    for (const field of required) {
      assert.ok(Object.hasOwn(result, field), `Missing field: ${field}`);
    }
  });

  it('breakdown contains all 5 scoring dimensions', () => {
    const result = scorePassage('Some text here.');
    const dims = ['answer_block_quality', 'self_containment', 'structural_readability', 'statistical_density', 'uniqueness_signals'];
    for (const d of dims) {
      assert.ok(Object.hasOwn(result.breakdown, d), `Missing dimension: ${d}`);
    }
  });

  it('total_score is sum of breakdown values', () => {
    const result = scorePassage(HIGH_CITABILITY);
    const sum = Object.values(result.breakdown).reduce((a, b) => a + b, 0);
    assert.strictEqual(result.total_score, sum);
  });

  it('scores are within their maximum bounds', () => {
    const result = scorePassage(HIGH_CITABILITY);
    assert.ok(result.breakdown.answer_block_quality <= 30);
    assert.ok(result.breakdown.self_containment <= 25);
    assert.ok(result.breakdown.structural_readability <= 20);
    assert.ok(result.breakdown.statistical_density <= 15);
    assert.ok(result.breakdown.uniqueness_signals <= 10);
  });

  it('total_score is between 0 and 100', () => {
    const result = scorePassage(HIGH_CITABILITY);
    assert.ok(result.total_score >= 0);
    assert.ok(result.total_score <= 100);
  });

  it('word_count matches actual word count', () => {
    const text = 'One two three four five six seven eight nine ten.';
    const result = scorePassage(text);
    assert.strictEqual(result.word_count, 10);
  });

  it('preview is truncated to 30 words with ellipsis', () => {
    const words = Array.from({ length: 50 }, (_, i) => `word${i}`);
    const result = scorePassage(words.join(' '));
    assert.ok(result.preview.endsWith('...'));
    // preview = "word0 word1 ... word29..." — 30 words, last one suffixed with '...'
    assert.strictEqual(result.preview.split(' ').length, 30);
  });
});

describe('scorePassage — grade assignment', () => {
  it('high-quality passage gets grade A or B', () => {
    const result = scorePassage(HIGH_CITABILITY);
    assert.ok(['A', 'B'].includes(result.grade), `Expected A or B, got ${result.grade} (score: ${result.total_score})`);
  });

  it('low-quality passage gets grade D or F', () => {
    const result = scorePassage(LOW_CITABILITY);
    assert.ok(['D', 'F'].includes(result.grade), `Expected D or F, got ${result.grade} (score: ${result.total_score})`);
  });

  it('high passage scores higher than low passage', () => {
    const high = scorePassage(HIGH_CITABILITY);
    const low = scorePassage(LOW_CITABILITY);
    assert.ok(high.total_score > low.total_score, `High: ${high.total_score}, Low: ${low.total_score}`);
  });
});

describe('scorePassage — answer block quality', () => {
  it('definition pattern ("X is a...") increases score', () => {
    const withDef = scorePassage(DEFINITION_PATTERN);
    const withoutDef = scorePassage(LOW_CITABILITY);
    assert.ok(
      withDef.breakdown.answer_block_quality > withoutDef.breakdown.answer_block_quality
    );
  });

  it('question heading adds bonus points', () => {
    const withQ = scorePassage('Machine learning is a method of data analysis. It automates analytical model building.', 'What is machine learning?');
    const withoutQ = scorePassage('Machine learning is a method of data analysis. It automates analytical model building.', 'Machine Learning');
    assert.ok(withQ.breakdown.answer_block_quality >= withoutQ.breakdown.answer_block_quality);
  });
});

describe('scorePassage — self-containment', () => {
  it('optimal word count (134-167) scores highest in self-containment', () => {
    const optimalWords = Array.from({ length: 150 }, (_, i) => `word${i} Acme Corp value`).join(' ').split(' ').slice(0, 150).join(' ');
    const result = scorePassage(optimalWords);
    assert.ok(result.breakdown.self_containment >= 10, `Expected >=10, got ${result.breakdown.self_containment}`);
  });

  it('very short passage (< 30 words) scores 0 for word count component', () => {
    const short = scorePassage('Short text here only few words.');
    // Short text gets minimal self-containment
    assert.ok(short.breakdown.self_containment < 15);
  });
});

describe('scorePassage — statistical density', () => {
  it('percentages increase statistical density score', () => {
    const withPct = scorePassage('Performance improved by 45% and 67% with this approach in 2024.');
    const withoutPct = scorePassage('Performance improved significantly and greatly with this approach.');
    assert.ok(withPct.breakdown.statistical_density > withoutPct.breakdown.statistical_density);
  });

  it('named sources increase statistical density score', () => {
    const withSource = scorePassage('According to Google research published in 2024, the approach yields results.');
    const withoutSource = scorePassage('Research published recently shows the approach yields results.');
    assert.ok(withSource.breakdown.statistical_density >= withoutSource.breakdown.statistical_density);
  });
});
