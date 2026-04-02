import React from "react";
import { SFormCard } from "./Misc";
import { computeEffectiveCap } from "../lib/helpers";

export default function TeamDetail(props){
  const {
    activeTeam,
    teams,
    seasons,
    tSeason,
    setTSeason,
    members,
    todayStr,
    weekAgoStr,
    entries,
    wsUsers,
    AM,
    calcScore,
    calcAge,
    pts,
    uid,
    knownWs,
    activeWsId,
    setTeamView,
    leaveTeam,
    showTSF,
    setShowTSF,
    setSForm,
    sForm,
    sSaving,
    sFlash,
    createSeason,
    deleteSeason,
    seasonLabel,
    seasonStatus,
    daysLeft,
    setTTab,
    tTab,
    setTPeriod,
    tPeriod,
    MEDALS,
    RANK_CLR,
    fmtVal,
  } = props;
  const { prefs } = props;

  const team = teams[activeTeam];
  if(!team){ setTeamView("list"); return null; }
  const tSList = Object.entries(seasons).filter(([,s])=>s.team_id===activeTeam);
  const actS = tSeason.startsWith("season:")?seasons[tSeason.slice(7)]:null;
  const tMids = members[activeTeam]||[];
  const lb = (()=>{
    const t2 = todayStr();
    const w2 = weekAgoStr();
    const res = {};
    for(const id of tMids){
      const u = wsUsers[id];
      if(!u) continue;
      const days = entries[id]||{};
      let sc2 = 0;
      const acts = {};
      for(const a of AM) acts[a.key]=0;
      const teamSelected = prefs?.selectedActs?.teams?.[activeTeam];
      const visibleActKeys = (teamSelected && teamSelected.length)? teamSelected : (prefs?.selectedActs?.ws && prefs.selectedActs.ws.length)?prefs.selectedActs.ws : null;
      for(const [date,e] of Object.entries(days)){
        if(actS){ if(date<actS.start_date||date>actS.end_date) continue; }
        else { if(tPeriod==="today"&&date!==t2) continue; if(tPeriod==="week"&&date<w2) continue; }
        sc2 += calcScore(e, calcAge(u.dob), pts, visibleActKeys);
        for(const a of AM) acts[a.key] += parseFloat(e[a.key])||0;
      }
      // apply viewer limit via helper if available
      try{
        const cap = computeEffectiveCap(prefs?.limit, actS?{fromDate:actS.start_date,toDate:actS.end_date}:{period: tPeriod});
        if(cap!=null) sc2 = Math.min(sc2, cap);
      }catch(e){}
      res[id] = { sc: sc2, name: u.name, dob: u.dob, acts };
    }
    return res;
  })();
  const sorted = Object.entries(lb).sort((a,b)=>b[1].sc-a[1].sc);
  const myRank = sorted.findIndex(([id])=>id===uid)+1;
  const activeWsObj = knownWs.find(w=>w.id===activeWsId);
  const invUrl = `${window.location.origin}${window.location.pathname}?invite=${team.invite_code}&ws=${activeWsObj?.code||""}`;

  return (
    <>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1rem"}}>
        <button onClick={()=>setTeamView("list")} style={{fontSize:22,background:"none",border:"none",cursor:"pointer",color:"var(--bf-text3)",padding:0,lineHeight:1}}>‹</button>
        <div style={{flex:1}}>
          <p style={{margin:0,fontSize:16,fontWeight:800,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>{team.name}</p>
          <p style={{margin:0,fontSize:12,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>{tMids.length} členů</p>
        </div>
        <button onClick={()=>leaveTeam(activeTeam)} className="bf-btn-danger" style={{padding:"6px 12px",fontSize:12}}>Opustit</button>
      </div>

      <div className="bf-card" style={{marginBottom:"1rem"}}>
        <div className="bf-label" style={{marginBottom:8}}>Pozvánka</div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <input readOnly value={invUrl} className="bf-inp bf-inp-mono" style={{flex:1,fontSize:10,cursor:"text"}}/>
          <button onClick={()=>navigator.clipboard.writeText(invUrl)} className="bf-btn-sm">Kopírovat</button>
        </div>
      </div>

      <div style={{marginBottom:"1rem"}}>
        <div className="bf-section-header" style={{marginBottom:8}}>
          <div className="bf-label" style={{margin:0}}>Výzvy týmu</div>
          {!showTSF&&<button onClick={()=>{setShowTSF(true);setSForm({name:"",start_date:"",end_date:""});}} className="bf-btn-sm">+ Výzva</button>}
        </div>
        {showTSF&&<SFormCard sForm={sForm} setSForm={setSForm} sSaving={sSaving} sFlash={sFlash} onSubmit={()=>createSeason(activeTeam)} onCancel={()=>setShowTSF(false)}/>} 
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          <button onClick={()=>setTSeason("all")} className={`bf-chip${tSeason==="all"?" active":""}`} style={{flex:"none",padding:"6px 14px",fontSize:11}}>Bez výzvy</button>
          {tSList.sort(([,a],[,b])=>b.start_date.localeCompare(a.start_date)).map(([sid,s])=>{const lbl=seasonLabel(s);return (
            <button key={sid} onClick={()=>setTSeason(`season:${sid}`)} className={`bf-chip${tSeason===`season:${sid}`?" active":""}`} style={{flex:"none",padding:"6px 14px",fontSize:11,display:"flex",alignItems:"center",gap:5}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"currentColor",flexShrink:0,display:"inline-block",opacity:0.7}}/>{s.name}
            </button>
          );})}
        </div>
        {actS&&tMids.includes(uid)&&actS.created_by===uid&&<button onClick={()=>{deleteSeason(tSeason.slice(7));setTSeason("all");}} className="bf-btn-danger" style={{marginTop:8,padding:"5px 12px",fontSize:11}}>Smazat výzvu</button>}
      </div>

      {tSeason==="all"&&<div className="bf-chips">{[["today","Dnes"],["week","Týden"],["all","Vše"]].map(([k,l])=>(<button key={k} onClick={()=>setTPeriod(k)} className={`bf-chip${tPeriod===k?" active":""}`}>{l}</button>))}</div>}

      {actS&&<div className="bf-surface" style={{marginBottom:"1rem",display:"flex",alignItems:"center",gap:10}}>
        <span className={`bf-badge ${seasonLabel(actS).cls}`}>{seasonLabel(actS).text}</span>
        <div style={{flex:1}}>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:"var(--bf-text)",fontFamily:"var(--bf-font)"}}>{actS.name}</p>
          <p style={{margin:0,fontSize:11,fontFamily:"var(--bf-mono)",color:"var(--bf-text3)"}}>{actS.start_date} → {actS.end_date}</p>
        </div>
        {seasonStatus(actS)==="active"&&<span style={{fontSize:11,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>zbývá {daysLeft(actS)} dní</span>}
      </div>}

      {myRank>0&&<div className="bf-surface-accent" style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}><span style={{fontSize:12,color:"var(--bf-accent-text)",fontFamily:"var(--bf-font)",fontWeight:600}}>Tvoje pořadí</span><span style={{fontSize:26,fontWeight:800,fontFamily:"var(--bf-mono)",color:"var(--bf-accent)"}}>#{myRank}</span><span style={{fontSize:12,color:"var(--bf-accent-text)",fontFamily:"var(--bf-font)"}}>z {sorted.length}</span></div>}

      <div className="bf-nav" style={{marginBottom:"1rem"}}>{[["score","Body"],["activity","Aktivity"]].map(([t,l])=>(<button key={t} onClick={()=>setTTab(t)} className={`bf-nav-btn${tTab===t?" active":""}`}>{l}</button>))}</div>

      {tTab==="score"&&<>
        <div className="bf-label" style={{marginBottom:8}}>Žebříček</div>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {sorted.length===0&&<p style={{fontSize:13,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>Zatím žádná data.</p>}
          {sorted.map(([id,d],i)=>(
            <div key={id} className={`bf-lb-row${id===uid?" me":""}`}>
              <span style={{fontSize:17,minWidth:30,color:RANK_CLR[i]||"var(--bf-text3)",fontWeight:800,fontFamily:"var(--bf-mono)"}}>{MEDALS[i]||`${i+1}.`}</span>
              <div className="bf-av" style={{width:28,height:28,fontSize:11}}>{d.name[0]}</div>
              <span style={{flex:1,fontWeight:700,fontSize:14,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>{d.name}</span>
              <span style={{fontSize:16,fontWeight:700,fontFamily:"var(--bf-mono)",color:"var(--bf-text)"}}>{d.sc.toFixed(1)}</span>
              <span style={{fontSize:10,color:"var(--bf-text3)"}}>b</span>
            </div>
          ))}
        </div>
      </>}

      {tTab==="activity"&&<>
        <div className="bf-label" style={{marginBottom:8}}>Porovnání aktivit</div>
        {AM.map(a=>{
          const vals = sorted.map(([id,d])=>({name:d.name,val:d.acts[a.key]||0,isMe:id===uid})).sort((x,y)=>y.val-x.val);
          const mx = Math.max(...vals.map(v=>v.val),1);
          if(vals.every(v=>v.val===0)) return null;
          return (
            <div key={a.key} className="bf-card" style={{marginBottom:"0.75rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <div className="bf-act-icon" style={{width:30,height:30,borderRadius:7,fontSize:12,background:a.color+"20",color:a.color}}>{a.icon}</div>
                <p style={{margin:0,fontSize:13,fontWeight:700,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>{a.label}</p>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {vals.filter(v=>v.val>0).map((v,i)=>(
                  <div key={i}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:12,fontWeight:v.isMe?700:500,color:v.isMe?"var(--bf-text)":"var(--bf-text2)",fontFamily:"var(--bf-font)"}}>{i===0?"🥇 ":""}{v.name}</span>
                      <span style={{fontSize:12,fontFamily:"var(--bf-mono)",color:"var(--bf-text)",fontWeight:600}}>{fmtVal(a,v.val)} {a.unit}</span>
                    </div>
                    <div className="bf-progress-bar"><div className="bf-progress-fill" style={{width:`${(v.val/mx)*100}%`,background:v.isMe?a.color:"var(--bf-surface3)",opacity:v.isMe?1:0.6}}/></div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </>}
    </>
  );
}
