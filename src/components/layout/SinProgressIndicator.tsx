'use client';

import { useGameStore } from '@/src/store/gameStore';
import { TRIALS } from '@/src/data/trials';
import { motion } from 'framer-motion';

export default function SinProgressIndicator() {
  const completedTrials = useGameStore((s) => s.completedTrials);

  const radius = 40;
  const cx = 50;
  const cy = 50;

  return (
    <div className="fixed top-4 left-4 z-50" aria-label="Progression des péchés">
      <svg width="60" height="60" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(139,0,0,0.15)"
          strokeWidth="3"
        />
        {/* 7 segments */}
        {TRIALS.map((trial, i) => {
          const angle = (i / 7) * Math.PI * 2 - Math.PI / 2;
          const x = cx + radius * Math.cos(angle);
          const y = cy + radius * Math.sin(angle);
          const completed = completedTrials[i];

          return (
            <motion.circle
              key={trial.id}
              cx={x}
              cy={y}
              r={5}
              fill={completed ? trial.color : 'transparent'}
              stroke={completed ? trial.color : 'rgba(139,0,0,0.3)'}
              strokeWidth="1.5"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
            />
          );
        })}
        {/* Center text */}
        <text
          x={cx}
          y={cy + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#e8e0d4"
          fontSize="14"
          fontFamily="serif"
        >
          {completedTrials.filter(Boolean).length}/7
        </text>
      </svg>
    </div>
  );
}
