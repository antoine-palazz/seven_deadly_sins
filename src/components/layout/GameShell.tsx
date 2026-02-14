'use client';

import { ReactNode, useEffect } from 'react';
import MuteButton from './MuteButton';
import SinProgressIndicator from './SinProgressIndicator';
import { useGameStore } from '@/src/store/gameStore';
import { audioManager } from '@/src/utils/audio';

interface GameShellProps {
  children: ReactNode;
  showProgress?: boolean;
}

/**
 * Wraps game pages with the progress indicator, mute button, and audio init.
 */
export default function GameShell({ children, showProgress = true }: GameShellProps) {
  const audioEnabled = useGameStore((s) => s.audioEnabled);

  useEffect(() => {
    if (audioManager && !audioManager.initialized) {
      audioManager.init();
      audioManager.setMuted(!audioEnabled);
      audioManager.startAmbient();
    }
  }, [audioEnabled]);

  return (
    <>
      {showProgress && <SinProgressIndicator />}
      <MuteButton />
      {children}
    </>
  );
}
