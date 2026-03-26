import React from "react";

export default function TeamsList(props){
  const { myTeamIds, teams, members, seasons, uid, setActiveTeam, setTeamView, setTTab, setTSeason, setShowTSF } = props;
  return (
    <>
      <div className="bf-section-header" style={{marginBottom:"1rem"}}><div className="bf-label" style={{margin:0}}>Moje týmy</div><button onClick={()=>setTeamView("create")} className="bf-btn-sm">+ Nový tým</button></div>
      {!myTeamIds.length&&<p style={{fontSize:13,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>Zatím nejsi v žádném týmu.</p>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {myTeamIds.map(tid=>{
          const t = teams[tid];
          if(!t) return null;
          const mc = (members[tid]||[]).length;
          const tsc = Object.values(seasons).filter(s=>s.team_id===tid).length;
          return (
            <button key={tid} onClick={()=>{setActiveTeam(tid);setTeamView("detail");setTTab("score");setTSeason("all");setShowTSF(false);}} className="bf-team-card">
              <div className="bf-team-icon">{t.name[0]}</div>
              <div style={{flex:1}}>
                <p style={{margin:0,fontSize:15,fontWeight:700,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>{t.name}</p>
                <p style={{margin:0,fontSize:12,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>
                  {mc} {mc===1?"člen":"členů"}
                  {tsc>0 && <> · {tsc} výzev</>}
                  {t.created_by===uid && <> · tvůj</>}
                </p>
              </div>
              <span style={{fontSize:18,color:"var(--bf-text3)"}}>›</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
