// Variant A — Logo Build (splash hero). Use as app boot splash.

import React from 'react';
import { BF } from '../tokens';
import { useTime, easeOut, clamp } from '../useTime';
import { BottomCaption } from '../atoms';

export default function LogoBuild({ caption = 'Spouštíme aplikaci' }) {
  const t = useTime();
  const period = 4.2;
  const c = (t % period) / period;
  const bar1 = clamp((c - 0.05) / 0.30, 0, 1);
  const bar2 = clamp((c - 0.15) / 0.30, 0, 1);
  const bar3 = clamp((c - 0.25) / 0.30, 0, 1);
  const head1 = clamp((c - 0.42) / 0.10, 0, 1);
  const head2 = clamp((c - 0.50) / 0.10, 0, 1);
  const head3 = clamp((c - 0.58) / 0.10, 0, 1);
  const tri = clamp((c - 0.70) / 0.10, 0, 1);
  const word = clamp((c - 0.80) / 0.15, 0, 1);

  const bars = [
    { x: 90,  baseY: 480, h: 160, color: BF.purple, soft: BF.purpleSoft, p: bar1, hp: head1 },
    { x: 154, baseY: 480, h: 250, color: BF.blue,   soft: BF.blueSoft,   p: bar2, hp: head2 },
    { x: 218, baseY: 480, h: 200, color: BF.green,  soft: BF.greenSoft,  p: bar3, hp: head3 },
  ];

  return (
    <>
      <svg width="340" height="720" style={{ position: 'absolute', inset: 0 }}>
        <line x1="60" x2="280" y1="480" y2="480" stroke={BF.hair} strokeWidth="1.5" strokeLinecap="round" />
        {bars.map((b, i) => {
          const cur = b.h * easeOut(b.p);
          return (
            <rect key={i} x={b.x} y={b.baseY - cur} width="48" height={cur} rx="8" fill={b.color}
              style={{ filter: b.p > 0 ? `drop-shadow(0 0 10px ${b.color}55)` : 'none' }} />
          );
        })}
        {bars.map((b, i) => {
          if (b.hp <= 0) return null;
          const cy = b.baseY - b.h - 24;
          const y = 200 + (cy - 200) * easeOut(b.hp);
          const r = 18 + 4 * easeOut(b.hp);
          return (
            <g key={'h' + i}>
              <circle cx={b.x + 24} cy={y} r={r} fill={b.color}
                style={{ filter: `drop-shadow(0 0 16px ${b.color}88)` }} />
              {tri > 0 ? (
                <polygon points={`${b.x + 24},${y - 5} ${b.x + 17},${y + 7} ${b.x + 31},${y + 7}`}
                  fill={b.soft} opacity={tri * 0.95} />
              ) : null}
            </g>
          );
        })}
      </svg>
      <div style={{
        position: 'absolute', bottom: 130, left: 0, right: 0, textAlign: 'center',
        opacity: word, transform: `translateY(${(1 - word) * 8}px)`,
      }}>
        <div style={{ fontFamily: BF.display, fontWeight: 800, fontSize: 32,
          letterSpacing: '0.32em', color: BF.ink, opacity: 0.92 }}>BEATFIT</div>
        <div style={{ fontFamily: BF.mono, fontSize: 11, color: BF.inkDim,
          letterSpacing: '0.18em', marginTop: 6 }}>SOUTĚŽ AKTIVIT</div>
      </div>
      <BottomCaption text={caption} t={t} />
    </>
  );
}
