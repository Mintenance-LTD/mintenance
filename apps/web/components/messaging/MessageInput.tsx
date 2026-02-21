import React, { useState, useRef, KeyboardEvent } from 'react';
import { Paperclip, Smile, ExternalLink, X, FileIcon, Loader2 } from 'lucide-react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface MessageInputProps {
  onSendMessage: (message: string, attachment?: { url: string; name: string; type: string }) => void;
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
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if ((trimmedMessage || pendingFile) && !disabled) {
      onSendMessage(trimmedMessage || (pendingFile ? `Sent file: ${pendingFile.name}` : ''), pendingFile || undefined);
      setMessage('');
      setPendingFile(null);
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

    const textarea = e.target;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 120);
    textarea.style.height = `${newHeight}px`;
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File must be under 10MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const storagePath = `message-attachments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(storagePath, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(storagePath);

      setPendingFile({
        url: urlData.publicUrl,
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'file',
      });
    } catch (error) {
      toast.error('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleEmojiPicker = () => {
    const emojis = ['👍', '👋', '😊', '🎉', '✅', '❤️', '🔨', '🏠'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    setMessage(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        backgroundColor: theme.colors.white,
        borderTop: `1px solid ${theme.colors.border}`,
        borderRadius: `0 0 ${theme.borderRadius.lg} ${theme.borderRadius.lg}`,
      }}
    >
      {/* Pending file preview */}
      {pendingFile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: `${theme.spacing.sm} ${theme.spacing.md}`, backgroundColor: theme.colors.backgroundSecondary, borderBottom: `1px solid ${theme.colors.border}` }}>
          <FileIcon size={16} style={{ color: theme.colors.primary }} />
          <span style={{ fontSize: '13px', color: theme.colors.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pendingFile.name}</span>
          <button onClick={() => setPendingFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: theme.colors.textSecondary }}>
            <X size={16} />
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: theme.spacing.sm, padding: theme.spacing.md }}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelected}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          style={{ display: 'none' }}
        />

        {/* File Upload Button */}
        <button
          onClick={handleFileUpload}
          disabled={disabled || uploading}
          style={{
            padding: theme.spacing.sm,
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: theme.borderRadius.md,
            cursor: disabled || uploading ? 'not-allowed' : 'pointer',
            color: disabled ? theme.colors.textSecondary : theme.colors.primary,
            fontSize: theme.typography.fontSize.lg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!disabled && !uploading) {
              e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Attach file"
          aria-label="Attach file"
        >
          {uploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
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
            aria-label="Add emoji"
          >
            <Smile size={20} />
          </button>
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && !pendingFile)}
          variant="primary"
          size="sm"
          aria-label="Send message"
          style={{
            minWidth: '60px',
            height: '40px',
            borderRadius: theme.borderRadius.lg,
            fontSize: theme.typography.fontSize.lg,
          }}
        >
          <span aria-hidden="true"><ExternalLink size={20} /></span>
        </Button>
      </div>
    </div>
  );
};
