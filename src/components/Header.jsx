import React from "react";

export default function Header(props){
  const {userMeta,knownWs,activeWs,activeWsId,wsDropOpen,setWsDropOpen,switchWs,setStep,logout,loading,setAddWsMode,view,setView,setTeamView} = props;

  const WsDropdown = ()=> (
    <div style={{position:"relative"}}>
      <button onClick={()=>setWsDropOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:6,background:"var(--bf-surface2)",border:"1.5px solid var(--bf-border-md)",borderRadius:"var(--bf-r-md)",padding:"6px 12px",cursor:"pointer",fontFamily:"var(--bf-font)"}}>
        <span style={{fontSize:13,fontWeight:700,color:"var(--bf-text)",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{activeWs?.name||"Skupina"}</span>
        <span style={{fontSize:10,color:"var(--bf-text3)"}}>{wsDropOpen?"▲":"▼"}</span>
      </button>
      {wsDropOpen&&(
        <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,minWidth:200,background:"var(--bf-surface)",border:"1.5px solid var(--bf-border-md)",borderRadius:"var(--bf-r-md)",zIndex:100,overflow:"hidden",boxShadow:"0 4px 16px rgba(0,0,0,0.15)"}}>
          {knownWs.map(w=>(
            <button key={w.id} onClick={()=>switchWs(w.id)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 14px",background:w.id===activeWsId?"var(--bf-accent-dim)":"transparent",border:"none",cursor:"pointer",textAlign:"left",borderBottom:"1.5px solid var(--bf-border)"}}>
              <span style={{fontSize:13,color:w.id===activeWsId?"var(--bf-accent-text)":"var(--bf-text3)",minWidth:16}}>{w.id===activeWsId?"✓":""}</span>
              <span style={{fontSize:13,fontWeight:w.id===activeWsId?700:500,color:w.id===activeWsId?"var(--bf-accent-text)":"var(--bf-text)",fontFamily:"var(--bf-font)"}}>{w.name}</span>
            </button>
          ))}
          <button onClick={()=>{setWsDropOpen(false);setStep("ws-select");setAddWsMode("code");}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 14px",background:"transparent",border:"none",cursor:"pointer",textAlign:"left",borderBottom:"1.5px solid var(--bf-border)"}}>
            <span style={{fontSize:13,color:"var(--bf-text3)",minWidth:16}}>+</span>
            <span style={{fontSize:13,fontWeight:500,color:"var(--bf-text)",fontFamily:"var(--bf-font)"}}>Přidat skupinu</span>
          </button>
          <button onClick={logout} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 14px",background:"transparent",border:"none",cursor:"pointer",textAlign:"left"}}>
            <span style={{fontSize:13,color:"var(--bf-danger)",minWidth:16}}>↩</span>
            <span style={{fontSize:13,fontWeight:500,color:"var(--bf-danger)",fontFamily:"var(--bf-font)"}}>Odhlásit se</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="bf-topbar" onClick={()=>wsDropOpen&&setWsDropOpen(false)}>
        <div>
          <div className="bf-label" style={{marginBottom:1}}>{userMeta?.name}</div>
          <WsDropdown/>
        </div>
        {loading&&<span style={{fontSize:11,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>Načítám…</span>}
      </div>
      <div className="bf-nav">
        {[["log","Záznam"],["leaderboard","Žebříček"],["teams","Týmy"],["stats","Moje"]].map(([v,l])=> (
          <button key={v} onClick={()=>{setView(v);if(v==="teams")setTeamView("list");setWsDropOpen(false);}} className={`bf-nav-btn${props.view===v?" active":""}`}>{l}</button>
        ))}
      </div>
    </div>
  );
}
