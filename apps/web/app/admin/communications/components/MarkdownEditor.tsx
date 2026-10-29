'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Bold, Italic, Link, Heading3, Eye, EyeOff } from 'lucide-react';
import { Textarea } from '@/components/ui/Textarea';

const CONTENT_MAX_LENGTH = 5000;

/**
 * The input is admin-authored content, but an admin account could be
 * compromised — we still sanitize URL schemes to prevent stored XSS
 * via `javascript:` / `data:` / `vbscript:` protocol handlers.
 */
export function sanitizeUrlScheme(url: string): string {
  // Strip whitespace and control chars (e.g. \x09 in "java\tscript:")
  const cleaned = url.trim().replace(/[\x00-\x1f\x7f]/g, '');
  // Allow only http, https, mailto, and relative URLs (/path, #anchor, ?query)
  const safeSchemeRe = /^(https?:|mailto:|[/#?]|[^:]*$)/i;
  // Reject if the URL starts with a dangerous scheme
  if (!safeSchemeRe.test(cleaned)) return '#';
  // Second check: anything containing a `:` before the first `/` or `#` that
  // isn't http/https/mailto is untrusted
  const colonIdx = cleaned.indexOf(':');
  const slashIdx = cleaned.indexOf('/');
  const hashIdx = cleaned.indexOf('#');
  const hasSchemeColon =
    colonIdx !== -1 &&
    (slashIdx === -1 || colonIdx < slashIdx) &&
    (hashIdx === -1 || colonIdx < hashIdx);
  if (hasSchemeColon) {
    const scheme = cleaned.slice(0, colonIdx).toLowerCase();
    if (!['http', 'https', 'mailto'].includes(scheme)) return '#';
  }
  return cleaned;
}

// Text and attribute values are passed to React, never reparsed as HTML.
// Each recursive pass handles only the next syntax level, bounding nesting.
function renderInline(text: string, level = 0): React.ReactNode {
  const patterns = [/\[([^\]]+)\]\(([^)]+)\)/g, /\*\*(.+?)\*\*/g, /\*(.+?)\*/g];
  if (level === patterns.length) return text;
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(patterns[level])) {
    const index = match.index!;
    nodes.push(renderInline(text.slice(cursor, index), level + 1));
    const children = renderInline(match[1], level + 1);
    if (level === 0) {
      nodes.push(
        <a
          key={index}
          href={sanitizeUrlScheme(match[2])}
          style={{ color: '#0d9488', textDecoration: 'underline' }}
        >
          {children}
        </a>
      );
    } else if (level === 1) {
      nodes.push(<strong key={index}>{children}</strong>);
    } else {
      nodes.push(<em key={index}>{children}</em>);
    }
    cursor = index + match[0].length;
  }
  nodes.push(renderInline(text.slice(cursor), level + 1));
  return nodes;
}

export function renderMarkdownPreview(md: string): React.ReactNode {
  return md.split('\n').map((line, index) => (
    <React.Fragment key={index}>
      {index > 0 && <br />}
      {line.startsWith('# ') ? (
        <h3 style={{ fontSize: 18, fontWeight: 600, margin: '8px 0' }}>
          {renderInline(line.slice(2))}
        </h3>
      ) : (
        renderInline(line)
      )}
    </React.Fragment>
  ));
}

/**
 * Small presentational button used inside the markdown toolbar. Top-level
 * so its style block is shared and the parent JSX stays compact after we
 * removed the data-driven `toolbarButtons.map(...)`.
 */
function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      title={title}
      style={{
        padding: '6px 8px',
        border: '1px solid #e2e8f0',
        borderRadius: 6,
        backgroundColor: 'white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {children}
    </button>
  );
}

interface MarkdownEditorProps {
  content: string;
  onContentChange: (content: string) => void;
}

export function MarkdownEditor({
  content,
  onContentChange,
}: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wrapSelectedText = useCallback(
    (before: string, after: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = content;
      const selected = text.substring(start, end);
      const newText =
        text.substring(0, start) +
        before +
        selected +
        after +
        text.substring(end);
      onContentChange(newText);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.selectionStart = start + before.length;
        textarea.selectionEnd = start + before.length + selected.length;
      });
    },
    [content, onContentChange]
  );

  const handleInsertBold = useCallback(
    () => wrapSelectedText('**', '**'),
    [wrapSelectedText]
  );
  const handleInsertItalic = useCallback(
    () => wrapSelectedText('*', '*'),
    [wrapSelectedText]
  );
  const handleInsertLink = useCallback(
    () => wrapSelectedText('[', '](url)'),
    [wrapSelectedText]
  );
  const handleInsertHeading = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const lineStart = content.lastIndexOf('\n', start - 1) + 1;
    const newText =
      content.substring(0, lineStart) + '# ' + content.substring(lineStart);
    onContentChange(newText);
  }, [content, onContentChange]);

  // Toolbar buttons inlined below (rather than mapped over a memoized
  // array) because the array form transitively closed over
  // `textareaRef.current` via the handler functions, which the React
  // Compiler linter flags as `react-hooks/refs` (ref read in render).
  // With four buttons, the inlined JSX is shorter than the workaround.

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div
          role='toolbar'
          aria-label='Text formatting'
          style={{ display: 'flex', gap: 4 }}
        >
          <ToolbarButton onClick={handleInsertBold} title='Bold'>
            <Bold size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={handleInsertItalic} title='Italic'>
            <Italic size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={handleInsertLink} title='Link'>
            <Link size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={handleInsertHeading} title='Heading'>
            <Heading3 size={16} />
          </ToolbarButton>
        </div>
        <button
          type='button'
          onClick={() => setShowPreview(!showPreview)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            backgroundColor: '#fff',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
          {showPreview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {showPreview ? (
        <div
          style={{
            minHeight: 128,
            padding: 12,
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            backgroundColor: '#fafafa',
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {renderMarkdownPreview(content)}
        </div>
      ) : (
        <Textarea
          ref={textareaRef}
          placeholder='Announcement content... (supports **bold**, *italic*, [links](url), # headings)'
          value={content}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onContentChange(e.target.value)
          }
          rows={6}
          maxLength={CONTENT_MAX_LENGTH}
          required
        />
      )}

      <div
        style={{
          textAlign: 'right',
          fontSize: 12,
          color:
            content.length > CONTENT_MAX_LENGTH * 0.9 ? '#dc2626' : '#9ca3af',
          marginTop: 4,
        }}
      >
        {content.length} / {CONTENT_MAX_LENGTH}
      </div>
    </div>
  );
}
