import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { Translation } from '@/lib/i18n';

const LINE_UA = /\bLine\//i;

// 主要アプリのアプリ内ブラウザ（Facebook/Messenger, Instagram, WeChat, KakaoTalk, Naver, Snapchat, TikTok, Pinterest, LinkedIn, Twitter）
const KNOWN_IN_APP_UA =
  /FBAN|FBAV|FB_IAB|Instagram|MicroMessenger|KAKAOTALK|NAVER\(inapp|Snapchat|musical_ly|BytedanceWebview|Pinterest|LinkedInApp|Twitter/i;

function detectInAppBrowser(): { isInApp: boolean; isLine: boolean } {
  if (typeof navigator === 'undefined') return { isInApp: false, isLine: false };
  const ua = navigator.userAgent;
  const isLine = LINE_UA.test(ua);
  // iOS: 標準ブラウザは UA に "Safari/" を含むが、WKWebView ベースのアプリ内ブラウザは含まない
  const isIosWebView = /iPhone|iPad|iPod/.test(ua) && !/Safari\//.test(ua);
  // Android: WebView は UA に "; wv)" を含む
  const isAndroidWebView = /; wv\)/.test(ua);
  return {
    isInApp: isLine || KNOWN_IN_APP_UA.test(ua) || isIosWebView || isAndroidWebView,
    isLine,
  };
}

function buildExternalBrowserUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.set('openExternalBrowser', '1');
  return url.toString();
}

export function InAppBrowserNotice({ t }: { t: Translation }) {
  const [isInApp, setIsInApp] = useState(false);
  // openExternalBrowser=1 は LINE 専用のため、外部ブラウザへのリンクは LINE のときだけ出す
  const [externalUrl, setExternalUrl] = useState<string | null>(null);

  // hydration不一致を避けるためマウント後に判定する
  useEffect(() => {
    const { isInApp, isLine } = detectInAppBrowser();
    setIsInApp(isInApp);
    if (isLine) setExternalUrl(buildExternalBrowserUrl());
  }, []);

  if (!isInApp) return null;

  return (
    <div
      role="note"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px 14px',
        borderRadius: '14px',
        border: '1px solid var(--color-border)',
        backgroundColor: 'rgba(120, 120, 128, 0.06)',
        fontSize: '13px',
        lineHeight: 1.5,
        color: 'var(--color-text)',
      }}
    >
      <span>{t.inAppBrowserNotice}</span>
      {externalUrl && (
        <a
          href={externalUrl}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--color-accent-blue)' }}
        >
          <ExternalLink size={15} />
          {t.inAppBrowserOpenExternal}
        </a>
      )}
    </div>
  );
}

