import React from 'react';
import { motion } from 'framer-motion';
import type { ConversionDirection } from '@/lib/pack/types';
import { JAVA_VERSIONS, BEDROCK_VERSIONS } from '@/lib/pack/versions';

interface DirectionSettingsProps {
  direction: ConversionDirection;
  setDirection: (d: ConversionDirection) => void;
  selectedJavaVersion: string;
  setSelectedJavaVersion: (v: string) => void;
  selectedBedrockVersion: string;
  setSelectedBedrockVersion: (v: string) => void;
  t: any;
}

export function DirectionSettings({
  direction,
  setDirection,
  selectedJavaVersion,
  setSelectedJavaVersion,
  selectedBedrockVersion,
  setSelectedBedrockVersion,
  t
}: DirectionSettingsProps) {
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

      <motion.div layout style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
          {t.targetVersion} ({direction === 'java-to-bedrock' ? 'Bedrock' : 'Java'})
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
      </motion.div>
    </motion.div>
  );
}
