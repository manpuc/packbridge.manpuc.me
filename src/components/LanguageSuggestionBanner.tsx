import { useState, useEffect } from 'react';
import { Globe, X } from 'lucide-react';
import { LANG_NAMES, SUPPORTED_LANGUAGES, type Language } from '@/lib/i18n/config';

// Native suggestions mapping
const SUGGESTION_TEXT: Record<Language, { message: string; action: string }> = {
  ja: { message: '日本語で表示しますか？', action: '日本語に切り替え' },
  en: { message: 'Switch to English?', action: 'Switch' },
  ko: { message: '한국어로 보시겠습니까?', action: '변경' },
  zh: { message: '是否切换为中文？', action: '切换' },
  tl: { message: 'Lumipat sa Tagalog?', action: 'Lumipat' },
  es: { message: '¿Cambiar a Español?', action: 'Cambiar' },
  fr: { message: 'Passer en Français ?', action: 'Changer' },
  de: { message: 'Zu Deutsch wechseln?', action: 'Wechseln' },
};

function resolveBrowserLang(): Language | null {
  if (typeof navigator === 'undefined') return null;

  const candidates: string[] = [];
  if (Array.isArray(navigator.languages)) {
    candidates.push(...navigator.languages);
  }
  if (navigator.language) {
    candidates.push(navigator.language);
  }

  for (const raw of candidates) {
    const code = raw.toLowerCase().split('-')[0];
    if ((SUPPORTED_LANGUAGES as readonly string[]).includes(code)) {
      return code as Language;
    }
  }
  return null;
}

export default function LanguageSuggestionBanner() {
  const [targetLang, setTargetLang] = useState<Language | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. Check if user already dismissed or interacted with language selection
    try {
      const dismissed = localStorage.getItem('lang_suggestion_dismissed');
      if (dismissed) return;

      const savedLang = localStorage.getItem('lang');
      // If user has an explicit saved preference in localStorage, respect it and do not prompt
      if (savedLang) return;
    } catch {}

    // 2. Identify current URL language
    const path = window.location.pathname;
    const segments = path.split('/').filter(Boolean);
    const firstSegment = segments[0] as Language | undefined;
    const currentLang: Language = (firstSegment && (SUPPORTED_LANGUAGES as readonly string[]).includes(firstSegment))
      ? firstSegment
      : 'ja';

    // 3. Detect browser's preferred language
    const detected = resolveBrowserLang();
    if (!detected || detected === currentLang) {
      return;
    }

    setTargetLang(detected);
    // Slight delay so entrance animation feels smooth after page render
    const timer = setTimeout(() => setIsVisible(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem('lang_suggestion_dismissed', 'true');
    } catch {}
  };

  const handleSwitch = () => {
    if (!targetLang) return;
    try {
      localStorage.setItem('lang', targetLang);
      localStorage.setItem('lang_suggestion_dismissed', 'true');
    } catch {}

    const path = window.location.pathname;
    const langPrefixes = SUPPORTED_LANGUAGES.join('|');
    const langRegex = new RegExp(`^/(${langPrefixes})(/|$)`);
    const basePath = path.replace(langRegex, '/').replace(/\/+$/, '') || '';

    const newPath = `/${targetLang}${basePath}`;
    window.location.href = window.location.origin + newPath;
  };

  if (!targetLang || !isVisible) return null;

  const textInfo = SUGGESTION_TEXT[targetLang] || SUGGESTION_TEXT.en;

  return (
    <aside
      className="lang-suggestion-toast"
      role="region"
      aria-label="Language suggestion"
    >
      <div className="toast-content">
        <div className="toast-icon" aria-hidden="true">
          <Globe size={18} />
        </div>
        <div className="toast-text">
          <span className="toast-message">{textInfo.message}</span>
          <span className="toast-lang-name">({LANG_NAMES[targetLang]})</span>
        </div>
        <div className="toast-actions">
          <button
            type="button"
            onClick={handleSwitch}
            className="toast-btn-action"
          >
            {textInfo.action}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="toast-btn-close"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .lang-suggestion-toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          animation: slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          max-width: calc(100vw - 32px);
          width: max-content;
        }

        .toast-content {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px 8px 16px;
          background: var(--color-surface);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-full);
          box-shadow: var(--shadow-md), 0 8px 32px rgba(0, 0, 0, 0.12);
          color: var(--color-text);
          font-size: 14px;
        }

        .toast-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-accent-blue);
          flex-shrink: 0;
        }

        .toast-text {
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          font-weight: 500;
        }

        .toast-lang-name {
          color: var(--color-text-muted);
          font-size: 12px;
        }

        .toast-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: 4px;
        }

        .toast-btn-action {
          border: none;
          background: var(--color-accent-blue);
          color: #ffffff;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: transform 0.15s ease, opacity 0.15s ease;
          white-space: nowrap;
        }

        .toast-btn-action:hover {
          opacity: 0.9;
          transform: scale(1.02);
        }

        .toast-btn-action:active {
          transform: scale(0.97);
        }

        .toast-btn-close {
          border: none;
          background: transparent;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s ease, background 0.15s ease;
        }

        .toast-btn-close:hover {
          color: var(--color-text);
          background: rgba(0, 0, 0, 0.05);
        }

        [data-theme='dark'] .toast-btn-close:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translate(-50%, 20px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }

        @media (max-width: 480px) {
          .lang-suggestion-toast {
            bottom: 16px;
            width: calc(100vw - 32px);
          }
          .toast-content {
            padding: 8px 12px;
            justify-content: space-between;
          }
          .toast-text {
            font-size: 13px;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      `}} />
    </aside>
  );
}

