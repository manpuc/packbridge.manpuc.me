import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileCheck, AlertCircle, Download, RefreshCw, ChevronDown, ChevronUp, X } from 'lucide-react';
import JSZip from 'jszip';
import { convertPack } from '@/lib/pack/converter';
import type { PackReport, ConversionDirection, ConversionResult, ConversionOptions } from '@/lib/pack/types';
import { translations, type Language } from '@/lib/i18n';
import { JAVA_VERSIONS, BEDROCK_VERSIONS } from '@/lib/pack/versions';

export default function Converter() {
  const [lang, setLang] = useState<Language>('ja');
  const [direction, setDirection] = useState<ConversionDirection>('java-to-bedrock');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [report, setReport] = useState<PackReport | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedJavaVersion, setSelectedJavaVersion] = useState(JAVA_VERSIONS[0].id);
  const [selectedBedrockVersion, setSelectedBedrockVersion] = useState(BEDROCK_VERSIONS[0].id);
  const [isDragging, setIsDragging] = useState(false);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const t = translations[lang as keyof typeof translations];

  React.useEffect(() => {
    setLang(document.documentElement.lang as Language || 'ja');

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).some(t => t.toLowerCase() === 'files')) {
        dragCounter.current++;
        if (dragCounter.current === 1) {
          setIsDragging(true);
        }
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      dragCounter.current = 0;
      const droppedFile = e.dataTransfer?.files?.[0];
      if (droppedFile) {
        if (droppedFile.name.endsWith('.zip') || droppedFile.name.endsWith('.mcpack')) {
          setFile(droppedFile);
          setReport(null);
          setDownloadUrl(null);
        } else {
          alert(t.errorInvalidFile);
        }
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [t]);

  const handleFile = useCallback((selectedFile: File) => {
    if (selectedFile.name.endsWith('.zip') || selectedFile.name.endsWith('.mcpack')) {
      setFile(selectedFile);
      setReport(null);
      setDownloadUrl(null);
      setError(null);
      setWarning(null); // Reset warning, will be updated by useEffect
    } else {
      setError(t.errorInvalidFile);
      setWarning(null);
    }
  }, [t]);

  React.useEffect(() => {
    if (!file) {
      setIconUrl(null);
      return;
    }

    let isMounted = true;
    let currentIconUrl: string | null = null;
    
    const extractIcon = async () => {
      try {
        const jszip = new JSZip();
        const zip = await jszip.loadAsync(file);
        
        // 1. Logic-based warning by checking contents
        const hasManifest = zip.file('manifest.json') || zip.file(/manifest\.json$/).length > 0;
        const hasPackMcmeta = zip.file('pack.mcmeta') || zip.file(/pack\.mcmeta$/).length > 0;

        if (direction === 'java-to-bedrock' && (hasManifest || file.name.endsWith('.mcpack'))) {
          setWarning((t as any).warnPossibleBedrock);
        } else if (direction === 'bedrock-to-java' && hasPackMcmeta) {
          setWarning((t as any).warnPossibleJava);
        } else {
          setWarning(null);
        }

        // 2. Icon extraction
        const iconEntry = zip.file('pack.png') || zip.file('pack_icon.png') || zip.file(/\/(pack\.png|pack_icon\.png)$/)[0];
        
        if (iconEntry && isMounted) {
          const blob = await iconEntry.async('blob');
          currentIconUrl = URL.createObjectURL(blob);
          setIconUrl(currentIconUrl);
        }
      } catch (e) {
        console.error("Failed to process file", e);
      }
    };

    extractIcon();
    return () => {
      isMounted = false;
      if (currentIconUrl) URL.revokeObjectURL(currentIconUrl);
    };
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFile(selectedFile);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFile(droppedFile);
  }, [handleFile]);

  const startConversion = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    try {
      const options: ConversionOptions = {
        direction,
        javaVersionId: selectedJavaVersion,
        bedrockVersionId: selectedBedrockVersion
      };
      const result = await convertPack(file, options);
      setReport(result.report);
      const url = URL.createObjectURL(result.blob);
      setDownloadUrl(url);
    } catch (err) {
      console.error(err);
      setError(t.errorConversion);
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setReport(null);
    setDownloadUrl(null);
    setError(null);
    setWarning(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const springTransition = { type: "spring", stiffness: 300, damping: 30 } as const;

  return (
    <motion.div 
      layout
      className="converter-root" 
      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
    >
      <AnimatePresence>
        {isDragging && typeof document !== 'undefined' && createPortal(
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="drag-overlay"
            style={{ zIndex: 99999 }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="drag-content"
            >
              <Upload size={64} className="drag-icon" />
              <h2 style={{ fontSize: '32px', fontWeight: 800 }}>{t.dropzoneTitle}</h2>
              <p style={{ fontSize: '18px', opacity: 0.8 }}>{t.dropzoneSubtitle}</p>
            </motion.div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>

      {/* Direction Switcher */}
      <motion.div 
        layout 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="segmented-control">
          <button
            className={direction === 'java-to-bedrock' ? 'active' : ''}
            onClick={() => setDirection('java-to-bedrock')}
          >
            {t.directionJavaToBedrock}
          </button>
          <button
            className={direction === 'bedrock-to-java' ? 'active' : ''}
            onClick={() => setDirection('bedrock-to-java')}
          >
            {t.directionBedrockToJava}
          </button>
        </div>

        <motion.div layout style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            {t.targetVersion} ({direction === 'java-to-bedrock' ? 'Bedrock' : 'Java'})
          </label>
          <div className="select-wrapper">
            <select
              className="select-input"
              value={direction === 'java-to-bedrock' ? selectedBedrockVersion : selectedJavaVersion}
              onChange={(e) => direction === 'java-to-bedrock' ? setSelectedBedrockVersion(e.target.value) : setSelectedJavaVersion(e.target.value)}
            >
              {direction === 'java-to-bedrock'
                ? BEDROCK_VERSIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)
                : JAVA_VERSIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)
              }
            </select>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence mode="wait">
        {!report ? (
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
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); reset(); }}
                      style={{ padding: '12px', minWidth: '46px', width: '46px', justifyContent: 'center' }}
                    >
                      <X size={20} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="primary"
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); startConversion(); }}
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
        ) : (
          <motion.div 
            key="report"
            layout
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={springTransition}
            className="report-container" 
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
          >
            <motion.div layout className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, textAlign: 'center' }}>{t.summaryTitle}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <SummaryItem label={t.countTotal} value={report.totalFiles} index={0} />
                <SummaryItem label={t.countConverted} value={report.convertedCount} color="var(--color-success)" index={1} />
                <SummaryItem label={t.countSkipped} value={report.skippedCount} color="var(--color-warning)" index={2} />
                <SummaryItem label={t.countErrors} value={report.errorCount} color="var(--color-danger)" index={3} />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                {downloadUrl && (
                  <motion.a
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    href={downloadUrl}
                    download={`${file?.name.split('.')[0]}_converted.${direction === 'java-to-bedrock' ? 'mcpack' : 'zip'}`}
                    className="primary"
                    style={{ textDecoration: 'none', flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 24px', borderRadius: '14px', backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-text)', fontWeight: 600 }}
                  >
                    <Download size={18} />
                    {t.btnDownload}
                  </motion.a>
                )}
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="secondary" 
                  onClick={reset}
                >
                  <RefreshCw size={18} />
                  {t.btnReset}
                </motion.button>
              </div>
            </motion.div>

            <motion.div layout className="card">
              <button
                className="secondary"
                style={{ width: '100%', justifyContent: 'space-between', border: 'none', background: 'transparent' }}
                onClick={() => setShowDetails(!showDetails)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={18} />
                  {t.unsupportedTitle} ({report.skippedCount + report.errorCount})
                </span>
                <motion.div animate={{ rotate: showDetails ? 180 : 0 }}>
                  <ChevronDown size={18} />
                </motion.div>
              </button>

              <AnimatePresence>
                {showDetails && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="report-list" 
                    style={{ marginTop: '16px', maxHeight: '300px', overflowY: 'auto' }}
                  >
                    {report.details
                      .filter((d: ConversionResult) => d.status !== 'converted')
                      .map((detail: ConversionResult, idx: number) => (
                        <div key={idx} className="report-item">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: 600, wordBreak: 'break-all' }}>{detail.filename}</span>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{detail.reason}</span>
                          </div>
                          <span className={`status-badge status-${detail.status}`}>
                            {detail.status === 'skipped' ? t.statusSkipped : t.statusError}
                          </span>
                        </div>
                      ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        layout 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ 
          fontSize: '12px', 
          color: 'var(--color-text-muted)', 
          textAlign: 'center', 
          lineHeight: '1.5',
          maxWidth: '500px',
          margin: '0 auto' 
        }}
      >
        {t.disclaimerPerfect}
      </motion.div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
}

function SummaryItem({ label, value, color, index }: { label: string, value: number, color?: string, index: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 + index * 0.1 }}
      style={{ background: 'var(--color-border)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}
    >
      <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '24px', fontWeight: 800, color: color || 'var(--color-text)' }}>{value}</p>
    </motion.div>
  );
}
