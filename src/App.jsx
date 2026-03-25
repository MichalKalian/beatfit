import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

const DEFAULT_PTS = {
  shyby: 8, anglicky: 5, kliky: 2, dreepy: 1.5,
  sedLehy: 1, behKm: 15, koloKm: 4, plankSec: 0.05,
};

const ACTIVITY_META = [
  { key: "shyby",    label: "Shyby",     sub: "pull-ups",  unit: "ks", icon: "⬆", color: "#c084fc" },
  { key: "anglicky", label: "Angličáky", sub: "burpees",   unit: "ks", icon: "★", color: "#f97316" },
  { key: "kliky",    label: "Kliky",     sub: "push-ups",  unit: "ks", icon: "▲", color: "#38bdf8" },
  { key: "dreepy",   label: "Dřepy",     sub: "squats",    unit: "ks", icon: "↓", color: "#34d399" },
  { key: "sedLehy",  label: "Sed-lehy",  sub: "sit-ups",   unit: "ks", icon: "↔", color: "#a3e635" },
  { key: "behKm",    label: "Běh",       sub: "km",        unit: "km", icon: "▶", color: "#fbbf24" },
  { key: "koloKm",   label: "Kolo",      sub: "km",        unit: "km", icon: "○", color: "#fb7185" },
  { key: "plankSec", label: "Plank",     sub: "sekund",    unit: "s",  icon: "—", color: "#e879f9" },
];

function getActivities(pts) {
  return ACTIVITY_META.map(a => ({ ...a, pts: pts[a.key] ?? DEFAULT_PTS[a.key] }));
}

function calcAge(dob) {
  if (!dob) return 30;
  const b = new Date(dob), t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  if (t < new Date(t.getFullYear(), b.getMonth(), b.getDate())) age--;
  return age;
}

function ageMult(age) {
  const a = parseInt(age) || 30;
  if (a >= 30) return 1 + (a - 30) * 0.015;
  return Math.max(0.85, 1 - (30 - a) * 0.005);
}

function calcScore(e, age, pts) {
  if (!e) return 0;
  const activities = getActivities(pts);
  return activities.reduce((s, a) => s + (parseFloat(e[a.key]) || 0) * a.pts, 0) * ageMult(age);
}

function todayStr() { return new Date().toISOString().split("T")[0]; }
function weekAgoStr() {
  const d = new Date(); d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

const MEDALS  = ["🥇","🥈","🥉"];
const RANK_CLR = ["#f59e0b","#94a3b8","#b87333"];

export default function App() {
  const [view, setView]       = useState("login");
  const [uid, setUid]         = useState(null);
  const [users, setUsers]     = useState({});
  const [entries, setEntries] = useState({});
  const [pts, setPts]         = useState(DEFAULT_PTS);
  const [form, setForm]       = useState({});
  const [newName, setNewName] = useState("");
  const [newDob, setNewDob]   = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [flash, setFlash]     = useState(false);
  const [period, setPeriod]   = useState("week");
  const [logDate, setLogDate] = useState(todayStr());
  const [error, setError]     = useState(null);
  const [adminPwd, setAdminPwd] = useState("");
  const [adminError, setAdminError] = useState(false);
  const [ptsEdit, setPtsEdit] = useState({});
  const [ptsSaving, setPtsSaving] = useState(false);
  const [ptsFlash, setPtsFlash]   = useState(false);

  // ── načtení dat ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: usersData, error: ue }, { data: entriesData, error: ee }, { data: settingsData, error: se }] =
        await Promise.all([
          supabase.from("users").select("*"),
          supabase.from("entries").select("*"),
          supabase.from("settings").select("*").eq("key", "pts"),
        ]);
      if (ue) throw ue;
      if (ee) throw ee;

      const usersMap = {};
      for (const u of usersData) usersMap[u.id] = { name: u.name, dob: u.dob, since: u.since };
      setUsers(usersMap);

      const entriesMap = {};
      for (const e of entriesData) {
        if (!entriesMap[e.user_id]) entriesMap[e.user_id] = {};
        entriesMap[e.user_id][e.date] = e.data;
      }
      setEntries(entriesMap);

      if (!se && settingsData?.length > 0) {
        const saved = settingsData[0].value;
        setPts({ ...DEFAULT_PTS, ...saved });
      }
    } catch(e) {
      setError("Nepodařilo se načíst data. Zkontroluj připojení.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── přihlášení ──────────────────────────────────────────────────────────
  function loginUser(userId) {
    setUid(userId);
    setForm(entries[userId]?.[logDate] || {});
    setView("log");
  }

  // ── registrace ──────────────────────────────────────────────────────────
  async function register() {
    if (!newName.trim() || !newDob) return;
    const duplicate = Object.values(users).some(
      u => u.name.toLowerCase() === newName.trim().toLowerCase()
    );
    if (duplicate) { setError(`Hráč se jménem "${newName.trim()}" již existuje.`); return; }
    setSaving(true);
    setError(null);
    const id = "u" + Date.now();
    const newUser = { id, name: newName.trim(), dob: newDob, since: todayStr() };
    const { error: e } = await supabase.from("users").insert(newUser);
    if (e) { setError("Registrace se nezdařila."); setSaving(false); return; }
    setUsers(u => ({ ...u, [id]: { name: newUser.name, dob: newUser.dob, since: newUser.since } }));
    setUid(id);
    setForm({});
    setView("log");
    setSaving(false);
  }

  // ── smazání záznamu ─────────────────────────────────────────────────────
  async function deleteEntry() {
    if (!window.confirm(`Opravdu smazat záznam za ${logDate}?`)) return;
    setSaving(true);
    setError(null);
    const { error: e } = await supabase.from("entries")
      .delete()
      .eq("user_id", uid)
      .eq("date", logDate);
    if (e) { setError("Smazání se nezdařilo."); setSaving(false); return; }
    setEntries(prev => {
      const updated = { ...prev, [uid]: { ...(prev[uid] || {}) } };
      delete updated[uid][logDate];
      return updated;
    });
    setForm({});
    setSaving(false);
  }

  // ── uložení záznamu ─────────────────────────────────────────────────────
  async function saveEntry() {
    setSaving(true);
    setError(null);
    const t = logDate || todayStr();
    const { error: e } = await supabase.from("entries").upsert(
      { user_id: uid, date: t, data: form },
      { onConflict: "user_id,date" }
    );
    if (e) { setError("Uložení se nezdařilo."); setSaving(false); return; }
    setEntries(prev => ({ ...prev, [uid]: { ...(prev[uid] || {}), [t]: form } }));
    setFlash(true); setTimeout(() => setFlash(false), 2000);
    setSaving(false);
  }

  // ── uložení koeficientů ─────────────────────────────────────────────────
  async function savePts() {
    setPtsSaving(true);
    const merged = { ...pts, ...ptsEdit };
    const { error: e } = await supabase.from("settings").upsert(
      { key: "pts", value: merged },
      { onConflict: "key" }
    );
    if (e) { setError("Uložení koeficientů selhalo."); setPtsSaving(false); return; }
    setPts(merged);
    setPtsFlash(true); setTimeout(() => setPtsFlash(false), 2000);
    setPtsSaving(false);
  }

  // ── admin přihlášení ────────────────────────────────────────────────────
  function loginAdmin() {
    if (adminPwd === import.meta.env.VITE_ADMIN_PASSWORD) {
      setPtsEdit({ ...pts });
      setAdminError(false);
      setView("admin");
    } else {
      setAdminError(true);
    }
  }

  // ── žebříček ────────────────────────────────────────────────────────────
  function buildLB() {
    const t = todayStr(), w = weekAgoStr();
    const result = {};
    for (const [id, days] of Object.entries(entries)) {
      const u = users[id]; if (!u) continue;
      let sc = 0; const acts = {};
      for (const a of ACTIVITY_META) acts[a.key] = 0;
      for (const [date, e] of Object.entries(days)) {
        if (period === "today" && date !== t) continue;
        if (period === "week"  && date < w)  continue;
        sc += calcScore(e, calcAge(u.dob), pts);
        for (const a of ACTIVITY_META) acts[a.key] += parseFloat(e[a.key]) || 0;
      }
      result[id] = { sc, name: u.name, age: calcAge(u.dob), acts };
    }
    return result;
  }

  // ── styles ──────────────────────────────────────────────────────────────
  const P = { padding:"1rem", maxWidth:480, margin:"0 auto" };
  const topBarStyle = { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"0.75rem" };
  const navWrap = { display:"flex", gap:3, background:"var(--color-background-secondary)", padding:3, borderRadius:"var(--border-radius-md)", marginBottom:"1rem" };
  function navBtn(active) {
    return { flex:1, fontSize:12, fontWeight:500, border:"none", cursor:"pointer", padding:"7px 0", borderRadius:6,
      background: active?"var(--color-background-primary)":"transparent",
      color: active?"var(--color-text-primary)":"var(--color-text-secondary)",
      boxShadow: active?"0 0 0 0.5px var(--color-border-tertiary)":"none" };
  }
  function chipBtn(active) {
    return { flex:1, fontSize:12, fontWeight:500, cursor:"pointer", padding:"6px 0",
      border:"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-md)",
      background: active?"var(--color-text-primary)":"transparent",
      color: active?"var(--color-background-primary)":"var(--color-text-secondary)" };
  }
  const statCard   = { background:"var(--color-background-secondary)", borderRadius:"var(--border-radius-md)", padding:"0.75rem 1rem" };
  const card       = { background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-lg)", padding:"1rem 1.25rem" };
  const primaryBtn = { display:"block", width:"100%", padding:"11px", fontWeight:700, fontSize:14,
    background:"var(--color-text-primary)", color:"var(--color-background-primary)",
    border:"none", borderRadius:"var(--border-radius-md)", cursor:"pointer", letterSpacing:0.3 };
  const inputStyle = { display:"block", width:"100%", boxSizing:"border-box", padding:"9px 12px", fontSize:14,
    background:"var(--color-background-secondary)", border:"0.5px solid var(--color-border-tertiary)",
    borderRadius:"var(--border-radius-md)", color:"var(--color-text-primary)", outline:"none", fontFamily:"'DM Sans',sans-serif" };

  const ErrorBanner = () => error ? (
    <div style={{background:"var(--color-background-danger)",color:"var(--color-text-danger)",padding:"8px 12px",borderRadius:"var(--border-radius-md)",fontSize:13,marginBottom:"1rem"}}>
      {error}
    </div>
  ) : null;

  if (loading) return (
    <div style={{...P, textAlign:"center", paddingTop:"3rem", color:"var(--color-text-secondary)", fontSize:14}}>
      Načítám data…
    </div>
  );

  const user = users[uid];
  const ACTIVITIES = getActivities(pts);

  // ── login ────────────────────────────────────────────────────────────────
  if (view === "login") return (
    <div style={P}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');`}</style>
      <div style={{textAlign:"center", paddingTop:"0.5rem", marginBottom:"2rem"}}>
        <div style={{display:"inline-block",fontSize:9,fontWeight:700,letterSpacing:3,color:"var(--color-text-secondary)",border:"0.5px solid var(--color-border-secondary)",padding:"3px 12px",borderRadius:20,marginBottom:10}}>FIREMNÍ SOUTĚŽ</div>
        <h1 style={{margin:"0 0 4px",fontSize:38,fontWeight:800,letterSpacing:-1.5,fontFamily:"'DM Sans',sans-serif",color:"var(--color-text-primary)"}}>Beatfit</h1>
        <p style={{margin:0,fontSize:13,color:"var(--color-text-secondary)"}}>Zaznamenávej sporty, porovnávej výsledky</p>
      </div>
      <ErrorBanner/>
      {Object.keys(users).length > 0 && (
        <div style={{marginBottom:"1.5rem"}}>
          <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:"var(--color-text-secondary)"}}>Přihlásit se jako</p>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {Object.entries(users).sort(([,a],[,b])=>a.name.localeCompare(b.name)).map(([id,u])=>(
              <button key={id} onClick={()=>loginUser(id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",cursor:"pointer",width:"100%"}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:"var(--color-background-info)",color:"var(--color-text-info)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0,fontFamily:"'DM Sans',sans-serif"}}>{u.name[0]}</div>
                <span style={{fontWeight:600,color:"var(--color-text-primary)",fontFamily:"'DM Sans',sans-serif",fontSize:14}}>{u.name}</span>
                <span style={{marginLeft:"auto",fontSize:12,color:"var(--color-text-secondary)"}}>{calcAge(u.dob)} let</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={card}>
        <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:"var(--color-text-secondary)"}}>Nový hráč</p>
        <input placeholder="Celé jméno" value={newName} onChange={e=>setNewName(e.target.value)} style={{...inputStyle,marginBottom:8}}/>
        <label style={{display:"block",fontSize:11,color:"var(--color-text-secondary)",marginBottom:4,fontWeight:600,letterSpacing:0.5}}>Datum narození</label>
        <input type="date" value={newDob} onChange={e=>setNewDob(e.target.value)} style={{...inputStyle,marginBottom:12,fontFamily:"'DM Mono',monospace"}}/>
        <button onClick={register} disabled={!newName.trim()||!newDob||saving} style={primaryBtn}>
          {saving?"Registruji…":"Zaregistrovat se →"}
        </button>
      </div>
      <div style={{...card, marginTop:"1rem"}}>
        <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:"var(--color-text-secondary)"}}>Administrátor</p>
        <input type="password" placeholder="Heslo" value={adminPwd} onChange={e=>{setAdminPwd(e.target.value);setAdminError(false);}}
          onKeyDown={e=>e.key==="Enter"&&loginAdmin()}
          style={{...inputStyle, marginBottom:8, borderColor: adminError?"var(--color-border-danger)":"var(--color-border-tertiary)"}}/>
        {adminError && <p style={{margin:"0 0 8px",fontSize:12,color:"var(--color-text-danger)"}}>Nesprávné heslo</p>}
        <button onClick={loginAdmin} style={primaryBtn}>Přihlásit jako admin →</button>
      </div>
    </div>
  );

  // ── admin panel ───────────────────────────────────────────────────────────
  if (view === "admin") return (
    <div style={P}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');`}</style>
      <div style={topBarStyle}>
        <div>
          <p style={{margin:0,fontWeight:700,fontSize:15,fontFamily:"'DM Sans',sans-serif",color:"var(--color-text-primary)"}}>Administrátor</p>
          <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>Nastavení koeficientů</p>
        </div>
        <button onClick={()=>setView("login")} style={{fontSize:11,color:"var(--color-text-secondary)",background:"transparent",border:"0.5px solid var(--color-border-tertiary)",padding:"4px 10px",borderRadius:20,cursor:"pointer"}}>Odhlásit</button>
      </div>
      <ErrorBanner/>
      <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:"var(--color-text-secondary)"}}>Body za jednotku</p>
      <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:"1rem"}}>
        {ACTIVITY_META.map(a => {
          const current = ptsEdit[a.key] ?? pts[a.key] ?? DEFAULT_PTS[a.key];
          const isChanged = ptsEdit[a.key] !== undefined && ptsEdit[a.key] !== DEFAULT_PTS[a.key];
          return (
            <div key={a.key} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"var(--color-background-primary)",border:`0.5px solid ${isChanged?"var(--color-border-warning)":"var(--color-border-tertiary)"}`,borderRadius:"var(--border-radius-md)"}}>
              <div style={{width:34,height:34,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,background:a.color+"22",color:a.color,flexShrink:0}}>{a.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:0,fontSize:13,fontWeight:700,fontFamily:"'DM Sans',sans-serif",color:"var(--color-text-primary)"}}>{a.label}</p>
                <p style={{margin:0,fontSize:10,color:"var(--color-text-secondary)"}}>výchozí: {DEFAULT_PTS[a.key]} b/{a.unit}</p>
              </div>
              <input type="number" min="0" step="0.01"
                value={current}
                onChange={e => setPtsEdit(p => ({ ...p, [a.key]: parseFloat(e.target.value) || 0 }))}
                style={{width:70,textAlign:"right",padding:"7px 8px",fontSize:14,background:"var(--color-background-secondary)",border:`0.5px solid ${isChanged?"var(--color-border-warning)":"var(--color-border-tertiary)"}`,borderRadius:"var(--border-radius-md)",color:"var(--color-text-primary)",outline:"none",fontFamily:"'DM Mono',monospace"}}/>
              <span style={{fontSize:11,color:"var(--color-text-secondary)",minWidth:28}}>b/{a.unit}</span>
            </div>
          );
        })}
      </div>
      <button onClick={()=>{ setPtsEdit({...DEFAULT_PTS}); }} style={{...primaryBtn, background:"var(--color-background-secondary)", color:"var(--color-text-secondary)", border:"0.5px solid var(--color-border-tertiary)", marginBottom:8}}>
        Obnovit výchozí hodnoty
      </button>
      <button onClick={savePts} disabled={ptsSaving} style={primaryBtn}>
        {ptsSaving?"Ukládám…":ptsFlash?"✓ Uloženo!":"Uložit koeficienty"}
      </button>
      <p style={{marginTop:12,fontSize:11,color:"var(--color-text-secondary)",textAlign:"center"}}>
        Změny se projeví všem hráčům okamžitě po uložení.
      </p>
    </div>
  );

  // ── sdílené komponenty ───────────────────────────────────────────────────
  const TopBar = () => (
    <div style={topBarStyle}>
      <div>
        <p style={{margin:0,fontWeight:700,fontSize:15,fontFamily:"'DM Sans',sans-serif",color:"var(--color-text-primary)"}}>{user.name}</p>
        <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>{logDate}</p>
      </div>
      <button onClick={()=>{setUid(null);setView("login");}} style={{fontSize:11,color:"var(--color-text-secondary)",background:"transparent",border:"0.5px solid var(--color-border-tertiary)",padding:"4px 10px",borderRadius:20,cursor:"pointer"}}>Odhlásit</button>
    </div>
  );
  const Nav = () => (
    <div style={navWrap}>
      {[["log","Záznam"],["leaderboard","Žebříček"],["stats","Moje"]].map(([v,l])=>(
        <button key={v} onClick={()=>setView(v)} style={navBtn(view===v)}>{l}</button>
      ))}
    </div>
  );

  // ── záznam ───────────────────────────────────────────────────────────────
  if (view === "log") {
    const age = calcAge(user.dob);
    const sc = calcScore(form, age, pts);
    return (
      <div style={P}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');`}</style>
        <TopBar/><Nav/>
        <ErrorBanner/>
        <input type="date" value={logDate} max={todayStr()}
          onChange={e => { setLogDate(e.target.value); setForm(entries[uid]?.[e.target.value] || {}); }}
          style={{...inputStyle,marginBottom:"1rem",fontFamily:"'DM Mono',monospace"}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:"1rem"}}>
          <div style={statCard}>
            <p style={{margin:"0 0 4px",fontSize:11,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",color:"var(--color-text-secondary)"}}>Skóre</p>
            <p style={{margin:0,fontSize:24,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"var(--color-text-primary)"}}>{sc.toFixed(1)}</p>
          </div>
          <div style={statCard}>
            <p style={{margin:"0 0 4px",fontSize:11,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",color:"var(--color-text-secondary)"}}>Věkový koef.</p>
            <p style={{margin:0,fontSize:24,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"var(--color-text-primary)"}}>×{ageMult(age).toFixed(2)}</p>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {ACTIVITIES.map(a=>(
            <div key={a.key} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)"}}>
              <div style={{width:34,height:34,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,background:a.color+"22",color:a.color,flexShrink:0}}>{a.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:0,fontSize:13,fontWeight:700,fontFamily:"'DM Sans',sans-serif",color:"var(--color-text-primary)"}}>{a.label}</p>
                <p style={{margin:0,fontSize:10,color:"var(--color-text-secondary)"}}>{a.pts} b/{a.unit} · {a.sub}</p>
              </div>
              <input type="number" min="0" step={a.unit==="km"?"0.1":"1"}
                value={form[a.key]||""} placeholder="—"
                onChange={e=>setForm(f=>({...f,[a.key]:e.target.value}))}
                style={{width:64,textAlign:"right",padding:"7px 8px",fontSize:14,background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",color:"var(--color-text-primary)",outline:"none",fontFamily:"'DM Mono',monospace"}}/>
              <span style={{fontSize:11,color:"var(--color-text-secondary)",minWidth:20}}>{a.unit}</span>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginTop:"1rem"}}>
          <button onClick={saveEntry} disabled={saving} style={{...primaryBtn,flex:1}}>
            {saving?"Ukládám…":flash?"✓ Uloženo!":"Uložit výkon"}
          </button>
          {entries[uid]?.[logDate] && (
            <button onClick={deleteEntry} disabled={saving} style={{padding:"11px 14px",fontWeight:600,fontSize:13,background:"transparent",color:"var(--color-text-danger)",border:"0.5px solid var(--color-border-danger)",borderRadius:"var(--border-radius-md)",cursor:"pointer",flexShrink:0}}>
              Smazat
            </button>
          )}
        </div>
        {Object.keys(pts).some(k => pts[k] !== DEFAULT_PTS[k]) && (
          <div style={{marginTop:"0.75rem",padding:"8px 12px",background:"var(--color-background-warning)",borderRadius:"var(--border-radius-md)",fontSize:11,color:"var(--color-text-warning)"}}>
            Koeficienty byly upraveny administrátorem. Aktuální hodnoty jsou zobrazeny u každé aktivity.
          </div>
        )}
      </div>
    );
  }

  // ── žebříček ─────────────────────────────────────────────────────────────
  if (view === "leaderboard") {
    const lb = buildLB();
    const sorted = Object.entries(lb).sort((a,b)=>b[1].sc-a[1].sc);
    const myRank = sorted.findIndex(([id])=>id===uid)+1;
    const actW = {};
    for (const a of ACTIVITY_META) {
      let best=null,bestV=-1;
      for(const[,d] of Object.entries(lb)) if((d.acts[a.key]||0)>bestV){bestV=d.acts[a.key];best=d.name;}
      if(bestV>0) actW[a.key]={name:best,val:bestV};
    }
    return (
      <div style={P}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');`}</style>
        <TopBar/><Nav/>
        <ErrorBanner/>
        <div style={{display:"flex",gap:4,marginBottom:"1rem"}}>
          {[["today","Dnes"],["week","Týden"],["all","Vše"]].map(([k,l])=>(
            <button key={k} onClick={()=>setPeriod(k)} style={chipBtn(period===k)}>{l}</button>
          ))}
        </div>
        {myRank>0&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",padding:"10px 14px",marginBottom:"1rem"}}>
            <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>Tvoje pořadí</span>
            <span style={{fontSize:24,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"var(--color-text-primary)"}}># {myRank}</span>
            <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>z {sorted.length} hráčů</span>
          </div>
        )}
        <p style={{margin:"0 0 6px",fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:"var(--color-text-secondary)"}}>Celkové pořadí</p>
        <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:"1.5rem"}}>
          {sorted.length===0&&<p style={{fontSize:13,color:"var(--color-text-secondary)"}}>Zatím žádná data pro toto období.</p>}
          {sorted.map(([id,d],i)=>(
            <div key={id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:id===uid?"var(--color-background-info)":"var(--color-background-secondary)",border:`0.5px solid ${id===uid?"var(--color-border-info)":"transparent"}`,borderRadius:"var(--border-radius-md)"}}>
              <span style={{fontSize:16,minWidth:28,color:RANK_CLR[i]||"var(--color-text-secondary)",fontWeight:700}}>{MEDALS[i]||`${i+1}.`}</span>
              <div style={{width:26,height:26,borderRadius:"50%",background:"var(--color-background-info)",color:"var(--color-text-info)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0,fontFamily:"'DM Sans',sans-serif"}}>{d.name[0]}</div>
              <span style={{flex:1,fontWeight:600,fontSize:14,fontFamily:"'DM Sans',sans-serif",color:"var(--color-text-primary)"}}>{d.name}</span>
              <span style={{fontSize:11,color:"var(--color-text-secondary)",marginRight:6}}>{d.age} r.</span>
              <span style={{fontSize:16,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"var(--color-text-primary)"}}>{d.sc.toFixed(1)}</span>
              <span style={{fontSize:10,color:"var(--color-text-secondary)"}}>b</span>
            </div>
          ))}
        </div>
        <p style={{margin:"0 0 6px",fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:"var(--color-text-secondary)"}}>Vítězové disciplín</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
          {ACTIVITY_META.filter(a=>actW[a.key]).sort((a,b)=>actW[b.key].val-actW[a.key].val).map(a=>(
            <div key={a.key} style={{padding:"10px 12px",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)"}}>
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:5}}>
                <div style={{width:22,height:22,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,background:a.color+"22",color:a.color,flexShrink:0}}>{a.icon}</div>
                <span style={{fontSize:11,color:"var(--color-text-secondary)"}}>{a.label}</span>
              </div>
              <p style={{margin:"0 0 2px",fontSize:13,fontWeight:700,fontFamily:"'DM Sans',sans-serif",color:"var(--color-text-primary)"}}>{actW[a.key].name}</p>
              <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)",fontFamily:"'DM Mono',monospace"}}>
                {a.unit==="km"?actW[a.key].val.toFixed(1):Math.round(actW[a.key].val)} {a.unit}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── moje statistiky ───────────────────────────────────────────────────────
  if (view === "stats") {
    const myDays = entries[uid]||{};
    const dates = Object.keys(myDays).sort().reverse();
    const age = calcAge(user.dob);
    const total = dates.reduce((s,d)=>s+calcScore(myDays[d],age,pts),0);
    const totals = {};
    for(const a of ACTIVITY_META) totals[a.key]=0;
    for(const e of Object.values(myDays)) for(const a of ACTIVITY_META) totals[a.key]+=(parseFloat(e[a.key])||0);
    return (
      <div style={P}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');`}</style>
        <TopBar/><Nav/>
        <ErrorBanner/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:"1rem"}}>
          <div style={statCard}>
            <p style={{margin:"0 0 3px",fontSize:10,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",color:"var(--color-text-secondary)"}}>Celkem bodů</p>
            <p style={{margin:0,fontSize:20,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"var(--color-text-primary)"}}>{total.toFixed(0)}</p>
          </div>
          <div style={statCard}>
            <p style={{margin:"0 0 3px",fontSize:10,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",color:"var(--color-text-secondary)"}}>Aktivní dny</p>
            <p style={{margin:0,fontSize:20,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"var(--color-text-primary)"}}>{dates.length}</p>
          </div>
          <div style={statCard}>
            <p style={{margin:"0 0 3px",fontSize:10,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",color:"var(--color-text-secondary)"}}>Věk. koef.</p>
            <p style={{margin:0,fontSize:20,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"var(--color-text-primary)"}}>×{ageMult(age).toFixed(2)}</p>
          </div>
        </div>
        <p style={{margin:"0 0 6px",fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:"var(--color-text-secondary)"}}>Celkové součty</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:"1.25rem"}}>
          {ACTIVITY_META.filter(a=>totals[a.key]>0).map(a=>(
            <div key={a.key} style={{padding:"10px 12px",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)"}}>
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
                <div style={{width:20,height:20,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,background:a.color+"22",color:a.color,fontWeight:700}}>{a.icon}</div>
                <span style={{fontSize:11,color:"var(--color-text-secondary)"}}>{a.label}</span>
              </div>
              <p style={{margin:0,fontSize:16,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"var(--color-text-primary)"}}>
                {a.unit==="km"?totals[a.key].toFixed(1):Math.round(totals[a.key])}
                <span style={{fontSize:11,fontWeight:400,color:"var(--color-text-secondary)",marginLeft:3}}>{a.unit}</span>
              </p>
            </div>
          ))}
        </div>
        <p style={{margin:"0 0 6px",fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:"var(--color-text-secondary)"}}>Historie</p>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {dates.length===0&&<p style={{fontSize:13,color:"var(--color-text-secondary)"}}>Žádné záznamy.</p>}
          {dates.map(d=>(
            <div key={d} style={{padding:"10px 12px",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:12,fontWeight:600,fontFamily:"'DM Mono',monospace",color:"var(--color-text-secondary)"}}>{d}</span>
                <span style={{fontSize:14,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"var(--color-text-primary)"}}>{calcScore(myDays[d],age,pts).toFixed(1)} b</span>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {ACTIVITY_META.filter(a=>parseFloat(myDays[d][a.key])>0).map(a=>(
                  <span key={a.key} style={{fontSize:10,background:a.color+"20",color:a.color,padding:"2px 8px",borderRadius:20,fontWeight:700}}>
                    {a.label} {a.unit==="km"?parseFloat(myDays[d][a.key]).toFixed(1):Math.round(parseFloat(myDays[d][a.key]))} {a.unit}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}