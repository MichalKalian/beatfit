// Variant F — Score Showdown. Use for 1v1 head-to-head loading.

import React from 'react';
import { BF } from '../tokens';
import { useTime, easeOut } from '../useTime';
import { BrandHeader, BottomCaption, HeadChip } from '../atoms';

export default function Showdown({
  you = { name: 'Jakub Klimt', initials: 'JK', color: BF.blue, soft: BF.blueSoft },
  rival = { name: 'Magda Nová', initials: 'MN', color: BF.purple, soft: BF.purpleSoft },
  caption = 'Připravujeme souboj',
}) {
  const t = useTime();
  const cycle = (t % 4) / 4;
  const fill = easeOut(Math.min(1, cycle * 1.1));
  const wobble = Math.sin(t * 0.7) * 0.18;
  const s1 = Math.floor((1280 + Math.sin(t * 0.5) * 40) * fill);
  const s2 = Math.floor((1180 + Math.sin(t * 0.6 + 1) * 60) * fill);
  const total = s1 + s2 || 1;
  const split = 0.5 + wobble * 0.5 + (s1 / total - 0.5);

  return (
    <>
      <BrandHeader label="Skóre" />
      <div style={{
        position: 'absolute', top: 90, bottom: 110, left: 32, right: 32,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
          justifyContent: 'flex-end', paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <HeadChip color={you.color} soft={you.soft} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{you.name}</div>
              <div style={{ fontFamily: BF.mono, fontSize: 10, color: BF.inkDim, letterSpacing: '0.16em' }}>VY</div>
            </div>
          </div>
          <div style={{
            fontSize: 96, fontWeight: 800, letterSpacing: '-0.05em',
            color: you.color, lineHeight: 1, marginTop: 6,
            fontVariantNumeric: 'tabular-nums',
            textShadow: `0 0 36px ${you.color}55`,
          }}>{s1.toLocaleString('cs')}</div>
          <div style={{ fontSize: 12, color: BF.inkDim, fontFamily: BF.mono, marginTop: 4, letterSpacing: '0.14em' }}>
            BODŮ CELKEM
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '6px 0' }}>
          <div style={{
            height: 10, borderRadius: 6, background: BF.bgInner, overflow: 'hidden',
            position: 'relative', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)',
          }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: `${split * 100}%`,
              background: `linear-gradient(90deg, ${you.color}, ${you.soft})`,
              transition: 'width .2s',
            }} />
            <div style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: `${(1 - split) * 100}%`,
              background: `linear-gradient(270deg, ${rival.color}, ${rival.soft})`,
            }} />
            <div style={{
              position: 'absolute', left: `${split * 100}%`, top: -4, bottom: -4,
              width: 3, marginLeft: -1.5, background: BF.ink,
              borderRadius: 2, boxShadow: `0 0 12px rgba(255,255,255,0.6)`,
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            fontFamily: BF.mono, fontSize: 10, color: BF.inkDim, letterSpacing: '0.16em' }}>
            <span>{Math.round(split * 100)}%</span>
            <span style={{ color: BF.ink }}>ROUND 1 · 5 DNÍ</span>
            <span>{Math.round((1 - split) * 100)}%</span>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
          justifyContent: 'flex-start', paddingTop: 16, textAlign: 'right', alignItems: 'flex-end' }}>
          <div style={{
            fontSize: 96, fontWeight: 800, letterSpacing: '-0.05em',
            color: rival.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
            textShadow: `0 0 36px ${rival.color}55`,
          }}>{s2.toLocaleString('cs')}</div>
          <div style={{ fontSize: 12, color: BF.inkDim, fontFamily: BF.mono, marginTop: 4, letterSpacing: '0.14em' }}>
            BODŮ CELKEM
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{rival.name}</div>
              <div style={{ fontFamily: BF.mono, fontSize: 10, color: BF.inkDim, letterSpacing: '0.16em' }}>RIVAL</div>
            </div>
            <HeadChip color={rival.color} soft={rival.soft} />
          </div>
        </div>
      </div>
      <BottomCaption text={caption} t={t} />
    </>
  );
}
