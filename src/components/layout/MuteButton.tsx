'use client';

import { useGameStore } from '@/src/store/gameStore';
import { audioManager } from '@/src/utils/audio';

export default function MuteButton() {
  const audioEnabled = useGameStore((s) => s.audioEnabled);
  const setAudioEnabled = useGameStore((s) => s.setAudioEnabled);

  const toggle = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    if (audioManager) {
      audioManager.setMuted(!next);
    }
  };

  return (
    <button
      onClick={toggle}
      className="fixed bottom-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-blood/30 bg-void/80 text-foreground/70 backdrop-blur-sm transition-all active:scale-90"
      aria-label={audioEnabled ? 'Couper le son' : 'Activer le son'}
    >
      {audioEnabled ? (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
        </svg>
      ) : (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      )}
    </button>
  );
}
