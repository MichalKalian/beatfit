import React from "react";

export default function Prefs({prefs,setPrefs,activeWsId,activeTeam,AM,onClose,onSave}){
  const update = (patch)=>setPrefs(p=>{const n=JSON.parse(JSON.stringify(p));Object.assign(n,patch);localStorage.setItem('bf_prefs',JSON.stringify(n));return n;});
  const updateSelectedActsWs = (key,checked)=>{
    const sa = new Set(prefs.selectedActs?.ws||[]);
    if(checked) sa.add(key); else sa.delete(key);
    update({selectedActs:{...prefs.selectedActs,ws: Array.from(sa)}});
  };
  const updateSelectedActsTeam = (teamId,key,checked)=>{
    const teams = {...(prefs.selectedActs?.teams||{})};
    const setv = new Set(teams[teamId]||[]);
    if(checked) setv.add(key); else setv.delete(key);
    teams[teamId]=Array.from(setv);
    update({selectedActs:{...prefs.selectedActs,teams}});
  };

  return (
    <div className="bf-modal">
      <div className="bf-modal-card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <div className="bf-label">Nastavení soutěže</div>
          <button onClick={onClose} className="bf-btn-ghost">Zavřít</button>
        </div>
        <div style={{marginBottom:12}}>
          <div style={{marginBottom:6,fontWeight:700}}>Limity bodů (zobrazit ostatním maximálně)</div>
          <label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={prefs.limit.enabled} onChange={e=>update({limit:{...prefs.limit,enabled:e.target.checked}})}/> Zapnout limit</label>
          <div style={{display:'flex',gap:8,alignItems:'center',marginTop:6}}>
            <select value={prefs.limit.period} onChange={e=>update({limit:{...prefs.limit,period:e.target.value}})}>
              <option value="day">Denní</option>
              <option value="week">Týdenní</option>
              <option value="month">Měsíční</option>
            </select>
            <input type="number" value={prefs.limit.value} onChange={e=>update({limit:{...prefs.limit,value:parseFloat(e.target.value)||0}})} style={{width:120}}/>
            <span>bodů</span>
          </div>
        </div>

        <div style={{marginBottom:12}}>
          <div style={{marginBottom:6,fontWeight:700}}>Vybrané aktivity pro skupinu</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {AM.map(a=>(
              <label key={a.key} style={{display:'flex',alignItems:'center',gap:6}}>
                <input type="checkbox" checked={(prefs.selectedActs?.ws||[]).includes(a.key)} onChange={e=>updateSelectedActsWs(a.key,e.target.checked)}/>
                <span style={{fontSize:13}}>{a.label}</span>
              </label>
            ))}
          </div>
        </div>

        {activeTeam&&<div style={{marginBottom:12}}>
          <div style={{marginBottom:6,fontWeight:700}}>Vybrané aktivity pro tento tým</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {AM.map(a=>(
              <label key={a.key} style={{display:'flex',alignItems:'center',gap:6}}>
                <input type="checkbox" checked={((prefs.selectedActs?.teams||{})[activeTeam]||[]).includes(a.key)} onChange={e=>updateSelectedActsTeam(activeTeam,a.key,e.target.checked)}/>
                <span style={{fontSize:13}}>{a.label}</span>
              </label>
            ))}
          </div>
        </div>}

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
          <div style={{fontSize:12,color:'var(--bf-text3)'}}>Nastavení se ukládá lokálně a (pokud je povoleno) se také uloží do tvé DB účtu automaticky.</div>
          <div style={{display:'flex',gap:8}}>
            <button className="bf-btn" onClick={()=>{ onSave&&onSave(); onClose&&onClose(); }}>Uložit</button>
            <button className="bf-btn-ghost" onClick={onClose}>Zrušit</button>
          </div>
        </div>
      </div>
    </div>
  );
}
