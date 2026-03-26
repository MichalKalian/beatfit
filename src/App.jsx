import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import "./beatfit.css";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY);

const DEFAULT_PTS = { shyby:8,anglicky:5,kliky:2,dreepy:1.5,sedLehy:1,behKm:15,koloKm:4,plankSec:0.05,kroky:0.003,silovy:1.5,plavani:12,veslovani:10,kardio:0.8 };
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
  {key:"silovy",  label:"Silový tr.",sub:"strength", unit:"min",icon:"◉",color:"#f43f5e"},
  {key:"plavani", label:"Plavání",   sub:"swim",     unit:"km", icon:"~",color:"#0ea5e9"},
  {key:"veslovani",label:"Veslování",sub:"rowing",   unit:"km", icon:"↑",color:"#8b5cf6"},
  {key:"kardio",  label:"Kardio",    sub:"cardio",   unit:"min",icon:"♥",color:"#10b981"},
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
function fmtVal(a,v){if(a.unit==="km")return parseFloat(v).toFixed(1);if(a.unit==="kr")return Math.round(v).toLocaleString();return Math.round(v);}
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
const SK="bf_session"; // { userId, activeWsId, knownWsIds:[] }

export default function App(){
  // ── auth ──────────────────────────────────────────────────────────────────
  const[step,setStep]           = useState("start"); // start | login | register | ws-select | app
  const[uid,setUid]             = useState(null);
  const[userMeta,setUserMeta]   = useState(null); // { name, dob, pin }
  // login/register form
  const[authName,setAuthName]   = useState("");
  const[authDob,setAuthDob]     = useState("");
  const[authPin,setAuthPin]     = useState("");
  const[authPin2,setAuthPin2]   = useState("");
  const[authErr,setAuthErr]     = useState("");
  const[authLoad,setAuthLoad]   = useState(false);
  // workspace selection
  const[knownWs,setKnownWs]     = useState([]); // [{id,name,code,created_by}]
  const[activeWsId,setActiveWsId] = useState(null);
  const[wsDropOpen,setWsDropOpen] = useState(false);
  const[addWsMode,setAddWsMode] = useState(null); // null | "code" | "new"
  const[addWsCode,setAddWsCode] = useState("");
  const[addWsErr,setAddWsErr]   = useState("");
  const[addWsName,setAddWsName] = useState("");
  const[addWsLoad,setAddWsLoad] = useState(false);
  // invite from URL
  const[pendInv,setPendInv]     = useState(null);
  const[invInfo,setInvInfo]     = useState(null);
  // ── workspace data ────────────────────────────────────────────────────────
  const[view,setView]           = useState("log");
  const[wsUsers,setWsUsers]     = useState({});  // userId -> {name,dob}
  const[entries,setEntries]     = useState({});  // userId -> {date -> data}
  const[pts,setPts]             = useState(DEFAULT_PTS);
  const[goals,setGoals]         = useState({});
  const[teams,setTeams]         = useState({});
  const[members,setMembers]     = useState({});
  const[seasons,setSeasons]     = useState({});
  // ── ui state ──────────────────────────────────────────────────────────────
  const[loading,setLoading]     = useState(true);
  const[saving,setSaving]       = useState(false);
  const[flash,setFlash]         = useState(false);
  const[period,setPeriod]       = useState("week");
  const[logDate,setLogDate]     = useState(todayStr());
  const[err,setErr]             = useState(null);
  const[form,setForm]           = useState({});
  const[goalIn,setGoalIn]       = useState("");
  const[goalFlash,setGoalFlash] = useState(false);
  const[renameWs,setRenameWs]   = useState(false);
  const[renameVal,setRenameVal] = useState("");
  const[wsActsEdit,setWsActsEdit]     = useState(null);
  const[wsActsSaving,setWsActsSaving] = useState(false);
  const[teamActsEdit,setTeamActsEdit] = useState(null);
  // ── teams / seasons ───────────────────────────────────────────────────────
  const[teamView,setTeamView]   = useState("list");
  const[activeTeam,setActiveTeam] = useState(null);
  const[newTName,setNewTName]   = useState("");
  const[tPeriod,setTPeriod]     = useState("week");
  const[tTab,setTTab]           = useState("score");
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
    if(inv){setPendInv(inv);}
    if(wsCode){setAddWsCode(wsCode);}
    window.history.replaceState({},"",window.location.pathname);

    const sess=JSON.parse(localStorage.getItem(SK)||"null");
    if(sess?.userId&&sess?.activeWsId){
      restoreSession(sess).then(ok=>{
        if(!ok){localStorage.removeItem(SK);setLoading(false);}
      });
    } else setLoading(false);
  },[]);

  async function restoreSession(sess){
    try{
      const{data:u,error:ue}=await supabase.from("users").select("*").eq("id",sess.userId).single();
      if(ue||!u)return false;
      setUid(sess.userId);setUserMeta({name:u.name,dob:u.dob,pin:u.pin});
      // load workspaces user belongs to
      const wsList=await loadUserWorkspaces(sess.userId);
      setKnownWs(wsList);
      const activeWs=wsList.find(w=>w.id===sess.activeWsId)||wsList[0];
      if(!activeWs)return false;
      setActiveWsId(activeWs.id);
      await loadWsData(activeWs.id,sess.userId);
      // handle pending invite
      if(pendInv){const{data:td}=await supabase.from("teams").select("*").eq("workspace_id",activeWs.id);const tf=td?.find(t=>t.invite_code===pendInv);if(tf)setInvInfo({teamId:tf.id,teamName:tf.name});}
      setStep("app");return true;
    }catch{return false;}
  }

  async function loadUserWorkspaces(userId){
    const{data,error}=await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id",userId);
    if(error||!data?.length)return[];
    const ids=data.map(r=>r.workspace_id);
    const{data:ws,error:we}=await supabase
      .from("workspaces")
      .select("*")
      .in("id",ids);
    if(we)return[];
    return ws||[];
  }

  async function loadWsData(wsId,userId){
    setLoading(true);
    try{
      // members of this workspace
      const{data:mData}=await supabase.from("workspace_members").select("user_id").eq("workspace_id",wsId);
      const memberIds=(mData||[]).map(r=>r.user_id);
      if(!memberIds.length){setWsUsers({});setEntries({});setLoading(false);return;}
      const[uR,eR,gR,tR,sR,stR,tmR]=await Promise.all([
        supabase.from("users").select("*").in("id",memberIds),
        supabase.from("entries").select("*").in("user_id",memberIds),
        supabase.from("goals").select("*").in("user_id",memberIds),
        supabase.from("teams").select("*").eq("workspace_id",wsId),
        supabase.from("seasons").select("*").eq("workspace_id",wsId),
        supabase.from("settings").select("*").eq("key","pts"),
        supabase.from("team_members").select("*"),
      ]);
      const uMap={};for(const u of uR.data||[])uMap[u.id]={name:u.name,dob:u.dob};setWsUsers(uMap);
      const eMap={};for(const e of eR.data||[]){if(!eMap[e.user_id])eMap[e.user_id]={};eMap[e.user_id][e.date]=e.data;}setEntries(eMap);
      const gMap={};for(const g of gR.data||[])gMap[g.user_id]=g.weekly_goal;setGoals(gMap);
      const tMap={};for(const t of tR.data||[])tMap[t.id]={name:t.name,created_by:t.created_by,invite_code:t.invite_code,selected_acts:t.selected_acts||null};
      const tIds=Object.keys(tMap),mMap={};for(const m of tmR.data||[]){if(!tIds.includes(m.team_id))continue;if(!mMap[m.team_id])mMap[m.team_id]=[];mMap[m.team_id].push(m.user_id);}setMembers(mMap);
      const sMap={};for(const s of sR.data||[])sMap[s.id]={name:s.name,start_date:s.start_date,end_date:s.end_date,created_by:s.created_by,team_id:s.team_id,scope:s.scope};setSeasons(sMap);
      if(stR.data?.length>0)setPts({...DEFAULT_PTS,...stR.data[0].value});
      setForm(eMap[userId]?.[logDate]||{});
      setGoalIn(gMap[userId]||"");
    }catch(e){setErr("Nepodařilo se načíst data skupiny.");}
    setLoading(false);
  }

  // ── switch workspace ──────────────────────────────────────────────────────
  async function switchWs(wsId){
    setWsDropOpen(false);setLoading(true);
    setActiveWsId(wsId);
    setView("log");setLbMode("global");setTeamView("list");
    await loadWsData(wsId,uid);
    const sess=JSON.parse(localStorage.getItem(SK)||"{}");
    localStorage.setItem(SK,JSON.stringify({...sess,activeWsId:wsId}));
  }

  // ── add workspace ─────────────────────────────────────────────────────────
  async function addWsByCode(){
    if(!addWsCode.trim())return;
    setAddWsLoad(true);setAddWsErr("");
    const{data,error}=await supabase.from("workspaces").select("*")
      .eq("code",addWsCode.trim().toUpperCase()).single();
    if(error||!data){setAddWsErr("Kód skupiny nebyl nalezen.");setAddWsLoad(false);return;}
    if(knownWs.find(w=>w.id===data.id)){
      // already member — just switch
      setAddWsCode("");setAddWsMode(null);setAddWsLoad(false);
      setActiveWsId(data.id);
      await loadWsData(data.id,uid);
      localStorage.setItem(SK,JSON.stringify({userId:uid,activeWsId:data.id}));
      setStep("app");return;
    }
    await supabase.from("workspace_members").insert({workspace_id:data.id,user_id:uid});
    setKnownWs(w=>[...w,data]);
    setAddWsCode("");setAddWsMode(null);setAddWsLoad(false);
    setActiveWsId(data.id);
    await loadWsData(data.id,uid);
    localStorage.setItem(SK,JSON.stringify({userId:uid,activeWsId:data.id}));
    setStep("app");
  }

  async function addWsNew(){
    if(!addWsName.trim())return;
    setAddWsLoad(true);setAddWsErr("");
    const wsId="ws"+Date.now(),code=randCode();
    const{error:we}=await supabase.from("workspaces").insert({id:wsId,name:addWsName.trim(),code,created_by:uid});
    if(we){setAddWsErr("Vytvoření skupiny selhalo.");setAddWsLoad(false);return;}
    const{error:me}=await supabase.from("workspace_members").insert({workspace_id:wsId,user_id:uid});
    if(me){setAddWsErr("Přidání do skupiny selhalo.");setAddWsLoad(false);return;}
    const newWs={id:wsId,name:addWsName.trim(),code,created_by:uid};
    setKnownWs(w=>[...w,newWs]);setAddWsName("");setAddWsMode(null);setAddWsLoad(false);
    await switchWs(wsId);
  }

  // ── login / register ──────────────────────────────────────────────────────
  async function doLogin(){
    if(!authName.trim()||!authPin){setAuthErr("Vyplň jméno a PIN.");return;}
    setAuthLoad(true);setAuthErr("");
    const{data:found,error}=await supabase.from("users").select("*");
    if(error){setAuthErr("Chyba při načítání.");setAuthLoad(false);return;}
    const data=found?.find(u=>u.name.toLowerCase().trim()===authName.toLowerCase().trim());
    if(!data){setAuthErr(`Hráč "${authName.trim()}" nebyl nalezen.`);setAuthLoad(false);return;}
    if(data.pin!==authPin){setAuthErr("Nesprávný PIN.");setAuthLoad(false);return;}
    setUid(data.id);setUserMeta({name:data.name,dob:data.dob,pin:data.pin});
    const wsList=await loadUserWorkspaces(data.id);
    setKnownWs(wsList);
    if(wsList.length===0){
      localStorage.setItem(SK,JSON.stringify({userId:data.id,activeWsId:null}));
      setAuthLoad(false);setStep("ws-select");
    } else {
      const activeWs=wsList[0];
      setActiveWsId(activeWs.id);
      await loadWsData(activeWs.id,data.id);
      localStorage.setItem(SK,JSON.stringify({userId:data.id,activeWsId:activeWs.id}));
      setAuthLoad(false);setStep("app");
    }
  }

  async function doRegister(){
    if(!authName.trim()||!authDob||authPin.length<4||authPin!==authPin2){
      setAuthErr("Zkontroluj vyplněné údaje — PINy se musí shodovat (min. 4 číslice).");return;
    }
    setAuthLoad(true);setAuthErr("");
    // check name uniqueness globally
    const{data:existing}=await supabase.from("users").select("id").ilike("name",authName.trim());
    if(existing?.length){setAuthErr("Hráč s tímto jménem již existuje.");setAuthLoad(false);return;}
    const id="u"+Date.now();
    const{error:ue}=await supabase.from("users").insert({id,name:authName.trim(),dob:authDob,since:todayStr(),pin:authPin});
    if(ue){setAuthErr("Registrace selhala.");setAuthLoad(false);return;}
    setUid(id);setUserMeta({name:authName.trim(),dob:authDob,pin:authPin});
    setKnownWs([]);
    localStorage.setItem(SK,JSON.stringify({userId:id,activeWsId:null}));
    setAuthLoad(false);setStep("ws-select");
  }

  function logout(){
    setUid(null);setUserMeta(null);setKnownWs([]);setActiveWsId(null);
    setWsUsers({});setEntries({});setTeams({});setMembers({});setSeasons({});setGoals({});
    setStep("start");setView("log");setAuthName("");setAuthDob("");setAuthPin("");setAuthPin2("");
    setAuthErr("");setAddWsMode(null);setAddWsCode("");setAddWsErr("");setAddWsName("");
    setWsDropOpen(false);setRenameWs(false);
    localStorage.removeItem(SK);
  }

  // ── rename workspace ──────────────────────────────────────────────────────
  async function doRenameWs(){
    if(!renameVal.trim())return;
    const{error}=await supabase.from("workspaces").update({name:renameVal.trim()}).eq("id",activeWsId);
    if(error){setErr("Přejmenování selhalo.");return;}
    setKnownWs(w=>w.map(x=>x.id===activeWsId?{...x,name:renameVal.trim()}:x));
    setRenameWs(false);
  }

  // ── entry ops ─────────────────────────────────────────────────────────────
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
    const[wR,uR,eR,mR]=await Promise.all([
      supabase.from("workspaces").select("*"),
      supabase.from("users").select("*"),
      supabase.from("entries").select("user_id"),
      supabase.from("workspace_members").select("*"),
    ]);
    const ec={};for(const e of eR.data||[])ec[e.user_id]=(ec[e.user_id]||0)+1;
    const wMap={};for(const w of wR.data||[])wMap[w.id]={name:w.name,code:w.code};setAllWs(wMap);
    // group users by workspace via workspace_members
    const wuMap={};
    for(const m of mR.data||[]){
      const u=(uR.data||[]).find(x=>x.id===m.user_id);if(!u)continue;
      if(!wuMap[m.workspace_id])wuMap[m.workspace_id]=[];
      wuMap[m.workspace_id].push({id:u.id,name:u.name,dob:u.dob,pin:u.pin,entryCount:ec[u.id]||0});
    }
    setAllWsU(wuMap);setStep("admin");
  }

  async function savePts(){
    setPtsSv(true);const merged={...pts,...ptsEdit};
    const{error:e}=await supabase.from("settings").upsert({key:"pts",value:merged},{onConflict:"key"});
    if(e){setErr("Uložení koeficientů selhalo.");setPtsSv(false);return;}
    setPts(merged);setPtsFlash(true);setTimeout(()=>setPtsFlash(false),2000);setPtsSv(false);
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
    if(uIds.length>0){await Promise.all([supabase.from("entries").delete().in("user_id",uIds),supabase.from("goals").delete().in("user_id",uIds),supabase.from("team_members").delete().in("user_id",uIds)]);}
    await Promise.all([supabase.from("workspace_members").delete().eq("workspace_id",wsId),supabase.from("seasons").delete().eq("workspace_id",wsId),supabase.from("teams").delete().eq("workspace_id",wsId)]);
    await supabase.from("workspaces").delete().eq("id",wsId);
    setAllWs(w=>{const n={...w};delete n[wsId];return n;});setAllWsU(w=>{const n={...w};delete n[wsId];return n;});if(aSelWs===wsId)setASelWs(null);
  }

  async function saveAdminUser(){
    if(!editName.trim()||!editDob)return;
    const{error:e}=await supabase.from("users").update({name:editName.trim(),dob:editDob}).eq("id",editUser);
    if(e){setErr("Uložení selhalo.");return;}
    const wsId=Object.keys(allWsU).find(w=>(allWsU[w]||[]).some(u=>u.id===editUser));
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
    if(!window.confirm(`Opravdu smazat hráče "${u?.name}" ze skupiny?`))return;
    await supabase.from("workspace_members").delete().eq("workspace_id",wsId).eq("user_id",userId);
    setAllWsU(w=>({...w,[wsId]:(w[wsId]||[]).filter(u=>u.id!==userId)}));setEditUser(null);
  }

  // ── teams ─────────────────────────────────────────────────────────────────
  async function createTeam(){
    if(!newTName.trim())return;setSaving(true);setErr(null);
    const id="t"+Date.now(),ic=randCode();
    const{error:e}=await supabase.from("teams").insert({id,name:newTName.trim(),created_by:uid,invite_code:ic,workspace_id:activeWsId});
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
    const ns={id,name:sForm.name.trim(),start_date:sForm.start_date,end_date:sForm.end_date,created_by:uid,team_id:teamId||null,scope:teamId?"team":"global",workspace_id:activeWsId};
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

  function getVisibleActs(selected_acts){
    if(!selected_acts||!selected_acts.length) return AM;
    return AM.filter(a=>selected_acts.includes(a.key));
  }

  function buildLB(filterIds,fromDate,toDate){
    const t=todayStr(),w=weekAgoStr(),res={};
    for(const[id,days] of Object.entries(entries)){
      if(filterIds&&!filterIds.includes(id))continue;
      const u=wsUsers[id];if(!u)continue;
      let sc=0;const acts={};for(const a of AM)acts[a.key]=0;
      for(const[date,e] of Object.entries(days)){
        if(fromDate&&toDate){if(date<fromDate||date>toDate)continue;}
        else{if(period==="today"&&date!==t)continue;if(period==="week"&&date<w)continue;}
        sc+=calcScore(e,calcAge(u.dob),pts);for(const a of AM)acts[a.key]+=parseFloat(e[a.key])||0;
      }
      res[id]={sc,name:u.name,dob:u.dob,acts};
    }
    return res;
  }

  // ── styles helpers ────────────────────────────────────────────────────────
  const P={padding:"1rem",maxWidth:480,margin:"0 auto"};
  const Err=()=>err?(<div className="bf-err-banner"><span>{err}</span><button onClick={()=>setErr(null)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--bf-danger)",fontSize:18,lineHeight:1,padding:"0 0 0 8px"}}>×</button></div>):null;

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
        <button onClick={onCancel} className="bf-btn-ghost">Zrušit</button>
      </div>
    </div>
  );

  if(loading&&step!=="app")return<div style={{...P,textAlign:"center",paddingTop:"3rem",color:"var(--bf-text3)",fontSize:14,fontFamily:"var(--bf-font)"}}>Načítám…</div>;

  const activeWs=knownWs.find(w=>w.id===activeWsId);
  const isWsCreator=activeWs?.created_by===uid;
  const ACTS=getActs(pts);
  const myTeamIds=Object.keys(members).filter(tid=>(members[tid]||[]).includes(uid));
  const globalSeasons=Object.entries(seasons).filter(([,s])=>s.scope==="global");

  // ══ START ════════════════════════════════════════════════════════════════
  if(step==="start")return(
    <div style={P}>
      <div style={{textAlign:"center",padding:"2.5rem 0 2rem"}}>
        <div className="bf-ws-badge">Fitness soutěž</div>
        <h1 style={{fontSize:42,fontWeight:800,letterSpacing:"-0.04em",fontFamily:"var(--bf-font)",color:"var(--bf-text)",marginBottom:6}}>Beatfit</h1>
        <p style={{fontSize:13,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>Zaznamenávej sporty, porovnávej výsledky</p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:"1.5rem"}}>
        <button onClick={()=>setStep("login")} style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",background:"var(--bf-surface)",border:"1.5px solid var(--bf-border-md)",borderRadius:"var(--bf-r-lg)",cursor:"pointer",textAlign:"left"}}>
          <div style={{width:46,height:46,borderRadius:"var(--bf-r-md)",background:"var(--bf-accent-dim)",color:"var(--bf-accent-text)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>→</div>
          <div><p style={{margin:0,fontSize:15,fontWeight:700,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>Přihlásit se</p><p style={{margin:0,fontSize:12,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>Mám již účet</p></div>
        </button>
        <button onClick={()=>setStep("register")} style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",background:"var(--bf-surface)",border:"1.5px solid var(--bf-border-md)",borderRadius:"var(--bf-r-lg)",cursor:"pointer",textAlign:"left"}}>
          <div style={{width:46,height:46,borderRadius:"var(--bf-r-md)",background:"var(--bf-success-dim)",color:"var(--bf-success)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>+</div>
          <div><p style={{margin:0,fontSize:15,fontWeight:700,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>Registrovat se</p><p style={{margin:0,fontSize:12,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>První přihlášení</p></div>
        </button>
      </div>
      <div style={{borderTop:"1.5px solid var(--bf-border)",paddingTop:"1rem"}}>
        <div className="bf-label" style={{marginBottom:8,textAlign:"center"}}>Administrátor</div>
        <div style={{display:"flex",gap:8}}>
          <input type="password" placeholder="Heslo" value={adminPwd} onChange={e=>{setAdminPwd(e.target.value);setAdminErr(false);}} onKeyDown={e=>e.key==="Enter"&&loginAdmin()} className={`bf-inp${adminErr?" bf-inp-err":""}`} style={{flex:1}}/>
          <button onClick={loginAdmin} className="bf-btn-ghost" style={{flexShrink:0}}>→</button>
        </div>
        {adminErr&&<p style={{margin:"6px 0 0",fontSize:12,color:"var(--bf-danger)",fontFamily:"var(--bf-font)"}}>Nesprávné heslo</p>}
      </div>
    </div>
  );

  // ══ LOGIN ════════════════════════════════════════════════════════════════
  if(step==="login")return(
    <div style={P}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"1rem 0 1.5rem"}}>
        <button onClick={()=>{setStep("start");setAuthErr("");setAuthName("");setAuthPin("");}} style={{fontSize:22,background:"none",border:"none",cursor:"pointer",color:"var(--bf-text3)",padding:0,lineHeight:1}}>‹</button>
        <h2 style={{margin:0,fontSize:20,fontWeight:800,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>Přihlášení</h2>
      </div>
      {authErr&&<div className="bf-err-banner" style={{marginBottom:"1rem"}}><span>{authErr}</span></div>}
      <div className="bf-card">
        <div className="bf-label" style={{marginBottom:4}}>Jméno</div>
        <input placeholder="Celé jméno" value={authName} onChange={e=>setAuthName(e.target.value)} className="bf-inp" style={{marginBottom:12}}/>
        <div className="bf-label" style={{marginBottom:4}}>PIN</div>
        <input type="password" inputMode="numeric" maxLength={6} placeholder="Zadej PIN" value={authPin} onChange={e=>setAuthPin(e.target.value.replace(/\D/g,""))} onKeyDown={e=>e.key==="Enter"&&doLogin()} className="bf-inp-pin" style={{marginBottom:16}}/>
        <button onClick={doLogin} disabled={!authName.trim()||authPin.length<4||authLoad} className="bf-btn">{authLoad?"Přihlašuji…":"Přihlásit se →"}</button>
      </div>
    </div>
  );

  // ══ REGISTER ════════════════════════════════════════════════════════════
  if(step==="register")return(
    <div style={P}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"1rem 0 1.5rem"}}>
        <button onClick={()=>{setStep("start");setAuthErr("");setAuthName("");setAuthDob("");setAuthPin("");setAuthPin2("");}} style={{fontSize:22,background:"none",border:"none",cursor:"pointer",color:"var(--bf-text3)",padding:0,lineHeight:1}}>‹</button>
        <h2 style={{margin:0,fontSize:20,fontWeight:800,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>Registrace</h2>
      </div>
      {authErr&&<div className="bf-err-banner" style={{marginBottom:"1rem"}}><span>{authErr}</span></div>}
      <div className="bf-card">
        <div className="bf-label" style={{marginBottom:4}}>Celé jméno</div>
        <input placeholder="Jak tě ostatní uvidí v žebříčku" value={authName} onChange={e=>setAuthName(e.target.value)} className="bf-inp" style={{marginBottom:12}}/>
        <div className="bf-label" style={{marginBottom:4}}>Datum narození</div>
        <input type="date" value={authDob} onChange={e=>setAuthDob(e.target.value)} className="bf-inp bf-inp-mono" style={{marginBottom:12}}/>
        <div className="bf-label" style={{marginBottom:4}}>PIN (min. 4 číslice)</div>
        <input type="password" inputMode="numeric" maxLength={6} value={authPin} onChange={e=>setAuthPin(e.target.value.replace(/\D/g,""))} className="bf-inp-pin" style={{marginBottom:8}}/>
        <input type="password" inputMode="numeric" maxLength={6} placeholder="Potvrď PIN" value={authPin2} onChange={e=>setAuthPin2(e.target.value.replace(/\D/g,""))} onKeyDown={e=>e.key==="Enter"&&doRegister()} className="bf-inp-pin" style={{marginBottom:16}}/>
        <button onClick={doRegister} disabled={!authName.trim()||!authDob||authPin.length<4||authLoad} className="bf-btn">{authLoad?"Registruji…":"Zaregistrovat se →"}</button>
      </div>
    </div>
  );

  // ══ WS-SELECT ═══════════════════════════════════════════════════════════
  if(step==="ws-select")return(
    <div style={P}>
      <div style={{padding:"1.5rem 0 1rem"}}>
        <p style={{margin:"0 0 4px",fontSize:18,fontWeight:800,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>Vítej, {userMeta?.name}!</p>
        <p style={{margin:0,fontSize:13,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>Vyber skupinu nebo přidej novou.</p>
      </div>

      {knownWs.length>0&&<>
        <div className="bf-label" style={{marginBottom:8}}>Moje skupiny</div>
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:"1.5rem"}}>
          {knownWs.map(w=>(
            <button key={w.id} onClick={async()=>{
              setActiveWsId(w.id);
              await loadWsData(w.id,uid);
              localStorage.setItem(SK,JSON.stringify({userId:uid,activeWsId:w.id}));
              setStep("app");
            }} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",
              background:"var(--bf-surface)",border:"1.5px solid var(--bf-border-md)",
              borderRadius:"var(--bf-r-md)",cursor:"pointer",textAlign:"left",
              transition:"border-color 0.15s"}}>
              <div style={{width:40,height:40,borderRadius:"var(--bf-r-sm)",
                background:"var(--bf-accent-dim)",color:"var(--bf-accent-text)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:16,fontWeight:700,flexShrink:0,fontFamily:"var(--bf-font)"}}>
                {w.name[0]}
              </div>
              <div style={{flex:1}}>
                <p style={{margin:0,fontSize:15,fontWeight:700,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>{w.name}</p>
                <p style={{margin:0,fontSize:11,fontFamily:"var(--bf-mono)",color:"var(--bf-text3)",letterSpacing:"0.08em"}}>{w.code}</p>
              </div>
              <span style={{fontSize:20,color:"var(--bf-text3)"}}>›</span>
            </button>
          ))}
        </div>
      </>}

      <div style={{height:"1.5px",background:"var(--bf-border)",marginBottom:"1rem"}}}/>
      <div className="bf-label" style={{marginBottom:8}}>Přidat novou skupinu</div>
      <div style={{display:"flex",gap:6,marginBottom:"1rem"}}>
        <button onClick={()=>setAddWsMode(m=>m==="code"?null:"code")}
          className={`bf-chip${addWsMode==="code"?" active":""}`}>Zadat kód</button>
        <button onClick={()=>setAddWsMode(m=>m==="new"?null:"new")}
          className={`bf-chip${addWsMode==="new"?" active":""}`}>Vytvořit novou</button>
      </div>

      {addWsMode==="code"&&<div className="bf-card" style={{marginBottom:"1rem"}}>
        <div style={{display:"flex",gap:8,marginBottom:addWsErr?6:0}}>
          <input placeholder="Kód skupiny" value={addWsCode}
            onChange={e=>{setAddWsCode(e.target.value.toUpperCase());setAddWsErr("");}}
            onKeyDown={e=>e.key==="Enter"&&addWsByCode()}
            className="bf-inp bf-inp-mono"
            style={{flex:1,fontSize:17,letterSpacing:"0.15em",textAlign:"center"}}/>
          <button onClick={addWsByCode} disabled={addWsLoad||!addWsCode.trim()}
            className="bf-btn" style={{width:"auto",padding:"11px 18px",flexShrink:0}}>
            {addWsLoad?"…":"→"}
          </button>
        </div>
        {addWsErr&&<p style={{margin:0,fontSize:12,color:"var(--bf-danger)",fontFamily:"var(--bf-font)"}}>{addWsErr}</p>}
      </div>}

      {addWsMode==="new"&&<div className="bf-card" style={{marginBottom:"1rem"}}>
        <div className="bf-label" style={{marginBottom:4}}>Název skupiny</div>
        <input placeholder="Např. Práce 2025, Kamarádi…" value={addWsName}
          onChange={e=>setAddWsName(e.target.value)} className="bf-inp"
          style={{marginBottom:10}} onKeyDown={e=>e.key==="Enter"&&addWsNew()}/>
        {addWsErr&&<p style={{margin:"0 0 8px",fontSize:12,color:"var(--bf-danger)",fontFamily:"var(--bf-font)"}}>{addWsErr}</p>}
        <button onClick={addWsNew} disabled={!addWsName.trim()||addWsLoad} className="bf-btn">
          {addWsLoad?"Vytvářím…":"Vytvořit skupinu →"}
        </button>
      </div>}

      <button onClick={logout} className="bf-btn-out"
        style={{width:"100%",justifyContent:"center",marginTop:"0.5rem"}}>
        Odhlásit se
      </button>
    </div>
  );

  // ══ ADMIN ════════════════════════════════════════════════════════════════
  if(step==="admin")return(
    <div style={P}>
      <div className="bf-topbar"><div><div className="bf-label">Panel</div><p style={{margin:0,fontWeight:800,fontSize:17,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>Administrátor</p></div><button onClick={()=>{setStep("start");setAdminPwd("");}} className="bf-btn-out">Odhlásit</button></div>
      <Err/>
      <div className="bf-nav" style={{marginBottom:"1.25rem"}}>
        {[["workspaces","Skupiny"],["pts","Koeficienty"],["players","Hráči"]].map(([t,l])=>(<button key={t} onClick={()=>{setAdminTab(t);setEditUser(null);setEditWs(null);setErr(null);}} className={`bf-nav-btn${adminTab===t?" active":""}`}>{l}</button>))}
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
                  <div style={{flex:1}}><p style={{margin:0,fontSize:15,fontWeight:700,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>{w.name}</p><p style={{margin:0,fontSize:11,color:"var(--bf-text3)",fontFamily:"var(--bf-mono)",letterSpacing:"0.08em"}}>{w.code} · {uc} {uc===1?"člen":"členů"}</p></div>
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
              <div style={{display:"flex",gap:8}}><button onClick={saveAdminUser} className="bf-btn" style={{flex:1}}>Uložit</button><button onClick={()=>setEditUser(null)} className="bf-btn-ghost" style={{flex:1}}>Zrušit</button></div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {(allWsU[aSelWs]||[]).sort((a,b)=>a.name.localeCompare(b.name)).map(u=>(
                <div key={u.id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"var(--bf-surface)",border:"1.5px solid var(--bf-border-md)",borderRadius:"var(--bf-r-md)"}}>
                  <div className="bf-av" style={{width:32,height:32,fontSize:13,flexShrink:0}}>{u.name[0]}</div>
                  <div style={{flex:1,minWidth:0}}><p style={{margin:0,fontSize:13,fontWeight:700,color:"var(--bf-text)",fontFamily:"var(--bf-font)"}}>{u.name}</p><p style={{margin:0,fontSize:10,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>{calcAge(u.dob)} let · {u.entryCount} záz. · PIN: {u.pin?<span style={{color:"var(--bf-success)"}}>✓</span>:<span style={{color:"var(--bf-danger)"}}>❗</span>}</p></div>
                  <button onClick={()=>resetPin(u.id,aSelWs)} className="bf-btn-ghost" style={{fontSize:11,padding:"5px 10px"}}>PIN</button>
                  <button onClick={()=>{setEditUser(u.id);setEditName(u.name);setEditDob(u.dob);}} className="bf-btn-ghost" style={{fontSize:11,padding:"5px 10px"}}>Upravit</button>
                  <button onClick={()=>deleteAdminUser(u.id,aSelWs)} className="bf-btn-danger" style={{fontSize:11,padding:"5px 10px"}}>Odebrat</button>
                </div>
              ))}
              {!(allWsU[aSelWs]||[]).length&&<p style={{fontSize:13,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>Žádní členové.</p>}
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

  // ══ APP SHARED ════════════════════════════════════════════════════════════
  const WsDropdown=()=>(
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

  const TopBar=()=>(
    <div className="bf-topbar" onClick={()=>wsDropOpen&&setWsDropOpen(false)}>
      <div>
        <div className="bf-label" style={{marginBottom:1}}>{userMeta?.name}</div>
        <WsDropdown/>
      </div>
      {loading&&<span style={{fontSize:11,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>Načítám…</span>}
    </div>
  );

  const Nav=()=>(
    <div className="bf-nav">
      {[["log","Záznam"],["leaderboard","Žebříček"],["teams","Týmy"],["stats","Moje"]].map(([v,l])=>(
        <button key={v} onClick={()=>{setView(v);if(v==="teams")setTeamView("list");setWsDropOpen(false);}} className={`bf-nav-btn${view===v?" active":""}`}>{l}</button>
      ))}
    </div>
  );

  // ══ LOG ══════════════════════════════════════════════════════════════════
  if(view==="log"){
    const age=calcAge(userMeta?.dob),score=calcScore(form,age,pts),streak=calcStreak(entries[uid]||{});
    const weekGoal=parseFloat(goals[uid])||0;
    const weekScore=Object.entries(entries[uid]||{}).filter(([d])=>d>=weekAgoStr()).reduce((s,[,e])=>s+calcScore(e,age,pts),0);
    const goalPct=weekGoal>0?Math.min(100,(weekScore/weekGoal)*100):0;
    return(
      <div style={P} onClick={()=>wsDropOpen&&setWsDropOpen(false)}>
        <TopBar/><Nav/><Err/>
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
      <div style={P} onClick={()=>wsDropOpen&&setWsDropOpen(false)}>
        <TopBar/><Nav/><Err/>
        {lbMode==="global"?(<div className="bf-chips">{[["today","Dnes"],["week","Týden"],["all","Vše"]].map(([k,l])=>(<button key={k} onClick={()=>setPeriod(k)} className={`bf-chip${period===k?" active":""}`}>{l}</button>))}</div>):(
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
              <p style={{margin:0,fontSize:12,color:"var(--bf-text2)",fontFamily:"var(--bf-mono)",fontWeight:500}}>{fmtVal(a,actW[a.key].val)} {a.unit}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ══ TEAMS ════════════════════════════════════════════════════════════════
  if(view==="teams"){
    if(teamView==="list")return(
      <div style={P} onClick={()=>wsDropOpen&&setWsDropOpen(false)}>
        <TopBar/><Nav/><Err/>
        <div className="bf-section-header" style={{marginBottom:"1rem"}}><div className="bf-label" style={{margin:0}}>Moje týmy</div><button onClick={()=>setTeamView("create")} className="bf-btn-sm">+ Nový tým</button></div>
        {!myTeamIds.length&&<p style={{fontSize:13,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>Zatím nejsi v žádném týmu.</p>}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {myTeamIds.map(tid=>{const t=teams[tid];if(!t)return null;const mc=(members[tid]||[]).length,tsc=Object.values(seasons).filter(s=>s.team_id===tid).length;return(
            <button key={tid} onClick={()=>{setActiveTeam(tid);setTeamView("detail");setTTab("score");setTSeason("all");setShowTSF(false);}} className="bf-team-card">
              <div className="bf-team-icon">{t.name[0]}</div>
              <div style={{flex:1}}><p style={{margin:0,fontSize:15,fontWeight:700,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>{t.name}</p><p style={{margin:0,fontSize:12,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>{mc} {mc===1?"člen":"členů"}{tsc>0?` · ${tsc} výzev`:""}{t.created_by===uid?" · tvůj":""}</p></div>
              <span style={{fontSize:18,color:"var(--bf-text3)"}}>›</span>
            </button>
          );})}
        </div>
      </div>
    );
    if(teamView==="create")return(
      <div style={P} onClick={()=>wsDropOpen&&setWsDropOpen(false)}>
        <TopBar/><Nav/><Err/>
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
        for(const id of tMids){const u=wsUsers[id];if(!u)continue;const days=entries[id]||{};let sc2=0;const acts={};for(const a of AM)acts[a.key]=0;
          for(const[date,e] of Object.entries(days)){if(actS){if(date<actS.start_date||date>actS.end_date)continue;}else{if(tPeriod==="today"&&date!==t2)continue;if(tPeriod==="week"&&date<w2)continue;}
          sc2+=calcScore(e,calcAge(u.dob),pts);for(const a of AM)acts[a.key]+=parseFloat(e[a.key])||0;}res[id]={sc:sc2,name:u.name,dob:u.dob,acts};}return res;})();
      const sorted=Object.entries(lb).sort((a,b)=>b[1].sc-a[1].sc),myRank=sorted.findIndex(([id])=>id===uid)+1;
      const activeWsObj=knownWs.find(w=>w.id===activeWsId);
      const invUrl=`${window.location.origin}${window.location.pathname}?invite=${team.invite_code}&ws=${activeWsObj?.code||""}`;
      return(
        <div style={P} onClick={()=>wsDropOpen&&setWsDropOpen(false)}>
          <TopBar/><Nav/><Err/>
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
                  {vals.filter(v=>v.val>0).map((v,i)=>(<div key={v.name}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,fontWeight:v.isMe?700:500,color:v.isMe?"var(--bf-text)":"var(--bf-text2)",fontFamily:"var(--bf-font)"}}>{i===0?"🥇 ":""}{v.name}</span><span style={{fontSize:12,fontFamily:"var(--bf-mono)",color:"var(--bf-text)",fontWeight:600}}>{fmtVal(a,v.val)} {a.unit}</span></div><div className="bf-progress-bar"><div className="bf-progress-fill" style={{width:`${(v.val/mx)*100}%`,background:v.isMe?a.color:"var(--bf-surface3)",opacity:v.isMe?1:0.6}}/></div></div>))}
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
    const age=calcAge(userMeta?.dob),total=dates.reduce((s,d)=>s+calcScore(myDays[d],age,pts),0);
    const streak=calcStreak(myDays),weekGoal=parseFloat(goals[uid])||0;
    const weekScore=Object.entries(myDays).filter(([d])=>d>=weekAgoStr()).reduce((s,[,e])=>s+calcScore(e,age,pts),0);
    const goalPct=weekGoal>0?Math.min(100,(weekScore/weekGoal)*100):0;
    const totals={};for(const a of AM)totals[a.key]=0;
    for(const e of Object.values(myDays))for(const a of AM)totals[a.key]+=(parseFloat(e[a.key])||0);
    const cDays=Array.from({length:14},(_,i)=>dMinus(13-i));
    const cScores=cDays.map(d=>calcScore(myDays[d]||{},age,pts));
    const maxSc=Math.max(...cScores,1);
    return(
      <div style={P} onClick={()=>wsDropOpen&&setWsDropOpen(false)}>
        <TopBar/><Nav/><Err/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:"1rem"}}>
          {[{l:"Celkem bodů",v:total.toFixed(0)},{l:"Aktivní dny",v:dates.length},{l:"Streak",v:`${streak}${streak>0?" 🔥":""}`,c:streak>=7?"#f97316":undefined}].map(({l,v,c})=>(
            <div key={l} className="bf-stat"><div className="bf-label" style={{marginBottom:4}}>{l}</div><p style={{margin:0,fontSize:20,fontWeight:700,fontFamily:"var(--bf-mono)",color:c||"var(--bf-text)"}}>{v}</p></div>
          ))}
        </div>

        {/* skupina */}
        <div className="bf-card" style={{marginBottom:"1rem"}}>
          <div className="bf-section-header" style={{marginBottom:8}}>
            <div className="bf-label" style={{margin:0}}>Moje skupina</div>
            {isWsCreator&&!renameWs&&<button onClick={()=>{setRenameWs(true);setRenameVal(activeWs?.name||"");}} className="bf-btn-out" style={{fontSize:11}}>Přejmenovat</button>}
          </div>
          {renameWs?(
            <div style={{display:"flex",gap:8}}>
              <input value={renameVal} onChange={e=>setRenameVal(e.target.value)} className="bf-inp" style={{flex:1}} onKeyDown={e=>e.key==="Enter"&&doRenameWs()} autoFocus/>
              <button onClick={doRenameWs} className="bf-btn-sm">Uložit</button>
              <button onClick={()=>setRenameWs(false)} className="bf-btn-ghost">Zrušit</button>
            </div>
          ):(
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{flex:1}}><p style={{margin:0,fontSize:15,fontWeight:700,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>{activeWs?.name}</p><p style={{margin:0,fontSize:11,fontFamily:"var(--bf-mono)",color:"var(--bf-text3)",letterSpacing:"0.1em"}}>Kód: {activeWs?.code}</p></div>
              <button onClick={()=>activeWs?.code&&navigator.clipboard.writeText(activeWs.code)} className="bf-btn-out" style={{fontSize:11}}>Kopírovat kód</button>
            </div>
          )}
        </div>

        <div className="bf-card" style={{marginBottom:"1rem"}}>
          <div className="bf-label" style={{marginBottom:10}}>Týdenní cíl (body)</div>
          <div style={{display:"flex",gap:8,marginBottom:weekGoal>0?12:0}}>
            <input type="number" min="0" value={goalIn} onChange={e=>setGoalIn(e.target.value)} placeholder="Nastav cíl na tento týden" className="bf-inp bf-inp-mono" style={{flex:1}}/>
            <button onClick={saveGoal} className="bf-btn-sm">{goalFlash?"✓":"Uložit"}</button>
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
              <p style={{margin:0,fontSize:17,fontWeight:700,fontFamily:"var(--bf-mono)",color:"var(--bf-text)"}}>{fmtVal(a,totals[a.key])}<span style={{fontSize:11,fontWeight:500,color:"var(--bf-text3)",marginLeft:3}}>{a.unit}</span></p>
            </div>
          ))}
        </div>

        <div className="bf-section-header" style={{marginBottom:8}}>
          <div className="bf-label" style={{margin:0}}>Historie</div>
          <button onClick={()=>exportCSV(userMeta?.name,myDays,pts,age)} className="bf-btn-out" style={{fontSize:11}}>Export CSV ↓</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {!dates.length&&<p style={{fontSize:13,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>Žádné záznamy.</p>}
          {dates.map(d=>(
            <div key={d} className="bf-card" style={{padding:"10px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><span style={{fontSize:12,fontWeight:600,fontFamily:"var(--bf-mono)",color:"var(--bf-text2)"}}>{d}</span><span style={{fontSize:14,fontWeight:700,fontFamily:"var(--bf-mono)",color:"var(--bf-text)"}}>{calcScore(myDays[d],age,pts).toFixed(1)} b</span></div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {AM.filter(a=>parseFloat(myDays[d][a.key])>0).map(a=>(
                  <span key={a.key} style={{fontSize:10,background:a.color+"20",color:a.color,padding:"3px 9px",borderRadius:20,fontWeight:700,fontFamily:"var(--bf-font)"}}>
                    {a.label} {fmtVal(a,parseFloat(myDays[d][a.key]))} {a.unit}
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