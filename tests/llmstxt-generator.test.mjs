/**
 * tests/llmstxt-generator.test.mjs
 *
 * Tests for llmstxt-generator.mjs — validate and generate modes.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateLlmstxt, generateLlmstxt, runLlmstxt } from '../scripts/llmstxt-generator.mjs';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_LLMSTXT = `# Acme Corp

> Acme Corp provides cloud infrastructure tools for development teams.

## Main Pages

- [Home](https://acme.com/): Homepage of Acme Corp.
- [About](https://acme.com/about): Company overview and mission.
- [Pricing](https://acme.com/pricing): Subscription plans and pricing.

## Products & Services

- [Cloud Storage](https://acme.com/storage): Scalable object storage for teams.
- [CI/CD Pipeline](https://acme.com/cicd): Automated build and deploy pipelines.

## Key Facts

- Founded in 2018 by Jane Smith
- Headquartered in San Francisco, USA
- Serves 5,000+ engineering teams globally

## Contact

- Website: https://acme.com
- Email: hello@acme.com
`;

const INVALID_LLMSTXT = `Some random content without proper formatting
No title, no description, no sections, no links.
`;

const HOMEPAGE_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Acme Corp | Cloud Tools</title>
  <meta name="description" content="Cloud infrastructure tools for teams.">
</head>
<body>
  <nav>
    <a href="/about">About</a>
    <a href="/pricing">Pricing</a>
    <a href="/docs">Docs</a>
    <a href="/blog">Blog</a>
    <a href="/contact">Contact</a>
  </nav>
  <h1>Welcome to Acme</h1>
  <p>Build faster with our cloud tools.</p>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Mock fetch helpers
// ---------------------------------------------------------------------------

function makeNotFoundFetch() {
  return async (url) => {
    if (url.includes('/llms.txt') || url.includes('/llms-full.txt')) {
      return { status: 404, text: async () => '' };
    }
    // Homepage and other URLs return content so generate fallback works
    return { status: 200, text: async () => HOMEPAGE_HTML };
  };
}

function makeValidFetch() {
  return async (url) => {
    if (url.includes('/llms.txt') && !url.includes('full')) {
      return { status: 200, text: async () => VALID_LLMSTXT };
    }
    if (url.includes('/llms-full.txt')) {
      return { status: 404, text: async () => '' };
    }
    return { status: 200, text: async () => HOMEPAGE_HTML };
  };
}

function makeInvalidFetch() {
  return async (url) => {
    if (url.includes('/llms.txt')) {
      return { status: 200, text: async () => INVALID_LLMSTXT };
    }
    return { status: 200, text: async () => HOMEPAGE_HTML };
  };
}

function makeHomepageFetch() {
  return async (_url) => ({ status: 200, text: async () => HOMEPAGE_HTML });
}

// ---------------------------------------------------------------------------
// validateLlmstxt tests
// ---------------------------------------------------------------------------

describe('validateLlmstxt — not found', () => {
  it('returns exists: false when 404', async () => {
    const result = await validateLlmstxt('https://example.com', { fetchFn: makeNotFoundFetch() });
    assert.strictEqual(result.exists, false);
  });

  it('returns status not_found', async () => {
    const result = await validateLlmstxt('https://example.com', { fetchFn: makeNotFoundFetch() });
    assert.ok(['not_found', 'error'].includes(result.status) || result.issues.length > 0);
  });
});

describe('validateLlmstxt — valid file', () => {
  it('detects existing valid llms.txt', async () => {
    const result = await validateLlmstxt('https://acme.com', { fetchFn: makeValidFetch() });
    assert.strictEqual(result.exists, true);
  });

  it('detects title (# heading)', async () => {
    const result = await validateLlmstxt('https://acme.com', { fetchFn: makeValidFetch() });
    assert.strictEqual(result.has_title, true);
  });

  it('detects description (> blockquote)', async () => {
    const result = await validateLlmstxt('https://acme.com', { fetchFn: makeValidFetch() });
    assert.strictEqual(result.has_description, true);
  });

  it('detects sections (## headings)', async () => {
    const result = await validateLlmstxt('https://acme.com', { fetchFn: makeValidFetch() });
    assert.strictEqual(result.has_sections, true);
    assert.ok(result.section_count >= 2);
  });

  it('detects page links', async () => {
    const result = await validateLlmstxt('https://acme.com', { fetchFn: makeValidFetch() });
    assert.strictEqual(result.has_links, true);
    assert.ok(result.link_count >= 5);
  });

  it('marks format_valid true for well-formed file', async () => {
    const result = await validateLlmstxt('https://acme.com', { fetchFn: makeValidFetch() });
    assert.strictEqual(result.format_valid, true);
  });

  it('produces a non-zero score for valid file', async () => {
    const result = await validateLlmstxt('https://acme.com', { fetchFn: makeValidFetch() });
    assert.ok(result.score > 0, `Score should be > 0, got ${result.score}`);
  });
});

describe('validateLlmstxt — invalid file', () => {
  it('marks format_valid false for malformed file', async () => {
    const result = await validateLlmstxt('https://example.com', { fetchFn: makeInvalidFetch() });
    assert.strictEqual(result.format_valid, false);
  });

  it('reports issues for malformed file', async () => {
    const result = await validateLlmstxt('https://example.com', { fetchFn: makeInvalidFetch() });
    assert.ok(result.issues.length > 0, 'Should have reported issues');
  });
});

// ---------------------------------------------------------------------------
// generateLlmstxt tests
// ---------------------------------------------------------------------------

describe('generateLlmstxt', () => {
  it('returns a generated string', async () => {
    const result = await generateLlmstxt('https://acme.com', { fetchFn: makeHomepageFetch() });
    assert.ok(typeof result.generated === 'string');
    assert.ok(result.generated.length > 0);
  });

  it('generated content starts with # (title)', async () => {
    const result = await generateLlmstxt('https://acme.com', { fetchFn: makeHomepageFetch() });
    assert.ok(result.generated.startsWith('#'), `Expected # title, got: ${result.generated.slice(0, 50)}`);
  });

  it('generated content includes a blockquote description', async () => {
    const result = await generateLlmstxt('https://acme.com', { fetchFn: makeHomepageFetch() });
    assert.ok(result.generated.includes('> '), 'Should include > description');
  });

  it('generated content includes at least one ## section', async () => {
    const result = await generateLlmstxt('https://acme.com', { fetchFn: makeHomepageFetch() });
    assert.ok(result.generated.includes('## '), 'Should include ## sections');
  });

  it('generated content includes a Contact section', async () => {
    const result = await generateLlmstxt('https://acme.com', { fetchFn: makeHomepageFetch() });
    assert.ok(result.generated.includes('## Contact'), 'Should include Contact section');
  });

  it('extracts site name from title tag', async () => {
    const result = await generateLlmstxt('https://acme.com', { fetchFn: makeHomepageFetch() });
    // Title is "Acme Corp | Cloud Tools" → should extract "Acme Corp"
    assert.ok(result.generated.includes('Acme'), `Title extraction failed: ${result.generated.slice(0, 100)}`);
  });

  it('reports pages_analyzed count', async () => {
    const result = await generateLlmstxt('https://acme.com', { fetchFn: makeHomepageFetch() });
    assert.ok(typeof result.pages_analyzed === 'number');
    assert.ok(result.pages_analyzed > 0);
  });
});

// ---------------------------------------------------------------------------
// runLlmstxt (combined) tests
// ---------------------------------------------------------------------------

describe('runLlmstxt — combined', () => {
  it('returns validation result in validate mode', async () => {
    const result = await runLlmstxt('https://acme.com', 'validate', { fetchFn: makeValidFetch() });
    assert.ok(Object.hasOwn(result, 'exists'));
  });

  it('generates file when not found in validate mode', async () => {
    const result = await runLlmstxt('https://example.com', 'validate', { fetchFn: makeNotFoundFetch() });
    assert.ok(Object.hasOwn(result, 'issues'));
    // validate mode falls back to generate when file not found
    assert.strictEqual(result.status, 'not_found');
    assert.ok(typeof result.generated === 'string');
    assert.ok(result.generated.length > 0);
  });

  it('returns generated content in generate mode', async () => {
    const result = await runLlmstxt('https://acme.com', 'generate', { fetchFn: makeHomepageFetch() });
    assert.ok(typeof result.generated === 'string');
    assert.ok(result.generated.length > 0);
  });
});
