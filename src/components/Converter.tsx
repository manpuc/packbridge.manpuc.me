import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload } from 'lucide-react';
import JSZip from 'jszip';
import { convertPack } from '@/lib/pack/converter';
import type { PackReport, ConversionDirection, ConversionOptions } from '@/lib/pack/types';
import type { Translation, Language } from '@/lib/i18n';
import { JAVA_VERSIONS, BEDROCK_VERSIONS } from '@/lib/pack/versions';
import { useFileDrop } from '@/hooks/useFileDrop';

// Sub-components
import { DirectionSettings } from './converter/DirectionSettings';
import { DropZone } from './converter/DropZone';
import { ConversionReport } from './converter/ConversionReport';

interface ConverterProps {
  t: Translation;
  lang: Language;
}

export default function Converter({ t, lang: initialLang }: ConverterProps) {
  const [direction, setDirection] = useState<ConversionDirection>('java-to-bedrock');
  const [file, setFile] = useState<File | null>(null);
  const [zipInstance, setZipInstance] = useState<JSZip | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [report, setReport] = useState<PackReport | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [selectedJavaVersion, setSelectedJavaVersion] = useState(JAVA_VERSIONS[0].id);
  const [selectedBedrockVersion, setSelectedBedrockVersion] = useState(BEDROCK_VERSIONS[0].id);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // Window-wide drag and drop hook
  const { isDragging } = useFileDrop({
    onDrop: (files) => {
      const droppedFile = files[0];
      if (droppedFile) handleFile(droppedFile);
    }
  });

  const handleFile = useCallback((selectedFile: File) => {
    if (selectedFile.name.endsWith('.zip') || selectedFile.name.endsWith('.mcpack')) {
      setFile(selectedFile);
      setZipInstance(null); // Reset instance, will be loaded in preview useEffect
      setReport(null);
      setDownloadUrl(null);
      setError(null);
      setWarning(null);
    } else {
      setError(t.errorInvalidFile);
      setWarning(null);
    }
  }, [t]);

  // Preview and Content Analysis
  useEffect(() => {
    if (!file) {
      setIconUrl(null);
      setZipInstance(null);
      return;
    }

    let isMounted = true;
    let currentIconUrl: string | null = null;
    
    const analyzeFile = async () => {
      try {
        const jszip = new JSZip();
        const zip = await jszip.loadAsync(file);
        if (!isMounted) return;

        setZipInstance(zip);
        
        // Logic-based warning
        const hasManifest = zip.file('manifest.json') || zip.file(/manifest\.json$/).length > 0;
        const hasPackMcmeta = zip.file('pack.mcmeta') || zip.file(/pack\.mcmeta$/).length > 0;

        if (direction === 'java-to-bedrock' && (hasManifest || file.name.endsWith('.mcpack'))) {
          setWarning(t.warnPossibleBedrock);
        } else if (direction === 'bedrock-to-java' && hasPackMcmeta) {
          setWarning(t.warnPossibleJava);
        } else {
          setWarning(null);
        }

        // Icon extraction
        const iconEntry = zip.file('pack.png') || zip.file('pack_icon.png') || zip.file(/\/(pack\.png|pack_icon\.png)$/)[0];
        if (iconEntry) {
          const blob = await iconEntry.async('blob');
          currentIconUrl = URL.createObjectURL(blob);
          setIconUrl(currentIconUrl);
        }
      } catch (e) {
        console.error("Failed to process file", e);
      }
    };

    analyzeFile();
    return () => {
      isMounted = false;
      if (currentIconUrl) URL.revokeObjectURL(currentIconUrl);
    };
  }, [file, direction, t]);

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
      // Reuse zipInstance if available to save memory/time
      const result = await convertPack(zipInstance || file, options, file.name);
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
    setZipInstance(null);
    setReport(null);
    setDownloadUrl(null);
    setError(null);
    setWarning(null);
  };

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

      <DirectionSettings 
        direction={direction}
        setDirection={setDirection}
        selectedJavaVersion={selectedJavaVersion}
        setSelectedJavaVersion={setSelectedJavaVersion}
        selectedBedrockVersion={selectedBedrockVersion}
        setSelectedBedrockVersion={setSelectedBedrockVersion}
        t={t}
      />

      <AnimatePresence mode="wait">
        {!report ? (
          <DropZone 
            file={file}
            iconUrl={iconUrl}
            error={error}
            warning={warning}
            isProcessing={isProcessing}
            onFileSelect={handleFile}
            onConvert={startConversion}
            onReset={reset}
            t={t}
          />
        ) : (
          <ConversionReport 
            report={report}
            downloadUrl={downloadUrl}
            fileName={file?.name || 'pack'}
            direction={direction}
            onReset={reset}
            t={t}
          />
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
