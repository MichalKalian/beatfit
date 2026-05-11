// Variant C — Activity Rings. Use during activity sync / measurement.

import React from 'react';
import { BF } from '../tokens';
import { useTime, easeInOut } from '../useTime';
import { BrandHeader, BottomCaption } from '../atoms';

export default function Rings({ caption = 'Měříme výkon' }) {
  const t = useTime();
  const cycle = (t % 3.6) / 3.6;
  const a1 = easeInOut(Math.min(1, cycle * 1.05));
  const a2 = easeInOut(Math.min(1, cycle * 0.88));
  const a3 = easeInOut(Math.min(1, cycle * 0.72));
  const pct = Math.floor(a1 * 100);
  const cx = 170, cy = 300;

  return (
    <>
      <BrandHeader label="Prstence" />
      <svg width="340" height="720" style={{ position: 'absolute', inset: 0 }}>
        <Ring cx={cx} cy={cy} r={120} stroke={BF.blue}   pct={a1} thickness={16} />
        <Ring cx={cx} cy={cy} r={96}  stroke={BF.purple} pct={a2} thickness={16} />
        <Ring cx={cx} cy={cy} r={72}  stroke={BF.green}  pct={a3} thickness={16} />
      </svg>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: cy - 36, textAlign: 'center', pointerEvents: 'none',
      }}>
        <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: '-0.04em',
          fontVariantNumeric: 'tabular-nums', color: BF.ink }}>
          {pct}<span style={{ fontSize: 24, color: BF.inkDim, marginLeft: 2 }}>%</span>
        </div>
        <div style={{ fontSize: 10, fontFamily: BF.mono, color: BF.inkDim,
          letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: 4 }}>SOUBOJ</div>
      </div>
      <div style={{
        position: 'absolute', bottom: 110, left: 32, right: 32,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {[
          { c: BF.blue,   n: 'Jakub', v: Math.floor(347 * a1) },
          { c: BF.purple, n: 'Magda', v: Math.floor(312 * a2) },
          { c: BF.green,  n: 'Tomáš', v: Math.floor(289 * a3) },
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: r.c,
              boxShadow: `0 0 8px ${r.c}88` }} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{r.n}</span>
            <span style={{ fontFamily: BF.mono, fontSize: 13, color: r.c,
              fontVariantNumeric: 'tabular-nums' }}>{r.v} kliků</span>
          </div>
        ))}
      </div>
      <BottomCaption text={caption} t={t} />
    </>
  );
}

function Ring({ cx, cy, r, stroke, pct, thickness }) {
  const C = 2 * Math.PI * r;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} stroke={BF.divider} strokeWidth={thickness} fill="none" />
      <circle cx={cx} cy={cy} r={r} stroke={stroke} strokeWidth={thickness} fill="none"
        strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ filter: `drop-shadow(0 0 6px ${stroke})` }} />
    </g>
  );
}
