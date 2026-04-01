import React, { useState } from "react";

export default function Leaderboard(props) {
  const {
    P,
    onCloseDropdown,
    lbMode,
    setLbMode,
    globalSeasons,
    period,
    setPeriod,
    loadWsData,
    activeWsId,
    actS,
    sorted,
    myRank,
    actW,
    AM,
    fmtVal,
    calcStreak,
    entries,
    uid,
    MEDALS,
    RANK_CLR,
    seasonLabel,
    daysLeft,
    seasonStatus,
    lbChartData,
  } = props;

  const [showChart, setShowChart] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const toggleHighlight = id => setHighlightedId(prev => prev === id ? null : id);

  const periodOptions = [
    ["today", "Dnes"],
    ["week", "Týden"],
    ["all", "Vše"],
  ];

  const renderProgressRace = () => {
    if (!sorted.length) return null;
    const maxSc = sorted[0][1].sc;
    if (maxSc <= 0) return null;
    return (
      <div style={{ marginBottom: "1.25rem" }}>
        <div className="bf-label" style={{ marginBottom: 8 }}>Progress race</div>
        <div className="bf-card" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map(([id, d], i) => {
            const pct = (d.sc / maxSc) * 100;
            const color = lbChartData?.players.find(p => p.id === id)?.color || "#c084fc";
            const dimmed = highlightedId && highlightedId !== id;
            return (
              <div key={id} onClick={() => toggleHighlight(id)} style={{ display: "flex", alignItems: "center", gap: 8, opacity: dimmed ? 0.25 : 1, transition: "opacity 0.2s", cursor: "pointer" }}>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--bf-mono)", color: RANK_CLR[i] || "var(--bf-text3)", minWidth: 22, textAlign: "right" }}>
                  {MEDALS[i] || `${i + 1}.`}
                </span>
                <span style={{ fontSize: 11, fontFamily: "var(--bf-font)", color: "var(--bf-text)", width: 72, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: highlightedId === id ? 700 : 400 }}>
                  {d.name}
                </span>
                <div style={{ flex: 1, background: "var(--bf-surface2)", borderRadius: 4, height: 10, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.4s ease" }} />
                </div>
                <span style={{ fontSize: 11, fontFamily: "var(--bf-mono)", color: "var(--bf-text2)", minWidth: 48, textAlign: "right" }}>
                  {d.sc.toFixed(1)} b
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderLineChart = () => {
    if (!lbChartData || !lbChartData.players.length || lbChartData.dateGroups.length < 2) return null;
    const { dateGroups, players } = lbChartData;
    const W = 500, H = 160;
    const PAD = { top: 12, right: 12, bottom: 24, left: 40 };
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const n = dateGroups.length;
    const maxVal = Math.max(...players.flatMap(p => p.points), 1);
    const xPos = i => PAD.left + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1));
    const yPos = v => PAD.top + innerH - (v / maxVal) * innerH;

    const labelCount = Math.min(n, 5);
    const labelIdxs = [...new Set(
      Array.from({ length: labelCount }, (_, k) => Math.round(k * (n - 1) / Math.max(labelCount - 1, 1)))
    )];

    const yTicks = [0, 0.5, 1];

    return (
      <div style={{ marginBottom: "1.25rem" }}>
        <div className="bf-label" style={{ marginBottom: 8 }}>Průběh soutěže</div>
        <div className="bf-card" style={{ padding: "12px 14px" }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}>
            {/* grid lines */}
            {yTicks.map(f => (
              <line key={f} x1={PAD.left} x2={W - PAD.right} y1={yPos(maxVal * f)} y2={yPos(maxVal * f)}
                stroke="var(--bf-border)" strokeWidth="0.7" strokeDasharray="4,4" />
            ))}
            {/* y-axis labels */}
            {yTicks.map(f => (
              <text key={f} x={PAD.left - 4} y={yPos(maxVal * f) + 3} fontSize="8" fill="var(--bf-text3)"
                textAnchor="end" fontFamily="monospace">
                {Math.round(maxVal * f)}
              </text>
            ))}
            {/* x-axis labels */}
            {labelIdxs.map(i => (
              <text key={i} x={xPos(i)} y={H - 5} fontSize="8" fill="var(--bf-text3)"
                textAnchor="middle" fontFamily="monospace">
                {dateGroups[i]?.slice(5)}
              </text>
            ))}
            {/* player lines */}
            {players.map(p => {
              const dimmed = highlightedId && highlightedId !== p.id;
              const highlighted = highlightedId === p.id;
              return (
                <polyline
                  key={p.id}
                  points={p.points.map((v, i) => `${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`).join(" ")}
                  fill="none"
                  stroke={p.color}
                  strokeWidth={highlighted ? 3 : 1.8}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity={dimmed ? 0.12 : 0.9}
                  style={{ transition: "opacity 0.2s, stroke-width 0.2s" }}
                />
              );
            })}
            {/* last-point dots */}
            {players.map(p => {
              const last = p.points[p.points.length - 1];
              if (last == null) return null;
              const dimmed = highlightedId && highlightedId !== p.id;
              const highlighted = highlightedId === p.id;
              return <circle key={p.id} cx={xPos(p.points.length - 1).toFixed(1)} cy={yPos(last).toFixed(1)} r={highlighted ? 4 : 3} fill={p.color} opacity={dimmed ? 0.12 : 1} style={{ transition: "opacity 0.2s" }} />;
            })}
          </svg>
          {/* legend */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 8 }}>
            {players.map(p => {
              const dimmed = highlightedId && highlightedId !== p.id;
              const active = highlightedId === p.id;
              return (
                <div key={p.id} onClick={() => toggleHighlight(p.id)} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", opacity: dimmed ? 0.3 : 1, transition: "opacity 0.2s" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0, outline: active ? `2px solid ${p.color}` : "none", outlineOffset: 1 }} />
                  <span style={{ fontSize: 10, color: "var(--bf-text2)", fontFamily: "var(--bf-font)", fontWeight: active ? 700 : 400 }}>{p.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const chartToggleBtn = (
    <button
      onClick={() => setShowChart(v => !v)}
      style={{
        flexShrink: 0, padding: "8px 12px",
        background: showChart ? "var(--bf-accent)" : "var(--bf-surface2)",
        border: showChart ? "1.5px solid var(--bf-accent)" : "1.5px solid var(--bf-border-md)",
        borderRadius: "var(--bf-r-md)", cursor: "pointer", fontSize: 14, lineHeight: 1,
        color: showChart ? "#fff" : "var(--bf-text)", fontWeight: 600,
      }}
      title="Zobrazit grafy"
    >
      📊
    </button>
  );

  return (
    <div style={P} onClick={onCloseDropdown}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: "1rem" }}>
        {lbMode === "global" ? (
          <>
            <div className="bf-chips" style={{ flex: 1, marginBottom: 0 }}>
              {periodOptions.map(([k, l]) => (
                <button key={k} onClick={() => setPeriod(k)} className={`bf-chip${period === k ? " active" : ""}`}>
                  {l}
                </button>
              ))}
            </div>
            {chartToggleBtn}
            <button
              onClick={() => loadWsData(activeWsId)}
              style={{ flexShrink: 0, padding: "8px 12px", background: "var(--bf-surface2)", border: "1.5px solid var(--bf-border-md)", borderRadius: "var(--bf-r-md)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
              title="Obnovit"
            >
              ↻
            </button>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem", padding: "10px 14px", background: "var(--bf-surface2)", borderRadius: "var(--bf-r-md)", border: "1.5px solid var(--bf-border)", width: "100%" }}>
            <button onClick={() => setLbMode("global")} style={{ fontSize: 22, background: "none", border: "none", cursor: "pointer", color: "var(--bf-text3)", padding: 0, lineHeight: 1 }}>‹</button>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--bf-text)", fontFamily: "var(--bf-font)" }}>{actS?.name}</p>
              <p style={{ margin: 0, fontSize: 11, fontFamily: "var(--bf-mono)", color: "var(--bf-text3)" }}>{actS?.start_date} → {actS?.end_date}</p>
            </div>
            {actS && <span className={`bf-badge ${seasonLabel(actS).cls}`}>{seasonLabel(actS).text}</span>}
            {chartToggleBtn}
          </div>
        )}
      </div>

      {showChart && (
        <>
          {renderProgressRace()}
          {renderLineChart()}
        </>
      )}

      {lbMode === "global" && globalSeasons.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <div className="bf-label" style={{ marginBottom: 8 }}>Výzvy</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {globalSeasons.sort(([, a], [, b]) => b.start_date.localeCompare(a.start_date)).map(([sid, s]) => {
              const lbl = seasonLabel(s);
              const dl = daysLeft(s);
              const st = seasonStatus(s);
              return (
                <button key={sid} onClick={() => setLbMode(`season:${sid}`)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--bf-surface)", border: "1.5px solid var(--bf-border-md)", borderRadius: "var(--bf-r-md)", cursor: "pointer", width: "100%", textAlign: "left" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span className={`bf-badge ${lbl.cls}`}>{lbl.text}</span>
                      {st === "active" && dl >= 0 && <span style={{ fontSize: 11, color: "var(--bf-text3)", fontFamily: "var(--bf-font)" }}>zbývá {dl} dní</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, fontFamily: "var(--bf-font)", color: "var(--bf-text)" }}>{s.name}</p>
                    <p style={{ margin: 0, fontSize: 11, fontFamily: "var(--bf-mono)", color: "var(--bf-text3)" }}>{s.start_date} → {s.end_date}</p>
                  </div>
                  <span style={{ fontSize: 18, color: "var(--bf-text3)" }}>›</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {myRank > 0 && (
        <div className="bf-surface-accent" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <span style={{ fontSize: 12, color: "var(--bf-accent-text)", fontFamily: "var(--bf-font)", fontWeight: 600 }}>Tvoje pořadí</span>
          <span style={{ fontSize: 26, fontWeight: 800, fontFamily: "var(--bf-mono)", color: "var(--bf-accent)" }}>#{myRank}</span>
          <span style={{ fontSize: 12, color: "var(--bf-accent-text)", fontFamily: "var(--bf-font)" }}>z {sorted.length} hráčů</span>
        </div>
      )}

      <div className="bf-label" style={{ marginBottom: 8 }}>Celkové pořadí</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: "1.5rem" }}>
        {sorted.length === 0 && <p style={{ fontSize: 13, color: "var(--bf-text3)", fontFamily: "var(--bf-font)" }}>Zatím žádná data.</p>}
        {sorted.map(([id, d], i) => {
          const streak = calcStreak(entries[id] || {});
          return (
            <div key={id} className={`bf-lb-row${id === uid ? " me" : ""}`}>
              <span style={{ fontSize: 17, minWidth: 30, color: RANK_CLR[i] || "var(--bf-text3)", fontWeight: 800, fontFamily: "var(--bf-mono)" }}>{MEDALS[i] || `${i + 1}.`}</span>
              <div className="bf-av" style={{ width: 28, height: 28, fontSize: 11 }}>{d.name[0]}</div>
              <span style={{ flex: 1, fontWeight: 700, fontSize: 14, fontFamily: "var(--bf-font)", color: "var(--bf-text)" }}>{d.name}</span>
              {streak >= 3 && <span className="bf-badge bf-badge-accent" style={{ fontSize: 10 }}>{streak}🔥</span>}
              <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--bf-mono)", color: "var(--bf-text)" }}>{d.sc.toFixed(1)}</span>
              <span style={{ fontSize: 10, color: "var(--bf-text3)", fontFamily: "var(--bf-font)" }}>b</span>
            </div>
          );
        })}
      </div>

      <div className="bf-label" style={{ marginBottom: 8 }}>Vítězové disciplín</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {AM.filter(a => actW[a.key]).sort((a, b) => actW[b.key].val - actW[a.key].val).map(a => (
          <div key={a.key} className="bf-card" style={{ padding: "10px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <div className="bf-act-icon" style={{ width: 26, height: 26, borderRadius: 6, fontSize: 11, background: a.color + "20", color: a.color }}>{a.icon}</div>
              <span style={{ fontSize: 11, color: "var(--bf-text3)", fontFamily: "var(--bf-font)" }}>{a.label}</span>
            </div>
            <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, fontFamily: "var(--bf-font)", color: "var(--bf-text)" }}>{actW[a.key].name}</p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--bf-text2)", fontFamily: "var(--bf-mono)", fontWeight: 500 }}>{fmtVal(a, actW[a.key].val)} {a.unit}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
