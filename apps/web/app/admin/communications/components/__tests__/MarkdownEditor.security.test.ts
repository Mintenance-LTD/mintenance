/**
 * Security tests for the admin MarkdownEditor preview renderer.
 *
 * Admin accounts CAN be compromised — we sanitize URL schemes in markdown
 * links to prevent stored XSS via `javascript:` / `data:` / `vbscript:` and
 * other non-http(s) protocol handlers.
 */
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { sanitizeUrlScheme, renderMarkdownPreview } from '../MarkdownEditor';

const simpleMarkdownToHtml = (markdown: string) =>
  renderToStaticMarkup(
    createElement(Fragment, null, renderMarkdownPreview(markdown))
  );

describe('sanitizeUrlScheme', () => {
  it('allows http:// URLs', () => {
    expect(sanitizeUrlScheme('http://example.com')).toBe('http://example.com');
  });

  it('allows https:// URLs', () => {
    expect(sanitizeUrlScheme('https://example.com/path?q=1')).toBe(
      'https://example.com/path?q=1'
    );
  });

  it('allows mailto: URLs', () => {
    expect(sanitizeUrlScheme('mailto:hello@example.com')).toBe(
      'mailto:hello@example.com'
    );
  });

  it('allows relative URLs starting with /', () => {
    expect(sanitizeUrlScheme('/dashboard')).toBe('/dashboard');
  });

  it('allows anchor URLs', () => {
    expect(sanitizeUrlScheme('#section-1')).toBe('#section-1');
  });

  it('allows query-only URLs', () => {
    expect(sanitizeUrlScheme('?page=2')).toBe('?page=2');
  });

  it('BLOCKS javascript: URLs', () => {
    expect(sanitizeUrlScheme('javascript:alert(1)')).toBe('#');
  });

  it('BLOCKS javascript: URLs with whitespace obfuscation', () => {
    expect(sanitizeUrlScheme('  javascript:alert(1)  ')).toBe('#');
  });

  it('BLOCKS javascript: URLs with control-char obfuscation', () => {
    // Tab inside the scheme
    expect(sanitizeUrlScheme('java\tscript:alert(1)')).toBe('#');
    // Newline
    expect(sanitizeUrlScheme('java\nscript:alert(1)')).toBe('#');
  });

  it('BLOCKS case-variant javascript:', () => {
    expect(sanitizeUrlScheme('JavaScript:alert(1)')).toBe('#');
    expect(sanitizeUrlScheme('JAVASCRIPT:alert(1)')).toBe('#');
  });

  it('BLOCKS data: URLs', () => {
    expect(sanitizeUrlScheme('data:text/html,<script>alert(1)</script>')).toBe(
      '#'
    );
  });

  it('BLOCKS vbscript: URLs', () => {
    expect(sanitizeUrlScheme('vbscript:msgbox(1)')).toBe('#');
  });

  it('BLOCKS file: URLs', () => {
    expect(sanitizeUrlScheme('file:///etc/passwd')).toBe('#');
  });

  it('BLOCKS ftp: URLs (only http/https/mailto allowed)', () => {
    expect(sanitizeUrlScheme('ftp://example.com')).toBe('#');
  });
});

describe('React Markdown preview — XSS resistance', () => {
  it('escapes script tags in body text', () => {
    const html = simpleMarkdownToHtml('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('neutralizes javascript: href in link syntax', () => {
    const html = simpleMarkdownToHtml('[click me](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="#"');
    expect(html).toContain('click me');
  });

  it('neutralizes data: href in link syntax', () => {
    const html = simpleMarkdownToHtml(
      '[x](data:text/html,<svg/onload=alert(1)>)'
    );
    expect(html).not.toContain('data:');
    expect(html).toContain('href="#"');
  });

  it('preserves safe https links', () => {
    const html = simpleMarkdownToHtml('[example](https://example.com)');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('example');
  });

  it('escapes HTML in link label', () => {
    const html = simpleMarkdownToHtml(
      '[<img src=x onerror=alert(1)>](https://ok.com)'
    );
    // React renders the label as text, never as an image element.
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });

  it('handles markdown with quotes without breaking out of href attribute', () => {
    const html = simpleMarkdownToHtml('[x]("onclick=alert(1)//)');
    // Even if the href contains garbage, quotes must be escaped
    expect(html).not.toContain('" onclick');
  });

  it('preserves bold/italic formatting', () => {
    const html = simpleMarkdownToHtml('**bold** and *italic*');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
  });

  it('preserves headings, line breaks, and formatting inside link labels', () => {
    const html = simpleMarkdownToHtml(
      '# **Heading**\n[**bold** and *italic*](https://example.com)'
    );
    const document = new DOMParser().parseFromString(html, 'text/html');
    expect(document.querySelector('h3 strong')?.textContent).toBe('Heading');
    expect(document.querySelectorAll('br')).toHaveLength(1);
    expect(document.querySelector('a strong')?.textContent).toBe('bold');
    expect(document.querySelector('a em')?.textContent).toBe('italic');
  });

  it('does not double-escape query parameters or create attributes from quotes', () => {
    const url = 'https://example.com/?a=1&b=" onmouseover="alert';
    const document = new DOMParser().parseFromString(
      simpleMarkdownToHtml(`[x](${url})`),
      'text/html'
    );
    const link = document.querySelector('a');
    expect(link?.getAttribute('href')).toBe(url);
    expect(link?.hasAttribute('onmouseover')).toBe(false);
  });

  it('does not decode entity-obfuscated schemes into executable URLs', () => {
    const document = new DOMParser().parseFromString(
      simpleMarkdownToHtml('[x](javascript&#58;alert)'),
      'text/html'
    );
    expect(document.querySelector('a')?.getAttribute('href')).toBe(
      'javascript&#58;alert'
    );
  });
});
