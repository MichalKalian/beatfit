import React from "react";

export default function TeamCreate(props){
  const { newTName, setNewTName, createTeam, saving, setTeamView } = props;
  return (
    <>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1.5rem"}}><button onClick={()=>setTeamView("list")} style={{fontSize:22,background:"none",border:"none",cursor:"pointer",color:"var(--bf-text3)",padding:0,lineHeight:1}}>‹</button><div className="bf-label" style={{margin:0}}>Nový tým</div></div>
      <div className="bf-card"><input placeholder="Název týmu" value={newTName} onChange={e=>setNewTName(e.target.value)} className="bf-inp" style={{marginBottom:12}} onKeyDown={e=>e.key==="Enter"&&createTeam()}/><button onClick={createTeam} disabled={!newTName.trim()||saving} className="bf-btn">{saving?"Vytvářím…":"Vytvořit tým →"}</button></div>
    </>
  );
}
