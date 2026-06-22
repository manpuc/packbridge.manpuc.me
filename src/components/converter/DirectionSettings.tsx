import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ConversionDirection } from '@/lib/pack/types';
import { JAVA_VERSIONS, BEDROCK_VERSIONS } from '@/lib/pack/versions';

const IosSwitch = ({ checked, onChange }: { checked: boolean, onChange: (c: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    style={{
      width: '40px',
      height: '24px',
      borderRadius: '12px',
      backgroundColor: checked ? '#007AFF' : 'rgba(120, 120, 120, 0.3)',
      border: 'none',
      padding: '2px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: checked ? 'flex-end' : 'flex-start',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      flexShrink: 0,
      transform: 'none'
    }}
  >
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 700, damping: 30 }}
      style={{
        width: '20px',
        height: '20px',
        backgroundColor: '#fff',
        borderRadius: '50%',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}
    />
  </button>
);

interface DirectionSettingsProps {
  direction: ConversionDirection;
  setDirection: (d: ConversionDirection) => void;
  selectedJavaVersion: string;
  setSelectedJavaVersion: (v: string) => void;
  selectedBedrockVersion: string;
  setSelectedBedrockVersion: (v: string) => void;
  isAutoDetected?: boolean;
  hasFile?: boolean;
  enableGuiConversion: boolean;
  setEnableGuiConversion: (v: boolean) => void;
  enableAnimationConversion: boolean;
  setEnableAnimationConversion: (v: boolean) => void;
  enableLanguageConversion: boolean;
  setEnableLanguageConversion: (v: boolean) => void;
  t: any;
}

export function DirectionSettings({
  direction,
  setDirection,
  selectedJavaVersion,
  setSelectedJavaVersion,
  selectedBedrockVersion,
  setSelectedBedrockVersion,
  isAutoDetected,
  hasFile,
  enableGuiConversion,
  setEnableGuiConversion,
  enableAnimationConversion,
  setEnableAnimationConversion,
  enableLanguageConversion,
  setEnableLanguageConversion,
  t
}: DirectionSettingsProps) {
  const [isBetaExpanded, setIsBetaExpanded] = useState(false);
  const sourceName = direction === 'java-to-bedrock' ? 'Java' : 'Bedrock';
  const targetName = direction === 'java-to-bedrock' ? 'Bedrock' : 'Java';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="segmented-control">
        <button
          className={direction === 'java-to-bedrock' ? 'active' : ''}
          onClick={() => setDirection('java-to-bedrock')}
        >
          {t.directionJavaToBedrock}
        </button>
        <button
          className={direction === 'bedrock-to-java' ? 'active' : ''}
          onClick={() => setDirection('bedrock-to-java')}
        >
          {t.directionBedrockToJava}
        </button>
      </div>

      <motion.div layout style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>{t.sourceVersion} ({sourceName})</span>
            {isAutoDetected && <span style={{ color: 'var(--color-primary)' }}>{t.autoDetected}</span>}
          </label>
          <div className={`select-wrapper ${!isAutoDetected ? 'disabled' : ''}`} style={{ opacity: !isAutoDetected ? 0.7 : 1 }}>
            {hasFile ? (
              <select
                className="select-input"
                value={direction === 'java-to-bedrock' ? selectedJavaVersion : selectedBedrockVersion}
                disabled={true}
              >
                {direction === 'java-to-bedrock'
                  ? JAVA_VERSIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)
                  : BEDROCK_VERSIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)
                }
              </select>
            ) : (
              <div className="select-input" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-muted)' }}>
                {t.uploadToAutoDetect}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            {t.targetVersion} ({targetName})
          </label>
          <div className="select-wrapper">
            <select
              className="select-input"
              value={direction === 'java-to-bedrock' ? selectedBedrockVersion : selectedJavaVersion}
              onChange={(e) => direction === 'java-to-bedrock' ? setSelectedBedrockVersion(e.target.value) : setSelectedJavaVersion(e.target.value)}
            >
              {direction === 'java-to-bedrock'
                ? BEDROCK_VERSIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)
                : JAVA_VERSIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)
              }
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
          <button
            type="button"
            onClick={() => setIsBetaExpanded(!isBetaExpanded)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '4px',
              fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)',
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontFamily: 'inherit', textAlign: 'left', width: '100%',
              transform: 'none'
            }}
          >
            {isBetaExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {t.betaFeatures || 'Beta Features'}
          </button>

          <AnimatePresence initial={false}>
            {isBetaExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '14px', cursor: 'pointer', padding: '4px 0' }}>
                    <span style={{ color: 'var(--color-text)' }}>{t.enableGuiConversion || 'Enable GUI Conversion'}</span>
                    <IosSwitch checked={enableGuiConversion} onChange={setEnableGuiConversion} />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '14px', cursor: 'pointer', padding: '4px 0' }}>
                    <span style={{ color: 'var(--color-text)' }}>{t.enableAnimationConversion || 'Enable Animation Conversion'}</span>
                    <IosSwitch checked={enableAnimationConversion} onChange={setEnableAnimationConversion} />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '14px', cursor: 'pointer', padding: '4px 0' }}>
                    <span style={{ color: 'var(--color-text)' }}>{t.enableLanguageConversion || 'Enable Language Conversion'}</span>
                    <IosSwitch checked={enableLanguageConversion} onChange={setEnableLanguageConversion} />
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
