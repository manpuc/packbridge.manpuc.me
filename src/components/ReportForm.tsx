import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Copy, Check, ExternalLink, Lock } from 'lucide-react';
import type { Language } from '@/lib/i18n';
import { getReportStrings, LAST_CONVERSION_KEY, APP_VERSION } from '@/lib/i18n/report';

const REPO = 'manpuc/packbridge.manpuc.me';
const LOG_LIMIT = 6000;

export interface LastConversion {
  direction: string;
  fileName: string;
  fileSize: number;
  log: string;
}

type Kind = 'conversion' | 'ui' | 'other';
type AutoKey = 'direction' | 'file' | 'log' | 'env' | 'version';

const spring = { type: 'spring', stiffness: 300, damping: 30 } as const;

export default function ReportForm({ lang }: { lang: Language }) {
  const s = getReportStrings(lang);
  const [ctx, setCtx] = useState<LastConversion | null>(null);
  const [env, setEnv] = useState('');
  const [kind, setKind] = useState<Kind>('other');
  const [summary, setSummary] = useState('');
  const [expected, setExpected] = useState('');
  const [steps, setSteps] = useState('');
  const [include, setInclude] = useState<Record<AutoKey, boolean>>({ direction: true, file: true, log: true, env: true, version: true });
  const [touched, setTouched] = useState(false);
  const [showAuto, setShowAuto] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setEnv(navigator.userAgent);
    const fromConversion = new URLSearchParams(location.search).has('from');
    try {
      const raw = sessionStorage.getItem(LAST_CONVERSION_KEY);
      if (raw) {
        setCtx(JSON.parse(raw));
        if (fromConversion) { setKind('conversion'); setShowAuto(true); }
      }
    } catch { /* ignore */ }
  }, []);


  const log = ctx?.log ?? '';
  const isTruncated = log.length > LOG_LIMIT;
  const kindLabel = { conversion: s.kindConversion, ui: s.kindUi, other: s.kindOther }[kind];

  const body = useMemo(() => {
    const env_: string[] = [];
    if (include.version) env_.push(`- App: v${APP_VERSION}`);
    if (include.env) env_.push(`- Browser/OS: ${env}`);
    if (ctx && include.direction) env_.push(`- Direction: ${ctx.direction}`);
    if (ctx && include.file) env_.push(`- File: ${ctx.fileName} (${(ctx.fileSize / 1048576).toFixed(2)} MB)`);
    const parts = [
      `### Type\n${kindLabel}`,
      `### What happened\n${summary.trim()}`,
      expected.trim() && `### Expected / Actual\n${expected.trim()}`,
      steps.trim() && `### Steps to reproduce\n${steps.trim()}`,
      env_.length && `### Environment\n${env_.join('\n')}`,
      ctx && include.log && log && `### Log\n\`\`\`\n${isTruncated ? log.slice(0, LOG_LIMIT) + '\n… (truncated)' : log}\n\`\`\``,
    ];
    return parts.filter(Boolean).join('\n\n');
  }, [include, env, ctx, kindLabel, summary, expected, steps, log, isTruncated]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!summary.trim()) {
      document.getElementById('report-summary')?.focus();
      return;
    }
    const q = new URLSearchParams({ title: `[${kindLabel}] ${summary.trim()}`, body, labels: 'bug' });
    window.open(`https://github.com/${REPO}/issues/new?${q}`, '_blank', 'noopener');
    setSent(true);
  };

  const copyLog = async () => {
    await navigator.clipboard.writeText(log);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const summaryError = touched && !summary.trim();

  if (sent) {
    return (
      <motion.section key="sent" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="card report-sent" aria-live="polite">
        <div className="report-sent-icon"><ExternalLink size={22} /></div>
        <h2>{s.sentTitle}</h2>
        <p>{s.sentBody}</p>
        <button type="button" className="secondary" onClick={() => setSent(false)}>{s.again}</button>
      </motion.section>
    );
  }

  const autoRows: { key: AutoKey; label: string; value: string; show: boolean }[] = [
    { key: 'direction', label: s.fieldDirection, value: ctx?.direction ?? '', show: !!ctx },
    { key: 'file', label: s.fieldFile, value: ctx ? `${ctx.fileName} · ${(ctx.fileSize / 1048576).toFixed(2)} MB` : '', show: !!ctx },
    { key: 'env', label: s.fieldEnv, value: env, show: true },
    { key: 'version', label: s.fieldVersion, value: `v${APP_VERSION}`, show: true },
  ];

  return (
    <form className="report-form" onSubmit={submit} noValidate>
      <section className="card report-fields">
        <div className="report-field">
          <span className="report-label" id="report-kind-label">{s.kind}</span>
          <div className="segmented-control" role="radiogroup" aria-labelledby="report-kind-label">
            {(['conversion', 'ui', 'other'] as Kind[]).map((k) => (
              <button key={k} id={`report-kind-${k}`} type="button" role="radio" aria-checked={kind === k} className={kind === k ? 'active' : ''} onClick={() => setKind(k)}>
                {{ conversion: s.kindConversion, ui: s.kindUi, other: s.kindOther }[k]}
              </button>
            ))}
          </div>
        </div>

        <div className="report-field">
          <label className="report-label" htmlFor="report-summary">{s.summary}</label>
          <input
            id="report-summary"
            className={`report-input${summaryError ? ' invalid' : ''}`}
            value={summary}
            maxLength={120}
            placeholder={s.summaryPlaceholder}
            aria-invalid={summaryError}
            aria-describedby={summaryError ? 'report-summary-error' : undefined}
            onChange={(e) => setSummary(e.target.value)}
          />
          {summaryError && <p id="report-summary-error" className="report-error">{s.summaryRequired}</p>}
        </div>

        <div className="report-field">
          <label className="report-label" htmlFor="report-expected">{s.expected}<span className="report-optional">{s.optional}</span></label>
          <textarea id="report-expected" className="report-input" rows={3} value={expected} placeholder={s.expectedPlaceholder} onChange={(e) => setExpected(e.target.value)} />
        </div>

        <div className="report-field">
          <label className="report-label" htmlFor="report-steps">{s.steps}<span className="report-optional">{s.optional}</span></label>
          <textarea id="report-steps" className="report-input" rows={3} value={steps} placeholder={s.stepsPlaceholder} onChange={(e) => setSteps(e.target.value)} />
        </div>
      </section>

      <section className="card report-auto">
        <button type="button" id="report-auto-toggle" className="report-disclosure" aria-expanded={showAuto} onClick={() => setShowAuto(!showAuto)}>
          <span>{s.auto}</span>
          <motion.span animate={{ rotate: showAuto ? 180 : 0 }}><ChevronDown size={18} /></motion.span>
        </button>
        <AnimatePresence initial={false}>
          {showAuto && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              <p className="report-hint">{ctx ? s.autoHint : s.autoEmpty}</p>
              <ul className="report-auto-list">
                {autoRows.filter((r) => r.show).map((r) => (
                  <li key={r.key}>
                    <label className="report-check">
                      <input type="checkbox" checked={include[r.key]} onChange={(e) => setInclude({ ...include, [r.key]: e.target.checked })} />
                      <span className="report-check-label">{r.label}</span>
                      <span className="report-check-value">{r.value}</span>
                    </label>
                  </li>
                ))}
                {ctx && log && (
                  <li>
                    <label className="report-check">
                      <input type="checkbox" checked={include.log} onChange={(e) => setInclude({ ...include, log: e.target.checked })} />
                      <span className="report-check-label">{s.fieldLog}</span>
                    </label>
                    <pre className="report-log">{log}</pre>
                    {isTruncated && <p className="report-hint warn">{s.truncated}</p>}
                    <button type="button" className="secondary report-small" onClick={copyLog}>
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? s.copied : s.copyLog}
                    </button>
                  </li>
                )}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <details className="report-preview" open={showPreview} onToggle={(e) => setShowPreview((e.target as HTMLDetailsElement).open)}>
        <summary>{s.preview}</summary>
        <pre>{body}</pre>
      </details>

      <div className="report-submit-bar">
        <p className="report-notice"><Lock size={14} />{s.publicNotice}</p>
        <button id="report-submit" type="submit" className="primary report-submit">
          {s.submit}
        </button>
      </div>
    </form>
  );
}
