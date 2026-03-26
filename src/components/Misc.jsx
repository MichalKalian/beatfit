import React from "react";

export function Err({err,setErr}){
  if(!err) return null;
  return (
    <div className="bf-err-banner">
      <span>{err}</span>
      <button onClick={()=>setErr(null)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--bf-danger)",fontSize:18,lineHeight:1,padding:"0 0 0 8px"}}>×</button>
    </div>
  );
}

export const SFormCard = ({sForm,setSForm,sSaving,sFlash,onSubmit,onCancel})=> (
  <div className="bf-card" style={{marginBottom:"1rem"}}>
    <div className="bf-label" style={{marginBottom:10}}>Nová výzva</div>
    <input placeholder="Název výzvy" value={sForm.name} onChange={e=>setSForm(f=>({...f,name:e.target.value}))} className="bf-inp" style={{marginBottom:8}}/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
      <div><label className="bf-label">Začátek</label><input type="date" value={sForm.start_date} onChange={e=>setSForm(f=>({...f,start_date:e.target.value}))} className="bf-inp bf-inp-mono"/></div>
      <div><label className="bf-label">Konec</label><input type="date" value={sForm.end_date} onChange={e=>setSForm(f=>({...f,end_date:e.target.value}))} className="bf-inp bf-inp-mono"/></div>
    </div>
    <div style={{display:"flex",gap:8}}>
      <button onClick={onSubmit} disabled={!sForm.name.trim()||!sForm.start_date||!sForm.end_date||sSaving} className="bf-btn" style={{flex:1}}>{sSaving?"Vytvářím…":sFlash?"✓ Vytvořeno!":"Vytvořit výzvu →"}</button>
      <button onClick={onCancel} className="bf-btn-ghost">Zrušit</button>
    </div>
  </div>
);

export default null;
