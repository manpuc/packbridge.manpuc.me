import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Copy, Check, ExternalLink, Lock, Send, AlertTriangle, ArrowLeft } from 'lucide-react';
import type { Language } from '@/lib/i18n';
import { getTranslation } from '@/lib/i18n';
import { getReportStrings, LAST_CONVERSION_KEY, APP_VERSION } from '@/lib/i18n/report';
import { FluidSegmentedControl } from '@/components/ui/FluidSegmentedControl';

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/moejyrpk';
const REPO = 'manpuc/packbridge.manpuc.me';
const COOLDOWN_KEY = 'pb_report_last_sent';
const COOLDOWN_MS = 45000; // 45 seconds between submissions
const TIME_TRAP_MS = 2500; // Require >= 2.5s from page load before submission
const LOG_LIMIT = 3000;

export interface LastConversion {
  direction: string;
  fileName: string;
  fileSize: number;
  log: string;
}

type Kind = 'conversion' | 'ui' | 'other';
type AutoKey = 'direction' | 'file' | 'log' | 'env' | 'version';
type SentMode = 'formspree' | 'github' | null;

const spring = { type: 'spring', stiffness: 300, damping: 30 } as const;

export default function ReportForm({ lang }: { lang: Language }) {
  const s = getReportStrings(lang);
  const t = getTranslation(lang);
  const homeHref = lang === 'ja' ? '/' : `/${lang}`;
  const [ctx, setCtx] = useState<LastConversion | null>(null);
  const [env, setEnv] = useState('');
  const [kind, setKind] = useState<Kind>('other');
  const [summary, setSummary] = useState('');
  const [expected, setExpected] = useState('');
  const [steps, setSteps] = useState('');
  const [email, setEmail] = useState('');
  const [gotcha, setGotcha] = useState(''); // Honeypot field
  const [include, setInclude] = useState<Record<AutoKey, boolean>>({
    direction: true,
    file: true,
    log: true,
    env: true,
    version: true,
  });
  const [touched, setTouched] = useState(false);
  const [showAuto, setShowAuto] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sentMode, setSentMode] = useState<SentMode>(null);

  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    setEnv(navigator.userAgent);
    const fromConversion = new URLSearchParams(location.search).has('from');
    try {
      const raw = sessionStorage.getItem(LAST_CONVERSION_KEY);
      if (raw) {
        setCtx(JSON.parse(raw));
        if (fromConversion) {
          setKind('conversion');
          setShowAuto(true);
        }
      }
    } catch {
      /* ignore */
    }
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
      email.trim() && `### Contact Email\n${email.trim()}`,
      env_.length && `### Environment\n${env_.join('\n')}`,
      ctx && include.log && log && `### Log\n\`\`\`\n${isTruncated ? log.slice(0, LOG_LIMIT) + '\n… (truncated)' : log}\n\`\`\``,
    ];
    return parts.filter(Boolean).join('\n\n');
  }, [include, env, ctx, kindLabel, summary, expected, steps, email, log, isTruncated]);

  // Direct Submission via Formspree (No GitHub account needed)
  const submitDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setSubmitError(null);

    if (!summary.trim()) {
      document.getElementById('report-summary')?.focus();
      return;
    }

    // Anti-Spam 1: Honeypot check (Bots fill hidden fields)
    if (gotcha.trim()) {
      // Silently pretend success to mislead spam bots
      setSentMode('formspree');
      return;
    }

    // Anti-Spam 2: Time-trap (Bots submit almost instantaneously)
    const elapsed = Date.now() - mountTimeRef.current;
    if (elapsed < TIME_TRAP_MS) {
      setSubmitError(s.spamFast);
      return;
    }

    // Anti-Spam 3: Cooldown check (Prevent rapid multi-submissions)
    try {
      const lastSent = Number(sessionStorage.getItem(COOLDOWN_KEY) || '0');
      if (Date.now() - lastSent < COOLDOWN_MS) {
        setSubmitError(s.spamCooldown);
        return;
      }
    } catch {
      /* ignore */
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, any> = {
        _gotcha: gotcha,
        type: kindLabel,
        summary: summary.trim(),
      };

      if (email.trim()) {
        payload.email = email.trim();
        payload._replyto = email.trim();
      } else {
        payload.email = 'anonymous@packbridge.local';
      }

      if (expected.trim()) payload.expected = expected.trim();
      if (steps.trim()) payload.steps = steps.trim();
      if (include.version) payload.app_version = `v${APP_VERSION}`;
      if (include.env) payload.environment = env;
      if (ctx && include.direction) payload.direction = ctx.direction;
      if (ctx && include.file) payload.file_info = `${ctx.fileName} (${(ctx.fileSize / 1048576).toFixed(2)} MB)`;
      if (ctx && include.log && log) {
        payload.log = log.slice(0, LOG_LIMIT);
      }

      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        try {
          sessionStorage.setItem(COOLDOWN_KEY, String(Date.now()));
        } catch {
          /* ignore */
        }
        setSentMode('formspree');
      } else {
        setSubmitError(s.sendError);
      }
    } catch (err) {
      console.error('Failed to submit report to Formspree:', err);
      setSubmitError(s.sendError);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Alternative Submission via GitHub Issue
  const submitToGitHub = () => {
    setTouched(true);
    if (!summary.trim()) {
      document.getElementById('report-summary')?.focus();
      return;
    }
    const q = new URLSearchParams({ title: `[${kindLabel}] ${summary.trim()}`, body, labels: 'bug' });
    window.open(`https://github.com/${REPO}/issues/new?${q}`, '_blank', 'noopener');
    setSentMode('github');
  };

  const copyLog = async () => {
    await navigator.clipboard.writeText(log);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const summaryError = touched && !summary.trim();

  if (sentMode === 'formspree') {
    return (
      <motion.section
        key="sent-formspree"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="card report-sent"
        aria-live="polite"
        style={{ textAlign: 'center', padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
      >
        <div
          className="report-sent-icon"
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-success)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={28} />
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 700 }}>{s.sentDirectTitle}</h2>
        <p style={{ color: 'var(--color-text-muted)', maxWidth: '440px', lineHeight: 1.6 }}>{s.sentDirectBody}</p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setSentMode(null);
              setSummary('');
              setExpected('');
              setSteps('');
            }}
          >
            {s.again}
          </button>
          <a href={homeHref} className="btn-link primary">
            <ArrowLeft size={16} />
            {t.backToHome}
          </a>
        </div>
      </motion.section>
    );
  }

  if (sentMode === 'github') {
    return (
      <motion.section
        key="sent-github"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="card report-sent"
        aria-live="polite"
      >
        <div className="report-sent-icon"><ExternalLink size={22} /></div>
        <h2>{s.sentTitle}</h2>
        <p>{s.sentBody}</p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" className="secondary" onClick={() => setSentMode(null)}>{s.again}</button>
          <a href={homeHref} className="btn-link primary">
            <ArrowLeft size={16} />
            {t.backToHome}
          </a>
        </div>
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
    <form className="report-form" onSubmit={submitDirect} noValidate>
      {/* Honeypot field for bot spam trap */}
      <input
        type="text"
        name="_gotcha"
        value={gotcha}
        onChange={(e) => setGotcha(e.target.value)}
        style={{ display: 'none', position: 'absolute', left: '-9999px' }}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <section className="card report-fields">
        <div className="report-field">
          <span className="report-label" id="report-kind-label">{s.kind}</span>
          <FluidSegmentedControl
            value={kind}
            onChange={setKind}
            ariaLabelledBy="report-kind-label"
            role="radiogroup"
            options={[
              { value: 'conversion', label: s.kindConversion, id: 'report-kind-conversion' },
              { value: 'ui', label: s.kindUi, id: 'report-kind-ui' },
              { value: 'other', label: s.kindOther, id: 'report-kind-other' },
            ]}
          />
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
          <label className="report-label" htmlFor="report-expected">
            {s.expected}
            <span className="report-optional">{s.optional}</span>
          </label>
          <textarea
            id="report-expected"
            className="report-input"
            rows={3}
            value={expected}
            placeholder={s.expectedPlaceholder}
            onChange={(e) => setExpected(e.target.value)}
          />
        </div>

        <div className="report-field">
          <label className="report-label" htmlFor="report-steps">
            {s.steps}
            <span className="report-optional">{s.optional}</span>
          </label>
          <textarea
            id="report-steps"
            className="report-input"
            rows={3}
            value={steps}
            placeholder={s.stepsPlaceholder}
            onChange={(e) => setSteps(e.target.value)}
          />
        </div>

        {/* Optional Email Address */}
        <div className="report-field">
          <label className="report-label" htmlFor="report-email">
            {s.emailLabel}
            <span className="report-optional">{s.optional}</span>
          </label>
          <input
            id="report-email"
            type="email"
            className="report-input"
            value={email}
            placeholder={s.emailPlaceholder}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </section>

      <section className="card report-auto">
        <button
          type="button"
          id="report-auto-toggle"
          className="report-disclosure"
          aria-expanded={showAuto}
          onClick={() => setShowAuto(!showAuto)}
        >
          <span>{s.auto}</span>
          <motion.span animate={{ rotate: showAuto ? 180 : 0 }}>
            <ChevronDown size={18} />
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {showAuto && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <p className="report-hint">{ctx ? s.autoHint : s.autoEmpty}</p>
              <ul className="report-auto-list">
                {autoRows.filter((r) => r.show).map((r) => (
                  <li key={r.key}>
                    <label className="report-check">
                      <input
                        type="checkbox"
                        checked={include[r.key]}
                        onChange={(e) => setInclude({ ...include, [r.key]: e.target.checked })}
                      />
                      <span className="report-check-label">{r.label}</span>
                      <span className="report-check-value">{r.value}</span>
                    </label>
                  </li>
                ))}
                {ctx && log && (
                  <li>
                    <label className="report-check">
                      <input
                        type="checkbox"
                        checked={include.log}
                        onChange={(e) => setInclude({ ...include, log: e.target.checked })}
                      />
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

      <div className="report-submit-bar" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p className="report-notice">
          <Lock size={14} />
          {s.publicNotice}
        </p>

        {submitError && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: 'color-mix(in srgb, var(--color-danger) 12%, transparent)',
              color: 'var(--color-danger)',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertTriangle size={18} />
            <span>{submitError}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          <button
            id="report-submit"
            type="submit"
            className="primary report-submit"
            disabled={isSubmitting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '14px 24px',
              fontSize: '16px',
              fontWeight: 600,
              borderRadius: '14px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            <Send size={18} />
            {isSubmitting ? s.submitting : s.submitDirect}
          </button>

          <div style={{ textAlign: 'center', marginTop: '4px' }}>
            <button
              type="button"
              onClick={submitToGitHub}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                fontSize: '13px',
                textDecoration: 'underline',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
              }}
            >
              <ExternalLink size={14} />
              {s.orGithubBtn}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
