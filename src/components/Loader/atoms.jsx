// Shared loader UI atoms: brand mark, wordmark, bottom caption, etc.

import React from 'react';
import { BF } from './tokens';

// Mini 3-podium brand mark — keep visible on every loader screen
export function MiniMark({ scale = 1 }) {
  const s = scale;
  return (
    <svg width={28 * s} height={20 * s} viewBox="0 0 28 20">
      <circle cx="5" cy="8" r="2.4" fill={BF.purple} />
      <rect x="3.2" y="10" width="3.6" height="9" rx="1" fill={BF.purple} />
      <circle cx="14" cy="4" r="2.4" fill={BF.blue} />
      <rect x="12.2" y="6" width="3.6" height="13" rx="1" fill={BF.blue} />
      <circle cx="23" cy="6" r="2.4" fill={BF.green} />
      <rect x="21.2" y="8" width="3.6" height="11" rx="1" fill={BF.green} />
    </svg>
  );
}

export function Wordmark({ size = 11, alpha = 0.45 }) {
  return (
    <span style={{
      fontFamily: BF.display, fontWeight: 800, fontSize: size,
      letterSpacing: '0.36em', color: `rgba(255,255,255,${alpha})`,
    }}>BEATFIT</span>
  );
}

// Brand header strip — usually placed at top of the stage
export function BrandHeader({ label }) {
  return (
    <div style={{
      position: 'absolute', top: 26, left: 0, right: 0, zIndex: 15,
      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10,
    }}>
      <MiniMark />
      <Wordmark size={11} />
      {label ? (
        <span style={{
          fontFamily: BF.mono, fontSize: 10, color: BF.inkFaint,
          letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>· {label}</span>
      ) : null}
    </div>
  );
}

export function Dots({ t }) {
  const n = Math.floor(t * 2) % 4;
  return <span style={{ display: 'inline-block', width: 18, textAlign: 'left' }}>{'.'.repeat(n)}</span>;
}

// 3-segment indeterminate progress + caption
export function BottomCaption({ text, t, segments = 3 }) {
  const phase = (t * 0.55) % 1;
  const colors = [BF.purple, BF.blue, BF.green];
  return (
    <div style={{
      position: 'absolute', bottom: 22, left: 32, right: 32, zIndex: 10,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
    }}>
      <div style={{ display: 'flex', gap: 6, width: '100%' }}>
        {colors.slice(0, segments).map((c, i) => {
          const local = (phase + i / segments) % 1;
          const a = 0.16 + 0.84 * Math.max(0, Math.sin(local * Math.PI));
          return (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: c, opacity: a,
              boxShadow: a > 0.6 ? `0 0 8px ${c}` : 'none',
            }} />
          );
        })}
      </div>
      <div style={{
        fontSize: 12, fontFamily: BF.mono, letterSpacing: '0.16em',
        textTransform: 'uppercase', color: BF.inkDim, textAlign: 'center',
      }}>{text}<Dots t={t} /></div>
    </div>
  );
}

// Brand head: circle + inner triangle (matches icon's smiley heads)
export function HeadChip({ color, soft, size = 44 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, position: 'relative',
      boxShadow: `0 0 16px ${color}66, 0 4px 12px rgba(0,0,0,0.4)`,
    }}>
      <svg width={size} height={size} viewBox="0 0 44 44" style={{ position: 'absolute', inset: 0 }}>
        <polygon points="22,14 14,30 30,30" fill={soft} opacity="0.85" />
      </svg>
    </div>
  );
}
