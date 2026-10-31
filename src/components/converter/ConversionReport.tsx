import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, AlertCircle, ChevronDown } from 'lucide-react';
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

export function ConversionReport({
  report,
  downloadUrl,
  fileName,
  direction,
  onReset,
  t
}: ConversionReportProps) {
  const [showDetails, setShowDetails] = useState(false);
  const isPerfect = report.errorCount === 0 && report.skippedCount === 0;

  return (
    <motion.div
      key="report"
      layout
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -16 }}
      transition={springTransition}
      className="report-container"
      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
    >
      <motion.div layout className="card" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
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
          style={{ display: 'flex', gap: '12px', marginTop: '4px' }}
        >
          {downloadUrl && (
            <motion.a
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              href={downloadUrl}
              download={`${fileName.replace(/\.(zip|mcpack)$/i, '')}_converted.${direction.endsWith('bedrock') ? 'mcpack' : 'zip'}`}
              onClick={() => {
                const format = direction.endsWith('bedrock') ? 'mcpack' : 'zip';
                trackEvent('pack_download', { format, direction });
              }}
              className="primary"
              style={{
                textDecoration: 'none',
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '14px 24px',
                borderRadius: '16px',
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-primary-text)',
                fontWeight: 700,
                fontSize: '15px',
                boxShadow: '0 4px 18px rgba(0,0,0,0.12)'
              }}
            >
              <Download size={19} />
              {t.btnDownload}
            </motion.a>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="secondary"
            onClick={onReset}
            style={{ borderRadius: '16px', padding: '14px 20px', fontWeight: 600 }}
          >
            <RefreshCw size={18} />
            {t.btnReset}
          </motion.button>
        </motion.div>
      </motion.div>

      {(report.skippedCount > 0 || report.errorCount > 0) && (
        <motion.div
          layout
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
          style={{ padding: '16px 20px' }}
        >
          <button
            type="button"
            className="unsupported-toggle-btn"
            onClick={() => setShowDetails(!showDetails)}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <AlertCircle size={18} color="var(--color-warning)" />
              <span style={{ color: 'var(--color-text)' }}>
                {t.unsupportedTitle} ({report.skippedCount + report.errorCount})
              </span>
            </span>
            <motion.div animate={{ rotate: showDetails ? 180 : 0 }} transition={{ type: "spring", stiffness: 350, damping: 25 }}>
              <ChevronDown size={18} style={{ color: 'var(--color-text-muted)' }} />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{
                  height: 'auto',
                  opacity: 1,
                  transition: {
                    height: { duration: 0.28, ease: [0.25, 1, 0.5, 1] },
                    opacity: { duration: 0.2, ease: 'easeOut' }
                  }
                }}
                exit={{
                  height: 0,
                  opacity: 0,
                  transition: {
                    height: { duration: 0.24, ease: [0.25, 1, 0.5, 1] },
                    opacity: { duration: 0.15, ease: 'easeIn' }
                  }
                }}
                style={{ overflow: 'hidden' }}
              >
                <div
                  className="report-list"
                  style={{ marginTop: '16px', maxHeight: '300px', overflowY: 'auto' }}
                >
                  {report.details
                    .filter((d: ConversionResult) => d.status !== 'converted')
                    .map((detail: ConversionResult, idx: number) => (
                      <div
                        key={idx}
                        className="report-item"
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600, wordBreak: 'break-all' }}>{detail.filename}</span>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{detail.reason}</span>
                        </div>
                        <span className={`status-badge status-${detail.status}`}>
                          {detail.status === 'skipped' ? 'SKIP' : 'ERR'}
                        </span>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
      style={{ minWidth: 0, overflow: 'hidden' }}
    >
      <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>{label}</p>
      <motion.p
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.25 + index * 0.06, type: "spring", stiffness: 450, damping: 20 }}
        style={{ fontSize: '26px', fontWeight: 800, color: color || 'var(--color-text)', margin: 0, fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {value.toLocaleString()}
      </motion.p>
    </motion.div>
  );
}
