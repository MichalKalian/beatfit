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
      <div style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.45)',zIndex:1200,padding:16}}>
        <div className={`bf-card ${prefs.limit?.enabled? 'prefs-limit-enabled': ''}`} style={{width:'min(920px,96%)',maxHeight:'90vh',overflow:'auto',padding:'18px 22px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
            <div style={{display:'flex',flexDirection:'column'}}>
              <div className="bf-label">Nastavení soutěže</div>
              <div style={{fontSize:16,fontWeight:700}}>Limity a vybrané aktivity</div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="bf-btn-ghost" onClick={onClose}>Zavřít</button>
            </div>
          </div>

          <section style={{marginTop:10,marginBottom:14}}>
            <div style={{marginBottom:8,fontWeight:700}}>Limity bodů (zobrazit ostatním maximálně)</div>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <button onClick={()=>update({limit:{...prefs.limit,enabled:!prefs.limit.enabled}})} aria-pressed={prefs.limit.enabled} className={`act-chip${prefs.limit.enabled?" active":""}`} style={{display:'flex',alignItems:'center',gap:10,fontSize:14}}>
                <span style={{fontWeight:600}}>Zapnout limit</span>
              </button>
              <select className="bf-inp" value={prefs.limit.period} onChange={e=>update({limit:{...prefs.limit,period:e.target.value}})} style={{width:140}}>
                <option value="day">Denní</option>
                <option value="week">Týdenní</option>
                <option value="month">Měsíční</option>
              </select>
              <input className="bf-inp bf-inp-mono" type="number" value={prefs.limit.value} onChange={e=>update({limit:{...prefs.limit,value:parseFloat(e.target.value)||0}})} style={{width:120}}/>
              <div style={{color:'var(--bf-text3)'}}>bodů</div>
            </div>
          </section>

          <section style={{marginBottom:14}}>
            <div style={{marginBottom:10,fontWeight:700}}>Vybrané aktivity pro skupinu</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
              {AM.map(a=>{
                const checked=(prefs.selectedActs?.ws||[]).includes(a.key);
                return (
                  <button key={a.key} onClick={()=>updateSelectedActsWs(a.key,!checked)} aria-pressed={checked} className={`act-chip${checked?" active":""}`} style={{display:'flex',alignItems:'center',gap:10,fontSize:14}}>
                    <span style={{fontWeight:600}}>{a.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {activeTeam&&(
            <section style={{marginBottom:14}}>
              <div style={{marginBottom:10,fontWeight:700}}>Vybrané aktivity pro tento tým</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
                {AM.map(a=>{
                  const checked=((prefs.selectedActs?.teams||{})[activeTeam]||[]).includes(a.key);
                  return (
                    <button key={a.key} onClick={()=>updateSelectedActsTeam(activeTeam,a.key,!checked)} aria-pressed={checked} className={`act-chip${checked?" active":""}`} style={{display:'flex',alignItems:'center',gap:10,fontSize:14}}>
                      <span style={{fontWeight:600}}>{a.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginTop:10}}>
            <div style={{fontSize:12,color:'var(--bf-text3)'}}>Nastavení se ukládá lokálně a (pokud je povoleno) do DB účtu.</div>
            <div style={{display:'flex',gap:8}}>
              <button className="bf-btn" onClick={()=>{ onSave&&onSave(); onClose&&onClose(); }}>Uložit</button>
              <button className="bf-btn-ghost" onClick={onClose}>Zrušit</button>
            </div>
          </div>
        </div>
      </div>
    );
}
