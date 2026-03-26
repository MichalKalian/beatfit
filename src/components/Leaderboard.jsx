import React from "react";

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
  } = props;

  const periodOptions = [
    ["today", "Dnes"],
    ["week", "Týden"],
    ["all", "Vše"],
  ];

  return (
    <div style={P} onClick={onCloseDropdown}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: "1rem" }}>
        {lbMode === "global" ? (
          <>
            <div className="bf-chips" style={{ flex: 1, marginBottom: 0 }}>
              {periodOptions.map(([k, l]) => {
                return (
                  <button key={k} onClick={() => setPeriod(k)} className={`bf-chip${period === k ? " active" : ""}`}>
                    {l}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => loadWsData(activeWsId)}
              style={{ flexShrink: 0, padding: "8px 12px", background: "var(--bf-surface2)", border: "1.5px solid var(--bf-border-md)", borderRadius: "var(--bf-r-md)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
              title="Obnovit"
            >
              ↻
            </button>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem", padding: "10px 14px", background: "var(--bf-surface2)", borderRadius: "var(--bf-r-md)", border: "1.5px solid var(--bf-border)" }}>
            <button onClick={() => setLbMode("global")} style={{ fontSize: 22, background: "none", border: "none", cursor: "pointer", color: "var(--bf-text3)", padding: 0, lineHeight: 1 }}>‹</button>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--bf-text)", fontFamily: "var(--bf-font)" }}>{actS?.name}</p>
              <p style={{ margin: 0, fontSize: 11, fontFamily: "var(--bf-mono)", color: "var(--bf-text3)" }}>{actS?.start_date} → {actS?.end_date}</p>
            </div>
            {actS && <span className={`bf-badge ${seasonLabel(actS).cls}`}>{seasonLabel(actS).text}</span>}
          </div>
        )}
      </div>

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
