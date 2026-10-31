import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, RefreshCw, FileArchive, AlertCircle } from 'lucide-react';
import type { Translation } from '@/lib/i18n';

interface DropZoneProps {
  file: File | null;
  iconUrl: string | null;
  error: string | null;
  warning: string | null;
  isProcessing: boolean;
  progress?: { processed: number; total: number } | null;
  onFileSelect: (file: File, inputMethod?: 'drop' | 'file_picker') => void;
  onConvert: () => void;
  onReset: () => void;
  t: Translation;
}

const springTransition = { type: "spring", stiffness: 350, damping: 28 } as const;

export function DropZone({
  file,
  iconUrl,
  error,
  warning,
  isProcessing,
  progress,
  onFileSelect,
  onConvert,
  onReset,
  t
}: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) onFileSelect(selectedFile, 'file_picker');
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragOver) setIsDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) onFileSelect(droppedFile, 'drop');
  };

  const progressPercent = progress && progress.total > 0
    ? Math.min(100, Math.round((progress.processed / progress.total) * 100))
    : null;

  return (
    <motion.div
      key={error ? `input-error-${error}` : 'input'}
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, y: -10 }}
      transition={springTransition}
      className={`card ${error ? 'animate-shake' : ''}`}
    >
      <motion.div
        layout
        className={`dropzone ${file ? 'active' : ''} ${isDragOver ? 'dragover' : ''} ${error ? 'has-error' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        whileTap={isProcessing ? undefined : { scale: 0.99 }}
        style={{ cursor: isProcessing ? 'default' : 'pointer' }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".zip,.mcpack"
          style={{ display: 'none' }}
          disabled={isProcessing}
        />
        <motion.div layout>
          <AnimatePresence mode="wait">
            {isProcessing ? (
              <motion.div
                key="processing-icon"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={springTransition}
                className="dropzone-icon-container"
              >
                <RefreshCw className="dropzone-icon spin" />
              </motion.div>
            ) : error ? (
              <motion.div
                key="error-icon"
                initial={{ scale: 0.7, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 450, damping: 20 }}
                className="dropzone-icon-container"
                style={{ background: 'rgba(255, 59, 48, 0.12)', color: 'var(--color-danger)' }}
              >
                <AlertCircle className="dropzone-icon" style={{ color: 'var(--color-danger)' }} />
              </motion.div>
            ) : iconUrl ? (
              <motion.img
                key="pack-icon"
                initial={{ scale: 0.7, opacity: 0, y: 10, rotate: -4 }}
                animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={springTransition}
                src={iconUrl}
                alt="Pack Icon"
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '18px',
                  objectFit: 'cover',
                  boxShadow: '0 12px 28px rgba(0,0,0,0.16)',
                  border: '2px solid var(--color-surface)'
                }}
              />
            ) : file ? (
              <motion.div
                key="file-icon"
                initial={{ scale: 0.8, opacity: 0, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={springTransition}
                className="dropzone-icon-container"
              >
                <FileArchive className="dropzone-icon" />
              </motion.div>
            ) : (
              <motion.div
                key="upload-icon"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="dropzone-icon-container"
              >
                <Upload className="dropzone-icon" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div layout style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '100%' }}>
          <AnimatePresence mode="wait">
            <motion.p
              key={isProcessing ? 'processing' : file ? file.name : 'empty-title'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              style={{
                fontWeight: 700,
                fontSize: '18px',
                wordBreak: 'break-word',
                padding: '0 8px'
              }}
            >
              {isProcessing
                ? t.dropzoneProcessing
                : file
                  ? file.name
                  : t.dropzoneTitle}
            </motion.p>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.p
              key={
                isProcessing
                  ? 'processing-sub'
                  : error
                    ? `err-${error}`
                    : warning
                      ? `warn-${warning}`
                      : (file ? 'has-file' : 'no-file')
              }
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}
            >
              {isProcessing ? (
                progress && progress.total > 0 ? (
                  <span>{`${progress.processed} / ${progress.total} (${progressPercent}%)`}</span>
                ) : (
                  <span>{t.dropzoneProcessing}</span>
                )
              ) : error ? (
                <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{error}</span>
              ) : warning ? (
                <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>{warning}</span>
              ) : (
                file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : t.dropzoneSubtitle
              )}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {isProcessing ? (
            <motion.div
              key="processing-bar-wrapper"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}
            >
              <div className="dropzone-progress-bar">
                {progressPercent !== null ? (
                  <motion.div
                    className="dropzone-progress-indicator"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ ease: "easeOut", duration: 0.15 }}
                  />
                ) : (
                  <div className="dropzone-progress-indeterminate" />
                )}
              </div>
            </motion.div>
          ) : file ? (
            <motion.div
              key="action-buttons"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: 4 }}
              transition={{ duration: 0.15 }}
              style={{ display: 'flex', gap: '10px', marginTop: '14px', justifyContent: 'center' }}
            >
              <motion.button
                whileHover={{
                  backgroundColor: 'var(--color-danger)',
                  color: 'white',
                  scale: 1.05,
                  transition: { duration: 0.1 }
                }}
                transition={{ duration: 0.15 }}
                whileTap={{ scale: 0.94 }}
                className="secondary"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onReset(); }}
                style={{ padding: '12px', minWidth: '46px', width: '46px', justifyContent: 'center' }}
                aria-label="Reset selection"
              >
                <X size={20} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={springTransition}
                className="primary"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onConvert(); }}
              >
                {t.btnConvert}
              </motion.button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
