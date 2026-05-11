// LoaderShell — fullscreen dark stage that scales the 340×720 design
// to fit any viewport while preserving aspect ratio.

import React, { useEffect, useState } from 'react';
import { BF, STAGE_W, STAGE_H } from './tokens';

export default function LoaderShell({ children, fullscreen = true }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!fullscreen) return;
    const update = () => {
      const sx = window.innerWidth / STAGE_W;
      const sy = window.innerHeight / STAGE_H;
      setScale(Math.min(sx, sy, 1.4)); // cap so it doesn't get cartoonish
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [fullscreen]);

  if (!fullscreen) {
    // Inline mode — fill parent container
    return (
      <div style={{
        position: 'relative', width: STAGE_W, height: STAGE_H,
        background: BF.bg, color: BF.ink, fontFamily: BF.display,
        overflow: 'hidden', borderRadius: 16,
      }}>{children}</div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: BF.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, overflow: 'hidden',
    }}>
      <div style={{
        width: STAGE_W, height: STAGE_H,
        transform: `scale(${scale})`, transformOrigin: 'center center',
        position: 'relative', color: BF.ink, fontFamily: BF.display,
      }}>{children}</div>
    </div>
  );
}
