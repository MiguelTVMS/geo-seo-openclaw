/**
 * llmstxt-generator.mjs — llms.txt validator and generator
 *
 * Validates an existing /llms.txt file or generates a new one by crawling
 * the site starting from the homepage.
 *
 * Usage:
 *   node scripts/llmstxt-generator.mjs --url <url> --mode validate
 *   node scripts/llmstxt-generator.mjs --url <url> --mode generate
 *   node scripts/llmstxt-generator.mjs --help
 *
 * Output: JSON to stdout (including on fatal error). Errors also to stderr, exit code 1.
 */

import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

// ---------------------------------------------------------------------------
// Validate an existing llms.txt
// ---------------------------------------------------------------------------

/**
 * @param {string} url - any URL on the domain
 * @param {{ fetchFn?: Function }} options
 * @returns {Promise<object>}
 */
export async function validateLlmstxt(url, { fetchFn = fetch } = {}) {
  const base = getBase(url);
  const llmsUrl = `${base}/llms.txt`;
  const llmsFullUrl = `${base}/llms-full.txt`;

  const result = {
    url: llmsUrl,
    status: 'not_found',
    score: 0,
    exists: false,
    format_valid: false,
    has_title: false,
    has_description: false,
    has_sections: false,
    has_links: false,
    section_count: 0,
    link_count: 0,
    content: '',
    issues: [],
    suggestions: [],
    full_version: { url: llmsFullUrl, exists: false },
  };

  try {
    const res = await fetchFn(llmsUrl, { headers: DEFAULT_HEADERS });
    if (res.status === 200) {
      result.exists = true;
      result.status = 'found';
      const content = await res.text();
      result.content = content;

      const lines = content.trim().split(/\r?\n/);

      if (lines[0]?.startsWith('# ')) {
        result.has_title = true;
      } else {
        result.issues.push("Missing title — first line must be '# Site Name'");
      }

      if (lines.some((l) => l.startsWith('> '))) {
        result.has_description = true;
      } else {
        result.issues.push("Missing description — add '> Brief description' after title");
      }

      const sections = lines.filter((l) => l.startsWith('## '));
      result.section_count = sections.length;
      result.has_sections = sections.length > 0;
      if (!result.has_sections) {
        result.issues.push("No sections — add '## Section Name' headings");
      }

      const linkMatches = content.match(/^- \[.+\]\(.+\)/gm) || [];
      result.link_count = linkMatches.length;
      result.has_links = linkMatches.length > 0;
      if (!result.has_links) {
        result.issues.push("No page links — add '- [Page Title](url): Description' entries");
      }

      result.format_valid =
        result.has_title && result.has_description && result.has_sections && result.has_links;

      if (result.link_count < 5)
        result.suggestions.push('Add more key page entries (aim for 10-20)');
      if (result.section_count < 2)
        result.suggestions.push('Add more sections to organise content types');
      if (!/contact/i.test(content))
        result.suggestions.push('Add a Contact section with email and website');
      if (!/key fact/i.test(content) && !/about/i.test(content))
        result.suggestions.push('Add Key Facts section with founding date, location, core services');

      result.score = _scoreValidation(result);
    } else {
      result.issues.push(`llms.txt returned HTTP ${res.status}`);
      // Distinguish HTTP errors from true 404/not-found
      if (res.status !== 404) result.status = 'http_error';
    }
  } catch (err) {
    result.issues.push(`Error fetching llms.txt: ${err.message}`);
    result.status = 'error';
  }

  // Check llms-full.txt
  try {
    const fullRes = await fetchFn(llmsFullUrl, { headers: DEFAULT_HEADERS });
    if (fullRes.status === 200) result.full_version.exists = true;
  } catch {
    // not present — that's fine
  }

  return result;
}

function _scoreValidation(r) {
  let completeness = 0;
  if (r.has_title) completeness += 20;
  if (r.has_description) completeness += 20;
  if (r.has_sections) completeness += 20;
  if (r.link_count >= 5) completeness += 20;
  if (r.link_count >= 10) completeness += 10;
  if (r.full_version?.exists) completeness += 10;

  // Clamp to 100
  return Math.min(completeness, 100);
}

// ---------------------------------------------------------------------------
// Generate a new llms.txt from site crawl
// ---------------------------------------------------------------------------

/**
 * @param {string} url
 * @param {{ fetchFn?: Function, maxPages?: number }} options
 * @returns {Promise<object>}
 */
export async function generateLlmstxt(url, { fetchFn = fetch, maxPages = 30 } = {}) {
  const base = getBase(url);
  const result = {
    status: 'generated',
    pages_analyzed: 0,
    sections: {},
    generated: '',
    issues: [],
    suggestions: [],
  };

  let homepageHtml = '';
  try {
    const res = await fetchFn(`${base}/`, { headers: DEFAULT_HEADERS });
    if (!(res.ok ?? (res.status >= 200 && res.status < 300))) {
      const statusText = res.statusText || '';
      result.issues.push(
        `Failed to fetch homepage: HTTP ${res.status}${statusText ? ` ${statusText}` : ''}`,
      );
      result.status = 'error';
      return result;
    }
    homepageHtml = await res.text();
  } catch (err) {
    result.issues.push(`Failed to fetch homepage: ${err.message}`);
    result.status = 'error';
    return result;
  }

  const $ = cheerio.load(homepageHtml);

  // Site identity
  const rawTitle = $('title').first().text().trim();
  const siteName = rawTitle.split(/[|\-–]/)[0].trim() || new URL(base).hostname;
  const siteDescription =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    `Official website of ${siteName}`;

  // Discover and categorise internal pages
  const pages = {
    'Main Pages': [],
    'Products & Services': [],
    'Resources & Blog': [],
    Company: [],
    Support: [],
  };

  // Initialize seen with just the base URL (not base+'/' duplicate)
  // so pages_analyzed accurately reflects discovered URLs
  const seen = new Set([base]);
  const SKIP_EXTS = /\.(pdf|jpg|jpeg|png|gif|svg|webp|css|js|ico|xml|json)$/i;

  $('a[href]').each((_, el) => {
    if (seen.size >= maxPages) return false;
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    let abs;
    try {
      abs = new URL(href, base).href.split('#')[0];
    } catch {
      return;
    }
    const parsed = new URL(abs);
    if (parsed.hostname !== new URL(base).hostname) return;
    if (SKIP_EXTS.test(parsed.pathname)) return;
    if (seen.has(abs)) return;
    seen.add(abs);

    const text = $(el).text().trim();
    if (!text || text.length < 2) return;

    const path = parsed.pathname.toLowerCase();
    const entry = { url: abs, title: text };

    if (/\/(pricing|feature|product|solution|demo)/.test(path))
      pages['Products & Services'].push(entry);
    else if (/\/(blog|article|resource|guide|learn|docs|documentation)/.test(path))
      pages['Resources & Blog'].push(entry);
    else if (/\/(about|team|career|contact|press|partner)/.test(path))
      pages['Company'].push(entry);
    else if (/\/(help|support|faq|status)/.test(path))
      pages['Support'].push(entry);
    else pages['Main Pages'].push(entry);
  });

  result.pages_analyzed = seen.size;
  result.urls_discovered = seen.size; // Alias: links found via <a> tags (not all fetched)
  result.sections = Object.fromEntries(Object.entries(pages).map(([k, v]) => [k, v.length]));

  // Build llms.txt content
  const lines = [`# ${siteName}`, `> ${siteDescription}`, ''];

  lines.push('## Main Pages');
  lines.push(`- [Home](${base}/): Homepage of ${siteName}.`);
  for (const p of pages['Main Pages'].slice(0, 8)) {
    lines.push(`- [${p.title}](${p.url})`);
  }
  lines.push('');

  for (const [section, sectionPages] of Object.entries(pages)) {
    if (section === 'Main Pages' || sectionPages.length === 0) continue;
    lines.push(`## ${section}`);
    for (const p of sectionPages.slice(0, 10)) {
      lines.push(`- [${p.title}](${p.url})`);
    }
    lines.push('');
  }

  lines.push('## Contact');
  lines.push(`- Website: ${base}`);
  lines.push(`- Email: contact@${new URL(base).hostname}`);
  lines.push('');

  result.generated = lines.join('\n');
  return result;
}

// ---------------------------------------------------------------------------
// Combined entry point (validate → generate if not found)
// ---------------------------------------------------------------------------

/**
 * @param {string} url
 * @param {'validate'|'generate'} mode
 * @param {{ fetchFn?: Function }} options
 * @returns {Promise<object>}
 */
export async function runLlmstxt(url, mode = 'validate', { fetchFn = fetch } = {}) {
  const VALID_MODES = ['validate', 'generate'];
  if (!VALID_MODES.includes(mode)) {
    return {
      status: 'error',
      issues: [`Unknown mode '${mode}' — valid modes are: ${VALID_MODES.join(', ')}`],
      generated: '',
    };
  }

  if (mode === 'validate') {
    const validation = await validateLlmstxt(url, { fetchFn });
    // Only fall back to generate on true not-found (404/DNS miss).
    // Preserve http_error/error statuses — don't generate on 403/500.
    if (validation.status !== 'not_found') {
      return validation;
    }
    const generated = await generateLlmstxt(url, { fetchFn });
    // Merge issues/suggestions intentionally — don't overwrite validation reason
    return {
      ...validation,
      ...generated,
      issues: [
        ...(Array.isArray(validation.issues) ? validation.issues : []),
        ...(Array.isArray(generated.issues) ? generated.issues : []),
      ],
      suggestions: [
        ...(Array.isArray(validation.suggestions) ? validation.suggestions : []),
        ...(Array.isArray(generated.suggestions) ? generated.suggestions : []),
      ],
      status: 'not_found',
    };
  }
  return generateLlmstxt(url, { fetchFn });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBase(url) {
  const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
  // Use host (hostname + port) to preserve explicit ports (e.g., localhost:3000)
  return `${parsed.protocol}//${parsed.host}`;
}

// CLI entrypoint
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    process.stdout.write(
      'Usage: node scripts/llmstxt-generator.mjs --url <url> [--mode validate|generate]\n\n' +
      'Options:\n' +
      '  --url <url>              URL to analyse (required)\n' +
      '  --mode validate|generate Mode of operation (default: validate)\n' +
      '  --help                   Show this help message\n\n' +
      'Output: JSON to stdout. On error, JSON error object to stdout + message to stderr.\n'
    );
    process.exit(0);
  }

  const urlIdx = args.indexOf('--url');
  const modeIdx = args.indexOf('--mode');

  if (urlIdx === -1 || !args[urlIdx + 1]) {
    process.stderr.write('Error: --url is required\n');
    process.stderr.write('Run with --help for usage.\n');
    process.stdout.write(JSON.stringify({ error: '--url is required' }) + '\n');
    process.exit(1);
  }

  const url = args[urlIdx + 1];
  const mode = modeIdx !== -1 ? args[modeIdx + 1] : 'validate';

  runLlmstxt(url, mode)
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
