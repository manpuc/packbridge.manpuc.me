import { useState, useEffect, useRef } from 'react';
import { Languages, Check } from 'lucide-react';
import { translations, type Language } from '../lib/i18n';

const LANG_NAMES: Record<Language, string> = {
  ja: '日本語',
  en: 'English',
  ko: '한국어',
  zh: '中文',
  tl: 'Tagalog',
  tok: 'toki pona'
};

export default function LangToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<Language>('ja');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Detect lang from URL or HTML tag
    const path = window.location.pathname;
    const pathLang = path.split('/')[1] as Language;
    const detectedLang = Object.keys(translations).includes(pathLang) ? pathLang : 'ja';
    setCurrentLang(detectedLang);

    // Sync localStorage with current URL language
    localStorage.setItem('lang', detectedLang);

    // Close dropdown on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectLang = (lang: Language) => {
    setIsOpen(false);
    if (lang === currentLang) return;

    // Save choice
    localStorage.setItem('lang', lang);

    // Build new URL
    const baseUrl = window.location.origin;
    const newPath = lang === 'ja' ? '/' : `/${lang}`;
    window.location.href = baseUrl + newPath;
  };

  return (
    <div className="lang-selector-container" ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`icon-btn ${isOpen ? 'active' : ''}`}
        aria-label="Select Language"
      >
        <Languages size={20} />
      </button>

      {isOpen && (
        <div className="lang-dropdown fade-in">
          <div className="dropdown-header">Select Language</div>
          <div className="dropdown-list">
            {(Object.keys(LANG_NAMES) as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => selectLang(l)}
                className={`dropdown-item ${currentLang === l ? 'selected' : ''}`}
              >
                <span>{LANG_NAMES[l]}</span>
                {currentLang === l && <Check size={14} className="check-icon" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .lang-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          background: var(--color-surface);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          min-width: 160px;
          box-shadow: var(--shadow-md);
          z-index: 1000;
          overflow: hidden;
        }
        .dropdown-header {
          padding: 12px 16px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          border-bottom: 1px solid var(--color-border);
          font-weight: 600;
        }
        .dropdown-list {
          padding: 6px;
        }
        .dropdown-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--color-text);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }
        .dropdown-item:hover {
          background: rgba(0,0,0,0.05);
        }
        [data-theme="dark"] .dropdown-item:hover {
          background: rgba(255,255,255,0.1);
        }
        .dropdown-item.selected {
          color: var(--color-accent-blue);
          font-weight: 600;
        }
        .fade-in {
          animation: fadeIn 0.15s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
