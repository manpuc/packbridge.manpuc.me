import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ConversionDirection } from '@/lib/pack/types';
import type { Translation } from '@/lib/i18n';
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
  enableSoundConversion: boolean;
  setEnableSoundConversion: (v: boolean) => void;
  t: Translation;
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
  enableSoundConversion,
  setEnableSoundConversion,
  t
}: DirectionSettingsProps) {
  const [isBetaExpanded, setIsBetaExpanded] = useState(false);

  const uiDirection: 'java-to-bedrock' | 'bedrock-to-java' | 'version-update' =
    direction === 'java-to-bedrock' ? 'java-to-bedrock' :
    direction === 'bedrock-to-java' ? 'bedrock-to-java' : 'version-update';

  // We determine the internal source edition based on the direction passed from Converter
  const sourceEdition = direction.startsWith('java') ? 'java' : 'bedrock';

  const handleUiDirectionChange = (newDir: 'java-to-bedrock' | 'bedrock-to-java' | 'version-update') => {
    if (newDir === 'java-to-bedrock') {
      setDirection('java-to-bedrock');
    } else if (newDir === 'bedrock-to-java') {
      setDirection('bedrock-to-java');
    } else {
      // Defaults to java-to-java before auto-detect, Converter logic will auto-correct to bedrock-to-bedrock if Bedrock uploaded
      setDirection(sourceEdition === 'bedrock' ? 'bedrock-to-bedrock' : 'java-to-java');
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="segmented-control" style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap' }}>
        <button
          className={uiDirection === 'java-to-bedrock' ? 'active' : ''}
          onClick={() => handleUiDirectionChange('java-to-bedrock')}
          style={{ flex: 1, minWidth: '30%' }}
        >
          {t.directionJavaToBedrock}
        </button>
        <button
          className={uiDirection === 'bedrock-to-java' ? 'active' : ''}
          onClick={() => handleUiDirectionChange('bedrock-to-java')}
          style={{ flex: 1, minWidth: '30%' }}
        >
          {t.directionBedrockToJava}
        </button>
        <button
          className={uiDirection === 'version-update' ? 'active' : ''}
          onClick={() => handleUiDirectionChange('version-update')}
          style={{ flex: 1, minWidth: '30%' }}
        >
          {t.directionVersionUpdate || 'Version Update'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        <AnimatePresence initial={false}>
          {uiDirection !== 'version-update' && (
            <motion.div
              key="cross-edition"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{t.sourceVersion} ({uiDirection === 'java-to-bedrock' ? 'Java' : 'Bedrock'})</span>
                    {isAutoDetected && <span style={{ color: 'var(--color-primary)' }}>{t.autoDetected}</span>}
                  </label>
                  <div className={`select-wrapper ${!isAutoDetected ? 'disabled' : ''}`} style={{ opacity: !isAutoDetected ? 0.7 : 1 }}>
                    {hasFile ? (
                      <select
                        className="select-input"
                        value={uiDirection === 'java-to-bedrock' ? selectedJavaVersion : selectedBedrockVersion}
                        disabled={true}
                      >
                        {uiDirection === 'java-to-bedrock'
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
                    {t.targetVersion} ({uiDirection === 'java-to-bedrock' ? 'Bedrock' : 'Java'})
                  </label>
                  <div className="select-wrapper">
                    <select
                      className="select-input"
                      value={uiDirection === 'java-to-bedrock' ? selectedBedrockVersion : selectedJavaVersion}
                      onChange={(e) => uiDirection === 'java-to-bedrock' ? setSelectedBedrockVersion(e.target.value) : setSelectedJavaVersion(e.target.value)}
                    >
                      {uiDirection === 'java-to-bedrock'
                        ? BEDROCK_VERSIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)
                        : JAVA_VERSIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)
                      }
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {uiDirection === 'version-update' && (
            <motion.div
              key="version-update"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t.targetVersion} {hasFile ? `(${sourceEdition === 'java' ? 'Java' : 'Bedrock'})` : ''}</span>
                  {isAutoDetected && <span style={{ color: 'var(--color-primary)' }}>{t.autoDetected}</span>}
                </label>
                <div className="select-wrapper">
                  {hasFile ? (
                    <select
                      className="select-input"
                      value={sourceEdition === 'java' ? selectedJavaVersion : selectedBedrockVersion}
                      onChange={(e) => sourceEdition === 'java' ? setSelectedJavaVersion(e.target.value) : setSelectedBedrockVersion(e.target.value)}
                    >
                      {sourceEdition === 'java'
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
            </motion.div>
          )}
        </AnimatePresence>
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
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '14px', cursor: 'pointer', padding: '4px 0' }}>
                    <span style={{ color: 'var(--color-text)' }}>{t.enableSoundConversion || 'Enable Sound Conversion'}</span>
                    <IosSwitch checked={enableSoundConversion} onChange={setEnableSoundConversion} />
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
    </motion.div>
  );
}
