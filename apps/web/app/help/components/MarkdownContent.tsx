import React from 'react';
import { theme } from '@/lib/theme';

interface MarkdownContentProps {
  content: string;
}

/**
 * Simple markdown renderer for help articles
 * Converts basic markdown syntax to HTML
 */
export function MarkdownContent({ content }: MarkdownContentProps) {
  // Split content into lines
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentParagraph: string[] = [];
  let inList = false;
  let listItems: string[] = [];
  let listOrdered = false;

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ').trim();
      if (text) {
        elements.push(
          <p key={`p-${elements.length}`} style={{
            marginBottom: theme.spacing[4],
            color: theme.colors.textPrimary,
            lineHeight: 1.7,
          }}>
            {renderInlineMarkdown(text)}
          </p>
        );
      }
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      const ListTag = listOrdered ? 'ol' : 'ul';
      elements.push(
        <ListTag key={`list-${elements.length}`} style={{
          marginBottom: theme.spacing[4],
          paddingLeft: theme.spacing[6],
          listStyleType: listOrdered ? 'decimal' : 'disc',
        }}>
          {listItems.map((item, idx) => (
            <li key={idx} style={{
              marginBottom: theme.spacing[2],
              color: theme.colors.textPrimary,
            }}>
              {renderInlineMarkdown(item.replace(/^[-*]\s+|\d+\.\s+/, ''))}
            </li>
          ))}
        </ListTag>
      );
      listItems = [];
      inList = false;
    }
  };

  const renderInlineMarkdown = (text: string): React.ReactNode => {
    // Handle bold **text**
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    // Split by ** for bold
    const boldRegex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(remaining)) !== null) {
      // Add text before bold
      if (match.index > lastIndex) {
        const beforeText = remaining.slice(lastIndex, match.index);
        parts.push(<React.Fragment key={key++}>{beforeText}</React.Fragment>);
      }
      // Add bold text
      parts.push(
        <strong key={key++} style={{
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.textPrimary,
        }}>
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }
    // Add remaining text
    if (lastIndex < remaining.length) {
      parts.push(<React.Fragment key={key++}>{remaining.slice(lastIndex)}</React.Fragment>);
    }

    return parts.length > 0 ? <>{parts}</> : text;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Headers
    if (trimmed.startsWith('# ')) {
      flushParagraph();
      flushList();
      elements.push(
        <h1 key={`h1-${index}`} style={{
          fontSize: theme.typography.fontSize['2xl'],
          fontWeight: theme.typography.fontWeight.bold,
          marginTop: theme.spacing[6],
          marginBottom: theme.spacing[4],
          color: theme.colors.textPrimary,
        }}>
          {trimmed.replace(/^#\s+/, '')}
        </h1>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushParagraph();
      flushList();
      elements.push(
        <h2 key={`h2-${index}`} style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.semibold,
          marginTop: theme.spacing[6],
          marginBottom: theme.spacing[3],
          color: theme.colors.textPrimary,
        }}>
          {trimmed.replace(/^##\s+/, '')}
        </h2>
      );
      return;
    }
    if (trimmed.startsWith('### ')) {
      flushParagraph();
      flushList();
      elements.push(
        <h3 key={`h3-${index}`} style={{
          fontSize: theme.typography.fontSize.lg,
          fontWeight: theme.typography.fontWeight.semibold,
          marginTop: theme.spacing[4],
          marginBottom: theme.spacing[2],
          color: theme.colors.textPrimary,
        }}>
          {trimmed.replace(/^###\s+/, '')}
        </h3>
      );
      return;
    }

    // Lists
    if (trimmed.match(/^[-*]\s+/)) {
      flushParagraph();
      if (!inList) {
        listOrdered = false;
        inList = true;
      }
      listItems.push(trimmed);
      return;
    }
    if (trimmed.match(/^\d+\.\s+/)) {
      flushParagraph();
      if (!inList) {
        listOrdered = true;
        inList = true;
      }
      listItems.push(trimmed);
      return;
    }

    // Empty line
    if (trimmed === '') {
      flushParagraph();
      flushList();
      return;
    }

    // Regular paragraph
    if (inList) {
      flushList();
    }
    currentParagraph.push(trimmed);
  });

  // Flush remaining
  flushParagraph();
  flushList();

  return <div>{elements}</div>;
}

