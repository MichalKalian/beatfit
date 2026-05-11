// Variant E — Activity Cycler. Use when summing up multi-discipline scores.

import React from 'react';
import { BF, TEAM } from '../tokens';
import { useTime } from '../useTime';
import { BrandHeader, BottomCaption } from '../atoms';

const DEFAULT_CARDS = [
  { name: 'KLIKY',     unit: 'opakování', base: 247,  accent: BF.blue,   soft: BF.blueSoft   },
  { name: 'SEDY-LEHY', unit: 'opakování', base: 312,  accent: BF.purple, soft: BF.purpleSoft },
  { name: 'SHYBY',     unit: 'opakování', base: 38,   accent: BF.green,  soft: BF.greenSoft  },
  { name: 'KROKY',     unit: 'kroků',     base: 8420, accent: BF.blue,   soft: BF.blueSoft   },
  { name: 'DŘEPY',     unit: 'opakování', base: 184,  accent: BF.purple, soft: BF.purpleSoft },
  { name: 'PLANK',     unit: 'sekund',    base: 92,   accent: BF.green,  soft: BF.greenSoft  },
];

export default function Cycler({ cards = DEFAULT_CARDS, players = TEAM, caption = 'Sčítáme aktivity' }) {
  const t = useTime();
  const period = 1.1;
  const idx = Math.floor(t / period) % cards.length;
  const phase = (t / period) % 1;
  const cur = cards[idx];
  const next = cards[(idx + 1) % cards.length];
  const slide = phase > 0.85 ? (phase - 0.85) / 0.15 : 0;
  const countProgress = Math.min(1, phase * 1.3);

  return (
    <>
      <BrandHeader label="Disciplíny" />
      <div style={{
        position: 'absolute', top: 110, bottom: 110, left: 24, width: 4,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {cards.map((c, i) => (
          <div key={i} style={{
            flex: 1, borderRadius: 2,
            background: i === idx ? c.accent : BF.hair,
            boxShadow: i === idx ? `0 0 12px ${c.accent}` : 'none',
          }} />
        ))}
      </div>
      <div style={{
        position: 'absolute', top: 140, left: 50, right: 32, bottom: 180,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18,
      }}>
        <div style={{ fontFamily: BF.mono, fontSize: 11, color: BF.inkDim, letterSpacing: '0.22em' }}>
          DISCIPLÍNA {String(idx + 1).padStart(2, '0')} / {String(cards.length).padStart(2, '0')}
        </div>
        <div style={{ height: 96, position: 'relative', overflow: 'hidden' }}>
          <div key={`a${idx}`} style={{
            position: 'absolute', top: 0, left: 0,
            fontSize: 52, fontWeight: 800, letterSpacing: '-0.045em',
            color: cur.accent, lineHeight: 1,
            transform: `translateY(${-slide * 100}%)`, opacity: 1 - slide,
            textShadow: `0 0 30px ${cur.accent}33`,
          }}>{cur.name}</div>
          <div key={`b${idx}`} style={{
            position: 'absolute', top: 0, left: 0,
            fontSize: 52, fontWeight: 800, letterSpacing: '-0.045em',
            color: next.accent, lineHeight: 1,
            transform: `translateY(${(1 - slide) * 100}%)`, opacity: slide,
          }}>{next.name}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: '-0.04em',
            fontVariantNumeric: 'tabular-nums', color: BF.ink, lineHeight: 1 }}>
            {Math.floor(cur.base * countProgress).toLocaleString('cs')}
          </div>
          <div style={{ fontSize: 14, color: BF.inkDim, fontFamily: BF.mono }}>{cur.unit}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
          {players.slice(0, 3).map((p, i) => {
            const ratio = [1, 0.83, 0.65][i];
            const v = Math.floor(cur.base * countProgress * ratio);
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: p.color,
                  boxShadow: `0 0 6px ${p.color}77` }} />
                <div style={{ width: 48, fontSize: 11, color: BF.ink, fontWeight: 600 }}>
                  {p.name.split(' ')[0]}
                </div>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: BF.bgInner, overflow: 'hidden' }}>
                  <div style={{
                    width: `${ratio * countProgress * 100}%`, height: '100%',
                    background: p.color, borderRadius: 3,
                    boxShadow: `0 0 8px ${p.color}66`,
                  }} />
                </div>
                <div style={{ width: 44, textAlign: 'right', fontSize: 11, fontFamily: BF.mono,
                  color: p.color, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
              </div>
            );
          })}
        </div>
      </div>
      <BottomCaption text={caption} t={t} />
    </>
  );
}
