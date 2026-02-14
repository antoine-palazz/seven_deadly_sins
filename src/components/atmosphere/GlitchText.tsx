'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';

interface GlitchTextProps {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  glitchIntensity?: 'low' | 'medium' | 'high';
  typewriter?: boolean;
  typewriterSpeed?: number;
  onComplete?: () => void;
}

export default function GlitchText({
  text,
  className = '',
  as: Tag = 'span',
  glitchIntensity = 'medium',
  typewriter = false,
  typewriterSpeed = 50,
  onComplete,
}: GlitchTextProps) {
  const [displayed, setDisplayed] = useState(typewriter ? '' : text);
  const [isGlitching, setIsGlitching] = useState(false);
  const onCompleteRef = useRef(onComplete);

  // Keep ref in sync without triggering the typewriter effect
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!typewriter) {
      setDisplayed(text);
      return;
    }

    let i = 0;
    setDisplayed('');
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        if (Math.random() > 0.85) {
          setIsGlitching(true);
          setTimeout(() => setIsGlitching(false), 100);
        }
        i++;
      } else {
        clearInterval(interval);
        onCompleteRef.current?.();
      }
    }, typewriterSpeed);

    return () => clearInterval(interval);
  }, [text, typewriter, typewriterSpeed]);

  const glitchOffset =
    glitchIntensity === 'high' ? 4 : glitchIntensity === 'medium' ? 2 : 1;

  return (
    <motion.span
      className="relative inline-block"
      animate={
        isGlitching
          ? {
              x: [0, -glitchOffset, glitchOffset, 0],
              textShadow: [
                'none',
                `${glitchOffset}px 0 #8B0000, -${glitchOffset}px 0 #B8860B`,
                `${-glitchOffset}px 0 #B8860B, ${glitchOffset}px 0 #8B0000`,
                'none',
              ],
            }
          : {}
      }
      transition={{ duration: 0.1 }}
    >
      <Tag className={className}>
        {displayed}
        {typewriter && displayed.length < text.length && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
            className="text-blood"
          >
            ▌
          </motion.span>
        )}
      </Tag>
    </motion.span>
  );
}
