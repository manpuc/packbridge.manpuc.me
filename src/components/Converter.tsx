import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileCheck, AlertCircle, Download, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setLang(document.documentElement.lang as Language || 'ja');
  }, []);

  const t = translations[lang as keyof typeof translations];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.zip') || selectedFile.name.endsWith('.mcpack')) {
        setFile(selectedFile);
        setReport(null);
        setDownloadUrl(null);
      } else {
        alert(t.errorInvalidFile);
      }
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (droppedFile.name.endsWith('.zip') || droppedFile.name.endsWith('.mcpack')) {
        setFile(droppedFile);
        setReport(null);
        setDownloadUrl(null);
      } else {
        alert(t.errorInvalidFile);
      }
    }
  }, [t]);

  const startConversion = async () => {
    if (!file) return;
    setIsProcessing(true);
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
      alert(t.errorConversion);
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setReport(null);
    setDownloadUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="converter-root" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Direction Switcher */}
      <div className="card">
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

        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
        </div>
      </div>

      {/* File Input / Dropzone */}
      {!report && (
        <div className="card">
          <div
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
            <Upload className="dropzone-icon" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p style={{ fontWeight: 700, fontSize: '18px' }}>
                {file ? file.name : t.dropzoneTitle}
              </p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
                {t.dropzoneSubtitle}
              </p>
            </div>
            {file && !isProcessing && (
              <button
                className="primary"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); startConversion(); }}
                style={{ marginTop: '16px' }}
              >
                {t.btnConvert}
              </button>
            )}
            {isProcessing && (
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw className="spin" size={20} />
                <span>{t.dropzoneProcessing}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report & Download */}
      {report && (
        <div className="report-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, textAlign: 'center' }}>{t.summaryTitle}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <SummaryItem label={t.countTotal} value={report.totalFiles} />
              <SummaryItem label={t.countConverted} value={report.convertedCount} color="var(--color-success)" />
              <SummaryItem label={t.countSkipped} value={report.skippedCount} color="var(--color-warning)" />
              <SummaryItem label={t.countErrors} value={report.errorCount} color="var(--color-danger)" />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={`${file?.name.split('.')[0]}_converted.${direction === 'java-to-bedrock' ? 'mcpack' : 'zip'}`}
                  className="primary"
                  style={{ textDecoration: 'none', flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 24px', borderRadius: '14px', backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-text)', fontWeight: 600 }}
                >
                  <Download size={18} />
                  {t.btnDownload}
                </a>
              )}
              <button className="secondary" onClick={reset}>
                <RefreshCw size={18} />
                {t.btnReset}
              </button>
            </div>
          </div>

          <div className="card">
            <button
              className="secondary"
              style={{ width: '100%', justifyContent: 'space-between', border: 'none', background: 'transparent' }}
              onClick={() => setShowDetails(!showDetails)}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} />
                {t.unsupportedTitle} ({report.skippedCount + report.errorCount})
              </span>
              {showDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {showDetails && (
              <div className="report-list" style={{ marginTop: '16px', maxHeight: '300px', overflowY: 'auto' }}>
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
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function SummaryItem({ label, value, color }: { label: string, value: number, color?: string }) {
  return (
    <div style={{ background: 'var(--color-border)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
      <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '24px', fontWeight: 800, color: color || 'var(--color-text)' }}>{value}</p>
    </div>
  );
}
