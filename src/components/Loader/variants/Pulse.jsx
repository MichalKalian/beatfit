// Variant D — Pulse / ECG. Use during live workout / heart-rate sync.

import React from 'react';
import { BF } from '../tokens';
import { useTime } from '../useTime';
import { BrandHeader, BottomCaption } from '../atoms';

export default function Pulse({ caption = 'Synchronizace dat' }) {
  const t = useTime();
  const bpm = 142 + Math.round(Math.sin(t * 1.7) * 6);
  const pulse = 1 + 0.08 * Math.max(0, Math.sin(t * (bpm / 60) * Math.PI * 2));
  const W = 340, H = 130, midY = H / 2;
  const offset = (t * 90) % W;

  return (
    <>
      <BrandHeader label="Tep" />
      <div style={{
        position: 'absolute', top: 110, left: 32, right: 32,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      }}>
        <div style={{ fontFamily: BF.mono, fontSize: 11, color: BF.inkDim, letterSpacing: '0.22em' }}>
          PRŮMĚR TEPU SKUPINY
        </div>
        <div style={{
          fontSize: 80, fontWeight: 800, letterSpacing: '-0.04em',
          fontVariantNumeric: 'tabular-nums', color: BF.blue,
          textShadow: `0 0 30px ${BF.blue}66`,
          transform: `scale(${pulse})`, lineHeight: 1,
        }}>{bpm}<span style={{ fontSize: 22, color: BF.inkDim, marginLeft: 6, fontWeight: 500 }}>bpm</span></div>
      </div>
      <div style={{ position: 'absolute', top: 320, left: 0, right: 0, height: H, overflow: 'hidden' }}>
        <svg width={W} height={H} style={{ display: 'block' }}>
          <defs>
            <linearGradient id="bf-ecg-fade" x1="0" x2="1">
              <stop offset="0" stopColor={BF.blue} stopOpacity="0" />
              <stop offset="0.15" stopColor={BF.blue} stopOpacity="1" />
              <stop offset="0.85" stopColor={BF.blue} stopOpacity="1" />
              <stop offset="1" stopColor={BF.blue} stopOpacity="0" />
            </linearGradient>
          </defs>
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={i} x1={0} x2={W} y1={(i + 1) * H / 9} y2={(i + 1) * H / 9}
              stroke={BF.inkGhost} strokeWidth="1" />
          ))}
          <path d={buildPath(W, midY, offset)} stroke="url(#bf-ecg-fade)" strokeWidth="2.5"
            fill="none" strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 6px ${BF.blue})` }} />
        </svg>
      </div>
      <div style={{
        position: 'absolute', bottom: 120, left: 32, right: 32,
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
      }}>
        <Cell label="Aktivních" value={3} accent={BF.blue} />
        <Cell label="Kalorie" value={Math.floor(420 + (t * 1.4) % 80)} unit="kcal" accent={BF.purple} />
        <Cell label="Body" value={Math.floor(1284 + (t * 3) % 30)} accent={BF.green} />
      </div>
      <BottomCaption text={caption} t={t} />
    </>
  );
}

function Cell({ label, value, unit, accent }) {
  return (
    <div style={{ padding: '10px 10px', borderRadius: 14, background: BF.bgInner, border: `1px solid ${BF.hair}` }}>
      <div style={{ fontFamily: BF.mono, fontSize: 9, color: BF.inkDim,
        letterSpacing: '0.16em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 2,
        color: accent, fontVariantNumeric: 'tabular-nums' }}>
        {value}{unit && <span style={{ fontSize: 10, color: BF.inkDim, marginLeft: 3, fontWeight: 500 }}>{unit}</span>}
      </div>
    </div>
  );
}

function buildPath(W, midY, offset) {
  const beatW = 80;
  const beats = Math.ceil(W / beatW) + 2;
  let d = '';
  for (let b = -1; b < beats; b++) {
    const x0 = b * beatW - (offset % beatW);
    const pts = [
      [x0, midY], [x0 + 12, midY], [x0 + 18, midY - 6], [x0 + 24, midY],
      [x0 + 32, midY], [x0 + 34, midY + 8], [x0 + 38, midY - 38], [x0 + 42, midY + 18],
      [x0 + 46, midY], [x0 + 56, midY], [x0 + 62, midY - 9], [x0 + 68, midY], [x0 + beatW, midY],
    ];
    pts.forEach((p, i) => {
      d += (i === 0 && b === -1 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ' ';
    });
  }
  return d;
}
