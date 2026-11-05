import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download, RefreshCw, AlertCircle, ChevronDown, Search, ChevronLeft, ChevronRight, FileDown } from 'lucide-react';
import type { PackReport, ConversionResult } from '@/lib/pack/types';
import type { Translation } from '@/lib/i18n';

import { trackEvent } from '@/lib/analytics';

interface ConversionReportProps {
  report: PackReport;
  downloadUrl: string | null;
  fileName: string;
  direction: string;
  onReset: () => void;
  t: Translation;
}

const springTransition = { type: "spring", stiffness: 350, damping: 28 } as const;
const PAGE_SIZE = 20;

export function ConversionReport({
  report,
  downloadUrl,
  fileName,
  direction,
  onReset,
  t
}: ConversionReportProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [hasEverOpened, setHasEverOpened] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'error' | 'skipped'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const isPerfect = report.errorCount === 0 && report.skippedCount === 0;

  const nonConvertedDetails = useMemo(() => {
    return report.details.filter((d: ConversionResult) => d.status !== 'converted');
  }, [report.details]);

  const filteredDetails = useMemo(() => {
    if (!hasEverOpened) return [];
    const query = searchQuery.trim().toLowerCase();
    return nonConvertedDetails.filter((d: ConversionResult) => {
      if (filterType !== 'all' && d.status !== filterType) return false;
      if (!query) return true;
      const nameMatch = d.filename.toLowerCase().includes(query);
      const reasonMatch = d.reason ? d.reason.toLowerCase().includes(query) : false;
      return nameMatch || reasonMatch;
    });
  }, [nonConvertedDetails, filterType, searchQuery, hasEverOpened]);

  const totalPages = Math.max(1, Math.ceil(filteredDetails.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedDetails = useMemo(() => {
    if (!hasEverOpened) return [];
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredDetails.slice(start, start + PAGE_SIZE);
  }, [filteredDetails, currentPage, hasEverOpened]);

  const handleToggleDetails = () => {
    if (!hasEverOpened) setHasEverOpened(true);
    setShowDetails((prev) => !prev);
  };

  const handleExportTxt = () => {
    const lines: string[] = [
      `PackBridge Conversion Report - Skipped / Error Files`,
      `Target: ${fileName}`,
      `Direction: ${direction}`,
      `Date: ${new Date().toLocaleString()}`,
      `Summary: Total ${report.totalFiles} | Converted ${report.convertedCount} | Skipped ${report.skippedCount} | Errors ${report.errorCount}`,
      `--------------------------------------------------`,
      '',
    ];

    for (const item of nonConvertedDetails) {
      const tag = item.status === 'skipped' ? '[SKIP]' : '[ERROR]';
      lines.push(`${tag} ${item.filename}${item.reason ? ` - ${item.reason}` : ''}`);
    }

    const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const base = fileName.replace(/\.(zip|mcpack)$/i, '');
    a.download = `${base}_unsupported_files.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleFilterChange = (type: 'all' | 'error' | 'skipped') => {
    setFilterType(type);
    setPage(1);
  };

  return (
    <motion.div
      key="report"
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -16 }}
      transition={springTransition}
      className="report-container"
      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
    >
      <motion.div layout className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', maxWidth: '100%' }}>
          <motion.h2
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.25 }}
            style={{ fontSize: '20px', fontWeight: 800, textAlign: 'center', margin: 0 }}
          >
            {t.summaryTitle}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
            style={{
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              margin: 0,
              maxWidth: '90%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={fileName}
          >
            {fileName}
          </motion.p>
        </div>

        {/* 4 Staggered Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <SummaryItem label={t.countTotal} value={report.totalFiles} index={0} />
          <SummaryItem label={t.countConverted} value={report.convertedCount} color="var(--color-success)" index={1} />
          <SummaryItem label={t.countSkipped} value={report.skippedCount} color={report.skippedCount > 0 ? "var(--color-warning)" : undefined} index={2} />
          <SummaryItem label={t.countErrors} value={report.errorCount} color={report.errorCount > 0 ? "var(--color-danger)" : undefined} index={3} />
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.3 }}
          className="report-actions"
        >
          {downloadUrl && (
            <motion.a
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              href={downloadUrl}
              download={`${fileName.replace(/\.(zip|mcpack)$/i, '')}_converted.${direction.endsWith('bedrock') ? 'mcpack' : 'zip'}`}
              onClick={() => {
                const format = direction.endsWith('bedrock') ? 'mcpack' : 'zip';
                trackEvent('pack_download', { format, direction });
              }}
              className="report-download-btn primary"
            >
              <Download size={20} className="report-btn-icon" />
              <span>{t.btnDownload}</span>
            </motion.a>
          )}
          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="secondary report-reset-btn"
            onClick={onReset}
          >
            <RefreshCw size={17} className="report-btn-icon" />
            <span>{t.btnReset}</span>
          </motion.button>
        </motion.div>
      </motion.div>

      {(report.skippedCount > 0 || report.errorCount > 0) && (
        <motion.div
          layout
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card unsupported-card"
        >
          <button
            type="button"
            className="unsupported-toggle-btn"
            onClick={handleToggleDetails}
            aria-expanded={showDetails}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <AlertCircle size={18} color="var(--color-warning)" />
              <span style={{ color: 'var(--color-text)' }}>
                {t.unsupportedTitle} ({report.skippedCount + report.errorCount})
              </span>
            </span>
            <div
              className="t-acc-chevron"
              data-open={showDetails ? "true" : "false"}
              aria-hidden="true"
            >
              <ChevronDown size={18} style={{ color: 'var(--color-text-muted)' }} />
            </div>
          </button>

          <div className="t-acc-panel" data-open={showDetails ? "true" : "false"}>
            <div className="t-acc-panel-inner">
              {hasEverOpened && (
                <div style={{ padding: '4px' }}>
                  <div className="report-controls">
                    <div className="report-search-box">
                      <Search size={15} className="report-search-icon" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="ファイル名・理由で絞り込み..."
                        className="report-search-input"
                      />
                    </div>

                    <div className="report-filter-bar">
                      <div className="report-filter-tabs">
                        <button
                          type="button"
                          className={`report-filter-btn ${filterType === 'all' ? 'active' : ''}`}
                          onClick={() => handleFilterChange('all')}
                        >
                          すべて ({nonConvertedDetails.length})
                        </button>
                        {report.errorCount > 0 && (
                          <button
                            type="button"
                            className={`report-filter-btn ${filterType === 'error' ? 'active' : ''}`}
                            onClick={() => handleFilterChange('error')}
                          >
                            エラー ({report.errorCount})
                          </button>
                        )}
                        {report.skippedCount > 0 && (
                          <button
                            type="button"
                            className={`report-filter-btn ${filterType === 'skipped' ? 'active' : ''}`}
                            onClick={() => handleFilterChange('skipped')}
                          >
                            スキップ ({report.skippedCount})
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        className="report-export-btn"
                        onClick={handleExportTxt}
                        title={t.btnExportTxt}
                      >
                        <FileDown size={14} />
                        <span>{t.btnExportTxt}</span>
                      </button>
                    </div>
                  </div>

                  {filteredDetails.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                      該当ファイルは見つかりませんでした
                    </div>
                  ) : (
                    <div
                      className="report-list"
                      style={{ maxHeight: '340px', overflowY: 'auto' }}
                    >
                      {paginatedDetails.map((detail: ConversionResult, idx: number) => (
                        <div
                          key={detail.filename || idx}
                          className="report-item"
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
                            <span style={{ fontWeight: 600, wordBreak: 'break-all', fontSize: '13px' }}>{detail.filename}</span>
                            {detail.reason && (
                              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', wordBreak: 'break-word' }}>
                                {detail.reason}
                              </span>
                            )}
                          </div>
                          <span className={`status-badge status-${detail.status}`} style={{ flexShrink: 0 }}>
                            {detail.status === 'skipped' ? 'SKIP' : 'ERR'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {totalPages > 1 && (
                    <div className="report-pagination">
                      <button
                        type="button"
                        className="report-page-btn"
                        disabled={currentPage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft size={14} /> 前へ
                      </button>
                      <span>
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        className="report-page-btn"
                        disabled={currentPage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      >
                        次へ <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function SummaryItem({ label, value, color, index }: { label: string, value: number, color?: string, index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 380,
        damping: 24,
        delay: 0.15 + index * 0.06
      }}
      className="summary-card-metric"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 16px',
        borderRadius: 'var(--radius-inner)',
        backgroundColor: 'rgba(120, 120, 128, 0.06)',
        border: '1px solid var(--color-border)',
        gap: '4px',
        overflow: 'hidden'
      }}
    >
      <motion.span
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 450, damping: 20, delay: 0.2 + index * 0.06 }}
        style={{
          fontSize: '24px',
          fontWeight: 800,
          color: color || 'var(--color-text)',
          lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {value}
      </motion.span>
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          textAlign: 'center',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
        title={label}
      >
        {label}
      </span>
    </motion.div>
  );
}
