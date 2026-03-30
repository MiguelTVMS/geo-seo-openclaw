/**
 * fetch-page.mjs — GEO page fetcher and SSR heuristic
 *
 * Fetches a URL and returns structured analysis data including:
 * - HTML metadata (title, description, canonical, headings)
 * - Structured data (JSON-LD)
 * - Internal/external links and images
 * - Security headers
 * - SSR detection (Issue #19: dual-condition guard prevents false positives)
 *
 * Usage: node scripts/fetch-page.mjs --url <url> [--timeout <seconds>]
 *        node scripts/fetch-page.mjs --help
 * Output: JSON to stdout (including on fatal error). Errors also to stderr, exit code 1.
 */

import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const SECURITY_HEADERS = [
  'strict-transport-security',
  'content-security-policy',
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'permissions-policy',
];

const FRAMEWORK_ROOT_RE = /(app|root|__next|__nuxt)/i;

/**
 * Fetch a page and return structured analysis data.
 *
 * @param {string} url
 * @param {{ timeout?: number, fetchFn?: Function, includeHtml?: boolean }} options
 * @returns {Promise<object>}
 */
export async function fetchPage(url, { timeout = 30, fetchFn = fetch, includeHtml = false } = {}) {
  const result = {
    url,
    status_code: null,
    redirect_chain: [],
    headers: {},
    title: null,
    description: null,
    canonical: null,
    h1_tags: [],
    heading_structure: [],
    word_count: 0,
    text_content: '',
    internal_links: [],
    external_links: [],
    images: [],
    structured_data: [],
    has_ssr_content: true,
    security_headers: {},
    errors: [],
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout * 1000);

  try {
    // Manually follow redirects to populate redirect_chain
    const MAX_REDIRECTS = 10;
    let currentUrl = url;
    let response;
    let redirectLimitExceeded = false;

    for (let i = 0; i < MAX_REDIRECTS; i++) {
      response = await fetchFn(currentUrl, {
        headers: DEFAULT_HEADERS,
        redirect: 'manual',
        signal: controller.signal,
      });

      const status = response.status;
      if (status >= 300 && status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          result.errors.push(`Redirect response (${status}) missing Location header at ${currentUrl}`);
          break;
        }
        const nextUrl = new URL(location, currentUrl).toString();
        result.redirect_chain.push({ url: currentUrl, from: currentUrl, to: nextUrl, status });
        currentUrl = nextUrl;
        if (i === MAX_REDIRECTS - 1) redirectLimitExceeded = true;
        continue;
      }
      break;
    }

    if (!response) throw new Error('No response received');
    if (redirectLimitExceeded) {
      result.errors.push('Too many redirects');
    }

    result.status_code = response.status;

    // Collect response headers
    const rawHeaders = {};
    response.headers.forEach((value, key) => {
      rawHeaders[key] = value;
    });
    result.headers = rawHeaders;

    // Security headers
    for (const h of SECURITY_HEADERS) {
      if (rawHeaders[h]) result.security_headers[h] = rawHeaders[h];
    }

    const html = await response.text();
    // Only include raw HTML in output when explicitly requested (opt-in)
    // to keep default stdout output lightweight
    if (includeHtml) result.html = html;
    const $ = cheerio.load(html);

    // Basic metadata
    result.title = $('title').first().text().trim() || null;
    result.description =
      $('meta[name="description"]').attr('content')?.trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() ||
      null;
    result.canonical =
      $('link[rel="canonical"]').attr('href')?.trim() || null;

    // Heading structure — must run BEFORE decompose()
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const tag = el.tagName.toLowerCase();
      const level = parseInt(tag.slice(1), 10);
      const text = $(el).text().trim();
      result.heading_structure.push({ tag, level, text });
      if (tag === 'h1') result.h1_tags.push(text);
    });

    // JSON-LD structured data — must run BEFORE decompose()
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const raw = $(el).html();
        // Guard against empty/missing JSON-LD content; treat as invalid
        if (raw == null || raw.trim() === '') {
          result.errors.push('Invalid JSON-LD detected');
          return;
        }
        const data = JSON.parse(raw);
        if (data !== null && (Array.isArray(data) || typeof data === 'object')) {
          result.structured_data.push(data);
        } else {
          result.errors.push('Invalid JSON-LD detected');
        }
      } catch {
        result.errors.push('Invalid JSON-LD detected');
      }
    });

    // SSR check — MUST run BEFORE decompose() mutates the tree
    // Issue #19: dual-condition guard prevents false positives on
    // WordPress/Bricks/LiteSpeed sites that use framework-style root divs
    // but serve full server-rendered HTML.
    const ssrCheckResults = [];
    $('[id]').each((_, el) => {
      const id = $(el).attr('id') || '';
      if (FRAMEWORK_ROOT_RE.test(id)) {
        const innerText = $(el).text().trim();
        ssrCheckResults.push({ id, text_length: innerText.length });
      }
    });

    // Use the final URL after redirect chain for link resolution and classification
    const effectiveUrl = currentUrl;
    const parsedUrl = new URL(effectiveUrl);
    const baseDomain = parsedUrl.hostname;
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
      try {
        const abs = new URL(href, effectiveUrl).href;
        const parsed = new URL(abs);
        const linkText = $(el).text().trim();
        if (parsed.hostname === baseDomain) {
          result.internal_links.push({ url: abs, text: linkText });
        } else if (['http:', 'https:'].includes(parsed.protocol)) {
          result.external_links.push({ url: abs, text: linkText });
        }
      } catch {
        // malformed href — skip
      }
    });

    // Images — must run BEFORE decompose()
    $('img').each((_, el) => {
      result.images.push({
        src: $(el).attr('src') || '',
        alt: $(el).attr('alt') || '',
        width: $(el).attr('width') || null,
        height: $(el).attr('height') || null,
        loading: $(el).attr('loading') || null,
      });
    });

    // Text content — decompose non-content elements (destructive)
    $('script, style, nav, footer, header').each((_, el) => $(el).remove());
    const text = $.root().text().replace(/\s+/g, ' ').trim();
    result.text_content = text;
    result.word_count = text ? text.split(/\s+/).length : 0;

    // SSR assessment — uses pre-decompose measurements + final word count
    // Only flag CSR when BOTH conditions hold:
    //   1. Framework root div has < 50 chars of inner text
    //   2. Overall page word count is < 200
    for (const check of ssrCheckResults) {
      if (check.text_length < 50 && result.word_count < 200) {
        result.has_ssr_content = false;
        result.errors.push(
          `Possible client-side only rendering detected: ` +
            `#${check.id} has minimal server-rendered content ` +
            `(${result.word_count} words on page)`
        );
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      result.errors.push(`Timeout after ${timeout} seconds`);
    } else if (err.cause?.code === 'ECONNREFUSED' || err.cause?.code === 'ENOTFOUND') {
      result.errors.push(`Connection error: ${err.message}`);
    } else {
      result.errors.push(`Unexpected error: ${err.message}`);
    }
  } finally {
    clearTimeout(timer);
  }

  return result;
}

// CLI entrypoint
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    process.stdout.write(
      'Usage: node scripts/fetch-page.mjs --url <url> [--timeout <seconds>]\n\n' +
      'Options:\n' +
      '  --url <url>         URL to fetch (required)\n' +
      '  --timeout <seconds> Request timeout in seconds (default: 30)\n' +
      '  --help              Show this help message\n\n' +
      'Output: JSON to stdout. On error, JSON error object to stdout + message to stderr.\n'
    );
    process.exit(0);
  }

  const urlIdx = args.indexOf('--url');
  const timeoutIdx = args.indexOf('--timeout');

  if (urlIdx === -1 || !args[urlIdx + 1]) {
    process.stderr.write('Error: --url is required\n');
    process.stderr.write('Run with --help for usage.\n');
    process.stdout.write(JSON.stringify({ error: '--url is required' }) + '\n');
    process.exit(1);
  }

  const url = args[urlIdx + 1];
  let timeout = 30;
  if (timeoutIdx !== -1) {
    const rawTimeout = args[timeoutIdx + 1];
    const parsedTimeout = Number.parseInt(rawTimeout, 10);
    if (Number.isFinite(parsedTimeout) && parsedTimeout > 0) {
      timeout = parsedTimeout;
    }
  }

  fetchPage(url, { timeout })
    .then((result) => process.stdout.write(JSON.stringify(result, null, 2) + '\n'))
    .catch((err) => {
      const msg = err?.message ?? 'Unknown error';
      process.stderr.write(`Fatal: ${msg}\n`);
      try {
        process.stdout.write(JSON.stringify({ error: msg }) + '\n');
      } catch {
        process.stdout.write('{"error":"Unknown error"}\n');
      }
      process.exit(1);
    });
}
