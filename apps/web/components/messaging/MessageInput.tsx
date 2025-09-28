import React, { useState, useRef, KeyboardEvent } from 'react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = 'Type a message...',
}) => {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSendMessage(trimmedMessage);
      setMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 120); // Max height of ~5 lines
    textarea.style.height = `${newHeight}px`;
  };

  const handleFileUpload = () => {
    // TODO: implement file upload
    alert('File upload feature coming soon!');
  };

  const handleEmojiPicker = () => {
    // TODO: implement emoji picker
    alert('Emoji picker coming soon!');
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: theme.spacing.sm,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.white,
        borderTop: `1px solid ${theme.colors.border}`,
        borderRadius: `0 0 ${theme.borderRadius.lg} ${theme.borderRadius.lg}`,
      }}
    >
      {/* File Upload Button */}
      <button
        onClick={handleFileUpload}
        disabled={disabled}
        style={{
          padding: theme.spacing.sm,
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: theme.borderRadius.md,
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: disabled ? theme.colors.textSecondary : theme.colors.primary,
          fontSize: theme.typography.fontSize.lg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title="Attach file"
      >
        📎
      </button>

      {/* Message Input Container */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          backgroundColor: theme.colors.backgroundSecondary,
          borderRadius: theme.borderRadius.lg,
          border: `1px solid ${theme.colors.border}`,
          minHeight: '40px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          disabled={disabled}
          placeholder={placeholder}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            fontSize: theme.typography.fontSize.base,
            lineHeight: theme.typography.lineHeight.normal,
            backgroundColor: 'transparent',
            color: theme.colors.text,
            resize: 'none',
            minHeight: '24px',
            maxHeight: '96px',
            overflow: 'auto',
            fontFamily: theme.typography.fontFamily.regular,
          }}
          rows={1}
        />

        {/* Emoji Button */}
        <button
          onClick={handleEmojiPicker}
          disabled={disabled}
          style={{
            padding: theme.spacing.sm,
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: theme.borderRadius.md,
            cursor: disabled ? 'not-allowed' : 'pointer',
            color: disabled ? theme.colors.textSecondary : theme.colors.primary,
            fontSize: theme.typography.fontSize.lg,
            marginRight: theme.spacing.xs,
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Add emoji"
        >
          😊
        </button>
      </div>

      {/* Send Button */}
      <Button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        variant="primary"
        size="sm"
        style={{
          minWidth: '60px',
          height: '40px',
          borderRadius: theme.borderRadius.lg,
          fontSize: theme.typography.fontSize.lg,
        }}
      >
        ↗️
      </Button>
    </div>
  );
};