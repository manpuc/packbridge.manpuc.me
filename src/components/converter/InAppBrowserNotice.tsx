import { useEffect, useState } from 'react';
import { ExternalLink, TriangleAlert, X } from 'lucide-react';
import type { Translation } from '@/lib/i18n';
import { buildExternalBrowserUrl, useInAppBrowser } from '@/lib/inAppBrowser';
import { trackEvent } from '@/lib/analytics';

const DISMISS_KEY = 'in_app_browser_notice_dismissed';

/**
 * アプリ内ブラウザ向けの警告シート（スマホ前提・画面下部）。
 * 「Safari・Chromeで開いてください」を最も大きく太く見せ、登場時に一度だけアイコンを揺らす。
 * 閉じても、ファイル選択後に DropZone 側で再度警告する。
 */
export function InAppBrowserNotice({ t }: { t: Translation }) {
  const { isInApp, isLine } = useInAppBrowser();
  const [isVisible, setIsVisible] = useState(false);
  // openExternalBrowser=1 は LINE 専用のため、外部ブラウザへのボタンは LINE のときだけ出す
  const [externalUrl, setExternalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isInApp) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) return;
    } catch {}
    if (isLine) setExternalUrl(buildExternalBrowserUrl());
    // ページ描画後に表示する
    const timer = setTimeout(() => setIsVisible(true), 600);
    return () => clearTimeout(timer);
  }, [isInApp, isLine]);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, 'true');
    } catch {}
  };

  if (!isVisible) return null;

  return (
    <aside className="in-app-notice" role="alert" aria-label="In-app browser notice">
      <div className="in-app-notice-row">
        <div className="in-app-notice-icon" aria-hidden="true">
          <TriangleAlert size={30} strokeWidth={2.4} />
        </div>
        <div className="in-app-notice-text">
          <span className="in-app-notice-reason">{t.inAppBrowserNotice}</span>
          <strong className="in-app-notice-action-text">{t.inAppBrowserAction}</strong>
        </div>
        <button type="button" onClick={handleDismiss} className="in-app-notice-close" aria-label="Close">
          <X size={20} />
        </button>
      </div>
      {externalUrl && (
        <a
          href={externalUrl}
          // Astro ClientRouter の遷移横取りを避け、LINE が openExternalBrowser を検知できるよう通常のページ読み込みにする
          data-astro-reload
          rel="noopener"
          onClick={() => {
            trackEvent('open_external_browser', { browser: isLine ? 'line' : 'other', trigger: 'notice_sheet' });
          }}
          className="in-app-notice-button"
        >
          <ExternalLink size={18} />
          {t.inAppBrowserOpenExternal}
        </a>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .in-app-notice {
          position: fixed;
          left: 12px;
          right: 12px;
          bottom: calc(12px + env(safe-area-inset-bottom));
          margin: 0 auto;
          max-width: 480px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 8px;
          /* 蜷悟ｿ・ｧ剃ｸｸ: 螟門・ 18px(--radius-md) = 繝懊ち繝ｳ 10px(--radius-sm) + 菴咏區 8px */
          padding: 8px;
          background: var(--color-surface);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-md);
          color: var(--color-text);
          animation: inAppNoticeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        /* 言語提案バナー（画面下）が表示されている間は、その上に積む */
        body:has(.lang-suggestion-toast) .in-app-notice {
          bottom: calc(88px + env(safe-area-inset-bottom));
        }
        .in-app-notice-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 4px 0 0 4px;
        }
        /* 警告色はこのタイルだけに使う（背景全体は塗らない） */
        .in-app-notice-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: var(--radius-sm);
          background: color-mix(in srgb, var(--color-warning) 22%, transparent);
          color: var(--color-warning);
          flex-shrink: 0;
          transform-origin: 50% 85%;
          /* 登場後に目立つ弾むアニメーションで視線を引く */
          animation: inAppNoticeWiggle 0.9s cubic-bezier(0.25, 1, 0.5, 1) 0.5s 1 both;
        }
        .in-app-notice-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
          padding-top: 1px;
        }
        .in-app-notice-reason {
          font-size: 15px;
          line-height: 1.5;
          font-weight: 500;
        }
        .in-app-notice-action-text {
          font-size: 19px;
          line-height: 1.35;
          font-weight: 800;
          letter-spacing: -0.01em;
        }
        .in-app-notice-close {
          border: none;
          background: transparent;
          color: var(--color-text-muted);
          cursor: pointer;
          width: 44px;
          height: 44px;
          margin: -4px 0 0 0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .in-app-notice-close:active { background: rgba(120, 120, 128, 0.16); }
        .in-app-notice-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 48px;
          background: var(--color-accent-blue);
          color: #ffffff;
          font-size: 16px;
          font-weight: 700;
          text-decoration: none;
          border-radius: var(--radius-sm);
          transition: transform 0.15s ease, opacity 0.15s ease;
        }
        .in-app-notice-button:active { transform: scale(0.97); opacity: 0.9; }
        @keyframes inAppNoticeIn {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes inAppNoticeWiggle {
          0% { transform: scale(1) rotate(0deg); }
          15% { transform: scale(1.18) rotate(-16deg); }
          30% { transform: scale(1.18) rotate(14deg); }
          45% { transform: scale(1.12) rotate(-10deg); }
          60% { transform: scale(1.06) rotate(6deg); }
          75% { transform: scale(1.02) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .in-app-notice, .in-app-notice-icon { animation: none; }
        }
      `}} />
    </aside>
  );
}
