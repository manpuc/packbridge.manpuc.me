import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload } from 'lucide-react';
import JSZip from 'jszip';
import { convertPackWithWorker } from '@/lib/pack/worker-client';
import type { PackReport, ConversionDirection, ConversionOptions } from '@/lib/pack/types';
import type { Translation, Language } from '@/lib/i18n';
import { JAVA_VERSIONS, BEDROCK_VERSIONS, getJavaVersionByPackFormat, getBedrockVersionByEngineVersion } from '@/lib/pack/versions';
import { useFileDrop } from '@/hooks/useFileDrop';
import { Bug } from 'lucide-react';
import { getReportStrings, reportHref, LAST_CONVERSION_KEY } from '@/lib/i18n/report';
import {
  trackEvent,
  getSizeTier,
  getDurationTier,
  getFileCountTier,
  getLocalConversionCount,
  incrementLocalConversionCount,
  getUsageTier,
  categorizeError,
  analyzeReportSafety,
  getExtClass
} from '@/lib/analytics';
import { LARGE_FILE_WARN_THRESHOLD_BYTES, MAX_SAFE_FILE_COUNT, MAX_SAFE_UNCOMPRESSED_BYTES } from '@/lib/pack/security';

// Sub-components
import { DirectionSettings } from './converter/DirectionSettings';
import { DropZone } from './converter/DropZone';
import { ConversionReport } from './converter/ConversionReport';

interface ConverterProps {
  t: Translation;
  lang: Language;
  initialDirection?: ConversionDirection;
  initialJavaVersion?: string;
  initialBedrockVersion?: string;
}

export default function Converter({
  t,
  lang: initialLang,
  initialDirection = 'java-to-bedrock',
  initialJavaVersion = JAVA_VERSIONS[0].id,
  initialBedrockVersion = BEDROCK_VERSIONS[0].id,
}: ConverterProps) {
  const [direction, setDirection] = useState<ConversionDirection>(initialDirection);
  const [file, setFile] = useState<File | null>(null);
  const [zipInstance, setZipInstance] = useState<JSZip | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [report, setReport] = useState<PackReport | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [selectedJavaVersion, setSelectedJavaVersion] = useState(initialJavaVersion);
  const [selectedBedrockVersion, setSelectedBedrockVersion] = useState(initialBedrockVersion);
  const [sourceJavaVersion, setSourceJavaVersion] = useState(initialJavaVersion);
  const [sourceBedrockVersion, setSourceBedrockVersion] = useState(initialBedrockVersion);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [enableGuiConversion, setEnableGuiConversion] = useState(false);
  const [enableModernGuiSprites, setEnableModernGuiSprites] = useState(true);
  const [enableTgaConversion, setEnableTgaConversion] = useState(true);
  const [enableAnimationConversion, setEnableAnimationConversion] = useState(true);
  const [enableLanguageConversion, setEnableLanguageConversion] = useState(true);
  const [enableSoundConversion, setEnableSoundConversion] = useState(true);
  const [enableAudioReencode, setEnableAudioReencode] = useState(false);

  const hasTrackedInteractRef = useRef(false);
  const lastInputMethodRef = useRef<'drop' | 'file_picker'>('drop');

  const trackUploadInteract = useCallback((action: 'picker_open' | 'drag_enter') => {
    if (hasTrackedInteractRef.current) return;
    hasTrackedInteractRef.current = true;
    trackEvent('upload_interact', {
      action,
      ui_lang: initialLang,
    });
  }, [initialLang]);

  // Load saved beta preferences on mount
  useEffect(() => {
    try {
      const savedGui = localStorage.getItem('pb_beta_gui');
      if (savedGui) setEnableGuiConversion(savedGui === 'true');

      const savedModernGui = localStorage.getItem('pb_beta_modern_gui');
      if (savedModernGui) setEnableModernGuiSprites(savedModernGui === 'true');

      const savedTga = localStorage.getItem('pb_beta_tga');
      if (savedTga) setEnableTgaConversion(savedTga === 'true');

      const savedAnim = localStorage.getItem('pb_beta_anim');
      if (savedAnim) setEnableAnimationConversion(savedAnim === 'true');

      const savedLang = localStorage.getItem('pb_beta_lang');
      if (savedLang) setEnableLanguageConversion(savedLang === 'true');

      const savedSound = localStorage.getItem('pb_beta_sound');
      if (savedSound) setEnableSoundConversion(savedSound === 'true');

      const savedAudioReencode = localStorage.getItem('pb_beta_audio_reencode');
      if (savedAudioReencode) setEnableAudioReencode(savedAudioReencode === 'true');
    } catch (e) {
      // Ignore localStorage errors (e.g., in incognito mode)
    }
  }, []);

  // Save beta preferences when they change
  useEffect(() => {
    try {
      localStorage.setItem('pb_beta_gui', String(enableGuiConversion));
      localStorage.setItem('pb_beta_modern_gui', String(enableModernGuiSprites));
      localStorage.setItem('pb_beta_tga', String(enableTgaConversion));
      localStorage.setItem('pb_beta_anim', String(enableAnimationConversion));
      localStorage.setItem('pb_beta_lang', String(enableLanguageConversion));
      localStorage.setItem('pb_beta_sound', String(enableSoundConversion));
      localStorage.setItem('pb_beta_audio_reencode', String(enableAudioReencode));
    } catch (e) {
      // Ignore
    }
  }, [enableGuiConversion, enableModernGuiSprites, enableTgaConversion, enableAnimationConversion, enableLanguageConversion, enableSoundConversion, enableAudioReencode]);

  const handleFile = useCallback((selectedFile: File, inputMethod: 'drop' | 'file_picker' = 'drop') => {
    lastInputMethodRef.current = inputMethod;
    const lowerName = selectedFile.name.toLowerCase();

    if (lowerName.endsWith('.zip') || lowerName.endsWith('.mcpack')) {
      setFile(selectedFile);
      setZipInstance(null); // Reset instance, will be loaded in preview useEffect
      setReport(null);
      setDownloadUrl(null);
      setError(null);
      setIsAutoDetected(false);

      if (selectedFile.size > LARGE_FILE_WARN_THRESHOLD_BYTES) {
        const mb = (selectedFile.size / (1024 * 1024)).toFixed(0);
        const largeFileWarn = initialLang === 'ja'
          ? `ファイルサイズが大容量（${mb}MB）です。端末のメモリ状況によって処理が遅延またはクラッシュする可能性があります。`
          : `Large file (${mb}MB). May cause high memory usage or crash depending on device resources.`;
        setWarning(largeFileWarn);
      } else {
        setWarning(null);
      }

      trackEvent('file_selected', {
        format: lowerName.endsWith('.mcpack') ? 'mcpack' : 'zip',
        size_tier: getSizeTier(selectedFile.size),
        input_method: inputMethod,
      });
    } else {
      setError(t.errorInvalidFile);
      setWarning(null);
      trackEvent('file_rejected', {
        stage: 'extension_check',
        reason: 'unsupported_extension',
        ext_class: getExtClass(selectedFile.name),
        input_method: inputMethod,
        ...(selectedFile.size > 0 ? { size_tier: getSizeTier(selectedFile.size) } : {}),
      });
    }
  }, [t, initialLang]);

  const handleEmptyDrop = useCallback(() => {
    setError(t.errorInvalidFile);
    setWarning(null);
    trackEvent('file_rejected', {
      stage: 'extension_check',
      reason: 'empty_drop',
      ext_class: 'folder_or_none',
      input_method: 'drop',
    });
  }, [t.errorInvalidFile]);

  // Window-wide drag and drop hook
  const onFileDrop = useCallback((files: FileList) => {
    const droppedFile = files[0];
    if (droppedFile) {
      handleFile(droppedFile, 'drop');
    } else {
      handleEmptyDrop();
    }
  }, [handleFile, handleEmptyDrop]);

  const { isDragging } = useFileDrop({
    onDrop: onFileDrop,
    onEmptyDrop: handleEmptyDrop,
    onDragStartFiles: () => trackUploadInteract('drag_enter'),
  });

  // Track abandonment on page unload if file is loaded but not converted
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (file && !report && !isProcessing) {
        trackEvent('file_abandoned', {
          reason: 'page_unload',
          has_warning: !!warning,
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [file, report, isProcessing, warning]);

  // Load ZIP once when file changes (with safety limits against Zip Bombs)
  useEffect(() => {
    if (!file) {
      setIconUrl(null);
      setZipInstance(null);
      setIsAutoDetected(false);
      return;
    }

    let isMounted = true;
    let currentIconUrl: string | null = null;

    const loadZipAndIcon = async () => {
      try {
        const jszip = new JSZip();
        const zip = await jszip.loadAsync(file);
        if (!isMounted) return;

        const fileKeys = Object.keys(zip.files).filter(k => !zip.files[k].dir && !k.endsWith('/'));
        if (fileKeys.length > MAX_SAFE_FILE_COUNT) {
          setError(t.errorConversion);
          setFile(null);
          trackEvent('file_rejected', {
            stage: 'safety_limit',
            reason: 'too_many_files',
            ext_class: getExtClass(file.name),
            input_method: lastInputMethodRef.current,
            size_tier: getSizeTier(file.size),
          });
          return;
        }

        let totalUncompressed = 0;
        for (const k of fileKeys) {
          const rawData = (zip.files[k] as any)._data;
          const uncompressedSize = typeof rawData?.uncompressedSize === 'number' ? rawData.uncompressedSize : 0;
          if (uncompressedSize > 0) {
            totalUncompressed += uncompressedSize;
            if (totalUncompressed > MAX_SAFE_UNCOMPRESSED_BYTES) {
              setError(t.errorConversion);
              setFile(null);
              trackEvent('file_rejected', {
                stage: 'safety_limit',
                reason: 'uncompressed_too_large',
                ext_class: getExtClass(file.name),
                input_method: lastInputMethodRef.current,
                size_tier: getSizeTier(file.size),
              });
              return;
            }
          }
        }

        setZipInstance(zip);

        // Icon extraction ( max 10MB guard )
        try {
          const iconEntry = zip.file('pack.png') || zip.file('pack_icon.png') || zip.file(/\/(pack\.png|pack_icon\.png)$/)[0];
          const iconSize = (iconEntry as any)?._data?.uncompressedSize ?? 0;
          if (iconEntry && iconSize <= 10 * 1024 * 1024) {
            const blob = await iconEntry.async('blob');
            if (!isMounted) return;
            currentIconUrl = URL.createObjectURL(blob);
            setIconUrl(currentIconUrl);
          }
        } catch (iconError) {
          console.warn("Failed to extract pack icon", iconError);
        }
      } catch (e) {
        console.error("Failed to process file", e);
        if (!isMounted) return;
        setError(t.errorInvalidFile);
        setWarning(null);
        setFile(null);
        trackEvent('file_rejected', {
          stage: 'archive_parse',
          reason: 'corrupt_or_unreadable',
          ext_class: getExtClass(file.name),
          input_method: lastInputMethodRef.current,
          size_tier: getSizeTier(file.size),
        });
      }
    };

    loadZipAndIcon();
    return () => {
      isMounted = false;
      if (currentIconUrl) URL.revokeObjectURL(currentIconUrl);
    };
  }, [file, t.errorConversion, t.errorInvalidFile]);

  // Content Analysis & Version Detection (re-evaluates on direction change without re-unzipping)
  useEffect(() => {
    if (!file || !zipInstance) return;

    let isMounted = true;

    const analyzeZipMetadata = async () => {
      try {
        const packMcmetaEntry = zipInstance.file('pack.mcmeta') || zipInstance.file(/(^|\/)pack\.mcmeta$/)[0];
        const manifestEntry = zipInstance.file('manifest.json') || zipInstance.file(/(^|\/)manifest\.json$/)[0];

        const isVersionUpdate = direction === 'java-to-java' || direction === 'bedrock-to-bedrock';
        let actualSource = direction.startsWith('java') ? 'java' : 'bedrock';

        if (isVersionUpdate) {
          if (manifestEntry || file.name.toLowerCase().endsWith('.mcpack')) {
            actualSource = 'bedrock';
            if (direction !== 'bedrock-to-bedrock') setDirection('bedrock-to-bedrock');
          } else if (packMcmetaEntry) {
            actualSource = 'java';
            if (direction !== 'java-to-java') setDirection('java-to-java');
          }
        }

        const sourceEdition = actualSource;

        const isLargeFile = file.size > LARGE_FILE_WARN_THRESHOLD_BYTES;
        const mb = (file.size / (1024 * 1024)).toFixed(0);
        const largeFileWarn = isLargeFile
          ? (initialLang === 'ja'
              ? `ファイルサイズが大容量（${mb}MB）です。端末のメモリ状況によって処理が遅延またはクラッシュする可能性があります。`
              : `Large file (${mb}MB). May cause high memory usage or crash depending on device resources.`)
          : null;

        let editionWarn: string | null = null;
        if (sourceEdition === 'java' && (manifestEntry || file.name.toLowerCase().endsWith('.mcpack'))) {
          editionWarn = t.warnPossibleBedrock;
        } else if (sourceEdition === 'bedrock' && packMcmetaEntry) {
          editionWarn = t.warnPossibleJava;
        }

        // Check if archive seems to contain any Minecraft pack structure
        let notPackWarn: string | null = null;
        const hasPackFiles = packMcmetaEntry || manifestEntry || Object.keys(zipInstance.files).some(p => {
          const lower = p.toLowerCase();
          return lower.includes('assets/') || lower.includes('textures/') || lower.includes('sounds/') || lower.includes('texts/');
        });
        if (!hasPackFiles) {
          notPackWarn = t.warnNotMinecraftPack;
        }

        const warnings: string[] = [];
        if (largeFileWarn) warnings.push(largeFileWarn);
        if (editionWarn) warnings.push(editionWarn);
        if (notPackWarn) warnings.push(notPackWarn);

        if (warnings.length > 0) {
          setWarning(warnings.join(' '));
        } else {
          setWarning(null);
        }

        // Version Extraction
        try {
          if (sourceEdition === 'java' && packMcmetaEntry) {
            const content = await packMcmetaEntry.async('string');
            if (!isMounted) return;
            const json = JSON.parse(content);
            const rawFormat = json?.pack?.pack_format ?? (Array.isArray(json?.pack?.min_format) ? json.pack.min_format[0] : json?.pack?.min_format);
            if (typeof rawFormat === 'number') {
              const detected = getJavaVersionByPackFormat(rawFormat);
              if (detected) {
                setSourceJavaVersion(detected);
                if (direction === 'java-to-bedrock') {
                  setSelectedJavaVersion(detected);
                } else if (direction === 'java-to-java') {
                  setSelectedJavaVersion(JAVA_VERSIONS[0].id);
                }
                setIsAutoDetected(true);
              }
            }
          } else if (sourceEdition === 'bedrock' && manifestEntry) {
            const content = await manifestEntry.async('string');
            if (!isMounted) return;
            const json = JSON.parse(content);
            if (Array.isArray(json?.header?.min_engine_version)) {
              const detected = getBedrockVersionByEngineVersion(json.header.min_engine_version);
              if (detected) {
                setSourceBedrockVersion(detected);
                if (direction === 'bedrock-to-java') {
                  setSelectedBedrockVersion(detected);
                } else if (direction === 'bedrock-to-bedrock') {
                  setSelectedBedrockVersion(BEDROCK_VERSIONS[0].id);
                }
                setIsAutoDetected(true);
              }
            }
          }
        } catch (verError) {
          console.warn("Failed to detect version from file", verError);
        }
      } catch (e) {
        console.error("Failed to analyze metadata", e);
      }
    };

    analyzeZipMetadata();
    return () => {
      isMounted = false;
    };
  }, [file, zipInstance, direction, t, initialLang]);

  const startConversion = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(null);
    setError(null);
    const startTime = Date.now();

    // 匿名利用回数の取得とインクリメント（UUID不保持）
    const prevCount = getLocalConversionCount();
    const nextCount = incrementLocalConversionCount();

    trackEvent('conversion_start', {
      direction,
      java_version: selectedJavaVersion,
      bedrock_version: selectedBedrockVersion,
      detection: isAutoDetected ? 'auto_detected' : 'manual_changed',
      opt_gui: enableGuiConversion,
      opt_animation: enableAnimationConversion,
      opt_audio_reencode: enableAudioReencode,
      user_type: prevCount === 0 ? 'first_time' : 'repeat',
      usage_tier: getUsageTier(nextCount),
      ui_lang: initialLang,
    });

    try {
      const options: ConversionOptions = {
        direction,
        javaVersionId: selectedJavaVersion,
        bedrockVersionId: selectedBedrockVersion,
        sourceJavaVersionId: sourceJavaVersion,
        sourceBedrockVersionId: sourceBedrockVersion,
        enableGuiConversion,
        enableModernGuiSprites,
        enableTgaConversion,
        enableAnimationConversion,
        enableLanguageConversion,
        enableSoundConversion,
        enableAudioReencode
      };
      const result = await convertPackWithWorker(file, options, (processed, total) => {
        setProgress({ processed, total });
      });

      // Zero-converted guard: if no files were converted, prevent producing an empty pack
      if (result.report.convertedCount === 0) {
        setError(t.errorZeroConverted);
        saveContext(result.report.details
          .filter((d) => d.status !== 'converted')
          .map((d) => `[${d.status}] ${d.filename}: ${d.reason ?? ''}`)
          .join('\n'));
        trackEvent('conversion_failed', {
          direction,
          error_category: 'ZERO_CONVERTED',
          opt_audio_reencode: enableAudioReencode,
          size_tier: getSizeTier(file.size),
        });
        return;
      }

      setReport(result.report);
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      const url = URL.createObjectURL(result.blob);
      setDownloadUrl(url);
      saveContext(result.report.details
        .filter((d) => d.status !== 'converted')
        .map((d) => `[${d.status}] ${d.filename}: ${d.reason ?? ''}`)
        .join('\n'));

      const safety = analyzeReportSafety(result.report);
      trackEvent('conversion_success', {
        direction,
        duration_tier: getDurationTier(Date.now() - startTime),
        file_count_tier: getFileCountTier(result.report.totalFiles),
        has_audio: safety.hasAudio,
        has_animations: safety.hasAnimations,
        opt_audio_reencode: enableAudioReencode,
        skip_reason_top: safety.skipReasonTop,
      });
    } catch (err) {
      console.error(err);
      setError(t.errorConversion);
      saveContext(`[fatal] ${err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err)}`);

      trackEvent('conversion_failed', {
        direction,
        error_category: categorizeError(err),
        opt_audio_reencode: enableAudioReencode,
        size_tier: getSizeTier(file.size),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const saveContext = (log: string) => {
    if (!file) return;
    try {
      sessionStorage.setItem(LAST_CONVERSION_KEY, JSON.stringify({
        direction: `${direction} (java ${selectedJavaVersion}, bedrock ${selectedBedrockVersion})`,
        fileName: file.name,
        fileSize: file.size,
        log,
      }));
    } catch { /* ignore */ }
  };

  const rs = getReportStrings(initialLang);
  const showReportEntry = error === t.errorConversion || (report && (report.errorCount > 0 || report.skippedCount > 0));

  const reset = () => {
    if (file && !report && !isProcessing) {
      trackEvent('file_abandoned', {
        reason: 'manual_reset',
        has_warning: !!warning,
      });
    }
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    if (iconUrl) URL.revokeObjectURL(iconUrl);
    setFile(null);
    setZipInstance(null);
    setIconUrl(null);
    setReport(null);
    setProgress(null);
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
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="drag-overlay"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="drag-content"
            >
              <motion.div
                className="drag-icon-wrapper"
                animate={{ y: [-3, 3, -3] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
              >
                <Upload size={38} className="drag-icon" />
              </motion.div>
              <h2 style={{ fontSize: '24px', fontWeight: 800 }}>{t.dropzoneTitle}</h2>
              <p style={{ fontSize: '15px', color: 'var(--color-text-muted)' }}>{t.dropzoneSubtitle}</p>
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
        sourceJavaVersion={sourceJavaVersion}
        setSourceJavaVersion={setSourceJavaVersion}
        sourceBedrockVersion={sourceBedrockVersion}
        setSourceBedrockVersion={setSourceBedrockVersion}
        isAutoDetected={isAutoDetected}
        hasFile={!!file}
        enableGuiConversion={enableGuiConversion}
        setEnableGuiConversion={setEnableGuiConversion}
        enableModernGuiSprites={enableModernGuiSprites}
        setEnableModernGuiSprites={setEnableModernGuiSprites}
        enableTgaConversion={enableTgaConversion}
        setEnableTgaConversion={setEnableTgaConversion}
        enableAnimationConversion={enableAnimationConversion}
        setEnableAnimationConversion={setEnableAnimationConversion}
        enableLanguageConversion={enableLanguageConversion}
        setEnableLanguageConversion={setEnableLanguageConversion}
        enableSoundConversion={enableSoundConversion}
        setEnableSoundConversion={setEnableSoundConversion}
        enableAudioReencode={enableAudioReencode}
        setEnableAudioReencode={setEnableAudioReencode}
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
            progress={progress}
            onFileSelect={handleFile}
            onEmptyDrop={handleEmptyDrop}
            onPickerOpen={() => trackUploadInteract('picker_open')}
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

      {showReportEntry && (
        <motion.a
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          href={`${reportHref(initialLang)}?from=conversion`}
          data-astro-prefetch="tap"
          className="report-entry"
          id="report-entry"
          onClick={() => {
            trackEvent('report_click', {
              source: error === t.errorConversion ? 'error_banner' : 'report_summary',
            });
          }}
        >
          <Bug size={16} />{rs.reportThis}
        </motion.a>
      )}

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
