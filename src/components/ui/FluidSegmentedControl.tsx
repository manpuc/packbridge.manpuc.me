import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  id?: string;
}

interface FluidSegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabelledBy?: string;
  role?: 'radiogroup' | 'tablist';
  style?: React.CSSProperties;
  className?: string;
}

export function FluidSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabelledBy,
  role = 'radiogroup',
  style,
  className = '',
}: FluidSegmentedControlProps<T>) {
  const prefersReducedMotion = useReducedMotion();
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));

  const [prevIndex, setPrevIndex] = useState(activeIndex);
  const [pulseKey, setPulseKey] = useState(0);
  const [jumpDistance, setJumpDistance] = useState(0);
  const [pressedValue, setPressedValue] = useState<T | null>(null);

  useEffect(() => {
    if (activeIndex !== prevIndex) {
      setJumpDistance(Math.abs(activeIndex - prevIndex));
      setPrevIndex(activeIndex);
      setPulseKey((k) => k + 1);
    }
  }, [activeIndex, prevIndex]);

  const count = Math.max(1, options.length);
  const isJumpingTwo = jumpDistance > 1;
  const stretchX = prefersReducedMotion ? 1 : isJumpingTwo ? 1.18 : 1.11;
  const squeezeY = prefersReducedMotion ? 1 : isJumpingTwo ? 0.87 : 0.91;

  return (
    <div
      className={`segmented-control fluid-segmented-control ${className}`.trim()}
      role={role}
      aria-labelledby={ariaLabelledBy}
      style={{
        gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
        ...style,
      }}
    >
      {/* Fluid Sliding Thumb */}
      <div
        className="fluid-segmented-track"
        aria-hidden="true"
        style={{
          gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
        }}
      >
        <motion.div
          className="fluid-segmented-thumb-carrier"
          initial={false}
          animate={{
            x: `${activeIndex * 100}%`,
          }}
          transition={
            prefersReducedMotion
              ? { duration: 0.15 }
              : {
                  type: 'spring',
                  stiffness: 420,
                  damping: 30,
                  mass: 0.85,
                }
          }
        >
          <motion.div
            key={pulseKey}
            className="fluid-segmented-thumb"
            initial={
              pulseKey === 0 || prefersReducedMotion
                ? false
                : { scaleX: 0.94, scaleY: 1.04 }
            }
            animate={
              pulseKey === 0 || prefersReducedMotion
                ? {
                    scaleX: pressedValue === value ? 0.96 : 1,
                    scaleY: pressedValue === value ? 0.95 : 1,
                  }
                : {
                    scaleX: [1, stretchX, 0.97, 1],
                    scaleY: [1, squeezeY, 1.02, 1],
                  }
            }
            transition={
              pulseKey === 0 || prefersReducedMotion
                ? { type: 'spring', stiffness: 520, damping: 28 }
                : {
                    duration: 0.42,
                    times: [0, 0.36, 0.76, 1],
                    ease: [0.22, 1, 0.36, 1],
                  }
            }
          />
        </motion.div>
      </div>

      {/* Segment Buttons */}
      {options.map((opt) => {
        const isActive = opt.value === value;
        const isPressed = pressedValue === opt.value;

        return (
          <button
            key={opt.value}
            id={opt.id}
            type="button"
            role={role === 'radiogroup' ? 'radio' : 'tab'}
            aria-checked={role === 'radiogroup' ? isActive : undefined}
            aria-selected={role === 'tablist' ? isActive : undefined}
            className={`fluid-segmented-btn ${isActive ? 'active' : ''}`}
            onPointerDown={() => setPressedValue(opt.value)}
            onPointerUp={() => setPressedValue(null)}
            onPointerLeave={() => setPressedValue(null)}
            onPointerCancel={() => setPressedValue(null)}
            onClick={() => onChange(opt.value)}
          >
            <span
              className="fluid-segmented-label"
              style={{
                transform: prefersReducedMotion
                  ? 'none'
                  : isPressed
                    ? 'scale(0.96)'
                    : isActive
                      ? 'scale(1.01)'
                      : 'scale(1)',
                transition: 'transform 0.18s cubic-bezier(0.25, 1, 0.5, 1)'
              }}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

