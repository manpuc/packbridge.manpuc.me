import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, RefreshCw } from 'lucide-react';

interface DropZoneProps {
  file: File | null;
  iconUrl: string | null;
  error: string | null;
  warning: string | null;
  isProcessing: boolean;
  onFileSelect: (file: File) => void;
  onConvert: () => void;
  onReset: () => void;
  t: any;
}

const springTransition = { type: "spring", stiffness: 300, damping: 30 } as const;

export function DropZone({
  file,
  iconUrl,
  error,
  warning,
  isProcessing,
  onFileSelect,
  onConvert,
  onReset,
  t
}: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) onFileSelect(selectedFile);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) onFileSelect(droppedFile);
  };

  return (
    <motion.div 
      key="input"
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={springTransition}
      className="card"
    >
      <motion.div
        layout
        className={`dropzone ${file ? 'active' : ''}`}
        onDragOver={(e: React.DragEvent) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".zip,.mcpack"
          style={{ display: 'none' }}
        />
        <motion.div layout>
          {iconUrl ? (
            <motion.img 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={iconUrl} 
              alt="Pack Icon" 
              style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '16px', 
                objectFit: 'cover',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                border: '2px solid var(--color-surface)'
              }} 
            />
          ) : (
            <Upload className="dropzone-icon" />
          )}
        </motion.div>
        <motion.div layout style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p style={{ fontWeight: 700, fontSize: '18px' }}>
            {file ? file.name : t.dropzoneTitle}
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            {error ? (
              <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{error}</span>
            ) : warning ? (
              <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>{warning}</span>
            ) : (
              file ? (file.size / (1024 * 1024)).toFixed(2) + ' MB' : t.dropzoneSubtitle
            )}
          </p>
        </motion.div>
        
        <AnimatePresence>
          {file && !isProcessing && (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'center' }}
            >
              <motion.button
                whileHover={{ 
                  backgroundColor: 'var(--color-danger)', 
                  color: 'white', 
                  scale: 1.05,
                  transition: { duration: 0.05, ease: "linear" }
                }}
                transition={{ duration: 0.05, ease: "linear" }}
                whileTap={{ scale: 0.95 }}
                className="secondary"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onReset(); }}
                style={{ padding: '12px', minWidth: '46px', width: '46px', justifyContent: 'center' }}
              >
                <X size={20} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="primary"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onConvert(); }}
              >
                {t.btnConvert}
              </motion.button>
            </motion.div>
          )}
          {isProcessing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <RefreshCw className="spin" size={20} />
              <span>{t.dropzoneProcessing}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
