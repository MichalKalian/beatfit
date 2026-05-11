// Variant B — Live Podium. Use when joining/loading a leaderboard.

import React from 'react';
import { BF, TEAM } from '../tokens';
import { useTime, easeOut } from '../useTime';
import { BrandHeader, BottomCaption } from '../atoms';

export default function Podium({ players = TEAM, caption = 'Skládáme žebříček' }) {
  const t = useTime();
  const playersBase = players.slice(0, 3).map((p, i) => ({
    ...p,
    rate: [0.95, 0.90, 0.85][i],
    freq: [0.6, 0.5, 0.7][i],
    phase: [0.0, 1.2, 2.4][i],
  }));
  const cycle = (t % 5) / 5;
  const env = easeOut(Math.min(1, cycle * 1.1));
  const scored = playersBase.map((p) => {
    const wobble = 0.85 + 0.15 * Math.sin(t * p.freq + p.phase);
    return { ...p, score: Math.floor((420 * p.rate * wobble) * env) };
  });
  const ranked = [...scored].sort((a, b) => b.score - a.score);
  const maxScore = ranked[0].score || 1;
  const slotsX = [80, 170, 260];
  const placement = [ranked[1], ranked[0], ranked[2]];

  return (
    <>
      <BrandHeader label="Podium" />
      <div style={{ position: 'absolute', top: 90, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Aktuální stupně vítězů
        </div>
        <div style={{ fontFamily: BF.mono, fontSize: 10, color: BF.inkDim,
          letterSpacing: '0.18em', marginTop: 4 }}>
          AKTUALIZACE V REÁLNÉM ČASE
        </div>
      </div>
      <div style={{ position: 'absolute', top: 180, left: 0, right: 0, height: 360 }}>
        {placement.map((p, i) => {
          const h = 60 + (p.score / maxScore) * 180;
          const winner = ranked[0].id === p.id;
          return (
            <div key={p.id} style={{
              position: 'absolute', left: slotsX[i], bottom: 0,
              transform: 'translateX(-50%)',
              transition: 'left .5s cubic-bezier(.2,.7,.3,1)',
            }}>
              <div style={{ fontFamily: BF.mono, fontSize: 11, color: p.color,
                textAlign: 'center', letterSpacing: '0.16em', marginBottom: 6, fontWeight: 600 }}>
                {ranked.indexOf(p) + 1}.
              </div>
              <Stack {...p} h={h} winner={winner} t={t} />
            </div>
          );
        })}
        <div style={{ position: 'absolute', bottom: 0, left: 32, right: 32, height: 1, background: BF.hair }} />
      </div>
      <BottomCaption text={caption} t={t} />
    </>
  );
}

function Stack({ color, soft, h, score, name, winner, t }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', background: color, marginBottom: 8,
        position: 'relative', boxShadow: `0 0 ${winner ? 24 : 10}px ${color}${winner ? 'aa' : '55'}`,
        transform: winner ? `scale(${1 + Math.sin(t * 4) * 0.04})` : 'scale(1)',
      }}>
        <svg width="36" height="36" viewBox="0 0 36 36" style={{ position: 'absolute', inset: 0 }}>
          <polygon points="18,10 11,24 25,24" fill={soft} opacity="0.9" />
        </svg>
      </div>
      <div style={{
        width: 56, height: h, borderRadius: 8,
        background: `linear-gradient(180deg, ${color}, ${color}dd)`,
        position: 'relative', overflow: 'hidden',
        boxShadow: `0 0 28px ${color}33, inset 0 1px 0 ${soft}66`,
      }}>
        <div style={{
          position: 'absolute', left: 0, right: 0,
          top: `${((t * 40) % (h + 40)) - 40}px`, height: 30,
          background: `linear-gradient(180deg, transparent, ${soft}55, transparent)`,
        }} />
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 8, textAlign: 'center',
          fontFamily: BF.mono, fontSize: 13, color: '#0d0d14',
          fontWeight: 700, fontVariantNumeric: 'tabular-nums',
        }}>{score}</div>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: BF.ink, fontWeight: 600 }}>{name}</div>
    </div>
  );
}
