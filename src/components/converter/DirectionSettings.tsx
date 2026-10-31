import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { ConversionDirection } from '@/lib/pack/types';
import type { Translation } from '@/lib/i18n';
import { JAVA_VERSIONS, BEDROCK_VERSIONS } from '@/lib/pack/versions';
import { FluidSegmentedControl } from '@/components/ui/FluidSegmentedControl';

const IosSwitch = ({ checked, onChange }: { checked: boolean, onChange: (c: boolean) => void }) => {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerLeave={() => setIsPressed(false)}
      onPointerCancel={() => setIsPressed(false)}
      onClick={() => onChange(!checked)}
      style={{
        boxSizing: 'border-box',
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        backgroundColor: checked ? 'var(--color-success)' : 'var(--color-border)',
        border: 'none',
        padding: '2px',
        display: 'block',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background-color 0.25s var(--spring-smooth)',
        flexShrink: 0,
        transform: 'none',
        WebkitTapHighlightColor: 'transparent'
      }}
    >
      <motion.div
        initial={false}
        animate={{
          x: checked ? 20 : 0,
          scaleX: isPressed ? 1.2 : 1,
          scaleY: isPressed ? 0.88 : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 450,
          damping: 28,
        }}
        style={{
          width: '20px',
          height: '20px',
          backgroundColor: '#ffffff',
          borderRadius: '50%',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          transformOrigin: checked ? 'right center' : 'left center'
        }}
      />
    </button>
  );
};

interface DirectionSettingsProps {
  direction: ConversionDirection;
  setDirection: (d: ConversionDirection) => void;
  selectedJavaVersion: string;
  setSelectedJavaVersion: (v: string) => void;
  selectedBedrockVersion: string;
  setSelectedBedrockVersion: (v: string) => void;
  sourceJavaVersion?: string;
  setSourceJavaVersion?: (v: string) => void;
  sourceBedrockVersion?: string;
  setSourceBedrockVersion?: (v: string) => void;
  isAutoDetected?: boolean;
  hasFile?: boolean;
  enableGuiConversion: boolean;
  setEnableGuiConversion: (v: boolean) => void;
  enableModernGuiSprites: boolean;
  setEnableModernGuiSprites: (v: boolean) => void;
  enableTgaConversion: boolean;
  setEnableTgaConversion: (v: boolean) => void;
  enableAnimationConversion: boolean;
  setEnableAnimationConversion: (v: boolean) => void;
  enableLanguageConversion: boolean;
  setEnableLanguageConversion: (v: boolean) => void;
  enableSoundConversion: boolean;
  setEnableSoundConversion: (v: boolean) => void;
  enableAudioReencode: boolean;
  setEnableAudioReencode: (v: boolean) => void;
  t: Translation;
}

export function DirectionSettings({
  direction,
  setDirection,
  selectedJavaVersion,
  setSelectedJavaVersion,
  selectedBedrockVersion,
  setSelectedBedrockVersion,
  sourceJavaVersion,
  setSourceJavaVersion,
  sourceBedrockVersion,
  setSourceBedrockVersion,
  isAutoDetected,
  hasFile,
  enableGuiConversion,
  setEnableGuiConversion,
  enableModernGuiSprites,
  setEnableModernGuiSprites,
  enableTgaConversion,
  setEnableTgaConversion,
  enableAnimationConversion,
  setEnableAnimationConversion,
  enableLanguageConversion,
  setEnableLanguageConversion,
  enableSoundConversion,
  setEnableSoundConversion,
  enableAudioReencode,
  setEnableAudioReencode,
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
      <FluidSegmentedControl
        value={uiDirection}
        onChange={handleUiDirectionChange}
        style={{ marginBottom: '16px' }}
        options={[
          { value: 'java-to-bedrock', label: t.directionJavaToBedrock },
          { value: 'bedrock-to-java', label: t.directionBedrockToJava },
          { value: 'version-update', label: t.directionVersionUpdate || 'Version Update' },
        ]}
      />

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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{t.sourceVersion} {hasFile ? `(${sourceEdition === 'java' ? 'Java' : 'Bedrock'})` : ''}</span>
                    {isAutoDetected && <span style={{ color: 'var(--color-primary)' }}>{t.autoDetected}</span>}
                  </label>
                  <div className={`select-wrapper ${!isAutoDetected ? 'disabled' : ''}`} style={{ opacity: !isAutoDetected ? 0.7 : 1 }}>
                    {hasFile ? (
                      <select
                        className="select-input"
                        value={sourceEdition === 'java' ? (sourceJavaVersion || selectedJavaVersion) : (sourceBedrockVersion || selectedBedrockVersion)}
                        disabled={true}
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                    {t.targetVersion} {hasFile ? `(${sourceEdition === 'java' ? 'Java' : 'Bedrock'})` : ''}
                  </label>
                  <div className="select-wrapper">
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
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
          <button
            type="button"
            className="beta-toggle-btn"
            onClick={() => setIsBetaExpanded(!isBetaExpanded)}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                display: 'inline-block',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '6px',
                backgroundColor: 'var(--color-border)',
                color: 'var(--color-text-muted)',
                letterSpacing: '0.02em'
              }}>BETA</span>
              <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{t.betaFeatures || 'Beta Features'}</span>
            </span>
            <motion.div
              animate={{ rotate: isBetaExpanded ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="beta-toggle-chevron"
            >
              <ChevronDown size={17} />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {isBetaExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{
                  height: 'auto',
                  opacity: 1,
                  transition: {
                    height: { type: 'spring', stiffness: 350, damping: 30 },
                    opacity: { duration: 0.22, ease: 'easeOut' }
                  }
                }}
                exit={{
                  height: 0,
                  opacity: 0,
                  transition: {
                    height: { duration: 0.24, ease: [0.25, 1, 0.5, 1] },
                    opacity: { duration: 0.18, ease: 'easeIn' }
                  }
                }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '6px' }}>
                  <label className="beta-option-row">
                    <span style={{ color: 'var(--color-text)' }}>{t.enableGuiConversion || 'Enable GUI Conversion'}</span>
                    <IosSwitch checked={enableGuiConversion} onChange={setEnableGuiConversion} />
                  </label>
                  <label className="beta-option-row">
                    <span style={{ color: 'var(--color-text)' }}>{t.enableModernGuiSprites || 'Enable 1.20.2+ Split GUI Sprites'}</span>
                    <IosSwitch checked={enableModernGuiSprites} onChange={setEnableModernGuiSprites} />
                  </label>
                  <label className="beta-option-row">
                    <span style={{ color: 'var(--color-text)' }}>{t.enableTgaConversion || 'Convert TGA Textures to PNG'}</span>
                    <IosSwitch checked={enableTgaConversion} onChange={setEnableTgaConversion} />
                  </label>
                  <label className="beta-option-row">
                    <span style={{ color: 'var(--color-text)' }}>{t.enableAnimationConversion || 'Enable Animation Conversion'}</span>
                    <IosSwitch checked={enableAnimationConversion} onChange={setEnableAnimationConversion} />
                  </label>
                  <label className="beta-option-row">
                    <span style={{ color: 'var(--color-text)' }}>{t.enableLanguageConversion || 'Enable Language Conversion'}</span>
                    <IosSwitch checked={enableLanguageConversion} onChange={setEnableLanguageConversion} />
                  </label>
                  <label className="beta-option-row">
                    <span style={{ color: 'var(--color-text)' }}>{t.enableSoundConversion || 'Enable Sound Conversion'}</span>
                    <IosSwitch checked={enableSoundConversion} onChange={setEnableSoundConversion} />
                  </label>
                  <label className="beta-option-row">
                    <span style={{ color: 'var(--color-text)' }}>{t.enableAudioReencode || 'Re-encode Audio (FFmpeg, ~20MB)'}</span>
                    <IosSwitch checked={enableAudioReencode} onChange={setEnableAudioReencode} />
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
    </motion.div>
  );
}
