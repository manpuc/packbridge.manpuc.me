import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, AlertCircle, ChevronDown } from 'lucide-react';
import type { PackReport, ConversionResult } from '@/lib/pack/types';

interface ConversionReportProps {
  report: PackReport;
  downloadUrl: string | null;
  fileName: string;
  direction: string;
  onReset: () => void;
  t: any;
}

const springTransition = { type: "spring", stiffness: 300, damping: 30 } as const;

export function ConversionReport({
  report,
  downloadUrl,
  fileName,
  direction,
  onReset,
  t
}: ConversionReportProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
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
              download={`${fileName.split('.')[0]}_converted.${direction === 'java-to-bedrock' ? 'mcpack' : 'zip'}`}
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
            onClick={onReset}
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
                      {detail.status === 'skipped' ? 'SKIP' : 'ERR'}
                    </span>
                  </div>
                ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
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
