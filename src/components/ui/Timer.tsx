'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { formatTime } from '@/src/utils/helpers';

interface TimerProps {
  /** Total duration in seconds. Use a unique `key` to reset. */
  duration: number;
  running: boolean;
  onTimeUp: () => void;
  distortion?: number;
  className?: string;
}

export default function Timer({
  duration,
  running,
  onTimeUp,
  distortion = 1,
  className = '',
}: TimerProps) {
  const [display, setDisplay] = useState(duration);
  const timeRef = useRef(duration);
  const firedRef = useRef(false);
  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      timeRef.current -= 0.1 * distortion;

      if (timeRef.current <= 0) {
        timeRef.current = 0;
        clearInterval(interval);
        setDisplay(0);
        if (!firedRef.current) {
          firedRef.current = true;
          setTimeout(() => onTimeUpRef.current(), 0);
        }
        return;
      }

      setDisplay(timeRef.current);
    }, 100);

    return () => clearInterval(interval);
  }, [running, distortion]);

  const pct = (display / duration) * 100;
  const isLow = display < duration * 0.2;

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <motion.span
        className={`font-mono text-lg tabular-nums ${
          isLow ? 'text-blood-light animate-heartbeat' : 'text-foreground/70'
        }`}
        animate={isLow ? { scale: [1, 1.05, 1] } : {}}
        transition={{ repeat: Infinity, duration: 0.8 }}
      >
        {formatTime(Math.max(0, display))}
      </motion.span>
      <div className="h-1 w-32 overflow-hidden rounded-full bg-ash">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: isLow
              ? 'linear-gradient(90deg, #8B0000, #FF4500)'
              : 'linear-gradient(90deg, #8B0000, #B8860B)',
          }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>
    </div>
  );
}
