import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const currentTheme = savedTheme || systemTheme;
    setTheme(currentTheme);
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <button onClick={toggleTheme} className="icon-btn theme-toggle-btn" aria-label="Toggle Theme">
      <div className="t-icon-swap" data-state={theme === 'light' ? 'moon' : 'sun'}>
        <span className="t-icon" data-icon="moon">
          <Moon size={20} />
        </span>
        <span className="t-icon" data-icon="sun">
          <Sun size={20} />
        </span>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .theme-toggle-btn .t-icon-swap {
          position: relative;
          display: inline-grid;
          width: 20px;
          height: 20px;
          place-items: center;
        }
        .theme-toggle-btn .t-icon {
          grid-area: 1 / 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition:
            opacity var(--icon-swap-dur, 260ms) var(--icon-swap-ease, cubic-bezier(0.22, 1, 0.36, 1)),
            filter var(--icon-swap-dur, 260ms) var(--icon-swap-ease, cubic-bezier(0.22, 1, 0.36, 1)),
            transform var(--icon-swap-dur, 260ms) var(--icon-swap-ease, cubic-bezier(0.22, 1, 0.36, 1));
        }
        .theme-toggle-btn .t-icon-swap[data-state="moon"] .t-icon[data-icon="moon"],
        .theme-toggle-btn .t-icon-swap[data-state="sun"] .t-icon[data-icon="sun"] {
          opacity: 1;
          filter: blur(0);
          transform: scale(1) rotate(0deg);
        }
        .theme-toggle-btn .t-icon-swap[data-state="moon"] .t-icon[data-icon="sun"] {
          opacity: 0;
          filter: blur(2px);
          transform: scale(0.35) rotate(45deg);
        }
        .theme-toggle-btn .t-icon-swap[data-state="sun"] .t-icon[data-icon="moon"] {
          opacity: 0;
          filter: blur(2px);
          transform: scale(0.35) rotate(-45deg);
        }
        @media (prefers-reduced-motion: reduce) {
          .theme-toggle-btn .t-icon {
            transition: none !important;
          }
        }
      `}} />
    </button>
  );
}
