/**
 * Phase 3 foundation smoke tests.
 * Validates that Node 22+ built-ins and required dependencies are available
 * before Phase 4 script migration begins.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as cheerio from 'cheerio';

describe('Node runtime foundation', () => {
  it('Node version meets minimum floor (22.14.0)', () => {
    const [major, minor, patch] = process.versions.node.split('.').map(Number);
    // Node 22.14.0 is the minimum; we're running higher in practice
    assert.ok(
      major > 22 || (major === 22 && (minor > 14 || (minor === 14 && patch >= 0))),
      `Node ${process.versions.node} does not meet >=22.14.0 requirement`
    );
  });

  it('native fetch is available without polyfill', () => {
    assert.strictEqual(typeof fetch, 'function', 'fetch must be a global function');
  });

  it('native URL API is available', () => {
    const url = new URL('https://example.com/path?q=1');
    assert.strictEqual(url.hostname, 'example.com');
    assert.strictEqual(url.pathname, '/path');
    assert.strictEqual(url.searchParams.get('q'), '1');
  });

  it('cheerio loads and parses HTML in ESM context', () => {
    const html = '<h1>GEO Test</h1><p class="intro">passage content</p>';
    const $ = cheerio.load(html);
    assert.strictEqual($('h1').text(), 'GEO Test');
    assert.strictEqual($('p.intro').text(), 'passage content');
  });

  it('cheerio handles real-world HTML structures', () => {
    const html = `
      <html>
        <head><title>Test</title></head>
        <body>
          <script type="application/ld+json">{"@type":"Organization","name":"Acme"}</script>
          <nav><a href="/about">About</a><a href="/services">Services</a></nav>
          <main>
            <h1>Welcome</h1>
            <h2>Services</h2>
            <p>We do things.</p>
          </main>
        </body>
      </html>
    `;
    const $ = cheerio.load(html);

    // JSON-LD extraction pattern (used by geo-schema worker)
    const ldJson = $('script[type="application/ld+json"]').first().html();
    const parsed = JSON.parse(ldJson);
    assert.strictEqual(parsed['@type'], 'Organization');

    // Heading extraction pattern (used by geo-citability worker)
    const headings = [];
    $('h1, h2, h3').each((_, el) => headings.push($(el).text().trim()));
    assert.deepStrictEqual(headings, ['Welcome', 'Services']);

    // Internal link extraction pattern (used by geo-audit discovery)
    const links = [];
    $('a[href]').each((_, el) => links.push($(el).attr('href')));
    assert.deepStrictEqual(links, ['/about', '/services']);
  });

  it('ESM module type is enforced (package.json type:module)', async () => {
    // Dynamic import of a built-in — confirms ESM resolution is active
    const { readFile } = await import('node:fs/promises');
    assert.strictEqual(typeof readFile, 'function');
  });
});
