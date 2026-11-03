import { useEffect, useState } from 'react';

const LINE_UA = /\bLine\//i;

// 主要アプリのアプリ内ブラウザ（Facebook/Messenger, Instagram, WeChat, KakaoTalk, Naver, Snapchat, TikTok, Pinterest, LinkedIn, Twitter）
const KNOWN_IN_APP_UA =
  /FBAN|FBAV|FB_IAB|Instagram|MicroMessenger|KAKAOTALK|NAVER\(inapp|Snapchat|musical_ly|BytedanceWebview|Pinterest|LinkedInApp|Twitter/i;

export function detectInAppBrowser(): { isInApp: boolean; isLine: boolean } {
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

/** LINE の openExternalBrowser=1 付き URL（LINE 専用の仕様） */
export function buildExternalBrowserUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.set('openExternalBrowser', '1');
  return url.toString();
}

/** hydration 不一致を避けるため、マウント後に判定する */
export function useInAppBrowser(): { isInApp: boolean; isLine: boolean } {
  const [state, setState] = useState({ isInApp: false, isLine: false });
  useEffect(() => {
    setState(detectInAppBrowser());
  }, []);
  return state;
}

