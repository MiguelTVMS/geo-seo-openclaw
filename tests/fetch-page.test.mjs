/**
 * tests/fetch-page.test.mjs
 *
 * Node.js test parity for tests/test_fetch_page_ssr.py
 *
 * Covers the fix for GitHub Issue #19: false positives where sites using
 * framework-style root divs (id="app", id="root") but serving full HTML via
 * SSR/prerendering were incorrectly flagged as client-side-only.
 *
 * 8 test suites, 18 assertions — mirrors Python test class structure exactly.
 */

import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { fetchPage } from '../scripts/fetch-page.mjs';

// ---------------------------------------------------------------------------
// HTML Fixtures (mirrors Python test fixtures exactly)
// ---------------------------------------------------------------------------

const WORDPRESS_BRICKS_HTML = `<!DOCTYPE html>
<html>
<head><title>Bricks Builder Site</title></head>
<body>
  <div id="app">
    <header><nav>Home About Contact</nav></header>
    <main>
      <h1>Welcome to our WordPress site</h1>
      <p>This is a fully server-rendered page built with Bricks Builder on
      WordPress. All the content below is rendered by PHP on the server and
      delivered as complete HTML to the browser and to any crawler or AI bot
      that requests it without running JavaScript.</p>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
      eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
      minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip
      ex ea commodo consequat. Duis aute irure dolor in reprehenderit in
      voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
      <p>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
      officia deserunt mollit anim id est laborum. Additional content here to
      ensure we exceed the two-hundred word threshold used by the heuristic
      so that this page is correctly recognised as server-rendered content
      rather than a blank client-side shell waiting for JavaScript to hydrate
      it.</p>
    </main>
    <footer>Footer content here</footer>
  </div>
</body>
</html>`;

const LITESPEED_CACHE_HTML = `<!DOCTYPE html>
<html>
<head><title>LiteSpeed Cache Site</title></head>
<body>
  <div id="root">
    <h1>Product catalogue</h1>
    <p>Our products are fully rendered server-side with LiteSpeed Cache
    providing HTML caching so that every request receives a complete HTML
    document without any client-side JavaScript rendering required. This
    means AI crawlers, search engines, and other bots all get the same rich
    content that a browser with JavaScript disabled would see.</p>
    <p>Product one: A great item that costs twenty dollars and is very
    popular with our customers who appreciate quality and value. Product two:
    Another excellent item at thirty dollars providing outstanding value for
    money. Product three: Premium option at fifty dollars for discerning
    buyers who want the very best quality available on the market today.</p>
    <p>Contact us for bulk pricing on orders of ten units or more. We offer
    free shipping on orders over one hundred dollars within the continental
    United States. International shipping is available at competitive rates
    calculated at checkout.</p>
  </div>
</body>
</html>`;

const PRERENDER_SERVICE_HTML = `<!DOCTYPE html>
<html>
<head><title>Pre-rendered React App</title></head>
<body>
  <div id="__next">
    <h1>Server pre-rendered page</h1>
    <p>This Next.js application uses server-side rendering so that the page
    is always delivered as complete HTML. The content here represents the
    kind of rich, indexable text that a pre-rendering service would serve to
    crawlers and AI bots visiting the site. The JavaScript framework hydrates
    on the client but the initial payload is full HTML.</p>
    <p>We have extensive documentation, articles, and guides covering a wide
    range of topics relevant to our users. Our content team publishes new
    material every week ensuring the site remains fresh and authoritative in
    our subject area. This makes us an ideal citation source for AI language
    models seeking reliable, up-to-date information.</p>
    <p>Our technology stack includes modern tools chosen for performance and
    developer experience. We measure core web vitals regularly and optimise
    continuously to ensure fast load times for all visitors regardless of
    their device or network connection speed.</p>
  </div>
</body>
</html>`;

const TRUE_CSR_SHELL_HTML = `<!DOCTYPE html>
<html>
<head><title>Client Side App</title></head>
<body>
  <div id="app"></div>
  <script src="/bundle.js"></script>
</body>
</html>`;

const TRUE_CSR_ROOT_HTML = `<!DOCTYPE html>
<html>
<head><title>React App</title></head>
<body>
  <div id="root">Loading...</div>
  <script src="/main.js"></script>
</body>
</html>`;

const NO_FRAMEWORK_HTML = `<!DOCTYPE html>
<html>
<head><title>Plain HTML Site</title></head>
<body>
  <h1>A standard HTML page</h1>
  <p>This page uses no JavaScript framework at all. It is plain HTML served
  directly by the web server. It should never be flagged as client-rendered
  because it has no framework-style root divs and contains plenty of text
  content for any crawler or AI model to index and use as a citation source.
  The page covers many topics in depth and provides reliable information.</p>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Test helper: mock fetch with a given HTML string
// ---------------------------------------------------------------------------

function makeFetchFn(html, status = 200) {
  return async (_url, _opts) => ({
    status,
    headers: {
      forEach: (_cb) => {},
    },
    text: async () => html,
  });
}

// ---------------------------------------------------------------------------
// Test suites (mirrors 8 Python test classes)
// ---------------------------------------------------------------------------

describe('TestSSRDetectionNonFrameworkSites', () => {
  it('plain HTML has has_ssr_content true', async () => {
    const result = await fetchPage('http://example.com/', {
      fetchFn: makeFetchFn(NO_FRAMEWORK_HTML),
    });
    assert.strictEqual(result.has_ssr_content, true);
  });

  it('plain HTML has no client-side rendering errors', async () => {
    const result = await fetchPage('http://example.com/', {
      fetchFn: makeFetchFn(NO_FRAMEWORK_HTML),
    });
    const csrErrors = result.errors.filter((e) =>
      e.toLowerCase().includes('client-side')
    );
    assert.deepStrictEqual(csrErrors, []);
  });
});

describe('TestSSRDetectionFalsePositives', () => {
  it('WordPress/Bricks Builder site (id=app) is NOT flagged as CSR', async () => {
    const result = await fetchPage('http://example.com/', {
      fetchFn: makeFetchFn(WORDPRESS_BRICKS_HTML),
    });
    assert.strictEqual(
      result.has_ssr_content,
      true,
      'WordPress/Bricks Builder site should not be flagged as CSR'
    );
  });

  it('WordPress/Bricks Builder site has no CSR errors', async () => {
    const result = await fetchPage('http://example.com/', {
      fetchFn: makeFetchFn(WORDPRESS_BRICKS_HTML),
    });
    const csrErrors = result.errors.filter((e) =>
      e.toLowerCase().includes('client-side')
    );
    assert.deepStrictEqual(csrErrors, []);
  });

  it('LiteSpeed Cache site (id=root) is NOT flagged as CSR', async () => {
    const result = await fetchPage('http://example.com/', {
      fetchFn: makeFetchFn(LITESPEED_CACHE_HTML),
    });
    assert.strictEqual(
      result.has_ssr_content,
      true,
      'LiteSpeed Cache site should not be flagged as CSR'
    );
  });

  it('LiteSpeed Cache site has no CSR errors', async () => {
    const result = await fetchPage('http://example.com/', {
      fetchFn: makeFetchFn(LITESPEED_CACHE_HTML),
    });
    const csrErrors = result.errors.filter((e) =>
      e.toLowerCase().includes('client-side')
    );
    assert.deepStrictEqual(csrErrors, []);
  });

  it('pre-rendered Next.js site (id=__next) is NOT flagged as CSR', async () => {
    const result = await fetchPage('http://example.com/', {
      fetchFn: makeFetchFn(PRERENDER_SERVICE_HTML),
    });
    assert.strictEqual(
      result.has_ssr_content,
      true,
      'Pre-rendered Next.js site should not be flagged as CSR'
    );
  });

  it('pre-rendered Next.js site has no CSR errors', async () => {
    const result = await fetchPage('http://example.com/', {
      fetchFn: makeFetchFn(PRERENDER_SERVICE_HTML),
    });
    const csrErrors = result.errors.filter((e) =>
      e.toLowerCase().includes('client-side')
    );
    assert.deepStrictEqual(csrErrors, []);
  });
});

describe('TestSSRDetectionTruePositives', () => {
  it('empty <div id="app"> shell is flagged as CSR', async () => {
    const result = await fetchPage('http://example.com/', {
      fetchFn: makeFetchFn(TRUE_CSR_SHELL_HTML),
    });
    assert.strictEqual(
      result.has_ssr_content,
      false,
      "Empty <div id='app'> shell should be flagged as CSR"
    );
  });

  it('empty <div id="app"> shell has at least one CSR error', async () => {
    const result = await fetchPage('http://example.com/', {
      fetchFn: makeFetchFn(TRUE_CSR_SHELL_HTML),
    });
    const csrErrors = result.errors.filter((e) =>
      e.toLowerCase().includes('client-side')
    );
    assert.ok(csrErrors.length >= 1);
  });

  it('<div id="root">Loading...</div> shell is flagged as CSR', async () => {
    const result = await fetchPage('http://example.com/', {
      fetchFn: makeFetchFn(TRUE_CSR_ROOT_HTML),
    });
    assert.strictEqual(
      result.has_ssr_content,
      false,
      "<div id='root'>Loading...</div> shell should be flagged as CSR"
    );
  });

  it('<div id="root">Loading...</div> shell has at least one CSR error', async () => {
    const result = await fetchPage('http://example.com/', {
      fetchFn: makeFetchFn(TRUE_CSR_ROOT_HTML),
    });
    const csrErrors = result.errors.filter((e) =>
      e.toLowerCase().includes('client-side')
    );
    assert.ok(csrErrors.length >= 1);
  });
});

describe('TestSSRWordCountReported', () => {
  it('CSR error message includes the word count', async () => {
    const result = await fetchPage('http://example.com/', {
      fetchFn: makeFetchFn(TRUE_CSR_SHELL_HTML),
    });
    const csrErrors = result.errors.filter((e) =>
      e.toLowerCase().includes('client-side')
    );
    assert.ok(
      csrErrors.some((e) => e.toLowerCase().includes('word')),
      'CSR error should mention word count'
    );
  });
});

describe('TestSSRDecomposeOrderIndependence', () => {
  it('root div with nested scripts + rich text is NOT flagged as CSR', async () => {
    const html = `<!DOCTYPE html>
<html><head><title>T</title></head>
<body>
  <div id="app">
    <script>window.__STATE__={};</script>
    <style>.x{color:red}</style>
    <h1>Main heading</h1>
    <p>Rich server-rendered paragraph one with many words to ensure the page
    exceeds the minimum threshold for the improved heuristic to correctly
    classify this page as server-rendered rather than a CSR shell waiting for
    JavaScript to populate it with content fetched from an API endpoint.</p>
    <p>Rich server-rendered paragraph two with additional words providing more
    context and information that would be valuable to AI models and search
    engines crawling this fully server-rendered page built with a framework
    that happens to use a div with id app as its mount point.</p>
  </div>
</body></html>`;

    const result = await fetchPage('http://example.com/', {
      fetchFn: makeFetchFn(html),
    });
    assert.strictEqual(result.has_ssr_content, true);
  });
});

describe('TestOutputContract', () => {
  it('result contains all required fields', async () => {
    const result = await fetchPage('http://example.com/', {
      fetchFn: makeFetchFn(NO_FRAMEWORK_HTML),
    });
    const required = [
      'url', 'status_code', 'redirect_chain', 'headers',
      'title', 'description', 'canonical',
      'h1_tags', 'heading_structure', 'word_count', 'text_content',
      'internal_links', 'external_links', 'images',
      'structured_data', 'has_ssr_content', 'security_headers', 'errors',
    ];
    for (const field of required) {
      assert.ok(Object.hasOwn(result, field), `Missing field: ${field}`);
    }
  });

  it('extracts title correctly', async () => {
    const result = await fetchPage('http://example.com/', {
      fetchFn: makeFetchFn(NO_FRAMEWORK_HTML),
    });
    assert.strictEqual(result.title, 'Plain HTML Site');
  });

  it('extracts h1 tags correctly', async () => {
    const result = await fetchPage('http://example.com/', {
      fetchFn: makeFetchFn(NO_FRAMEWORK_HTML),
    });
    assert.deepStrictEqual(result.h1_tags, ['A standard HTML page']);
  });

  it('extracts JSON-LD structured data', async () => {
    const html = `<!DOCTYPE html><html><head>
      <script type="application/ld+json">{"@type":"Organization","name":"Acme"}</script>
    </head><body><p>content</p></body></html>`;
    const result = await fetchPage('http://example.com/', {
      fetchFn: makeFetchFn(html),
    });
    assert.strictEqual(result.structured_data.length, 1);
    assert.strictEqual(result.structured_data[0]['@type'], 'Organization');
  });
});
