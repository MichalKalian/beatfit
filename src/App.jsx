import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import "./beatfit.css";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY);

const DEFAULT_PTS = { shyby:8,anglicky:5,kliky:2,dreepy:1.5,sedLehy:1,behKm:15,koloKm:4,plankSec:0.05,kroky:0.003 };
const AM = [
  {key:"shyby",   label:"Shyby",    sub:"pull-ups", unit:"ks", icon:"⬆",color:"#c084fc"},
  {key:"anglicky",label:"Angličáky",sub:"burpees",  unit:"ks", icon:"★",color:"#f97316"},
  {key:"kliky",   label:"Kliky",    sub:"push-ups", unit:"ks", icon:"▲",color:"#38bdf8"},
  {key:"dreepy",  label:"Dřepy",    sub:"squats",   unit:"ks", icon:"↓",color:"#34d399"},
  {key:"sedLehy", label:"Sed-lehy", sub:"sit-ups",  unit:"ks", icon:"↔",color:"#a3e635"},
  {key:"behKm",   label:"Běh",      sub:"km",       unit:"km", icon:"▶",color:"#fbbf24"},
  {key:"koloKm",  label:"Kolo",     sub:"km",       unit:"km", icon:"○",color:"#fb7185"},
  {key:"plankSec",label:"Plank",    sub:"sekund",   unit:"s",  icon:"—",color:"#e879f9"},
  {key:"kroky",   label:"Kroky",    sub:"steps",    unit:"kr", icon:"◆",color:"#06b6d4"},
];

const getActs = pts => AM.map(a=>({...a,pts:pts[a.key]??DEFAULT_PTS[a.key]}));
function calcAge(dob){if(!dob)return 30;const b=new Date(dob),t=new Date();let a=t.getFullYear()-b.getFullYear();if(t<new Date(t.getFullYear(),b.getMonth(),b.getDate()))a--;return a;}
function ageMult(age){const a=parseInt(age)||30;if(a>=30)return 1+(a-30)*0.015;return Math.max(0.85,1-(30-a)*0.005);}
function calcScore(e,age,pts){if(!e)return 0;return getActs(pts).reduce((s,a)=>s+(parseFloat(e[a.key])||0)*a.pts,0)*ageMult(age);}
function todayStr(){return new Date().toISOString().split("T")[0];}
function weekAgoStr(){const d=new Date();d.setDate(d.getDate()-7);return d.toISOString().split("T")[0];}
function dMinus(n){const d=new Date();d.setDate(d.getDate()-n);return d.toISOString().split("T")[0];}
function calcStreak(days){if(!days||!Object.keys(days).length)return 0;let s=0,c=new Date();if(!days[todayStr()])c.setDate(c.getDate()-1);while(true){const d=c.toISOString().split("T")[0];if(!days[d])break;s++;c.setDate(c.getDate()-1);}return s;}
function randCode(){return Math.random().toString(36).slice(2,8).toUpperCase();}
function exportCSV(name,days,pts,age){
  const h=["Datum","Skóre",...AM.map(a=>`${a.label} (${a.unit})`)];
  const r=Object.entries(days).sort(([a],[b])=>a.localeCompare(b)).map(([d,e])=>[d,calcScore(e,age,pts).toFixed(2),...AM.map(a=>parseFloat(e[a.key])||0)]);
  const csv=[h,...r].map(x=>x.join(";")).join("\n");
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);const el=document.createElement("a");el.href=url;el.download=`beatfit_${name}_${todayStr()}.csv`;el.click();URL.revokeObjectURL(url);
}
function seasonStatus(s){const t=todayStr();if(t<s.start_date)return"upcoming";if(t>s.end_date)return"finished";return"active";}
function seasonLabel(s){const st=seasonStatus(s);if(st==="upcoming")return{text:"Připravuje se",cls:"bf-badge-warn"};if(st==="finished")return{text:"Ukončeno",cls:"bf-badge-dim"};return{text:"Probíhá",cls:"bf-badge-success"};}
function daysLeft(s){return Math.ceil((new Date(s.end_date)-new Date(todayStr()))/(1000*60*60*24));}

const MEDALS=["🥇","🥈","🥉"],RANK_CLR=["#f59e0b","#94a3b8","#b87333"];
const SK="bf_session";

export default function App(){
  // ── auth / workspace ──────────────────────────────────────────────────────
  const[ws,setWs]               = useState(null);
  const[loginPath,setLoginPath] = useState(null); // null | "code" | "new"
  const[wsIn,setWsIn]           = useState("");
  const[wsErr,setWsErr]         = useState("");
  const[wsLoad,setWsLoad]       = useState(false);
  const[pendU,setPendU]         = useState(null);
  const[pinIn,setPinIn]         = useState("");
  const[pinErr,setPinErr]       = useState(false);
  const[setPinMode,setSetPinMode] = useState(false);
  const[newPin,setNewPin]       = useState("");
  const[newPinC,setNewPinC]     = useState("");
  // new user + new workspace form
  const[regName,setRegName]     = useState("");
  const[regDob,setRegDob]       = useState("");
  const[regPin,setRegPin]       = useState("");
  const[regWsName,setRegWsName] = useState("");
  // existing user in known workspace (code path)
  const[newName,setNewName]     = useState("");
  const[newDob,setNewDob]       = useState("");
  const[newRegPin,setNewRegPin] = useState("");
  // ── data ──────────────────────────────────────────────────────────────────
  const[view,setView]           = useState("login");
  const[uid,setUid]             = useState(null);
  const[users,setUsers]         = useState({});
  const[entries,setEntries]     = useState({});
  const[pts,setPts]             = useState(DEFAULT_PTS);
  const[goals,setGoals]         = useState({});
  const[teams,setTeams]         = useState({});
  const[members,setMembers]     = useState({});
  const[seasons,setSeasons]     = useState({});
  const[loading,setLoading]     = useState(true);
  const[saving,setSaving]       = useState(false);
  const[flash,setFlash]         = useState(false);
  const[period,setPeriod]       = useState("week");
  const[logDate,setLogDate]     = useState(todayStr());
  const[err,setErr]             = useState(null);
  const[form,setForm]           = useState({});
  const[goalIn,setGoalIn]       = useState("");
  const[goalFlash,setGoalFlash] = useState(false);
  // ── group rename ──────────────────────────────────────────────────────────
  const[renameWs,setRenameWs]   = useState(false);
  const[renameVal,setRenameVal] = useState("");
  // ── join another group ────────────────────────────────────────────────────
  const[joinMode,setJoinMode]   = useState(false);
  const[joinCode,setJoinCode]   = useState("");
  const[joinErr,setJoinErr]     = useState("");
  // ── teams / seasons ───────────────────────────────────────────────────────
  const[teamView,setTeamView]   = useState("list");
  const[activeTeam,setActiveTeam] = useState(null);
  const[newTName,setNewTName]   = useState("");
  const[tPeriod,setTPeriod]     = useState("week");
  const[tTab,setTTab]           = useState("score");
  const[pendInv,setPendInv]     = useState(null);
  const[invInfo,setInvInfo]     = useState(null);
  const[lbMode,setLbMode]       = useState("global");
  const[tSeason,setTSeason]     = useState("all");
  const[sForm,setSForm]         = useState({name:"",start_date:"",end_date:""});
  const[sSaving,setSSaving]     = useState(false);
  const[sFlash,setSFlash]       = useState(false);
  const[showSF,setShowSF]       = useState(false);
  const[showTSF,setShowTSF]     = useState(false);
  // ── admin ─────────────────────────────────────────────────────────────────
  const[adminPwd,setAdminPwd]   = useState("");
  const[adminErr,setAdminErr]   = useState(false);
  const[adminTab,setAdminTab]   = useState("workspaces");
  const[ptsEdit,setPtsEdit]     = useState({});
  const[ptsSv,setPtsSv]         = useState(false);
  const[ptsFlash,setPtsFlash]   = useState(false);
  const[allWs,setAllWs]         = useState({});
  const[allWsU,setAllWsU]       = useState({});
  const[aSelWs,setASelWs]       = useState(null);
  const[editUser,setEditUser]   = useState(null);
  const[editName,setEditName]   = useState("");
  const[editDob,setEditDob]     = useState("");
  const[nWsName,setNWsName]     = useState("");
  const[nWsCode,setNWsCode]     = useState(randCode());
  const[editWs,setEditWs]       = useState(null);
  const[editWsN,setEditWsN]     = useState("");
  const[editWsC,setEditWsC]     = useState("");

  // ── session restore ───────────────────────────────────────────────────────
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const inv=params.get("invite"),wsCode=params.get("ws");
    if(inv)setPendInv(inv);
    if(wsCode)setWsIn(wsCode);
    window.history.replaceState({},"",window.location.pathname);
    const sess=JSON.parse(localStorage.getItem(SK)||"null");
    if(sess?.userId&&sess?.wsId){loadWs(sess.wsId).then(ok=>{if(ok){setUid(sess.userId);setView("log");}else{localStorage.removeItem(SK);setLoading(false);}});}
    else setLoading(false);
  },[]);

  // ── load workspace ────────────────────────────────────────────────────────
  async function loadWs(wsId){
    try{
      const[wR,uR,tR,sR,stR,tmR]=await Promise.all([
        supabase.from("workspaces").select("*").eq("id",wsId).single(),
        supabase.from("users").select("*").eq("workspace_id",wsId),
        supabase.from("teams").select("*").eq("workspace_id",wsId),
        supabase.from("seasons").select("*").eq("workspace_id",wsId),
        supabase.from("settings").select("*").eq("key","pts"),
        supabase.from("team_members").select("*"),
      ]);
      if(wR.error)return false;
      setWs({id:wR.data.id,name:wR.data.name,code:wR.data.code,created_by:wR.data.created_by});
      const uMap={},uIds=[];
      for(const u of uR.data||[]){uMap[u.id]={name:u.name,dob:u.dob,since:u.since,pin:u.pin||""};uIds.push(u.id);}
      setUsers(uMap);
      if(uIds.length>0){
        const[eR,gR]=await Promise.all([supabase.from("entries").select("*").in("user_id",uIds),supabase.from("goals").select("*").in("user_id",uIds)]);
        const eMap={};for(const e of eR.data||[]){if(!eMap[e.user_id])eMap[e.user_id]={};eMap[e.user_id][e.date]=e.data;}setEntries(eMap);
        const gMap={};for(const g of gR.data||[])gMap[g.user_id]=g.weekly_goal;setGoals(gMap);
      }
      const tMap={};for(const t of tR.data||[])tMap[t.id]={name:t.name,created_by:t.created_by,invite_code:t.invite_code};setTeams(tMap);
      const tIds=Object.keys(tMap),mMap={};
      for(const m of tmR.data||[]){if(!tIds.includes(m.team_id))continue;if(!mMap[m.team_id])mMap[m.team_id]=[];mMap[m.team_id].push(m.user_id);}setMembers(mMap);
      const sMap={};for(const s of sR.data||[])sMap[s.id]={name:s.name,start_date:s.start_date,end_date:s.end_date,created_by:s.created_by,team_id:s.team_id,scope:s.scope};setSeasons(sMap);
      if(stR.data?.length>0)setPts({...DEFAULT_PTS,...stR.data[0].value});
      setLoading(false);return true;
    }catch{return false;}
  }

  // ── enter workspace by code ───────────────────────────────────────────────
  async function enterWs(){
    if(!wsIn.trim())return;
    setWsLoad(true);setWsErr("");
    const{data,error}=await supabase.from("workspaces").select("*").eq("code",wsIn.trim().toUpperCase()).single();
    if(error||!data){setWsErr("Kód skupiny nebyl nalezen.");setWsLoad(false);return;}
    if(pendInv){const{data:td}=await supabase.from("teams").select("*").eq("workspace_id",data.id);const tf=td?.find(t=>t.invite_code===pendInv);if(tf)setInvInfo({teamId:tf.id,teamName:tf.name});}
    await loadWs(data.id);setWsLoad(false);
  }

  // ── create workspace + user (solo start) ──────────────────────────────────
  async function createWsAndRegister(){
    if(!regName.trim()||!regDob||regPin.length<4||!regWsName.trim())return;
    setSaving(true);setErr(null);
    const wsId="ws"+Date.now();
    const userId="u"+(Date.now()+1);
    const code=randCode();
    const{error:we}=await supabase.from("workspaces").insert({id:wsId,name:regWsName.trim(),code,created_by:userId});
    if(we){setErr("Vytvoření skupiny selhalo.");setSaving(false);return;}
    const{error:ue}=await supabase.from("users").insert({id:userId,name:regName.trim(),dob:regDob,since:todayStr(),pin:regPin,workspace_id:wsId});
    if(ue){setErr("Registrace selhala.");setSaving(false);return;}
    await loadWs(wsId);
    setUid(userId);
    localStorage.setItem(SK,JSON.stringify({userId,wsId}));
    setRegName("");setRegDob("");setRegPin("");setRegWsName("");
    setSaving(false);setView("log");
  }

  // ── register into existing workspace ─────────────────────────────────────
  async function register(){
    if(!newName.trim()||!newDob||newRegPin.length<4)return;
    const dup=Object.values(users).some(u=>u.name.toLowerCase()===newName.trim().toLowerCase());
    if(dup){setErr(`Hráč se jménem "${newName.trim()}" již existuje.`);return;}
    setSaving(true);setErr(null);
    const id="u"+Date.now();
    const{error:e}=await supabase.from("users").insert({id,name:newName.trim(),dob:newDob,since:todayStr(),pin:newRegPin,workspace_id:ws.id});
    if(e){setErr("Registrace se nezdařila.");setSaving(false);return;}
    setUsers(u=>({...u,[id]:{name:newName.trim(),dob:newDob,since:todayStr(),pin:newRegPin}}));
    setNewName("");setNewDob("");setNewRegPin("");loginAs(id);setSaving(false);
  }

  // ── PIN handling ──────────────────────────────────────────────────────────
  function selectU(id){
    if(pendU===id){setPendU(null);setPinIn("");setPinErr(false);setSetPinMode(false);return;}
    setPendU(id);setPinIn("");setPinErr(false);
    const u=users[id];setSetPinMode(!u?.pin);setNewPin("");setNewPinC("");
  }

  function verifyPin(){if(pinIn===users[pendU].pin)loginAs(pendU);else{setPinErr(true);setPinIn("");}}

  async function saveNewPin(){
    if(newPin.length<4||newPin!==newPinC){setErr("PINy se neshodují nebo jsou kratší než 4 číslice.");return;}
    const targetId=pendU||uid;if(!targetId){setErr("Chyba: neznámý uživatel.");return;}
    const{error:e}=await supabase.from("users").update({pin:newPin}).eq("id",targetId);
    if(e){setErr(`PIN error: ${e.message}`);return;}
    setUsers(u=>({...u,[targetId]:{...u[targetId],pin:newPin}}));
    if(pendU)loginAs(pendU);
  }

  function loginAs(id){
    setUid(id);setForm(entries[id]?.[logDate]||{});setGoalIn(goals[id]||"");
    localStorage.setItem(SK,JSON.stringify({userId:id,wsId:ws.id}));
    setPendU(null);setPinIn("");setSetPinMode(false);
    if(pendInv)joinByCode(pendInv);
    setView("log");
  }

  function logout(){
    setUid(null);setWs(null);setUsers({});setEntries({});setTeams({});setMembers({});setSeasons({});setGoals({});
    setPendU(null);setWsIn("");setPinIn("");setSetPinMode(false);setInvInfo(null);setLoginPath(null);
    setRenameWs(false);setJoinMode(false);setJoinCode("");setJoinErr("");
    localStorage.removeItem(SK);setView("login");
  }

  // ── rename workspace ──────────────────────────────────────────────────────
  async function doRenameWs(){
    if(!renameVal.trim())return;
    const{error:e}=await supabase.from("workspaces").update({name:renameVal.trim()}).eq("id",ws.id);
    if(e){setErr("Přejmenování selhalo.");return;}
    setWs(w=>({...w,name:renameVal.trim()}));setRenameWs(false);
  }

  // ── join another group ────────────────────────────────────────────────────
  async function joinAnotherGroup(){
    if(!joinCode.trim())return;
    setJoinErr("");
    const{data,error}=await supabase.from("workspaces").select("*").eq("code",joinCode.trim().toUpperCase()).single();
    if(error||!data){setJoinErr("Kód skupiny nebyl nalezen.");return;}
    if(data.id===ws.id){setJoinErr("Tato skupina je již aktivní.");return;}
    // switch to new workspace — keep same user id won't exist there, so just switch context
    // User needs to register in new workspace — log them out and pre-fill code
    localStorage.removeItem(SK);
    setWsIn(joinCode.trim().toUpperCase());
    setJoinMode(false);setJoinCode("");setJoinErr("");
    logout();
    // re-set wsIn after logout clears it
    setTimeout(()=>{setWsIn(joinCode.trim().toUpperCase());setLoginPath("code");},50);
  }

  // ── entry operations ──────────────────────────────────────────────────────
  async function saveEntry(){
    setSaving(true);setErr(null);
    const t=logDate||todayStr();
    const{error:e}=await supabase.from("entries").upsert({user_id:uid,date:t,data:form},{onConflict:"user_id,date"});
    if(e){setErr("Uložení se nezdařilo.");setSaving(false);return;}
    setEntries(p=>({...p,[uid]:{...(p[uid]||{}),[t]:form}}));
    setFlash(true);setTimeout(()=>setFlash(false),2000);setSaving(false);
  }

  async function deleteEntry(){
    if(!window.confirm(`Opravdu smazat záznam za ${logDate}?`))return;
    setSaving(true);
    const{error:e}=await supabase.from("entries").delete().eq("user_id",uid).eq("date",logDate);
    if(e){setErr("Smazání se nezdařilo.");setSaving(false);return;}
    setEntries(p=>{const u={...p,[uid]:{...(p[uid]||{})}};delete u[uid][logDate];return u;});
    setForm({});setSaving(false);
  }

  async function saveGoal(){
    const val=parseFloat(goalIn)||0;
    const{error:e}=await supabase.from("goals").upsert({user_id:uid,weekly_goal:val},{onConflict:"user_id"});
    if(e){setErr("Uložení cíle selhalo.");return;}
    setGoals(g=>({...g,[uid]:val}));setGoalFlash(true);setTimeout(()=>setGoalFlash(false),2000);
  }

  // ── admin ─────────────────────────────────────────────────────────────────
  async function loginAdmin(){
    if(adminPwd!==import.meta.env.VITE_ADMIN_PASSWORD){setAdminErr(true);return;}
    setAdminErr(false);setPtsEdit({...pts});
    const[wR,uR,eR]=await Promise.all([supabase.from("workspaces").select("*"),supabase.from("users").select("*"),supabase.from("entries").select("user_id")]);
    const ec={};for(const e of eR.data||[])ec[e.user_id]=(ec[e.user_id]||0)+1;
    const wMap={};for(const w of wR.data||[])wMap[w.id]={name:w.name,code:w.code};setAllWs(wMap);
    const wuMap={};for(const u of uR.data||[]){if(!wuMap[u.workspace_id])wuMap[u.workspace_id]=[];wuMap[u.workspace_id].push({id:u.id,name:u.name,dob:u.dob,pin:u.pin,entryCount:ec[u.id]||0});}setAllWsU(wuMap);
    setView("admin");
  }

  async function createAdminWs(){
    if(!nWsName.trim()||!nWsCode.trim())return;
    const id="ws"+Date.now();
    const{error:e}=await supabase.from("workspaces").insert({id,name:nWsName.trim(),code:nWsCode.trim().toUpperCase()});
    if(e){setErr(e.message.includes("unique")?"Kód již existuje.":"Vytvoření selhalo.");return;}
    setAllWs(w=>({...w,[id]:{name:nWsName.trim(),code:nWsCode.trim().toUpperCase()}}));setAllWsU(w=>({...w,[id]:[]}));setNWsName("");setNWsCode(randCode());
  }

  async function updateAdminWs(){
    if(!editWsN.trim()||!editWsC.trim())return;
    const{error:e}=await supabase.from("workspaces").update({name:editWsN.trim(),code:editWsC.trim().toUpperCase()}).eq("id",editWs);
    if(e){setErr(e.message.includes("unique")?"Kód již existuje.":"Uložení selhalo.");return;}
    setAllWs(w=>({...w,[editWs]:{...w[editWs],name:editWsN.trim(),code:editWsC.trim().toUpperCase()}}));setEditWs(null);
  }

  async function deleteAdminWs(wsId){
    if(!window.confirm(`Opravdu smazat skupinu "${allWs[wsId]?.name}" včetně VŠECH dat?`))return;
    const uIds=(allWsU[wsId]||[]).map(u=>u.id);
    if(uIds.length>0){await Promise.all([supabase.from("entries").delete().in("user_id",uIds),supabase.from("goals").delete().in("user_id",uIds),supabase.from("team_members").delete().in("user_id",uIds)]);await supabase.from("users").delete().eq("workspace_id",wsId);}
    await Promise.all([supabase.from("seasons").delete().eq("workspace_id",wsId),supabase.from("teams").delete().eq("workspace_id",wsId)]);
    await supabase.from("workspaces").delete().eq("id",wsId);
    setAllWs(w=>{const n={...w};delete n[wsId];return n;});setAllWsU(w=>{const n={...w};delete n[wsId];return n;});if(aSelWs===wsId)setASelWs(null);
  }

  async function savePts(){
    setPtsSv(true);const merged={...pts,...ptsEdit};
    const{error:e}=await supabase.from("settings").upsert({key:"pts",value:merged},{onConflict:"key"});
    if(e){setErr("Uložení koeficientů selhalo.");setPtsSv(false);return;}
    setPts(merged);setPtsFlash(true);setTimeout(()=>setPtsFlash(false),2000);setPtsSv(false);
  }

  async function saveAdminEditUser(){
    if(!editName.trim()||!editDob)return;
    const wsId=Object.keys(allWsU).find(w=>(allWsU[w]||[]).some(u=>u.id===editUser));
    const dup=(allWsU[wsId]||[]).some(u=>u.id!==editUser&&u.name.toLowerCase()===editName.trim().toLowerCase());
    if(dup){setErr(`Jméno "${editName.trim()}" již existuje.`);return;}
    const{error:e}=await supabase.from("users").update({name:editName.trim(),dob:editDob}).eq("id",editUser);
    if(e){setErr("Uložení selhalo.");return;}
    setAllWsU(w=>({...w,[wsId]:(w[wsId]||[]).map(u=>u.id===editUser?{...u,name:editName.trim(),dob:editDob}:u)}));setEditUser(null);
  }

  async function resetPin(userId,wsId){
    const np=prompt("Nový PIN (min. 4 číslice):");if(!np||np.length<4)return;
    const{error:e}=await supabase.from("users").update({pin:np}).eq("id",userId);
    if(e){setErr("Reset PINu selhal.");return;}
    setAllWsU(w=>({...w,[wsId]:(w[wsId]||[]).map(u=>u.id===userId?{...u,pin:np}:u)}));
  }

  async function deleteAdminUser(userId,wsId){
    const u=(allWsU[wsId]||[]).find(u=>u.id===userId);
    if(!window.confirm(`Opravdu smazat hráče "${u?.name}"?`))return;
    await Promise.all([supabase.from("entries").delete().eq("user_id",userId),supabase.from("goals").delete().eq("user_id",userId),supabase.from("team_members").delete().eq("user_id",userId)]);
    await supabase.from("users").delete().eq("id",userId);
    setAllWsU(w=>({...w,[wsId]:(w[wsId]||[]).filter(u=>u.id!==userId)}));setEditUser(null);
  }

  // ── teams ─────────────────────────────────────────────────────────────────
  async function createTeam(){
    if(!newTName.trim())return;setSaving(true);setErr(null);
    const id="t"+Date.now(),ic=randCode();
    const{error:e}=await supabase.from("teams").insert({id,name:newTName.trim(),created_by:uid,invite_code:ic,workspace_id:ws.id});
    if(e){setErr("Vytvoření týmu selhalo.");setSaving(false);return;}
    await supabase.from("team_members").insert({team_id:id,user_id:uid});
    setTeams(t=>({...t,[id]:{name:newTName.trim(),created_by:uid,invite_code:ic}}));setMembers(m=>({...m,[id]:[uid]}));
    setNewTName("");setActiveTeam(id);setTeamView("detail");setTTab("score");setSaving(false);
  }

  async function joinByCode(code){
    const team=Object.entries(teams).find(([,t])=>t.invite_code===code);
    if(!team){setErr("Pozvánka nebyla nalezena.");setPendInv(null);setInvInfo(null);return;}
    const[teamId]=team;
    if((members[teamId]||[]).includes(uid)){setPendInv(null);setInvInfo(null);setActiveTeam(teamId);setTeamView("detail");setView("teams");return;}
    const{error:e}=await supabase.from("team_members").insert({team_id:teamId,user_id:uid});
    if(e){setErr("Přihlášení do týmu selhalo.");return;}
    setMembers(m=>({...m,[teamId]:[...(m[teamId]||[]),uid]}));
    setPendInv(null);setInvInfo(null);setActiveTeam(teamId);setTeamView("detail");setView("teams");
  }

  async function leaveTeam(teamId){
    if(!window.confirm(`Opravdu opustit tým "${teams[teamId]?.name}"?`))return;
    await supabase.from("team_members").delete().eq("team_id",teamId).eq("user_id",uid);
    setMembers(m=>({...m,[teamId]:(m[teamId]||[]).filter(id=>id!==uid)}));setTeamView("list");
  }

  async function createSeason(teamId=null){
    if(!sForm.name.trim()||!sForm.start_date||!sForm.end_date)return;
    if(sForm.end_date<=sForm.start_date){setErr("Datum konce musí být po datu začátku.");return;}
    setSSaving(true);setErr(null);
    const id="s"+Date.now();
    const ns={id,name:sForm.name.trim(),start_date:sForm.start_date,end_date:sForm.end_date,created_by:uid,team_id:teamId||null,scope:teamId?"team":"global",workspace_id:ws.id};
    const{error:e}=await supabase.from("seasons").insert(ns);
    if(e){setErr("Vytvoření sezóny selhalo.");setSSaving(false);return;}
    setSeasons(s=>({...s,[id]:{name:ns.name,start_date:ns.start_date,end_date:ns.end_date,created_by:uid,team_id:teamId||null,scope:ns.scope}}));
    setSForm({name:"",start_date:"",end_date:""});setShowSF(false);setShowTSF(false);
    setSFlash(true);setTimeout(()=>setSFlash(false),2000);setSSaving(false);
  }

  async function deleteSeason(id){
    if(!window.confirm(`Opravdu smazat výzvu "${seasons[id]?.name}"?`))return;
    await supabase.from("seasons").delete().eq("id",id);
    setSeasons(s=>{const n={...s};delete n[id];return n;});
  }

  function buildLB(filterIds,fromDate,toDate){
    const t=todayStr(),w=weekAgoStr(),res={};
    for(const[id,days] of Object.entries(entries)){
      if(filterIds&&!filterIds.includes(id))continue;
      const u=users[id];if(!u)continue;
      let sc=0;const acts={};for(const a of AM)acts[a.key]=0;
      for(const[date,e] of Object.entries(days)){
        if(fromDate&&toDate){if(date<fromDate||date>toDate)continue;}
        else{if(period==="today"&&date!==t)continue;if(period==="week"&&date<w)continue;}
        sc+=calcScore(e,calcAge(u.dob),pts);for(const a of AM)acts[a.key]+=parseFloat(e[a.key])||0;
      }
      res[id]={sc,name:u.name,age:calcAge(u.dob),acts};
    }
    return res;
  }

  // ── styles ────────────────────────────────────────────────────────────────
  const P={padding:"1rem",maxWidth:480,margin:"0 auto"};
  const ErrBanner=()=>err?(<div className="bf-err-banner"><span>{err}</span><button onClick={()=>setErr(null)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--bf-danger)",fontSize:18,lineHeight:1,padding:"0 0 0 8px"}}>×</button></div>):null;

  const SFormCard=({onSubmit,onCancel})=>(
    <div className="bf-card" style={{marginBottom:"1rem"}}>
      <div className="bf-label" style={{marginBottom:10}}>Nová výzva</div>
      <input placeholder="Název výzvy" value={sForm.name} onChange={e=>setSForm(f=>({...f,name:e.target.value}))} className="bf-inp" style={{marginBottom:8}}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        <div><label className="bf-label">Začátek</label><input type="date" value={sForm.start_date} onChange={e=>setSForm(f=>({...f,start_date:e.target.value}))} className="bf-inp bf-inp-mono"/></div>
        <div><label className="bf-label">Konec</label><input type="date" value={sForm.end_date} onChange={e=>setSForm(f=>({...f,end_date:e.target.value}))} className="bf-inp bf-inp-mono"/></div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={onSubmit} disabled={!sForm.name.trim()||!sForm.start_date||!sForm.end_date||sSaving} className="bf-btn" style={{flex:1}}>{sSaving?"Vytvářím…":sFlash?"✓ Vytvořeno!":"Vytvořit výzvu →"}</button>
        <button onClick={onCancel} className="bf-btn-ghost" style={{flexShrink:0}}>Zrušit</button>
      </div>
    </div>
  );

  if(loading)return<div style={{...P,textAlign:"center",paddingTop:"3rem",color:"var(--bf-text3)",fontSize:14,fontFamily:"var(--bf-font)"}}>Načítám data…</div>;

  const user=users[uid];
  const ACTS=getActs(pts);
  const myTeamIds=Object.keys(members).filter(tid=>(members[tid]||[]).includes(uid));
  const globalSeasons=Object.entries(seasons).filter(([,s])=>s.scope==="global");
  const isWsCreator=ws&&uid&&ws.created_by===uid;

  // ══ LOGIN ════════════════════════════════════════════════════════════════
  if(view==="login")return(
    <div style={P}>
      <div style={{textAlign:"center",padding:"2rem 0 1.75rem"}}>
        <div className="bf-ws-badge">Fitness soutěž</div>
        <h1 style={{fontSize:40,fontWeight:800,letterSpacing:"-0.04em",fontFamily:"var(--bf-font)",color:"var(--bf-text)",marginBottom:6}}>Beatfit</h1>
        <p style={{fontSize:13,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>Zaznamenávej sporty, porovnávej výsledky</p>
      </div>
      <ErrBanner/>

      {/* ── path selection ── */}
      {!loginPath&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button onClick={()=>setLoginPath("code")} style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",background:"var(--bf-surface)",border:"1.5px solid var(--bf-border-md)",borderRadius:"var(--bf-r-lg)",cursor:"pointer",textAlign:"left",transition:"border-color 0.15s"}}>
            <div style={{width:44,height:44,borderRadius:"var(--bf-r-md)",background:"var(--bf-accent-dim)",color:"var(--bf-accent-text)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>⌨</div>
            <div>
              <p style={{margin:0,fontSize:15,fontWeight:700,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>Mám kód skupiny</p>
              <p style={{margin:0,fontSize:12,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>Připojit se ke skupině kolegy nebo přítele</p>
            </div>
          </button>
          <button onClick={()=>setLoginPath("new")} style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",background:"var(--bf-surface)",border:"1.5px solid var(--bf-border-md)",borderRadius:"var(--bf-r-lg)",cursor:"pointer",textAlign:"left",transition:"border-color 0.15s"}}>
            <div style={{width:44,height:44,borderRadius:"var(--bf-r-md)",background:"var(--bf-success-dim)",color:"var(--bf-success)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>+</div>
            <div>
              <p style={{margin:0,fontSize:15,fontWeight:700,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>Začít bez kódu</p>
              <p style={{margin:0,fontSize:12,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>Vytvořit vlastní skupinu a pozvat ostatní</p>
            </div>
          </button>
          <div style={{borderTop:"1.5px solid var(--bf-border)",paddingTop:"1rem",marginTop:"0.5rem"}}>
            <div className="bf-label" style={{marginBottom:8,textAlign:"center"}}>Administrátor</div>
            <div style={{display:"flex",gap:8}}>
              <input type="password" placeholder="Heslo" value={adminPwd} onChange={e=>{setAdminPwd(e.target.value);setAdminErr(false);}} onKeyDown={e=>e.key==="Enter"&&loginAdmin()} className={`bf-inp${adminErr?" bf-inp-err":""}`} style={{flex:1}}/>
              <button onClick={loginAdmin} className="bf-btn-ghost" style={{flexShrink:0}}>→</button>
            </div>
            {adminErr&&<p style={{margin:"6px 0 0",fontSize:12,color:"var(--bf-danger)",fontFamily:"var(--bf-font)"}}>Nesprávné heslo</p>}
          </div>
        </div>
      )}

      {/* ── path: enter code ── */}
      {loginPath==="code"&&!ws&&(
        <>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1.25rem"}}>
            <button onClick={()=>{setLoginPath(null);setWsErr("");}} style={{fontSize:22,background:"none",border:"none",cursor:"pointer",color:"var(--bf-text3)",padding:0,lineHeight:1}}>‹</button>
            <div className="bf-label" style={{margin:0}}>Kód skupiny</div>
          </div>
          {invInfo&&<div style={{background:"var(--bf-success-dim)",border:"1.5px solid var(--bf-success)",borderRadius:"var(--bf-r-md)",padding:"12px 16px",marginBottom:"1rem"}}><p style={{margin:"0 0 2px",fontWeight:700,fontSize:14,color:"var(--bf-success)",fontFamily:"var(--bf-font)"}}>Pozvánka do týmu {invInfo.teamName}</p><p style={{margin:0,fontSize:12,color:"var(--bf-success)",fontFamily:"var(--bf-font)"}}>Zadej kód skupiny — automaticky se připojíš.</p></div>}
          <div className="bf-card">
            <div style={{display:"flex",gap:8,marginBottom:6}}>
              <input placeholder="Kód skupiny (např. BEATFIT)" value={wsIn} onChange={e=>{setWsIn(e.target.value.toUpperCase());setWsErr("");}} onKeyDown={e=>e.key==="Enter"&&enterWs()} className={`bf-inp bf-inp-mono${wsErr?" bf-inp-err":""}`} style={{flex:1,fontSize:18,letterSpacing:"0.15em",textAlign:"center"}}/>
              <button onClick={enterWs} disabled={wsLoad||!wsIn.trim()} className="bf-btn" style={{width:"auto",padding:"11px 20px",fontSize:18,flexShrink:0}}>{wsLoad?"…":"→"}</button>
            </div>
            {wsErr&&<p style={{margin:0,fontSize:12,color:"var(--bf-danger)",fontFamily:"var(--bf-font)"}}>{wsErr}</p>}
          </div>
        </>
      )}

      {/* ── path: new workspace + user ── */}
      {loginPath==="new"&&(
        <>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1.25rem"}}>
            <button onClick={()=>setLoginPath(null)} style={{fontSize:22,background:"none",border:"none",cursor:"pointer",color:"var(--bf-text3)",padding:0,lineHeight:1}}>‹</button>
            <div className="bf-label" style={{margin:0}}>Nová skupina</div>
          </div>
          <ErrBanner/>
          <div className="bf-card">
            <div className="bf-label" style={{marginBottom:4}}>Název skupiny</div>
            <input placeholder="Např. Moje skupina, Práce 2025…" value={regWsName} onChange={e=>setRegWsName(e.target.value)} className="bf-inp" style={{marginBottom:16}}/>
            <div style={{height:"1.5px",background:"var(--bf-border)",margin:"0 0 16px"}}/>
            <div className="bf-label" style={{marginBottom:4}}>Tvoje jméno</div>
            <input placeholder="Celé jméno" value={regName} onChange={e=>setRegName(e.target.value)} className="bf-inp" style={{marginBottom:8}}/>
            <label className="bf-label" style={{marginBottom:4}}>Datum narození</label>
            <input type="date" value={regDob} onChange={e=>setRegDob(e.target.value)} className="bf-inp bf-inp-mono" style={{marginBottom:8}}/>
            <label className="bf-label" style={{marginBottom:4}}>PIN (min. 4 číslice)</label>
            <input type="password" inputMode="numeric" maxLength={6} value={regPin} onChange={e=>setRegPin(e.target.value.replace(/\D/g,""))} className="bf-inp-pin" style={{marginBottom:16}}/>
            <button onClick={createWsAndRegister} disabled={!regWsName.trim()||!regName.trim()||!regDob||regPin.length<4||saving} className="bf-btn">{saving?"Vytvářím…":"Vytvořit skupinu a začít →"}</button>
          </div>
        </>
      )}

      {/* ── known workspace: user list + register ── */}
      {loginPath==="code"&&ws&&(
        <>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"0 0 0.75rem",borderBottom:"1.5px solid var(--bf-border)",marginBottom:"1.25rem"}}>
            <button onClick={()=>{setWs(null);setPendU(null);setWsIn("");}} style={{fontSize:22,background:"none",border:"none",cursor:"pointer",color:"var(--bf-text3)",padding:0,lineHeight:1}}>‹</button>
            <div style={{flex:1}}>
              <p style={{margin:0,fontSize:17,fontWeight:800,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>{ws.name}</p>
              <p style={{margin:0,fontSize:11,fontFamily:"var(--bf-mono)",color:"var(--bf-text3)",letterSpacing:"0.1em"}}>{ws.code}</p>
            </div>
          </div>
          <ErrBanner/>
          {Object.keys(users).length>0&&(
            <div style={{marginBottom:"1.5rem"}}>
              <div className="bf-label" style={{marginBottom:10}}>Přihlásit se jako</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {Object.entries(users).sort(([,a],[,b])=>a.name.localeCompare(b.name)).map(([id,u])=>{
                  const streak=calcStreak(entries[id]||{}),sel=pendU===id;
                  return(
                    <div key={id}>
                      <button onClick={()=>selectU(id)} className={`bf-user-row${sel?" selected":""}`}>
                        <div className="bf-av" style={{width:36,height:36,fontSize:14}}>{u.name[0]}</div>
                        <span style={{fontWeight:700,color:"var(--bf-text)",fontFamily:"var(--bf-font)",fontSize:15,flex:1,textAlign:"left"}}>{u.name}</span>
                        {streak>1&&<span className="bf-badge bf-badge-accent" style={{fontSize:11}}>{streak}🔥</span>}
                        <span style={{color:"var(--bf-text3)",fontSize:16}}>{sel?"↑":"›"}</span>
                      </button>
                      {sel&&(
                        <div className="bf-pin-panel">
                          {setPinMode?(
                            <>
                              <p style={{margin:"0 0 10px",fontSize:13,color:"var(--bf-text2)",fontFamily:"var(--bf-font)",fontWeight:500}}>Nastav si PIN (min. 4 číslice)</p>
                              <input type="password" inputMode="numeric" maxLength={6} placeholder="Nový PIN" value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,""))} className="bf-inp-pin" style={{marginBottom:8}}/>
                              <input type="password" inputMode="numeric" maxLength={6} placeholder="Potvrď PIN" value={newPinC} onChange={e=>setNewPinC(e.target.value.replace(/\D/g,""))} className="bf-inp-pin" style={{marginBottom:10}}/>
                              {err&&<p style={{margin:"0 0 8px",fontSize:12,color:"var(--bf-danger)",fontFamily:"var(--bf-font)"}}>{err}</p>}
                              <button onClick={saveNewPin} disabled={newPin.length<4||newPin!==newPinC} className="bf-btn">Uložit PIN a přihlásit →</button>
                            </>
                          ):(
                            <>
                              <input type="password" inputMode="numeric" maxLength={6} placeholder="PIN" value={pinIn} onChange={e=>{setPinIn(e.target.value.replace(/\D/g,""));setPinErr(false);}} onKeyDown={e=>e.key==="Enter"&&verifyPin()} autoFocus className={`bf-inp-pin${pinErr?" err":""}`} style={{marginBottom:pinErr?6:10}}/>
                              {pinErr&&<p style={{margin:"0 0 8px",fontSize:12,color:"var(--bf-danger)",fontFamily:"var(--bf-font)",textAlign:"center"}}>Nesprávný PIN</p>}
                              <button onClick={verifyPin} disabled={pinIn.length<4} className="bf-btn">Přihlásit →</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="bf-card">
            <div className="bf-label" style={{marginBottom:12}}>Nový hráč</div>
            <input placeholder="Celé jméno" value={newName} onChange={e=>setNewName(e.target.value)} className="bf-inp" style={{marginBottom:8}}/>
            <label className="bf-label" style={{marginBottom:4}}>Datum narození</label>
            <input type="date" value={newDob} onChange={e=>setNewDob(e.target.value)} className="bf-inp bf-inp-mono" style={{marginBottom:8}}/>
            <label className="bf-label" style={{marginBottom:4}}>PIN (min. 4 číslice)</label>
            <input type="password" inputMode="numeric" maxLength={6} value={newRegPin} onChange={e=>setNewRegPin(e.target.value.replace(/\D/g,""))} className="bf-inp-pin" style={{marginBottom:12}}/>
            <button onClick={register} disabled={!newName.trim()||!newDob||newRegPin.length<4||saving} className="bf-btn">{saving?"Registruji…":"Zaregistrovat se →"}</button>
          </div>
        </>
      )}
    </div>
  );

  // ══ ADMIN ════════════════════════════════════════════════════════════════
  if(view==="admin")return(
    <div style={P}>
      <div className="bf-topbar">
        <div><div className="bf-label">Panel</div><p style={{margin:0,fontWeight:800,fontSize:17,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>Administrátor</p></div>
        <button onClick={()=>{setView("login");setAdminPwd("");}} className="bf-btn-out">Odhlásit</button>
      </div>
      <ErrBanner/>
      <div className="bf-nav" style={{marginBottom:"1.25rem"}}>
        {[["workspaces","Skupiny"],["pts","Koeficienty"],["players","Hráči"]].map(([t,l])=>(
          <button key={t} onClick={()=>{setAdminTab(t);setEditUser(null);setEditWs(null);setErr(null);}} className={`bf-nav-btn${adminTab===t?" active":""}`}>{l}</button>
        ))}
      </div>

      {adminTab==="workspaces"&&<>
        <div className="bf-label" style={{marginBottom:8}}>Skupiny</div>
        {editWs?(
          <div className="bf-card" style={{marginBottom:"1rem"}}>
            <div className="bf-label" style={{marginBottom:10}}>Upravit skupinu</div>
            <input placeholder="Název" value={editWsN} onChange={e=>setEditWsN(e.target.value)} className="bf-inp" style={{marginBottom:8}}/>
            <input placeholder="Kód" value={editWsC} onChange={e=>setEditWsC(e.target.value.toUpperCase())} className="bf-inp bf-inp-mono" style={{marginBottom:12,fontSize:18,letterSpacing:"0.12em"}}/>
            <div style={{display:"flex",gap:8}}><button onClick={updateAdminWs} className="bf-btn" style={{flex:1}}>Uložit</button><button onClick={()=>setEditWs(null)} className="bf-btn-ghost" style={{flex:1}}>Zrušit</button></div>
          </div>
        ):(
          <>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:"1.5rem"}}>
              {Object.entries(allWs).map(([id,w])=>{const uc=(allWsU[id]||[]).length;return(
                <div key={id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:"var(--bf-surface)",border:"1.5px solid var(--bf-border-md)",borderRadius:"var(--bf-r-md)"}}>
                  <div style={{flex:1}}><p style={{margin:0,fontSize:15,fontWeight:700,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>{w.name}</p><p style={{margin:0,fontSize:11,color:"var(--bf-text3)",fontFamily:"var(--bf-mono)",letterSpacing:"0.08em"}}>{w.code} · {uc} {uc===1?"hráč":"hráčů"}</p></div>
                  <button onClick={()=>{setEditWs(id);setEditWsN(w.name);setEditWsC(w.code);}} className="bf-btn-ghost" style={{fontSize:12,padding:"6px 12px"}}>Upravit</button>
                  <button onClick={()=>deleteAdminWs(id)} className="bf-btn-danger" style={{fontSize:12,padding:"6px 12px"}}>Smazat</button>
                </div>
              );})}
              {!Object.keys(allWs).length&&<p style={{fontSize:13,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>Žádné skupiny.</p>}
            </div>
            <div className="bf-card">
              <div className="bf-label" style={{marginBottom:12}}>Nová skupina</div>
              <input placeholder="Název skupiny" value={nWsName} onChange={e=>setNWsName(e.target.value)} className="bf-inp" style={{marginBottom:8}}/>
              <div style={{display:"flex",gap:8,marginBottom:12}}><input placeholder="Kód" value={nWsCode} onChange={e=>setNWsCode(e.target.value.toUpperCase())} className="bf-inp bf-inp-mono" style={{flex:1,fontSize:18,letterSpacing:"0.12em"}}/><button onClick={()=>setNWsCode(randCode())} className="bf-btn-ghost" style={{flexShrink:0}}>↻</button></div>
              <button onClick={createAdminWs} disabled={!nWsName.trim()||!nWsCode.trim()} className="bf-btn">Vytvořit skupinu →</button>
            </div>
          </>
        )}
      </>}

      {adminTab==="players"&&<>
        <div className="bf-label" style={{marginBottom:8}}>Vyberte skupinu</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:"1rem"}}>
          {Object.entries(allWs).map(([id,w])=>(<button key={id} onClick={()=>setASelWs(id)} className={`bf-chip${aSelWs===id?" active":""}`} style={{flex:"none",padding:"7px 16px"}}>{w.name}</button>))}
        </div>
        {aSelWs&&<>
          {editUser?(
            <div className="bf-card">
              <div className="bf-label" style={{marginBottom:10}}>Upravit hráče</div>
              <input value={editName} onChange={e=>setEditName(e.target.value)} className="bf-inp" style={{marginBottom:8}}/>
              <label className="bf-label" style={{marginBottom:4}}>Datum narození</label>
              <input type="date" value={editDob} onChange={e=>setEditDob(e.target.value)} className="bf-inp bf-inp-mono" style={{marginBottom:12}}/>
              <div style={{display:"flex",gap:8}}><button onClick={saveAdminEditUser} className="bf-btn" style={{flex:1}}>Uložit</button><button onClick={()=>setEditUser(null)} className="bf-btn-ghost" style={{flex:1}}>Zrušit</button></div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {(allWsU[aSelWs]||[]).sort((a,b)=>a.name.localeCompare(b.name)).map(u=>(
                <div key={u.id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"var(--bf-surface)",border:"1.5px solid var(--bf-border-md)",borderRadius:"var(--bf-r-md)"}}>
                  <div className="bf-av" style={{width:32,height:32,fontSize:13,flexShrink:0}}>{u.name[0]}</div>
                  <div style={{flex:1,minWidth:0}}><p style={{margin:0,fontSize:13,fontWeight:700,color:"var(--bf-text)",fontFamily:"var(--bf-font)"}}>{u.name}</p><p style={{margin:0,fontSize:10,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>{calcAge(u.dob)} let · {u.entryCount} záz. · PIN: {u.pin?<span style={{color:"var(--bf-success)"}}>✓</span>:<span style={{color:"var(--bf-danger)"}}>❗</span>}</p></div>
                  <button onClick={()=>resetPin(u.id,aSelWs)} className="bf-btn-ghost" style={{fontSize:11,padding:"5px 10px"}}>PIN</button>
                  <button onClick={()=>{setEditUser(u.id);setEditName(u.name);setEditDob(u.dob);}} className="bf-btn-ghost" style={{fontSize:11,padding:"5px 10px"}}>Upravit</button>
                  <button onClick={()=>deleteAdminUser(u.id,aSelWs)} className="bf-btn-danger" style={{fontSize:11,padding:"5px 10px"}}>Smazat</button>
                </div>
              ))}
              {!(allWsU[aSelWs]||[]).length&&<p style={{fontSize:13,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>Skupina zatím nemá žádné hráče.</p>}
            </div>
          )}
        </>}
      </>}

      {adminTab==="pts"&&<>
        <div className="bf-label" style={{marginBottom:10}}>Body za jednotku</div>
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:"1rem"}}>
          {AM.map(a=>{const current=ptsEdit[a.key]??pts[a.key]??DEFAULT_PTS[a.key],changed=ptsEdit[a.key]!==undefined&&ptsEdit[a.key]!==DEFAULT_PTS[a.key];return(
            <div key={a.key} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",background:"var(--bf-surface)",border:`1.5px solid ${changed?"var(--bf-warn)":"var(--bf-border-md)"}`,borderRadius:"var(--bf-r-md)"}}>
              <div className="bf-act-icon" style={{background:a.color+"20",color:a.color}}>{a.icon}</div>
              <div style={{flex:1}}><p style={{margin:0,fontSize:13,fontWeight:700,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>{a.label}</p><p style={{margin:0,fontSize:10,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>výchozí: {DEFAULT_PTS[a.key]} b/{a.unit}</p></div>
              <input type="number" min="0" step="0.001" value={current} onChange={e=>setPtsEdit(p=>({...p,[a.key]:parseFloat(e.target.value)||0}))} className="bf-act-num" style={{width:74}}/>
              <span style={{fontSize:11,color:"var(--bf-text3)",fontFamily:"var(--bf-font)",minWidth:28}}>b/{a.unit}</span>
            </div>
          );})}
        </div>
        <button onClick={()=>setPtsEdit({...DEFAULT_PTS})} className="bf-btn-ghost" style={{width:"100%",marginBottom:8,justifyContent:"center"}}>Obnovit výchozí hodnoty</button>
        <button onClick={savePts} disabled={ptsSv} className="bf-btn">{ptsSv?"Ukládám…":ptsFlash?"✓ Uloženo!":"Uložit koeficienty"}</button>
      </>}
    </div>
  );

  // ══ shared nav ════════════════════════════════════════════════════════════
  const TopBar=()=>(
    <div className="bf-topbar">
      <div>
        <div className="bf-label" style={{marginBottom:1}}>{ws?.name}</div>
        <p style={{margin:0,fontWeight:800,fontSize:16,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>{user?.name}</p>
      </div>
      <button onClick={logout} className="bf-btn-out">Odhlásit</button>
    </div>
  );
  const Nav=()=>(
    <div className="bf-nav">
      {[["log","Záznam"],["leaderboard","Žebříček"],["teams","Týmy"],["stats","Moje"]].map(([v,l])=>(
        <button key={v} onClick={()=>{setView(v);if(v==="teams")setTeamView("list");}} className={`bf-nav-btn${view===v?" active":""}`}>{l}</button>
      ))}
    </div>
  );

  // ══ LOG ══════════════════════════════════════════════════════════════════
  if(view==="log"){
    const age=calcAge(user.dob),score=calcScore(form,age,pts),streak=calcStreak(entries[uid]||{});
    const weekGoal=parseFloat(goals[uid])||0;
    const weekScore=Object.entries(entries[uid]||{}).filter(([d])=>d>=weekAgoStr()).reduce((s,[,e])=>s+calcScore(e,age,pts),0);
    const goalPct=weekGoal>0?Math.min(100,(weekScore/weekGoal)*100):0;
    return(
      <div style={P}>
        <TopBar/><Nav/><ErrBanner/>
        <input type="date" value={logDate} max={todayStr()} onChange={e=>{setLogDate(e.target.value);setForm(entries[uid]?.[e.target.value]||{});}} className="bf-inp bf-inp-mono" style={{marginBottom:"1rem",textAlign:"center",fontSize:14}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:"1rem"}}>
          {[{l:"Skóre",v:score.toFixed(1)},{l:"Věk. koef.",v:`×${ageMult(age).toFixed(2)}`},{l:"Streak",v:`${streak}${streak>0?" 🔥":""}`,c:streak>=7?"#f97316":undefined}].map(({l,v,c})=>(
            <div key={l} className="bf-stat"><div className="bf-label" style={{marginBottom:4}}>{l}</div><p style={{margin:0,fontSize:20,fontWeight:700,fontFamily:"var(--bf-mono)",color:c||"var(--bf-text)"}}>{v}</p></div>
          ))}
        </div>
        {weekGoal>0&&<div className="bf-surface" style={{marginBottom:"1rem"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div className="bf-label" style={{margin:0}}>Týdenní cíl</div><span style={{fontSize:12,fontFamily:"var(--bf-mono)",color:"var(--bf-text2)"}}>{weekScore.toFixed(0)} / {weekGoal} b</span></div><div className="bf-progress-bar"><div className="bf-progress-fill" style={{width:`${goalPct}%`,background:goalPct>=100?"var(--bf-success)":"var(--bf-accent)"}}/></div>{goalPct>=100&&<p style={{margin:"8px 0 0",fontSize:12,color:"var(--bf-success)",fontWeight:700,fontFamily:"var(--bf-font)"}}>Cíl splněn! 🎉</p>}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {ACTS.map(a=>(
            <div key={a.key} className="bf-act-row">
              <div className="bf-act-icon" style={{background:a.color+"20",color:a.color}}>{a.icon}</div>
              <div style={{flex:1,minWidth:0}}><p style={{margin:0,fontSize:13,fontWeight:700,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>{a.label}</p><p style={{margin:0,fontSize:10,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>{a.pts} b/{a.unit} · {a.sub}</p></div>
              <input type="number" min="0" step={a.unit==="km"?"0.1":"1"} value={form[a.key]||""} placeholder="—" onChange={e=>setForm(f=>({...f,[a.key]:e.target.value}))} className="bf-act-num"/>
              <span style={{fontSize:11,color:"var(--bf-text3)",fontFamily:"var(--bf-font)",minWidth:20}}>{a.unit}</span>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginTop:"1rem"}}>
          <button onClick={saveEntry} disabled={saving} className="bf-btn" style={{flex:1}}>{saving?"Ukládám…":flash?"✓ Uloženo!":"Uložit výkon"}</button>
          {entries[uid]?.[logDate]&&<button onClick={deleteEntry} disabled={saving} className="bf-btn-danger">Smazat</button>}
        </div>
        {Object.keys(pts).some(k=>pts[k]!==DEFAULT_PTS[k])&&<div style={{marginTop:"0.75rem",padding:"10px 14px",background:"var(--bf-warn-dim)",border:"1.5px solid var(--bf-warn)",borderRadius:"var(--bf-r-md)",fontSize:12,color:"var(--bf-warn)",fontFamily:"var(--bf-font)",fontWeight:500}}>Koeficienty byly upraveny administrátorem.</div>}
      </div>
    );
  }

  // ══ LEADERBOARD ══════════════════════════════════════════════════════════
  if(view==="leaderboard"){
    const actS=lbMode.startsWith("season:")?seasons[lbMode.slice(7)]:null;
    const lb=actS?buildLB(null,actS.start_date,actS.end_date):buildLB();
    const sorted=Object.entries(lb).sort((a,b)=>b[1].sc-a[1].sc);
    const myRank=sorted.findIndex(([id])=>id===uid)+1;
    const actW={};
    for(const a of AM){let best=null,bestV=-1;for(const[,d] of Object.entries(lb))if((d.acts[a.key]||0)>bestV){bestV=d.acts[a.key];best=d.name;}if(bestV>0)actW[a.key]={name:best,val:bestV};}
    return(
      <div style={P}>
        <TopBar/><Nav/><ErrBanner/>
        {lbMode==="global"?(
          <div className="bf-chips">{[["today","Dnes"],["week","Týden"],["all","Vše"]].map(([k,l])=>(<button key={k} onClick={()=>setPeriod(k)} className={`bf-chip${period===k?" active":""}`}>{l}</button>))}</div>
        ):(
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1rem",padding:"10px 14px",background:"var(--bf-surface2)",borderRadius:"var(--bf-r-md)",border:"1.5px solid var(--bf-border)"}}>
            <button onClick={()=>setLbMode("global")} style={{fontSize:22,background:"none",border:"none",cursor:"pointer",color:"var(--bf-text3)",padding:0,lineHeight:1}}>‹</button>
            <div style={{flex:1}}><p style={{margin:0,fontSize:14,fontWeight:700,color:"var(--bf-text)",fontFamily:"var(--bf-font)"}}>{actS?.name}</p><p style={{margin:0,fontSize:11,fontFamily:"var(--bf-mono)",color:"var(--bf-text3)"}}>{actS?.start_date} → {actS?.end_date}</p></div>
            {actS&&<span className={`bf-badge ${seasonLabel(actS).cls}`}>{seasonLabel(actS).text}</span>}
          </div>
        )}
        {lbMode==="global"&&globalSeasons.length>0&&<div style={{marginBottom:"1.25rem"}}>
          <div className="bf-label" style={{marginBottom:8}}>Výzvy</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {globalSeasons.sort(([,a],[,b])=>b.start_date.localeCompare(a.start_date)).map(([sid,s])=>{
              const lbl=seasonLabel(s),dl=daysLeft(s),st=seasonStatus(s);
              return(<button key={sid} onClick={()=>setLbMode(`season:${sid}`)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:"var(--bf-surface)",border:"1.5px solid var(--bf-border-md)",borderRadius:"var(--bf-r-md)",cursor:"pointer",width:"100%",textAlign:"left"}}>
                <div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><span className={`bf-badge ${lbl.cls}`}>{lbl.text}</span>{st==="active"&&dl>=0&&<span style={{fontSize:11,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>zbývá {dl} dní</span>}</div><p style={{margin:0,fontSize:14,fontWeight:700,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>{s.name}</p><p style={{margin:0,fontSize:11,fontFamily:"var(--bf-mono)",color:"var(--bf-text3)"}}>{s.start_date} → {s.end_date}</p></div>
                <span style={{fontSize:18,color:"var(--bf-text3)"}}>›</span>
              </button>);
            })}
          </div>
        </div>}
        {myRank>0&&<div className="bf-surface-accent" style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}><span style={{fontSize:12,color:"var(--bf-accent-text)",fontFamily:"var(--bf-font)",fontWeight:600}}>Tvoje pořadí</span><span style={{fontSize:26,fontWeight:800,fontFamily:"var(--bf-mono)",color:"var(--bf-accent)"}}>#{myRank}</span><span style={{fontSize:12,color:"var(--bf-accent-text)",fontFamily:"var(--bf-font)"}}>z {sorted.length} hráčů</span></div>}
        <div className="bf-label" style={{marginBottom:8}}>Celkové pořadí</div>
        <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:"1.5rem"}}>
          {sorted.length===0&&<p style={{fontSize:13,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>Zatím žádná data.</p>}
          {sorted.map(([id,d],i)=>{const streak=calcStreak(entries[id]||{});return(
            <div key={id} className={`bf-lb-row${id===uid?" me":""}`}>
              <span style={{fontSize:17,minWidth:30,color:RANK_CLR[i]||"var(--bf-text3)",fontWeight:800,fontFamily:"var(--bf-mono)"}}>{MEDALS[i]||`${i+1}.`}</span>
              <div className="bf-av" style={{width:28,height:28,fontSize:11}}>{d.name[0]}</div>
              <span style={{flex:1,fontWeight:700,fontSize:14,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>{d.name}</span>
              {streak>=3&&<span className="bf-badge bf-badge-accent" style={{fontSize:10}}>{streak}🔥</span>}
              <span style={{fontSize:16,fontWeight:700,fontFamily:"var(--bf-mono)",color:"var(--bf-text)"}}>{d.sc.toFixed(1)}</span>
              <span style={{fontSize:10,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>b</span>
            </div>
          );})}
        </div>
        <div className="bf-label" style={{marginBottom:8}}>Vítězové disciplín</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {AM.filter(a=>actW[a.key]).sort((a,b)=>actW[b.key].val-actW[a.key].val).map(a=>(
            <div key={a.key} className="bf-card" style={{padding:"10px 14px"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><div className="bf-act-icon" style={{width:26,height:26,borderRadius:6,fontSize:11,background:a.color+"20",color:a.color}}>{a.icon}</div><span style={{fontSize:11,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>{a.label}</span></div>
              <p style={{margin:"0 0 2px",fontSize:13,fontWeight:700,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>{actW[a.key].name}</p>
              <p style={{margin:0,fontSize:12,color:"var(--bf-text2)",fontFamily:"var(--bf-mono)",fontWeight:500}}>{a.unit==="km"?actW[a.key].val.toFixed(1):a.unit==="kr"?Math.round(actW[a.key].val).toLocaleString():Math.round(actW[a.key].val)} {a.unit}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ══ TEAMS ════════════════════════════════════════════════════════════════
  if(view==="teams"){
    if(teamView==="list")return(
      <div style={P}>
        <TopBar/><Nav/><ErrBanner/>
        <div className="bf-section-header" style={{marginBottom:"1rem"}}><div className="bf-label" style={{margin:0}}>Moje týmy</div><button onClick={()=>setTeamView("create")} className="bf-btn-sm">+ Nový tým</button></div>
        {!myTeamIds.length&&<p style={{fontSize:13,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>Zatím nejsi v žádném týmu.</p>}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {myTeamIds.map(tid=>{const t=teams[tid];if(!t)return null;const mc=(members[tid]||[]).length,tsc=Object.values(seasons).filter(s=>s.team_id===tid).length;return(
            <button key={tid} onClick={()=>{setActiveTeam(tid);setTeamView("detail");setTTab("score");setTSeason("all");setShowTSF(false);}} className="bf-team-card">
              <div className="bf-team-icon">T</div>
              <div style={{flex:1}}><p style={{margin:0,fontSize:15,fontWeight:700,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>{t.name}</p><p style={{margin:0,fontSize:12,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>{mc} {mc===1?"člen":"členů"}{tsc>0?` · ${tsc} výzev`:""}{t.created_by===uid?" · tvůj":""}</p></div>
              <span style={{fontSize:18,color:"var(--bf-text3)"}}>›</span>
            </button>
          );})}
        </div>
      </div>
    );
    if(teamView==="create")return(
      <div style={P}>
        <TopBar/><Nav/><ErrBanner/>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1.5rem"}}><button onClick={()=>setTeamView("list")} style={{fontSize:22,background:"none",border:"none",cursor:"pointer",color:"var(--bf-text3)",padding:0,lineHeight:1}}>‹</button><div className="bf-label" style={{margin:0}}>Nový tým</div></div>
        <div className="bf-card"><input placeholder="Název týmu" value={newTName} onChange={e=>setNewTName(e.target.value)} className="bf-inp" style={{marginBottom:12}} onKeyDown={e=>e.key==="Enter"&&createTeam()}/><button onClick={createTeam} disabled={!newTName.trim()||saving} className="bf-btn">{saving?"Vytvářím…":"Vytvořit tým →"}</button></div>
      </div>
    );
    if(teamView==="detail"&&activeTeam){
      const team=teams[activeTeam];if(!team){setTeamView("list");return null;}
      const tSList=Object.entries(seasons).filter(([,s])=>s.team_id===activeTeam);
      const actS=tSeason.startsWith("season:")?seasons[tSeason.slice(7)]:null;
      const tMids=members[activeTeam]||[];
      const lb=(()=>{const t2=todayStr(),w2=weekAgoStr(),res={};
        for(const id of tMids){const u=users[id];if(!u)continue;const days=entries[id]||{};let sc2=0;const acts={};for(const a of AM)acts[a.key]=0;
          for(const[date,e] of Object.entries(days)){if(actS){if(date<actS.start_date||date>actS.end_date)continue;}else{if(tPeriod==="today"&&date!==t2)continue;if(tPeriod==="week"&&date<w2)continue;}
          sc2+=calcScore(e,calcAge(u.dob),pts);for(const a of AM)acts[a.key]+=parseFloat(e[a.key])||0;}res[id]={sc:sc2,name:u.name,age:calcAge(u.dob),acts};}return res;})();
      const sorted=Object.entries(lb).sort((a,b)=>b[1].sc-a[1].sc),myRank=sorted.findIndex(([id])=>id===uid)+1;
      const invUrl=`${window.location.origin}${window.location.pathname}?invite=${team.invite_code}&ws=${ws.code}`;
      return(
        <div style={P}>
          <TopBar/><Nav/><ErrBanner/>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1rem"}}><button onClick={()=>setTeamView("list")} style={{fontSize:22,background:"none",border:"none",cursor:"pointer",color:"var(--bf-text3)",padding:0,lineHeight:1}}>‹</button><div style={{flex:1}}><p style={{margin:0,fontSize:16,fontWeight:800,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>{team.name}</p><p style={{margin:0,fontSize:12,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>{tMids.length} členů</p></div><button onClick={()=>leaveTeam(activeTeam)} className="bf-btn-danger" style={{padding:"6px 12px",fontSize:12}}>Opustit</button></div>
          <div className="bf-card" style={{marginBottom:"1rem"}}><div className="bf-label" style={{marginBottom:8}}>Pozvánka</div><div style={{display:"flex",gap:8,alignItems:"center"}}><input readOnly value={invUrl} className="bf-inp bf-inp-mono" style={{flex:1,fontSize:10,cursor:"text"}}/><button onClick={()=>navigator.clipboard.writeText(invUrl)} className="bf-btn-sm">Kopírovat</button></div></div>
          <div style={{marginBottom:"1rem"}}>
            <div className="bf-section-header" style={{marginBottom:8}}><div className="bf-label" style={{margin:0}}>Výzvy týmu</div>{!showTSF&&<button onClick={()=>{setShowTSF(true);setSForm({name:"",start_date:"",end_date:""});}} className="bf-btn-sm">+ Výzva</button>}</div>
            {showTSF&&<SFormCard onSubmit={()=>createSeason(activeTeam)} onCancel={()=>setShowTSF(false)}/>}
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              <button onClick={()=>setTSeason("all")} className={`bf-chip${tSeason==="all"?" active":""}`} style={{flex:"none",padding:"6px 14px",fontSize:11}}>Bez výzvy</button>
              {tSList.sort(([,a],[,b])=>b.start_date.localeCompare(a.start_date)).map(([sid,s])=>{const lbl=seasonLabel(s);return<button key={sid} onClick={()=>setTSeason(`season:${sid}`)} className={`bf-chip${tSeason===`season:${sid}`?" active":""}`} style={{flex:"none",padding:"6px 14px",fontSize:11,display:"flex",alignItems:"center",gap:5}}><span style={{width:6,height:6,borderRadius:"50%",background:"currentColor",flexShrink:0,display:"inline-block",opacity:0.7}}/>{s.name}</button>;})}
            </div>
            {actS&&tMids.includes(uid)&&actS.created_by===uid&&<button onClick={()=>{deleteSeason(tSeason.slice(7));setTSeason("all");}} className="bf-btn-danger" style={{marginTop:8,padding:"5px 12px",fontSize:11}}>Smazat výzvu</button>}
          </div>
          {tSeason==="all"&&<div className="bf-chips">{[["today","Dnes"],["week","Týden"],["all","Vše"]].map(([k,l])=>(<button key={k} onClick={()=>setTPeriod(k)} className={`bf-chip${tPeriod===k?" active":""}`}>{l}</button>))}</div>}
          {actS&&<div className="bf-surface" style={{marginBottom:"1rem",display:"flex",alignItems:"center",gap:10}}><span className={`bf-badge ${seasonLabel(actS).cls}`}>{seasonLabel(actS).text}</span><div style={{flex:1}}><p style={{margin:0,fontSize:13,fontWeight:700,color:"var(--bf-text)",fontFamily:"var(--bf-font)"}}>{actS.name}</p><p style={{margin:0,fontSize:11,fontFamily:"var(--bf-mono)",color:"var(--bf-text3)"}}>{actS.start_date} → {actS.end_date}</p></div>{seasonStatus(actS)==="active"&&<span style={{fontSize:11,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>zbývá {daysLeft(actS)} dní</span>}</div>}
          {myRank>0&&<div className="bf-surface-accent" style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}><span style={{fontSize:12,color:"var(--bf-accent-text)",fontFamily:"var(--bf-font)",fontWeight:600}}>Tvoje pořadí</span><span style={{fontSize:26,fontWeight:800,fontFamily:"var(--bf-mono)",color:"var(--bf-accent)"}}>#{myRank}</span><span style={{fontSize:12,color:"var(--bf-accent-text)",fontFamily:"var(--bf-font)"}}>z {sorted.length}</span></div>}
          <div className="bf-nav" style={{marginBottom:"1rem"}}>{[["score","Body"],["activity","Aktivity"]].map(([t,l])=>(<button key={t} onClick={()=>setTTab(t)} className={`bf-nav-btn${tTab===t?" active":""}`}>{l}</button>))}</div>
          {tTab==="score"&&<><div className="bf-label" style={{marginBottom:8}}>Žebříček</div><div style={{display:"flex",flexDirection:"column",gap:5}}>
            {sorted.length===0&&<p style={{fontSize:13,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>Zatím žádná data.</p>}
            {sorted.map(([id,d],i)=>(<div key={id} className={`bf-lb-row${id===uid?" me":""}`}><span style={{fontSize:17,minWidth:30,color:RANK_CLR[i]||"var(--bf-text3)",fontWeight:800,fontFamily:"var(--bf-mono)"}}>{MEDALS[i]||`${i+1}.`}</span><div className="bf-av" style={{width:28,height:28,fontSize:11}}>{d.name[0]}</div><span style={{flex:1,fontWeight:700,fontSize:14,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>{d.name}</span><span style={{fontSize:16,fontWeight:700,fontFamily:"var(--bf-mono)",color:"var(--bf-text)"}}>{d.sc.toFixed(1)}</span><span style={{fontSize:10,color:"var(--bf-text3)"}}>b</span></div>))}
          </div></>}
          {tTab==="activity"&&<><div className="bf-label" style={{marginBottom:8}}>Porovnání aktivit</div>
            {AM.map(a=>{const vals=sorted.map(([id,d])=>({name:d.name,val:d.acts[a.key]||0,isMe:id===uid})).sort((x,y)=>y.val-x.val);const mx=Math.max(...vals.map(v=>v.val),1);if(vals.every(v=>v.val===0))return null;return(
              <div key={a.key} className="bf-card" style={{marginBottom:"0.75rem"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><div className="bf-act-icon" style={{width:30,height:30,borderRadius:7,fontSize:12,background:a.color+"20",color:a.color}}>{a.icon}</div><p style={{margin:0,fontSize:13,fontWeight:700,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>{a.label}</p></div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {vals.filter(v=>v.val>0).map((v,i)=>(<div key={v.name}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,fontWeight:v.isMe?700:500,color:v.isMe?"var(--bf-text)":"var(--bf-text2)",fontFamily:"var(--bf-font)"}}>{i===0?"🥇 ":""}{v.name}</span><span style={{fontSize:12,fontFamily:"var(--bf-mono)",color:"var(--bf-text)",fontWeight:600}}>{a.unit==="km"?v.val.toFixed(1):a.unit==="kr"?Math.round(v.val).toLocaleString():Math.round(v.val)} {a.unit}</span></div><div className="bf-progress-bar"><div className="bf-progress-fill" style={{width:`${(v.val/mx)*100}%`,background:v.isMe?a.color:"var(--bf-surface3)",opacity:v.isMe?1:0.6}}/></div></div>))}
                </div>
              </div>
            );})}
          </>}
        </div>
      );
    }
  }

  // ══ STATS ════════════════════════════════════════════════════════════════
  if(view==="stats"){
    const myDays=entries[uid]||{},dates=Object.keys(myDays).sort().reverse();
    const age=calcAge(user.dob),total=dates.reduce((s,d)=>s+calcScore(myDays[d],age,pts),0);
    const streak=calcStreak(myDays),weekGoal=parseFloat(goals[uid])||0;
    const weekScore=Object.entries(myDays).filter(([d])=>d>=weekAgoStr()).reduce((s,[,e])=>s+calcScore(e,age,pts),0);
    const goalPct=weekGoal>0?Math.min(100,(weekScore/weekGoal)*100):0;
    const totals={};for(const a of AM)totals[a.key]=0;
    for(const e of Object.values(myDays))for(const a of AM)totals[a.key]+=(parseFloat(e[a.key])||0);
    const cDays=Array.from({length:14},(_,i)=>dMinus(13-i));
    const cScores=cDays.map(d=>calcScore(myDays[d]||{},age,pts));
    const maxSc=Math.max(...cScores,1);
    return(
      <div style={P}>
        <TopBar/><Nav/><ErrBanner/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:"1rem"}}>
          {[{l:"Celkem bodů",v:total.toFixed(0)},{l:"Aktivní dny",v:dates.length},{l:"Streak",v:`${streak}${streak>0?" 🔥":""}`,c:streak>=7?"#f97316":undefined}].map(({l,v,c})=>(
            <div key={l} className="bf-stat"><div className="bf-label" style={{marginBottom:4}}>{l}</div><p style={{margin:0,fontSize:20,fontWeight:700,fontFamily:"var(--bf-mono)",color:c||"var(--bf-text)"}}>{v}</p></div>
          ))}
        </div>

        {/* group info */}
        <div className="bf-card" style={{marginBottom:"1rem"}}>
          <div className="bf-section-header" style={{marginBottom:8}}>
            <div className="bf-label" style={{margin:0}}>Moje skupina</div>
            {isWsCreator&&!renameWs&&<button onClick={()=>{setRenameWs(true);setRenameVal(ws.name);}} className="bf-btn-out" style={{fontSize:11}}>Přejmenovat</button>}
          </div>
          {renameWs?(
            <div style={{display:"flex",gap:8}}>
              <input value={renameVal} onChange={e=>setRenameVal(e.target.value)} className="bf-inp" style={{flex:1}} onKeyDown={e=>e.key==="Enter"&&doRenameWs()} autoFocus/>
              <button onClick={doRenameWs} className="bf-btn-sm" style={{flexShrink:0}}>Uložit</button>
              <button onClick={()=>setRenameWs(false)} className="bf-btn-ghost" style={{flexShrink:0}}>Zrušit</button>
            </div>
          ):(
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{flex:1}}>
                <p style={{margin:0,fontSize:15,fontWeight:700,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>{ws.name}</p>
                <p style={{margin:0,fontSize:11,fontFamily:"var(--bf-mono)",color:"var(--bf-text3)",letterSpacing:"0.1em"}}>Kód: {ws.code}</p>
              </div>
              <button onClick={()=>navigator.clipboard.writeText(ws.code)} className="bf-btn-out" style={{fontSize:11}}>Kopírovat kód</button>
            </div>
          )}
          <div style={{height:"1.5px",background:"var(--bf-border)",margin:"12px 0"}}/>
          {joinMode?(
            <>
              <div className="bf-label" style={{marginBottom:6}}>Přejít do jiné skupiny</div>
              <div style={{display:"flex",gap:8,marginBottom:joinErr?6:0}}>
                <input placeholder="Kód skupiny" value={joinCode} onChange={e=>{setJoinCode(e.target.value.toUpperCase());setJoinErr("");}} className="bf-inp bf-inp-mono" style={{flex:1,letterSpacing:"0.1em"}} onKeyDown={e=>e.key==="Enter"&&joinAnotherGroup()}/>
                <button onClick={joinAnotherGroup} className="bf-btn-sm" style={{flexShrink:0}}>→</button>
                <button onClick={()=>{setJoinMode(false);setJoinCode("");setJoinErr("");}} className="bf-btn-ghost" style={{flexShrink:0}}>Zrušit</button>
              </div>
              {joinErr&&<p style={{margin:"4px 0 0",fontSize:12,color:"var(--bf-danger)",fontFamily:"var(--bf-font)"}}>{joinErr}</p>}
              <p style={{margin:"8px 0 0",fontSize:11,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>Po přechodu budeš odhlášen a přesměrován na přihlášení v nové skupině.</p>
            </>
          ):(
            <button onClick={()=>setJoinMode(true)} className="bf-btn-ghost" style={{width:"100%",justifyContent:"center",fontSize:13}}>Přejít do jiné skupiny →</button>
          )}
        </div>

        <div className="bf-card" style={{marginBottom:"1rem"}}>
          <div className="bf-label" style={{marginBottom:10}}>Týdenní cíl (body)</div>
          <div style={{display:"flex",gap:8,marginBottom:weekGoal>0?12:0}}>
            <input type="number" min="0" value={goalIn} onChange={e=>setGoalIn(e.target.value)} placeholder="Nastav cíl na tento týden" className="bf-inp bf-inp-mono" style={{flex:1}}/>
            <button onClick={saveGoal} className="bf-btn-sm" style={{flexShrink:0}}>{goalFlash?"✓":"Uložit"}</button>
          </div>
          {weekGoal>0&&<><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:12,color:"var(--bf-text2)",fontFamily:"var(--bf-font)"}}>Tento týden</span><span style={{fontSize:12,fontFamily:"var(--bf-mono)",color:"var(--bf-text2)",fontWeight:600}}>{weekScore.toFixed(0)} / {weekGoal} b</span></div><div className="bf-progress-bar"><div className="bf-progress-fill" style={{width:`${goalPct}%`,background:goalPct>=100?"var(--bf-success)":"var(--bf-accent)"}}/></div>{goalPct>=100&&<p style={{margin:"8px 0 0",fontSize:12,color:"var(--bf-success)",fontWeight:700,fontFamily:"var(--bf-font)"}}>Cíl splněn! 🎉</p>}</>}
        </div>
        <div className="bf-label" style={{marginBottom:8}}>Aktivita — posledních 14 dní</div>
        <div className="bf-card" style={{marginBottom:"1rem",padding:"1rem"}}>
          <div style={{display:"flex",alignItems:"flex-end",gap:3,height:68}}>
            {cDays.map((d,i)=>{const s2=cScores[i],h=s2>0?Math.max(5,Math.round((s2/maxSc)*58)):3;return(<div key={d} style={{flex:1,display:"flex",alignItems:"flex-end",height:68}}><div title={`${d}: ${s2.toFixed(1)} b`} className="bf-bar" style={{width:"100%",height:h,background:d===todayStr()?"var(--bf-accent)":s2>0?"#c084fc":"var(--bf-surface3)"}}/></div>);})}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}><span style={{fontSize:9,color:"var(--bf-text3)",fontFamily:"var(--bf-mono)"}}>{cDays[0].slice(5)}</span><span style={{fontSize:9,color:"var(--bf-text3)",fontFamily:"var(--bf-mono)"}}>dnes</span></div>
        </div>
        <div className="bf-label" style={{marginBottom:8}}>Celkové součty</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:"1.25rem"}}>
          {AM.filter(a=>totals[a.key]>0).map(a=>(
            <div key={a.key} className="bf-card" style={{padding:"10px 14px"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}><div className="bf-act-icon" style={{width:24,height:24,borderRadius:6,fontSize:10,background:a.color+"20",color:a.color}}>{a.icon}</div><span style={{fontSize:11,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>{a.label}</span></div>
              <p style={{margin:0,fontSize:17,fontWeight:700,fontFamily:"var(--bf-mono)",color:"var(--bf-text)"}}>{a.unit==="km"?totals[a.key].toFixed(1):a.unit==="kr"?Math.round(totals[a.key]).toLocaleString():Math.round(totals[a.key])}<span style={{fontSize:11,fontWeight:500,color:"var(--bf-text3)",marginLeft:3}}>{a.unit}</span></p>
            </div>
          ))}
        </div>
        <div className="bf-section-header" style={{marginBottom:8}}>
          <div className="bf-label" style={{margin:0}}>Historie</div>
          <button onClick={()=>exportCSV(user.name,myDays,pts,age)} className="bf-btn-out" style={{fontSize:11}}>Export CSV ↓</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {!dates.length&&<p style={{fontSize:13,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>Žádné záznamy.</p>}
          {dates.map(d=>(
            <div key={d} className="bf-card" style={{padding:"10px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><span style={{fontSize:12,fontWeight:600,fontFamily:"var(--bf-mono)",color:"var(--bf-text2)"}}>{d}</span><span style={{fontSize:14,fontWeight:700,fontFamily:"var(--bf-mono)",color:"var(--bf-text)"}}>{calcScore(myDays[d],age,pts).toFixed(1)} b</span></div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {AM.filter(a=>parseFloat(myDays[d][a.key])>0).map(a=>(
                  <span key={a.key} style={{fontSize:10,background:a.color+"20",color:a.color,padding:"3px 9px",borderRadius:20,fontWeight:700,fontFamily:"var(--bf-font)"}}>
                    {a.label} {a.unit==="km"?parseFloat(myDays[d][a.key]).toFixed(1):a.unit==="kr"?Math.round(parseFloat(myDays[d][a.key])).toLocaleString():Math.round(parseFloat(myDays[d][a.key]))} {a.unit}
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