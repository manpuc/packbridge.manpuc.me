import { useState, useEffect, useRef } from 'react';
import { Languages, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SUPPORTED_LANGUAGES, LANG_NAMES, type Language } from '@/lib/i18n';

export default function LangToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<Language>('ja');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Current pathname from browser
    const path = window.location.pathname;
    const pathLang = path.split('/')[1] as Language;
    const detectedLang = SUPPORTED_LANGUAGES.includes(pathLang) ? pathLang : 'ja';
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

    // Supported language prefixes
    const langPrefixes = SUPPORTED_LANGUAGES.join('|');
    const langRegex = new RegExp(`^/(${langPrefixes})(/|$)`);

    // Extract path without language prefix
    const currentPathname = window.location.pathname;
    const basePath = currentPathname.replace(langRegex, '/').replace(/\/+$/, '') || '';

    // Construct new path: all languages use /{lang}/...
    const newPath = `/${lang}${basePath}`;

    // Save choice, dismiss suggestion prompt, and redirect
    localStorage.setItem('lang', lang);
    localStorage.setItem('lang_suggestion_dismissed', 'true');
    window.location.href = window.location.origin + newPath;
  };

  return (
    <div className="lang-selector-container" ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`icon-btn ${isOpen ? 'active' : ''}`}
        aria-label="Select Language"
        aria-expanded={isOpen}
      >
        <Languages size={20} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="lang-dropdown"
            className="lang-dropdown"
            data-origin="top-right"
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -2 }}
            transition={{
              duration: 0.22,
              ease: [0.22, 1, 0.36, 1], // transitions.dev --dropdown-ease
            }}
          >
            <div className="dropdown-header">Select Language</div>
            <div className="dropdown-list">
              {SUPPORTED_LANGUAGES.map((l) => (
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
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{
        __html: `
        .lang-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid var(--color-border);
          padding: 6px;
          border-radius: calc(10px + 6px); /* Concentric: 10px inner item + 6px padding = 16px */
          min-width: 170px;
          box-shadow: var(--shadow-md);
          z-index: 1001;
          transform-origin: top right;
        }
        [data-theme="dark"] .lang-dropdown {
          background: rgba(24, 24, 26, 0.82);
        }
        .dropdown-header {
          padding: 8px 10px 6px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--color-text-muted);
          font-weight: 600;
        }
        .dropdown-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .dropdown-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 8px 10px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: var(--color-text);
          font-size: 14px;
          cursor: pointer;
          transition: background-color 0.15s ease, color 0.15s ease;
          text-align: left;
          transform: none !important;
        }
        .dropdown-item:hover {
          background: var(--color-border);
          opacity: 1;
        }
        .dropdown-item.selected {
          color: var(--color-accent-blue);
          font-weight: 600;
        }
      `}} />
    </div>
  );
}
