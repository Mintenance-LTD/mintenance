'use client';

import React, { useEffect } from 'react';
import { Camera, FileText, Plus } from 'lucide-react';

interface UploadDropzoneProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPickFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDropFiles: (files: FileList) => void;
  acceptedExts: string;
}

/**
 * Brand-dashed dropzone matching redesign-v2/documents-web.html.
 * Also installs window-level drag/drop handlers so the user can
 * drop anywhere on the page; the visual highlight applies only
 * to this dropzone.
 */
export function UploadDropzone({
  fileInputRef,
  onPickFiles,
  onDropFiles,
  acceptedExts,
}: UploadDropzoneProps) {
  const [dragHover, setDragHover] = React.useState(false);

  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      setDragHover(true);
    };
    const onDragLeave = (e: DragEvent) => {
      if (
        e.relatedTarget === null ||
        e.relatedTarget === undefined ||
        e.relatedTarget === document.documentElement
      ) {
        setDragHover(false);
      }
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragHover(false);
      if (e.dataTransfer?.files) onDropFiles(e.dataTransfer.files);
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [onDropFiles]);

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      role='button'
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      }}
      style={{
        background: dragHover ? 'var(--me-brand-soft)' : 'var(--me-surface)',
        border: '2px dashed var(--me-brand)',
        borderRadius: 22,
        padding: '60px 40px',
        textAlign: 'center',
        marginBottom: 18,
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'var(--me-brand-soft)',
          color: 'var(--me-brand)',
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto 18px',
        }}
      >
        <Plus size={32} strokeWidth={1.75} />
      </div>
      <div
        style={{
          fontFamily:
            'var(--me-font-display, "Instrument Serif", Georgia, serif)',
          fontSize: 24,
          letterSpacing: '-0.012em',
          marginBottom: 4,
        }}
      >
        Drop files anywhere
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--me-ink-3)',
          marginBottom: 20,
        }}
      >
        PDF, JPG, PNG, DOCX up to 25MB each
      </div>
      <div
        style={{
          display: 'flex',
          gap: 10,
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          type='button'
          className='btn btn-primary btn-sm'
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          <FileText size={13} strokeWidth={1.75} /> Browse files
        </button>
        <button
          type='button'
          className='btn btn-secondary btn-sm'
          onClick={(e) => {
            e.stopPropagation();
            if (fileInputRef.current) {
              fileInputRef.current.setAttribute('capture', 'environment');
              fileInputRef.current.click();
              setTimeout(() => {
                fileInputRef.current?.removeAttribute('capture');
              }, 1000);
            }
          }}
        >
          <Camera size={13} strokeWidth={1.75} /> Use camera
        </button>
      </div>
      <input
        ref={fileInputRef}
        type='file'
        multiple
        accept={acceptedExts}
        style={{ display: 'none' }}
        onChange={onPickFiles}
      />
    </div>
  );
}
