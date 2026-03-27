import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import "./beatfit.css";
import { DEFAULT_PTS, AM, getActs, calcAge, ageMult, calcScore, todayStr, weekAgoStr, dMinus, calcStreak, randCode, fmtVal, exportCSV, seasonStatus, seasonLabel, daysLeft, MEDALS, RANK_CLR } from "./lib/helpers";
import { computeEffectiveCap } from "./lib/helpers";
import { Err, SFormCard } from "./components/Misc";
import Header from "./components/Header";
import Leaderboard from "./components/Leaderboard";
import TeamsList from "./components/TeamsList";
import TeamCreate from "./components/TeamCreate";
import TeamDetail from "./components/TeamDetail";
import Prefs from "./components/Prefs";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY);

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
  // user preferences (localStorage-backed)
  const [prefs,setPrefs] = useState(()=>{
    try{const s=localStorage.getItem('bf_prefs');if(s)return JSON.parse(s);}catch(e){}
    return {limit:{enabled:false,period:'day',value:100},selectedActs:{ws:[],teams:{}}};
  });
  const [prefsOpen,setPrefsOpen] = useState(false);
  // refs for debounced DB save and skip-on-load behavior
  const saveTimeoutRef = useRef(null);
  const skipSaveRef = useRef(false);

  // load prefs from DB with fallback: team -> workspace -> global
  const loadPrefsFromDb = async ()=>{
    if(!uid) return;
    try{
      // try team-specific
      const order = [ {team_id: activeTeam, workspace_id: activeWsId}, {team_id: null, workspace_id: activeWsId}, {team_id: null, workspace_id: null} ];
      for(const q of order){
        let builder = supabase.from('user_prefs').select('*').eq('user_id', uid);
        if(q.team_id===null) builder = builder.is('team_id', null); else if(q.team_id) builder = builder.eq('team_id', q.team_id);
        if(q.workspace_id===null) builder = builder.is('workspace_id', null); else if(q.workspace_id) builder = builder.eq('workspace_id', q.workspace_id);
        const { data, error } = await builder.maybeSingle();
        if(error){ continue; }
        if(data && data.prefs){
          skipSaveRef.current = true;
          setPrefs(data.prefs);
          return;
        }
      }
    }catch(e){ setErr("Načtení preferencí selhalo."); }
  };

  // upsert prefs (debounced by effect below)
  const upsertPrefsToDb = async (p)=>{
    if(!uid) return;
    try{
      const row = { user_id: uid, workspace_id: activeWsId||null, team_id: activeTeam||null, prefs: p };
      const { error } = await supabase.from('user_prefs').upsert(row, { onConflict: 'user_id,workspace_id,team_id' });
      if(error) setErr('Uložení preferencí selhalo.');
    }catch(e){ setErr('Uložení preferencí selhalo.'); }
  };
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

    // load prefs when context/user changes
    useEffect(()=>{
      if(!uid) return;
      loadPrefsFromDb();
    },[uid, activeWsId, activeTeam]);

    // debounce prefs -> localStorage + DB upsert
    useEffect(()=>{
      if(!uid) return;
      if(skipSaveRef.current){ skipSaveRef.current = false; return; }
      try{ localStorage.setItem('bf_prefs', JSON.stringify(prefs)); }catch(e){}
      if(saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(()=>{ upsertPrefsToDb(prefs); }, 700);
      return ()=>{ if(saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
    },[prefs, uid, activeWsId, activeTeam]);

    // refresh form when entries change or logDate changes
    useEffect(()=>{
      if(!uid || !logDate) return;
      setForm(entries[uid]?.[logDate]||{});
    },[entries, uid, logDate]);
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
    // Header component extracted to src/components/Header.jsx
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

  function buildLB(filterIds,fromDate,toDate,opts={}){
    const t=todayStr(),w=weekAgoStr(),res={};
    const spanInfo = opts.spanInfo || (fromDate&&toDate?{fromDate,toDate}:{period: period});
    for(const[id,days] of Object.entries(entries)){
      if(filterIds&&!filterIds.includes(id))continue;
      const u=wsUsers[id];if(!u)continue;
      let sc=0;const acts={};
      // choose visible acts based on opts.selectedActs (array of keys) or default all
      const visibleActKeys = opts.selectedActs&&opts.selectedActs.length?opts.selectedActs:null;
      for(const a of AM)acts[a.key]=0;
      for(const[date,e] of Object.entries(days)){
        if(fromDate&&toDate){if(date<fromDate||date>toDate)continue;}
        else{if(period==="today"&&date!==t)continue;if(period==="week"&&date<w)continue;}
        sc+=calcScore(e,calcAge(u.dob),pts,visibleActKeys);for(const a of AM)acts[a.key]+=parseFloat(e[a.key])||0;
      }
      // apply viewer limit cap if provided
      if(opts.limit?.enabled){
        // compute effective cap via helper if available
        const cap = (typeof computeEffectiveCap!=='undefined')? computeEffectiveCap(opts.limit, spanInfo) : null;
        if(cap!=null) sc = Math.min(sc, cap);
      }
      res[id]={sc,name:u.name,dob:u.dob,acts};
    }
    return res;
  }

  // ── styles helpers ────────────────────────────────────────────────────────
  const P={padding:"1rem",maxWidth:480,margin:"0 auto"};
  

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

      <div style={{height:"1.5px",background:"var(--bf-border)",marginBottom:"1rem"}}/>
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
      <Err err={err} setErr={setErr}/>
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
    const selectedActsForWs = (prefs.selectedActs&&prefs.selectedActs.ws&&prefs.selectedActs.ws.length)?prefs.selectedActs.ws:null;
    const weekScore=Object.entries(entries[uid]||{}).filter(([d])=>d>=weekAgoStr()).reduce((s,[,e])=>s+calcScore(e,age,pts,selectedActsForWs),0);
    const goalPct=weekGoal>0?Math.min(100,(weekScore/weekGoal)*100):0;
    return(
      <div style={P} onClick={()=>wsDropOpen&&setWsDropOpen(false)}>
        <Header userMeta={userMeta} knownWs={knownWs} activeWs={activeWs} activeWsId={activeWsId} wsDropOpen={wsDropOpen} setWsDropOpen={setWsDropOpen} switchWs={switchWs} setStep={setStep} logout={logout} loading={loading} setAddWsMode={setAddWsMode} view={view} setView={setView} setTeamView={setTeamView} openPrefs={()=>setPrefsOpen(true)}/><Err err={err} setErr={setErr}/>
        {prefsOpen&&<Prefs prefs={prefs} setPrefs={setPrefs} activeWsId={activeWsId} activeTeam={activeTeam} AM={AM} onClose={()=>setPrefsOpen(false)} onSave={()=>upsertPrefsToDb(prefs)} />}
        <input type="date" value={logDate} max={todayStr()} onChange={e=>{setLogDate(e.target.value);setForm(entries[uid]?.[e.target.value]||{});}} className="bf-inp bf-inp-mono" style={{marginBottom:"1rem",textAlign:"center",fontSize:14}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:"1rem"}}>
          {[{l:"Skóre",v:score.toFixed(1)},{l:"Věk. koef.",v:`×${ageMult(age).toFixed(2)}`},{l:"Řada",v:`${streak}${streak>0?" 🔥":""}`,c:streak>=7?"#f97316":undefined}].map(({l,v,c})=>(
            <div key={l} className="bf-stat"><div className="bf-label" style={{marginBottom:4}}>{l}</div><p style={{margin:0,fontSize:20,fontWeight:700,fontFamily:"var(--bf-mono)",color:c||"var(--bf-text)"}}>{v}</p></div>
          ))}
        </div>
        {weekGoal>0&&<div className="bf-surface" style={{marginBottom:"1rem"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div className="bf-label" style={{margin:0}}>Týdenní cíl</div><span style={{fontSize:12,fontFamily:"var(--bf-mono)",color:"var(--bf-text2)"}}>{weekScore.toFixed(0)} / {weekGoal} b</span></div><div className="bf-progress-bar"><div className="bf-progress-fill" style={{width:`${goalPct}%`,background:goalPct>=100?"var(--bf-success)":"var(--bf-accent)"}}/></div>{goalPct>=100&&<p style={{margin:"8px 0 0",fontSize:12,color:"var(--bf-success)",fontWeight:700,fontFamily:"var(--bf-font)"}}>Cíl splněn! 🎉</p>}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {ACTS.filter(a=>!a.negative&&(!selectedActsForWs||selectedActsForWs.includes(a.key))).map(a=>(
            <div key={a.key} className="bf-act-row">
              <div className="bf-act-icon" style={{background:a.color+"20",color:a.color}}>{a.icon}</div>
              <div style={{flex:1,minWidth:0}}><p style={{margin:0,fontSize:13,fontWeight:700,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>{a.label}</p><p style={{margin:0,fontSize:10,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>{a.pts} b/{a.unit} · {a.sub}</p></div>
              <input type="number" min="0" step={a.unit==="km"?"0.1":"1"} value={form[a.key]||""} placeholder="—" onChange={e=>setForm(f=>({...f,[a.key]:e.target.value}))} className="bf-act-num"/>
              <span style={{fontSize:11,color:"var(--bf-text3)",fontFamily:"var(--bf-font)",minWidth:20}}>{a.unit}</span>
            </div>
          ))}
        </div>
        <div style={{marginTop:"1.25rem",marginBottom:"0.5rem",display:"flex",alignItems:"center",gap:8}}>
          <div style={{flex:1,height:"1.5px",background:"var(--bf-border)"}}/>
          <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.06em",color:"var(--bf-danger)",fontFamily:"var(--bf-font)",textTransform:"uppercase"}}>Alkohol 🍺 −body</span>
          <div style={{flex:1,height:"1.5px",background:"var(--bf-border)"}}/>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {ACTS.filter(a=>a.negative).map(a=>(
            <div key={a.key} className="bf-act-row" style={{borderColor:"var(--bf-danger-dim)"}}>
              <div className="bf-act-icon" style={{background:a.color+"15",color:a.color,fontSize:16}}>{a.icon}</div>
              <div style={{flex:1,minWidth:0}}><p style={{margin:0,fontSize:13,fontWeight:700,fontFamily:"var(--bf-font)",color:"var(--bf-text)"}}>{a.label}</p><p style={{margin:0,fontSize:10,color:"var(--bf-text3)",fontFamily:"var(--bf-font)"}}>{a.pts} b/{a.unit} · {a.sub}</p></div>
              <input type="number" min="0" step="1" value={form[a.key]||""} placeholder="—" onChange={e=>setForm(f=>({...f,[a.key]:e.target.value}))} className="bf-act-num" style={{borderColor:"var(--bf-danger-dim)"}}/>
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
    const selectedActsForWs = (prefs.selectedActs&&prefs.selectedActs.ws&&prefs.selectedActs.ws.length)?prefs.selectedActs.ws:null;
    const spanInfo = actS? {fromDate:actS.start_date,toDate:actS.end_date} : {period: period};
    const lb=actS?buildLB(null,actS.start_date,actS.end_date,{selectedActs:selectedActsForWs,limit:prefs.limit,spanInfo}):buildLB(null,null,null,{selectedActs:selectedActsForWs,limit:prefs.limit,spanInfo});
    const sorted=Object.entries(lb).sort((a,b)=>b[1].sc-a[1].sc);
    const myRank=sorted.findIndex(([id])=>id===uid)+1;
    const actW={};
    for(const a of AM){let best=null,bestV=-1;for(const[,d] of Object.entries(lb))if((d.acts[a.key]||0)>bestV){bestV=d.acts[a.key];best=d.name;}if(bestV>0)actW[a.key]={name:best,val:bestV};}
    return(
      <div style={P} onClick={()=>wsDropOpen&&setWsDropOpen(false)}>
        <Header userMeta={userMeta} knownWs={knownWs} activeWs={activeWs} activeWsId={activeWsId} wsDropOpen={wsDropOpen} setWsDropOpen={setWsDropOpen} switchWs={switchWs} setStep={setStep} logout={logout} loading={loading} setAddWsMode={setAddWsMode} view={view} setView={setView} setTeamView={setTeamView} openPrefs={()=>setPrefsOpen(true)}/>
        {prefsOpen&&<Prefs prefs={prefs} setPrefs={setPrefs} activeWsId={activeWsId} activeTeam={activeTeam} AM={AM} onClose={()=>setPrefsOpen(false)} onSave={()=>upsertPrefsToDb(prefs)} />}
        <Err err={err} setErr={setErr}/>
        <Leaderboard P={P} onCloseDropdown={()=>wsDropOpen&&setWsDropOpen(false)} lbMode={lbMode} setLbMode={setLbMode} globalSeasons={globalSeasons} period={period} setPeriod={setPeriod} loadWsData={loadWsData} activeWsId={activeWsId} actS={actS} sorted={sorted} myRank={myRank} actW={actW} AM={AM} fmtVal={fmtVal} calcStreak={calcStreak} entries={entries} uid={uid} MEDALS={MEDALS} RANK_CLR={RANK_CLR} seasonLabel={seasonLabel} daysLeft={daysLeft} seasonStatus={seasonStatus} prefs={prefs} />
      </div>
    );
  }

  // ══ TEAMS ════════════════════════════════════════════════════════════════
  if(view==="teams"){
    if(teamView==="list")return(
      <div style={P} onClick={()=>wsDropOpen&&setWsDropOpen(false)}>
        <Header userMeta={userMeta} knownWs={knownWs} activeWs={activeWs} activeWsId={activeWsId} wsDropOpen={wsDropOpen} setWsDropOpen={setWsDropOpen} switchWs={switchWs} setStep={setStep} logout={logout} loading={loading} setAddWsMode={setAddWsMode} view={view} setView={setView} setTeamView={setTeamView} openPrefs={()=>setPrefsOpen(true)}/>
        {prefsOpen&&<Prefs prefs={prefs} setPrefs={setPrefs} activeWsId={activeWsId} activeTeam={activeTeam} AM={AM} onClose={()=>setPrefsOpen(false)} onSave={()=>upsertPrefsToDb(prefs)} />}
        <Err err={err} setErr={setErr}/>
        <TeamsList myTeamIds={myTeamIds} teams={teams} members={members} seasons={seasons} uid={uid} setActiveTeam={setActiveTeam} setTeamView={setTeamView} setTTab={setTTab} setTSeason={setTSeason} setShowTSF={setShowTSF} />
      </div>
    );
    if(teamView==="create")return(
      <div style={P} onClick={()=>wsDropOpen&&setWsDropOpen(false)}>
        <Header userMeta={userMeta} knownWs={knownWs} activeWs={activeWs} activeWsId={activeWsId} wsDropOpen={wsDropOpen} setWsDropOpen={setWsDropOpen} switchWs={switchWs} setStep={setStep} logout={logout} loading={loading} setAddWsMode={setAddWsMode} view={view} setView={setView} setTeamView={setTeamView} openPrefs={()=>setPrefsOpen(true)}/>
        <Err err={err} setErr={setErr}/>
        <TeamCreate newTName={newTName} setNewTName={setNewTName} createTeam={createTeam} saving={saving} setTeamView={setTeamView} />
      </div>
    );
    if(teamView==="detail"&&activeTeam){
      return (
          <div style={P} onClick={()=>wsDropOpen&&setWsDropOpen(false)}>
            <Header userMeta={userMeta} knownWs={knownWs} activeWs={activeWs} activeWsId={activeWsId} wsDropOpen={wsDropOpen} setWsDropOpen={setWsDropOpen} switchWs={switchWs} setStep={setStep} logout={logout} loading={loading} setAddWsMode={setAddWsMode} view={view} setView={setView} setTeamView={setTeamView} openPrefs={()=>setPrefsOpen(true)}/>
            <Err err={err} setErr={setErr}/>
            <TeamDetail
            activeTeam={activeTeam}
            teams={teams}
            seasons={seasons}
            tSeason={tSeason}
            setTSeason={setTSeason}
            members={members}
            todayStr={todayStr}
            weekAgoStr={weekAgoStr}
            entries={entries}
            wsUsers={wsUsers}
            AM={AM}
            calcScore={calcScore}
            calcAge={calcAge}
            pts={pts}
            uid={uid}
            knownWs={knownWs}
            activeWsId={activeWsId}
            setTeamView={setTeamView}
            leaveTeam={leaveTeam}
            showTSF={showTSF}
            setShowTSF={setShowTSF}
            setSForm={setSForm}
            sForm={sForm}
            sSaving={sSaving}
            sFlash={sFlash}
            createSeason={createSeason}
            deleteSeason={deleteSeason}
            seasonLabel={seasonLabel}
            seasonStatus={seasonStatus}
            daysLeft={daysLeft}
            setTTab={setTTab}
            tTab={tTab}
            setTPeriod={setTPeriod}
            tPeriod={tPeriod}
            MEDALS={MEDALS}
            RANK_CLR={RANK_CLR}
            fmtVal={fmtVal}
              prefs={prefs}
          />
            {prefsOpen&&<Prefs prefs={prefs} setPrefs={setPrefs} activeWsId={activeWsId} activeTeam={activeTeam} AM={AM} onClose={()=>setPrefsOpen(false)} onSave={()=>upsertPrefsToDb(prefs)} />} 
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
        <Header userMeta={userMeta} knownWs={knownWs} activeWs={activeWs} activeWsId={activeWsId} wsDropOpen={wsDropOpen} setWsDropOpen={setWsDropOpen} switchWs={switchWs} setStep={setStep} logout={logout} loading={loading} setAddWsMode={setAddWsMode} view={view} setView={setView} setTeamView={setTeamView} openPrefs={()=>setPrefsOpen(true)}/><Err err={err} setErr={setErr}/>
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