'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Bold, Italic, Link, Heading3, Eye, EyeOff } from 'lucide-react';
import { Textarea } from '@/components/ui/Textarea';

const CONTENT_MAX_LENGTH = 5000;

/**
 * Converts a subset of markdown to HTML for preview purposes.
 * The input is admin-authored content (not user-submitted), so XSS risk is minimal.
 * HTML entities are escaped before any markdown transformation.
 */
function simpleMarkdownToHtml(md: string): string {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(
    /^# (.+)$/gm,
    '<h3 style="font-size:18px;font-weight:600;margin:8px 0">$1</h3>'
  );
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" style="color:#0d9488;text-decoration:underline">$1</a>'
  );
  html = html.replace(/\n/g, '<br/>');
  return html;
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

  // Admin-only preview — content is authored by admins, not user input.
  // HTML entities are escaped in simpleMarkdownToHtml before transformation.
  const previewHtml = simpleMarkdownToHtml(content);

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
          {[
            { icon: Bold, label: 'Bold', handler: handleInsertBold },
            { icon: Italic, label: 'Italic', handler: handleInsertItalic },
            { icon: Link, label: 'Link', handler: handleInsertLink },
            { icon: Heading3, label: 'Heading', handler: handleInsertHeading },
          ].map(({ icon: IconComp, label, handler }) => (
            <button
              key={label}
              type='button'
              onClick={handler}
              title={label}
              style={{
                padding: '6px 8px',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                backgroundColor: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <IconComp size={16} />
            </button>
          ))}
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
          // eslint-disable-next-line react/no-danger -- admin-only preview with escaped HTML entities
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
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
