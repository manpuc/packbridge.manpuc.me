import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Info } from 'lucide-react';
import type { Translation } from '@/lib/i18n';

interface IntroAccordionProps {
  t: Translation;
}

const springTransition = { type: 'spring', stiffness: 350, damping: 25 } as const;

export default function IntroAccordion({ t }: IntroAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    try {
      if (sessionStorage.getItem('pb_intro_open') === 'true') {
        setIsOpen(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      try {
        if (next) {
          sessionStorage.setItem('pb_intro_open', 'true');
        } else {
          sessionStorage.removeItem('pb_intro_open');
        }
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <section className="intro-accordion-section" aria-label={t.introTitle}>
      <button
        type="button"
        className="intro-summary"
        onClick={toggle}
        aria-expanded={isOpen}
      >
        <div className="intro-summary-content">
          <Info size={18} className="intro-summary-icon" />
          <span className="intro-summary-title">{t.introTitle}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={springTransition}
          className="intro-chevron"
          aria-hidden="true"
        >
          <ChevronDown size={18} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: 'auto',
              opacity: 1,
              transition: {
                height: { duration: 0.24, ease: [0.25, 1, 0.5, 1] },
                opacity: { duration: 0.18, ease: 'easeOut' }
              }
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { duration: 0.2, ease: [0.25, 1, 0.5, 1] },
                opacity: { duration: 0.14, ease: 'easeIn' }
              }
            }}
            style={{ overflow: 'hidden' }}
          >
            <div className="intro-content-body">
              <p className="intro-lead">{t.introDescription}</p>

              <div className="intro-divider" role="separator" />

              <div className="features-section">
                <h3 className="features-title">{t.introFeaturesTitle}</h3>
                <div className="features-grid">
                  <div className="feature-item">
                    <p>{t.introFeature1}</p>
                  </div>
                  <div className="feature-item">
                    <p>{t.introFeature2}</p>
                  </div>
                  <div className="feature-item">
                    <p>{t.introFeature3}</p>
                  </div>
                  <div className="feature-item">
                    <p>{t.introFeature4}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

