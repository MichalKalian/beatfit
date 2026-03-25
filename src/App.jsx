import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

const DEFAULT_PTS = { shyby:8,anglicky:5,kliky:2,dreepy:1.5,sedLehy:1,behKm:15,koloKm:4,plankSec:0.05 };
const ACTIVITY_META = [
  {key:"shyby",   label:"Shyby",    sub:"pull-ups", unit:"ks",icon:"⬆",color:"#c084fc"},
  {key:"anglicky",label:"Angličáky",sub:"burpees",  unit:"ks",icon:"★",color:"#f97316"},
  {key:"kliky",   label:"Kliky",    sub:"push-ups", unit:"ks",icon:"▲",color:"#38bdf8"},
  {key:"dreepy",  label:"Dřepy",    sub:"squats",   unit:"ks",icon:"↓",color:"#34d399"},
  {key:"sedLehy", label:"Sed-lehy", sub:"sit-ups",  unit:"ks",icon:"↔",color:"#a3e635"},
  {key:"behKm",   label:"Běh",      sub:"km",       unit:"km",icon:"▶",color:"#fbbf24"},
  {key:"koloKm",  label:"Kolo",     sub:"km",       unit:"km",icon:"○",color:"#fb7185"},
  {key:"plankSec",label:"Plank",    sub:"sekund",   unit:"s", icon:"—",color:"#e879f9"},
];

function getActivities(pts){return ACTIVITY_META.map(a=>({...a,pts:pts[a.key]??DEFAULT_PTS[a.key]}));}
function calcAge(dob){if(!dob)return 30;const b=new Date(dob),t=new Date();let age=t.getFullYear()-b.getFullYear();if(t<new Date(t.getFullYear(),b.getMonth(),b.getDate()))age--;return age;}
function ageMult(age){const a=parseInt(age)||30;if(a>=30)return 1+(a-30)*0.015;return Math.max(0.85,1-(30-a)*0.005);}
function calcScore(e,age,pts){if(!e)return 0;return getActivities(pts).reduce((s,a)=>s+(parseFloat(e[a.key])||0)*a.pts,0)*ageMult(age);}
function todayStr(){return new Date().toISOString().split("T")[0];}
function weekAgoStr(){const d=new Date();d.setDate(d.getDate()-7);return d.toISOString().split("T")[0];}
function dateMinusDays(n){const d=new Date();d.setDate(d.getDate()-n);return d.toISOString().split("T")[0];}
function calcStreak(days){
  if(!days||!Object.keys(days).length)return 0;
  let streak=0,cursor=new Date();
  if(!days[todayStr()])cursor.setDate(cursor.getDate()-1);
  while(true){const d=cursor.toISOString().split("T")[0];if(!days[d])break;streak++;cursor.setDate(cursor.getDate()-1);}
  return streak;
}
function randCode(){return Math.random().toString(36).slice(2,8).toUpperCase();}
function exportCSV(userName,days,pts,age){
  const headers=["Datum","Skóre",...ACTIVITY_META.map(a=>`${a.label} (${a.unit})`)];
  const rows=Object.entries(days).sort(([a],[b])=>a.localeCompare(b)).map(([date,e])=>
    [date,calcScore(e,age,pts).toFixed(2),...ACTIVITY_META.map(a=>parseFloat(e[a.key])||0)]);
  const csv=[headers,...rows].map(r=>r.join(";")).join("\n");
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=`beatfit_${userName}_${todayStr()}.csv`;a.click();URL.revokeObjectURL(url);
}
function seasonStatus(s){const t=todayStr();if(t<s.start_date)return"upcoming";if(t>s.end_date)return"finished";return"active";}
function seasonLabel(s){
  const st=seasonStatus(s);
  if(st==="upcoming")return{text:"Připravuje se",bg:"var(--color-background-warning)",color:"var(--color-text-warning)"};
  if(st==="finished")return{text:"Ukončeno",bg:"var(--color-background-secondary)",color:"var(--color-text-secondary)"};
  return{text:"Probíhá",bg:"var(--color-background-success)",color:"var(--color-text-success)"};
}
function daysLeft(s){return Math.ceil((new Date(s.end_date)-new Date(todayStr()))/(1000*60*60*24));}

const MEDALS=["🥇","🥈","🥉"],RANK_CLR=["#f59e0b","#94a3b8","#b87333"];
const FONT=`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');`;
const SK="bf_session";

export default function App(){
  // ── workspace + auth ─────────────────────────────────────────────────────
  const [workspace,setWorkspace]       = useState(null);
  const [wsInput,setWsInput]           = useState("");
  const [wsError,setWsError]           = useState("");
  const [wsLoading,setWsLoading]       = useState(false);
  const [pendingUser,setPendingUser]   = useState(null); // userId waiting for PIN
  const [pinInput,setPinInput]         = useState("");
  const [pinError,setPinError]         = useState(false);
  const [settingPin,setSettingPin]     = useState(false); // user has no PIN yet
  const [newPin,setNewPin]             = useState("");
  const [newPinC,setNewPinC]           = useState("");
  const [newRegPin,setNewRegPin]       = useState("");
  // ── data ─────────────────────────────────────────────────────────────────
  const [view,setView]                 = useState("login");
  const [uid,setUid]                   = useState(null);
  const [users,setUsers]               = useState({});
  const [entries,setEntries]           = useState({});
  const [pts,setPts]                   = useState(DEFAULT_PTS);
  const [goals,setGoals]               = useState({});
  const [teams,setTeams]               = useState({});
  const [members,setMembers]           = useState({});
  const [seasons,setSeasons]           = useState({});
  const [loading,setLoading]           = useState(true);
  const [saving,setSaving]             = useState(false);
  const [flash,setFlash]               = useState(false);
  const [period,setPeriod]             = useState("week");
  const [logDate,setLogDate]           = useState(todayStr());
  const [error,setError]               = useState(null);
  const [form,setForm]                 = useState({});
  const [newName,setNewName]           = useState("");
  const [newDob,setNewDob]             = useState("");
  const [goalInput,setGoalInput]       = useState("");
  const [goalFlash,setGoalFlash]       = useState(false);
  const [teamView,setTeamView]         = useState("list");
  const [activeTeam,setActiveTeam]     = useState(null);
  const [newTeamName,setNewTeamName]   = useState("");
  const [teamPeriod,setTeamPeriod]     = useState("week");
  const [teamTab,setTeamTab]           = useState("score");
  const [pendingInvite,setPendingInvite] = useState(null);
  const [inviteInfo,setInviteInfo]     = useState(null);
  const [lbMode,setLbMode]             = useState("global");
  const [teamSeasonMode,setTeamSeasonMode] = useState("all");
  const [seasonForm,setSeasonForm]     = useState({name:"",start_date:"",end_date:""});
  const [seasonSaving,setSeasonSaving] = useState(false);
  const [seasonFlash,setSeasonFlash]   = useState(false);
  const [showSeasonForm,setShowSeasonForm] = useState(false);
  const [showTSForm,setShowTSForm]     = useState(false);
  // ── admin ─────────────────────────────────────────────────────────────────
  const [adminPwd,setAdminPwd]         = useState("");
  const [adminErr,setAdminErr]         = useState(false);
  const [adminTab,setAdminTab]         = useState("workspaces");
  const [ptsEdit,setPtsEdit]           = useState({});
  const [ptsSaving,setPtsSaving]       = useState(false);
  const [ptsFlash,setPtsFlash]         = useState(false);
  const [allWs,setAllWs]               = useState({});   // id -> {name,code,userCount}
  const [allWsUsers,setAllWsUsers]     = useState({});   // wsId -> [{id,name,dob,entryCount}]
  const [adminSelWs,setAdminSelWs]     = useState(null);
  const [editUser,setEditUser]         = useState(null);
  const [editName,setEditName]         = useState("");
  const [editDob,setEditDob]           = useState("");
  const [newWsName,setNewWsName]       = useState("");
  const [newWsCode,setNewWsCode]       = useState(randCode());
  const [editWs,setEditWs]             = useState(null);
  const [editWsName,setEditWsName]     = useState("");
  const [editWsCode,setEditWsCode]     = useState("");

  // ── session restore ───────────────────────────────────────────────────────
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const inv=params.get("invite"), wsCode=params.get("ws");
    if(inv){setPendingInvite(inv);window.history.replaceState({},"",window.location.pathname);}
    if(wsCode){setWsInput(wsCode);}

    const session=JSON.parse(localStorage.getItem(SK)||"null");
    if(session?.userId&&session?.wsId){
      loadWsData(session.wsId).then(ok=>{
        if(ok){setUid(session.userId);setView("log");}
        else{localStorage.removeItem(SK);setLoading(false);}
      });
    } else setLoading(false);
  },[]);

  // ── load workspace data ───────────────────────────────────────────────────
  async function loadWsData(wsId){
    try{
      const[wsRes,uRes,tRes,sRes,stRes,tmRes]=await Promise.all([
        supabase.from("workspaces").select("*").eq("id",wsId).single(),
        supabase.from("users").select("*").eq("workspace_id",wsId),
        supabase.from("teams").select("*").eq("workspace_id",wsId),
        supabase.from("seasons").select("*").eq("workspace_id",wsId),
        supabase.from("settings").select("*").eq("key","pts"),
        supabase.from("team_members").select("*"),
      ]);
      if(wsRes.error)return false;
      setWorkspace({id:wsRes.data.id,name:wsRes.data.name,code:wsRes.data.code});

      const uMap={},uIds=[];
      for(const u of uRes.data||[]){uMap[u.id]={name:u.name,dob:u.dob,since:u.since,pin:u.pin||""};uIds.push(u.id);}
      setUsers(uMap);

      if(uIds.length>0){
        const[eRes,gRes]=await Promise.all([
          supabase.from("entries").select("*").in("user_id",uIds),
          supabase.from("goals").select("*").in("user_id",uIds),
        ]);
        const eMap={};
        for(const e of eRes.data||[]){if(!eMap[e.user_id])eMap[e.user_id]={};eMap[e.user_id][e.date]=e.data;}
        setEntries(eMap);
        const gMap={};
        for(const g of gRes.data||[])gMap[g.user_id]=g.weekly_goal;
        setGoals(gMap);
      }

      const tMap={};
      for(const t of tRes.data||[])tMap[t.id]={name:t.name,created_by:t.created_by,invite_code:t.invite_code};
      setTeams(tMap);

      const tIds=Object.keys(tMap),mMap={};
      for(const m of tmRes.data||[]){if(!tIds.includes(m.team_id))continue;if(!mMap[m.team_id])mMap[m.team_id]=[];mMap[m.team_id].push(m.user_id);}
      setMembers(mMap);

      const sMap={};
      for(const s of sRes.data||[])sMap[s.id]={name:s.name,start_date:s.start_date,end_date:s.end_date,created_by:s.created_by,team_id:s.team_id,scope:s.scope};
      setSeasons(sMap);

      if(stRes.data?.length>0)setPts({...DEFAULT_PTS,...stRes.data[0].value});
      setLoading(false);
      return true;
    }catch{return false;}
  }

  // ── enter workspace ───────────────────────────────────────────────────────
  async function enterWorkspace(){
    if(!wsInput.trim())return;
    setWsLoading(true);setWsError("");
    const{data,error}=await supabase.from("workspaces").select("*").eq("code",wsInput.trim().toUpperCase()).single();
    if(error||!data){setWsError("Kód workspace nebyl nalezen.");setWsLoading(false);return;}
    // check invite
    if(pendingInvite){
      const found=Object.entries(teams).find(([,t])=>t.invite_code===pendingInvite);
      if(!found){
        // teams not loaded yet for this workspace — load first
        const{data:teamData}=await supabase.from("teams").select("*").eq("workspace_id",data.id);
        const tf=teamData?.find(t=>t.invite_code===pendingInvite);
        if(tf)setInviteInfo({teamId:tf.id,teamName:tf.name});
      }
    }
    await loadWsData(data.id);
    setWsLoading(false);
  }

  // ── select user (click) ───────────────────────────────────────────────────
  function selectUser(userId){
    if(pendingUser===userId){setPendingUser(null);setPinInput("");setPinError(false);setSettingPin(false);return;}
    setPendingUser(userId);setPinInput("");setPinError(false);
    const u=users[userId];
    setSettingPin(!u?.pin);
    setNewPin("");setNewPinC("");
  }

  // ── verify PIN ────────────────────────────────────────────────────────────
  function verifyPin(){
    const u=users[pendingUser];
    if(pinInput===u.pin){loginAs(pendingUser);}
    else{setPinError(true);setPinInput("");}
  }

  // ── save new PIN (first time) ─────────────────────────────────────────────
  async function saveNewPin(){
    if(newPin.length<4||newPin!==newPinC){setError("PINy se neshodují nebo jsou kratší než 4 číslice.");return;}
    const{error:e}=await supabase.from("users").update({pin:newPin}).eq("id",pendingUser);
    if(e){setError("Nepodařilo se uložit PIN.");return;}
    setUsers(u=>({...u,[pendingUser]:{...u[pendingUser],pin:newPin}}));
    loginAs(pendingUser);
  }

  function loginAs(userId){
    setUid(userId);
    setForm(entries[userId]?.[logDate]||{});
    setGoalInput(goals[userId]||"");
    localStorage.setItem(SK,JSON.stringify({userId,wsId:workspace.id}));
    setPendingUser(null);setPinInput("");setSettingPin(false);
    if(pendingInvite)joinTeamByCode(pendingInvite);
    setView("log");
  }

  function logout(){
    setUid(null);setWorkspace(null);setUsers({});setEntries({});setTeams({});setMembers({});setSeasons({});setGoals({});
    setPendingUser(null);setWsInput("");setPinInput("");setSettingPin(false);setInviteInfo(null);
    localStorage.removeItem(SK);setView("login");
  }

  // ── register ─────────────────────────────────────────────────────────────
  async function register(){
    if(!newName.trim()||!newDob||newRegPin.length<4)return;
    const dup=Object.values(users).some(u=>u.name.toLowerCase()===newName.trim().toLowerCase());
    if(dup){setError(`Hráč se jménem "${newName.trim()}" již existuje.`);return;}
    setSaving(true);setError(null);
    const id="u"+Date.now();
    const{error:e}=await supabase.from("users").insert({id,name:newName.trim(),dob:newDob,since:todayStr(),pin:newRegPin,workspace_id:workspace.id});
    if(e){setError("Registrace se nezdařila.");setSaving(false);return;}
    setUsers(u=>({...u,[id]:{name:newName.trim(),dob:newDob,since:todayStr(),pin:newRegPin}}));
    setNewName("");setNewDob("");setNewRegPin("");
    loginAs(id);setSaving(false);
  }

  // ── save entry ────────────────────────────────────────────────────────────
  async function saveEntry(){
    setSaving(true);setError(null);
    const t=logDate||todayStr();
    const{error:e}=await supabase.from("entries").upsert({user_id:uid,date:t,data:form},{onConflict:"user_id,date"});
    if(e){setError("Uložení se nezdařilo.");setSaving(false);return;}
    setEntries(prev=>({...prev,[uid]:{...(prev[uid]||{}),[t]:form}}));
    setFlash(true);setTimeout(()=>setFlash(false),2000);setSaving(false);
  }

  async function deleteEntry(){
    if(!window.confirm(`Opravdu smazat záznam za ${logDate}?`))return;
    setSaving(true);
    const{error:e}=await supabase.from("entries").delete().eq("user_id",uid).eq("date",logDate);
    if(e){setError("Smazání se nezdařilo.");setSaving(false);return;}
    setEntries(prev=>{const u={...prev,[uid]:{...(prev[uid]||{})}};delete u[uid][logDate];return u;});
    setForm({});setSaving(false);
  }

  async function saveGoal(){
    const val=parseFloat(goalInput)||0;
    const{error:e}=await supabase.from("goals").upsert({user_id:uid,weekly_goal:val},{onConflict:"user_id"});
    if(e){setError("Uložení cíle selhalo.");return;}
    setGoals(g=>({...g,[uid]:val}));
    setGoalFlash(true);setTimeout(()=>setGoalFlash(false),2000);
  }

  // ── admin ─────────────────────────────────────────────────────────────────
  async function loginAdmin(){
    if(adminPwd!==import.meta.env.VITE_ADMIN_PASSWORD){setAdminErr(true);return;}
    setAdminErr(false);setPtsEdit({...pts});
    const[wsRes,uRes,eRes]=await Promise.all([
      supabase.from("workspaces").select("*"),
      supabase.from("users").select("*"),
      supabase.from("entries").select("user_id"),
    ]);
    const entryCounts={};
    for(const e of eRes.data||[]){entryCounts[e.user_id]=(entryCounts[e.user_id]||0)+1;}
    const wsMap={};
    for(const w of wsRes.data||[])wsMap[w.id]={name:w.name,code:w.code};
    setAllWs(wsMap);
    const wsUsersMap={};
    for(const u of uRes.data||[]){
      if(!wsUsersMap[u.workspace_id])wsUsersMap[u.workspace_id]=[];
      wsUsersMap[u.workspace_id].push({id:u.id,name:u.name,dob:u.dob,pin:u.pin,entryCount:entryCounts[u.id]||0});
    }
    setAllWsUsers(wsUsersMap);
    setView("admin");
  }

  async function createWorkspace(){
    if(!newWsName.trim()||!newWsCode.trim())return;
    const id="ws"+Date.now();
    const{error:e}=await supabase.from("workspaces").insert({id,name:newWsName.trim(),code:newWsCode.trim().toUpperCase()});
    if(e){setError(e.message.includes("unique")?"Kód již existuje.":"Vytvoření selhalo.");return;}
    setAllWs(w=>({...w,[id]:{name:newWsName.trim(),code:newWsCode.trim().toUpperCase()}}));
    setAllWsUsers(w=>({...w,[id]:[]}));
    setNewWsName("");setNewWsCode(randCode());
  }

  async function updateWorkspace(){
    if(!editWsName.trim()||!editWsCode.trim())return;
    const{error:e}=await supabase.from("workspaces").update({name:editWsName.trim(),code:editWsCode.trim().toUpperCase()}).eq("id",editWs);
    if(e){setError(e.message.includes("unique")?"Kód již existuje.":"Uložení selhalo.");return;}
    setAllWs(w=>({...w,[editWs]:{...w[editWs],name:editWsName.trim(),code:editWsCode.trim().toUpperCase()}}));
    setEditWs(null);
  }

  async function deleteWorkspace(wsId){
    if(!window.confirm(`Opravdu smazat workspace "${allWs[wsId]?.name}" včetně VŠECH dat?`))return;
    const uIds=(allWsUsers[wsId]||[]).map(u=>u.id);
    if(uIds.length>0){
      await Promise.all([
        supabase.from("entries").delete().in("user_id",uIds),
        supabase.from("goals").delete().in("user_id",uIds),
        supabase.from("team_members").delete().in("user_id",uIds),
      ]);
      await supabase.from("users").delete().eq("workspace_id",wsId);
    }
    await Promise.all([
      supabase.from("seasons").delete().eq("workspace_id",wsId),
      supabase.from("teams").delete().eq("workspace_id",wsId),
    ]);
    await supabase.from("workspaces").delete().eq("id",wsId);
    setAllWs(w=>{const n={...w};delete n[wsId];return n;});
    setAllWsUsers(w=>{const n={...w};delete n[wsId];return n;});
    if(adminSelWs===wsId)setAdminSelWs(null);
  }

  async function savePts(){
    setPtsSaving(true);
    const merged={...pts,...ptsEdit};
    const{error:e}=await supabase.from("settings").upsert({key:"pts",value:merged},{onConflict:"key"});
    if(e){setError("Uložení koeficientů selhalo.");setPtsSaving(false);return;}
    setPts(merged);setPtsFlash(true);setTimeout(()=>setPtsFlash(false),2000);setPtsSaving(false);
  }

  async function saveEditUser(){
    if(!editName.trim()||!editDob)return;
    const wsId=Object.keys(allWsUsers).find(wid=>(allWsUsers[wid]||[]).some(u=>u.id===editUser));
    const dup=(allWsUsers[wsId]||[]).some(u=>u.id!==editUser&&u.name.toLowerCase()===editName.trim().toLowerCase());
    if(dup){setError(`Jméno "${editName.trim()}" již existuje.`);return;}
    const{error:e}=await supabase.from("users").update({name:editName.trim(),dob:editDob}).eq("id",editUser);
    if(e){setError("Uložení selhalo.");return;}
    setAllWsUsers(w=>({...w,[wsId]:(w[wsId]||[]).map(u=>u.id===editUser?{...u,name:editName.trim(),dob:editDob}:u)}));
    setEditUser(null);
  }

  async function resetPin(userId,wsId){
    const np=prompt("Zadej nový PIN pro tohoto hráče (min. 4 číslice):");
    if(!np||np.length<4)return;
    const{error:e}=await supabase.from("users").update({pin:np}).eq("id",userId);
    if(e){setError("Reset PINu selhal.");return;}
    setAllWsUsers(w=>({...w,[wsId]:(w[wsId]||[]).map(u=>u.id===userId?{...u,pin:np}:u)}));
  }

  async function deleteAdminUser(userId,wsId){
    const u=(allWsUsers[wsId]||[]).find(u=>u.id===userId);
    if(!window.confirm(`Opravdu smazat hráče "${u?.name}"?`))return;
    await Promise.all([
      supabase.from("entries").delete().eq("user_id",userId),
      supabase.from("goals").delete().eq("user_id",userId),
      supabase.from("team_members").delete().eq("user_id",userId),
    ]);
    await supabase.from("users").delete().eq("id",userId);
    setAllWsUsers(w=>({...w,[wsId]:(w[wsId]||[]).filter(u=>u.id!==userId)}));
    setEditUser(null);
  }

  // ── teams ─────────────────────────────────────────────────────────────────
  async function createTeam(){
    if(!newTeamName.trim())return;
    setSaving(true);setError(null);
    const id="t"+Date.now(),invite_code=randCode();
    const{error:e}=await supabase.from("teams").insert({id,name:newTeamName.trim(),created_by:uid,invite_code,workspace_id:workspace.id});
    if(e){setError("Vytvoření týmu selhalo.");setSaving(false);return;}
    await supabase.from("team_members").insert({team_id:id,user_id:uid});
    setTeams(t=>({...t,[id]:{name:newTeamName.trim(),created_by:uid,invite_code}}));
    setMembers(m=>({...m,[id]:[uid]}));
    setNewTeamName("");setActiveTeam(id);setTeamView("detail");setTeamTab("score");setSaving(false);
  }

  async function joinTeamByCode(code){
    const team=Object.entries(teams).find(([,t])=>t.invite_code===code);
    if(!team){setError("Pozvánka nebyla nalezena.");setPendingInvite(null);setInviteInfo(null);return;}
    const[teamId]=team;
    if((members[teamId]||[]).includes(uid)){setPendingInvite(null);setInviteInfo(null);setActiveTeam(teamId);setTeamView("detail");setView("teams");return;}
    const{error:e}=await supabase.from("team_members").insert({team_id:teamId,user_id:uid});
    if(e){setError("Přihlášení do týmu selhalo.");return;}
    setMembers(m=>({...m,[teamId]:[...(m[teamId]||[]),uid]}));
    setPendingInvite(null);setInviteInfo(null);setActiveTeam(teamId);setTeamView("detail");setView("teams");
  }

  async function leaveTeam(teamId){
    if(!window.confirm(`Opravdu opustit tým "${teams[teamId]?.name}"?`))return;
    await supabase.from("team_members").delete().eq("team_id",teamId).eq("user_id",uid);
    setMembers(m=>({...m,[teamId]:(m[teamId]||[]).filter(id=>id!==uid)}));
    setTeamView("list");
  }

  // ── seasons ───────────────────────────────────────────────────────────────
  async function createSeason(teamId=null){
    if(!seasonForm.name.trim()||!seasonForm.start_date||!seasonForm.end_date)return;
    if(seasonForm.end_date<=seasonForm.start_date){setError("Datum konce musí být po datu začátku.");return;}
    setSeasonSaving(true);setError(null);
    const id="s"+Date.now();
    const ns={id,name:seasonForm.name.trim(),start_date:seasonForm.start_date,end_date:seasonForm.end_date,created_by:uid,team_id:teamId||null,scope:teamId?"team":"global",workspace_id:workspace.id};
    const{error:e}=await supabase.from("seasons").insert(ns);
    if(e){setError("Vytvoření sezóny selhalo.");setSeasonSaving(false);return;}
    setSeasons(s=>({...s,[id]:{name:ns.name,start_date:ns.start_date,end_date:ns.end_date,created_by:uid,team_id:teamId||null,scope:ns.scope}}));
    setSeasonForm({name:"",start_date:"",end_date:""});
    setShowSeasonForm(false);setShowTSForm(false);
    setSeasonFlash(true);setTimeout(()=>setSeasonFlash(false),2000);setSeasonSaving(false);
  }

  async function deleteSeason(id){
    if(!window.confirm(`Opravdu smazat výzvu "${seasons[id]?.name}"?`))return;
    await supabase.from("seasons").delete().eq("id",id);
    setSeasons(s=>{const n={...s};delete n[id];return n;});
  }

  // ── leaderboard helper ────────────────────────────────────────────────────
  function buildLB(filterIds,fromDate,toDate){
    const t=todayStr(),w=weekAgoStr(),result={};
    for(const[id,days] of Object.entries(entries)){
      if(filterIds&&!filterIds.includes(id))continue;
      const u=users[id];if(!u)continue;
      let sc=0;const acts={};
      for(const a of ACTIVITY_META)acts[a.key]=0;
      for(const[date,e] of Object.entries(days)){
        if(fromDate&&toDate){if(date<fromDate||date>toDate)continue;}
        else{if(period==="today"&&date!==t)continue;if(period==="week"&&date<w)continue;}
        sc+=calcScore(e,calcAge(u.dob),pts);
        for(const a of ACTIVITY_META)acts[a.key]+=parseFloat(e[a.key])||0;
      }
      result[id]={sc,name:u.name,age:calcAge(u.dob),acts};
    }
    return result;
  }

  // ── styles ────────────────────────────────────────────────────────────────
  const P={padding:"1rem",maxWidth:480,margin:"0 auto"};
  const topBarStyle={display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.75rem"};
  const navWrap={display:"flex",gap:3,background:"var(--color-background-secondary)",padding:3,borderRadius:"var(--border-radius-md)",marginBottom:"1rem"};
  const nB=(active)=>({flex:1,fontSize:12,fontWeight:500,border:"none",cursor:"pointer",padding:"7px 0",borderRadius:6,background:active?"var(--color-background-primary)":"transparent",color:active?"var(--color-text-primary)":"var(--color-text-secondary)",boxShadow:active?"0 0 0 0.5px var(--color-border-tertiary)":"none"});
  const cB=(active)=>({flex:1,fontSize:12,fontWeight:500,cursor:"pointer",padding:"6px 0",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",background:active?"var(--color-text-primary)":"transparent",color:active?"var(--color-background-primary)":"var(--color-text-secondary)"});
  const sc={background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)",padding:"0.75rem 1rem"};
  const card={background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"1rem 1.25rem"};
  const pBtn={display:"block",width:"100%",padding:"11px",fontWeight:700,fontSize:14,background:"var(--color-text-primary)",color:"var(--color-background-primary)",border:"none",borderRadius:"var(--border-radius-md)",cursor:"pointer",letterSpacing:0.3};
  const inp={display:"block",width:"100%",boxSizing:"border-box",padding:"9px 12px",fontSize:14,background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",color:"var(--color-text-primary)",outline:"none",fontFamily:"'DM Sans',sans-serif"};
  const SL={margin:"0 0 6px",fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:"var(--color-text-secondary)"};
  const Err=()=>error?(<div style={{background:"var(--color-background-danger)",color:"var(--color-text-danger)",padding:"8px 12px",borderRadius:"var(--border-radius-md)",fontSize:13,marginBottom:"1rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>{error}</span><button onClick={()=>setError(null)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--color-text-danger)",fontSize:16,padding:"0 0 0 8px"}}>×</button></div>):null;

  const SeasonFormCard=({onSubmit,onCancel})=>(
    <div style={{...card,marginBottom:"1rem"}}>
      <p style={{...SL,marginBottom:10}}>Nová výzva</p>
      <input placeholder="Název výzvy" value={seasonForm.name} onChange={e=>setSeasonForm(f=>({...f,name:e.target.value}))} style={{...inp,marginBottom:8}}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        <div><label style={{display:"block",fontSize:11,color:"var(--color-text-secondary)",marginBottom:4,fontWeight:600}}>Začátek</label><input type="date" value={seasonForm.start_date} onChange={e=>setSeasonForm(f=>({...f,start_date:e.target.value}))} style={{...inp,fontFamily:"'DM Mono',monospace"}}/></div>
        <div><label style={{display:"block",fontSize:11,color:"var(--color-text-secondary)",marginBottom:4,fontWeight:600}}>Konec</label><input type="date" value={seasonForm.end_date} onChange={e=>setSeasonForm(f=>({...f,end_date:e.target.value}))} style={{...inp,fontFamily:"'DM Mono',monospace"}}/></div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={onSubmit} disabled={!seasonForm.name.trim()||!seasonForm.start_date||!seasonForm.end_date||seasonSaving} style={{...pBtn,flex:1}}>{seasonSaving?"Vytvářím…":seasonFlash?"✓ Vytvořeno!":"Vytvořit výzvu →"}</button>
        <button onClick={onCancel} style={{padding:"11px 14px",fontWeight:600,fontSize:13,background:"transparent",color:"var(--color-text-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",cursor:"pointer",flexShrink:0}}>Zrušit</button>
      </div>
    </div>
  );

  if(loading) return <div style={{...P,textAlign:"center",paddingTop:"3rem",color:"var(--color-text-secondary)",fontSize:14}}>Načítám data…</div>;

  const user=users[uid];
  const ACTIVITIES=getActivities(pts);
  const myTeamIds=Object.keys(members).filter(tid=>(members[tid]||[]).includes(uid));
  const globalSeasons=Object.entries(seasons).filter(([,s])=>s.scope==="global");

  // ── LOGIN ────────────────────────────────────────────────────────────────
  if(view==="login") return(
    <div style={P}>
      <style>{FONT}</style>
      <div style={{textAlign:"center",paddingTop:"0.5rem",marginBottom:"2rem"}}>
        <div style={{display:"inline-block",fontSize:9,fontWeight:700,letterSpacing:3,color:"var(--color-text-secondary)",border:"0.5px solid var(--color-border-secondary)",padding:"3px 12px",borderRadius:20,marginBottom:10}}>FIREMNÍ SOUTĚŽ</div>
        <h1 style={{margin:"0 0 4px",fontSize:38,fontWeight:800,letterSpacing:-1.5,fontFamily:"'DM Sans',sans-serif",color:"var(--color-text-primary)"}}>Beatfit</h1>
        <p style={{margin:0,fontSize:13,color:"var(--color-text-secondary)"}}>Zaznamenávej sporty, porovnávej výsledky</p>
      </div>
      <Err/>

      {/* workspace code entry OR user list */}
      {!workspace?(
        <div style={card}>
          <p style={{...SL,marginBottom:10}}>Zadej kód skupiny</p>
          {inviteInfo&&<div style={{background:"var(--color-background-success)",border:"0.5px solid var(--color-border-success)",borderRadius:"var(--border-radius-md)",padding:"10px 12px",marginBottom:10}}><p style={{margin:0,fontSize:13,color:"var(--color-text-success)",fontWeight:600}}>Pozvánka do týmu {inviteInfo.teamName}</p><p style={{margin:0,fontSize:11,color:"var(--color-text-success)"}}>Zadej kód skupiny a přihlas se — automaticky se připojíš.</p></div>}
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <input placeholder="Kód skupiny (např. BEATFIT)" value={wsInput} onChange={e=>{setWsInput(e.target.value.toUpperCase());setWsError("");}}
              onKeyDown={e=>e.key==="Enter"&&enterWorkspace()}
              style={{...inp,flex:1,fontFamily:"'DM Mono',monospace",letterSpacing:2,borderColor:wsError?"var(--color-border-danger)":"var(--color-border-tertiary)"}}/>
            <button onClick={enterWorkspace} disabled={wsLoading||!wsInput.trim()} style={{...pBtn,width:"auto",padding:"9px 16px",flexShrink:0}}>{wsLoading?"…":"→"}</button>
          </div>
          {wsError&&<p style={{margin:0,fontSize:12,color:"var(--color-text-danger)"}}>{wsError}</p>}
          <p style={{margin:"8px 0 0",fontSize:11,color:"var(--color-text-secondary)"}}>Kód dostaneš od osoby, která skupinu vytvořila.</p>
        </div>
      ):(
        <>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1rem"}}>
            <button onClick={()=>{setWorkspace(null);setPendingUser(null);}} style={{fontSize:14,background:"none",border:"none",cursor:"pointer",color:"var(--color-text-secondary)",padding:0}}>‹</button>
            <div style={{flex:1}}><p style={{margin:0,fontSize:16,fontWeight:700,fontFamily:"'DM Sans',sans-serif",color:"var(--color-text-primary)"}}>{workspace.name}</p><p style={{margin:0,fontSize:11,fontFamily:"'DM Mono',monospace",color:"var(--color-text-secondary)",letterSpacing:1}}>{workspace.code}</p></div>
          </div>

          {/* user list */}
          {Object.keys(users).length>0&&(
            <div style={{marginBottom:"1.5rem"}}>
              <p style={SL}>Přihlásit se</p>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {Object.entries(users).sort(([,a],[,b])=>a.name.localeCompare(b.name)).map(([id,u])=>{
                  const streak=calcStreak(entries[id]||{});
                  const isSelected=pendingUser===id;
                  return(
                    <div key={id}>
                      <button onClick={()=>selectUser(id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:isSelected?"var(--color-background-info)":"var(--color-background-secondary)",border:`0.5px solid ${isSelected?"var(--color-border-info)":"var(--color-border-tertiary)"}`,borderRadius:"var(--border-radius-md)",cursor:"pointer",width:"100%"}}>
                        <div style={{width:32,height:32,borderRadius:"50%",background:"var(--color-background-info)",color:"var(--color-text-info)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0}}>{u.name[0]}</div>
                        <span style={{fontWeight:600,color:"var(--color-text-primary)",fontFamily:"'DM Sans',sans-serif",fontSize:14}}>{u.name}</span>
                        {streak>1&&<span style={{fontSize:11,background:"#f97316"+"22",color:"#f97316",padding:"2px 7px",borderRadius:20,fontWeight:700}}>{streak}d 🔥</span>}
                        <span style={{marginLeft:"auto",fontSize:12,color:"var(--color-text-secondary)"}}>{calcAge(u.dob)} let</span>
                      </button>
                      {/* inline PIN entry */}
                      {isSelected&&(
                        <div style={{padding:"12px 14px",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-info)",borderTop:"none",borderRadius:"0 0 var(--border-radius-md) var(--border-radius-md)"}}>
                          {settingPin?(
                            <>
                              <p style={{margin:"0 0 8px",fontSize:12,color:"var(--color-text-secondary)"}}>Tento účet ještě nemá PIN. Nastav si ho.</p>
                              <input type="password" inputMode="numeric" maxLength={6} placeholder="Nový PIN (min. 4 číslice)" value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,""))} style={{...inp,marginBottom:6,letterSpacing:4,fontFamily:"'DM Mono',monospace"}}/>
                              <input type="password" inputMode="numeric" maxLength={6} placeholder="Potvrď PIN" value={newPinC} onChange={e=>setNewPinC(e.target.value.replace(/\D/g,""))} style={{...inp,marginBottom:8,letterSpacing:4,fontFamily:"'DM Mono',monospace"}}/>
                              {error&&<p style={{margin:"0 0 6px",fontSize:12,color:"var(--color-text-danger)"}}>{error}</p>}
                              <button onClick={saveNewPin} disabled={newPin.length<4||newPin!==newPinC} style={pBtn}>Uložit PIN a přihlásit →</button>
                            </>
                          ):(
                            <>
                              <input type="password" inputMode="numeric" maxLength={6} placeholder="Zadej PIN" value={pinInput}
                                onChange={e=>{setPinInput(e.target.value.replace(/\D/g,""));setPinError(false);}}
                                onKeyDown={e=>e.key==="Enter"&&verifyPin()}
                                autoFocus
                                style={{...inp,marginBottom:pinError?6:8,letterSpacing:4,fontFamily:"'DM Mono',monospace",borderColor:pinError?"var(--color-border-danger)":"var(--color-border-tertiary)"}}/>
                              {pinError&&<p style={{margin:"0 0 6px",fontSize:12,color:"var(--color-text-danger)"}}>Nesprávný PIN.</p>}
                              <button onClick={verifyPin} disabled={pinInput.length<4} style={pBtn}>Přihlásit →</button>
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

          {/* register */}
          <div style={card}>
            <p style={{...SL,marginBottom:10}}>Nový hráč</p>
            <input placeholder="Celé jméno" value={newName} onChange={e=>setNewName(e.target.value)} style={{...inp,marginBottom:8}}/>
            <label style={{display:"block",fontSize:11,color:"var(--color-text-secondary)",marginBottom:4,fontWeight:600}}>Datum narození</label>
            <input type="date" value={newDob} onChange={e=>setNewDob(e.target.value)} style={{...inp,marginBottom:8,fontFamily:"'DM Mono',monospace"}}/>
            <input type="password" inputMode="numeric" maxLength={6} placeholder="PIN (min. 4 číslice)" value={newRegPin}
              onChange={e=>setNewRegPin(e.target.value.replace(/\D/g,""))}
              style={{...inp,marginBottom:12,letterSpacing:4,fontFamily:"'DM Mono',monospace"}}/>
            <button onClick={register} disabled={!newName.trim()||!newDob||newRegPin.length<4||saving} style={pBtn}>{saving?"Registruji…":"Zaregistrovat se →"}</button>
          </div>
        </>
      )}

      {/* admin */}
      <div style={{...card,marginTop:"1rem"}}>
        <p style={{...SL,marginBottom:10}}>Administrátor</p>
        <input type="password" placeholder="Heslo" value={adminPwd} onChange={e=>{setAdminPwd(e.target.value);setAdminErr(false);}} onKeyDown={e=>e.key==="Enter"&&loginAdmin()} style={{...inp,marginBottom:8,borderColor:adminErr?"var(--color-border-danger)":"var(--color-border-tertiary)"}}/>
        {adminErr&&<p style={{margin:"0 0 8px",fontSize:12,color:"var(--color-text-danger)"}}>Nesprávné heslo</p>}
        <button onClick={loginAdmin} style={pBtn}>Přihlásit jako admin →</button>
      </div>
    </div>
  );

  // ── ADMIN ────────────────────────────────────────────────────────────────
  if(view==="admin") return(
    <div style={P}>
      <style>{FONT}</style>
      <div style={topBarStyle}>
        <p style={{margin:0,fontWeight:700,fontSize:15,fontFamily:"'DM Sans',sans-serif",color:"var(--color-text-primary)"}}>Administrátor</p>
        <button onClick={()=>{setView("login");setAdminPwd("");}} style={{fontSize:11,color:"var(--color-text-secondary)",background:"transparent",border:"0.5px solid var(--color-border-tertiary)",padding:"4px 10px",borderRadius:20,cursor:"pointer"}}>Odhlásit</button>
      </div>
      <Err/>
      <div style={{...navWrap,marginBottom:"1rem"}}>
        {[["workspaces","Skupiny"],["pts","Koeficienty"],["players","Hráči"]].map(([t,l])=>(
          <button key={t} onClick={()=>{setAdminTab(t);setEditUser(null);setEditWs(null);setError(null);}} style={nB(adminTab===t)}>{l}</button>
        ))}
      </div>

      {/* WORKSPACES TAB */}
      {adminTab==="workspaces"&&<>
        <p style={SL}>Skupiny (workspaces)</p>
        {editWs?(
          <div style={{...card,marginBottom:"1rem"}}>
            <p style={{...SL,marginBottom:10}}>Upravit skupinu</p>
            <input placeholder="Název" value={editWsName} onChange={e=>setEditWsName(e.target.value)} style={{...inp,marginBottom:8}}/>
            <input placeholder="Kód" value={editWsCode} onChange={e=>setEditWsCode(e.target.value.toUpperCase())} style={{...inp,marginBottom:12,fontFamily:"'DM Mono',monospace",letterSpacing:2}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={updateWorkspace} style={{...pBtn,flex:1}}>Uložit</button>
              <button onClick={()=>setEditWs(null)} style={{flex:1,padding:"11px",fontWeight:600,fontSize:14,background:"transparent",color:"var(--color-text-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",cursor:"pointer"}}>Zrušit</button>
            </div>
          </div>
        ):(
          <>
            <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:"1.5rem"}}>
              {Object.entries(allWs).map(([id,w])=>{
                const uc=(allWsUsers[id]||[]).length;
                return(
                  <div key={id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)"}}>
                    <div style={{flex:1}}>
                      <p style={{margin:0,fontSize:14,fontWeight:700,fontFamily:"'DM Sans',sans-serif",color:"var(--color-text-primary)"}}>{w.name}</p>
                      <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)",fontFamily:"'DM Mono',monospace"}}>{w.code} · {uc} {uc===1?"hráč":"hráčů"}</p>
                    </div>
                    <button onClick={()=>{setEditWs(id);setEditWsName(w.name);setEditWsCode(w.code);}} style={{fontSize:11,padding:"4px 10px",background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:6,cursor:"pointer",color:"var(--color-text-secondary)"}}>Upravit</button>
                    <button onClick={()=>deleteWorkspace(id)} style={{fontSize:11,padding:"4px 10px",background:"transparent",border:"0.5px solid var(--color-border-danger)",borderRadius:6,cursor:"pointer",color:"var(--color-text-danger)"}}>Smazat</button>
                  </div>
                );
              })}
              {Object.keys(allWs).length===0&&<p style={{fontSize:13,color:"var(--color-text-secondary)"}}>Zatím žádné skupiny.</p>}
            </div>
            <div style={card}>
              <p style={{...SL,marginBottom:10}}>Nová skupina</p>
              <input placeholder="Název skupiny" value={newWsName} onChange={e=>setNewWsName(e.target.value)} style={{...inp,marginBottom:8}}/>
              <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
                <input placeholder="Kód" value={newWsCode} onChange={e=>setNewWsCode(e.target.value.toUpperCase())} style={{...inp,flex:1,fontFamily:"'DM Mono',monospace",letterSpacing:2}}/>
                <button onClick={()=>setNewWsCode(randCode())} style={{fontSize:11,padding:"9px 10px",background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",cursor:"pointer",color:"var(--color-text-secondary)",flexShrink:0,whiteSpace:"nowrap"}}>↻ Náhodný</button>
              </div>
              <button onClick={createWorkspace} disabled={!newWsName.trim()||!newWsCode.trim()} style={pBtn}>Vytvořit skupinu →</button>
            </div>
          </>
        )}
      </>}

      {/* PLAYERS TAB */}
      {adminTab==="players"&&<>
        <p style={SL}>Vyberte skupinu</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:"1rem"}}>
          {Object.entries(allWs).map(([id,w])=>(
            <button key={id} onClick={()=>setAdminSelWs(id)} style={{...cB(adminSelWs===id),flex:"none",padding:"5px 14px",fontSize:12}}>{w.name}</button>
          ))}
        </div>
        {adminSelWs&&<>
          {editUser?(
            <div style={card}>
              <p style={{...SL,marginBottom:10}}>Upravit hráče</p>
              <input value={editName} onChange={e=>setEditName(e.target.value)} style={{...inp,marginBottom:8}} placeholder="Jméno"/>
              <label style={{display:"block",fontSize:11,color:"var(--color-text-secondary)",marginBottom:4,fontWeight:600}}>Datum narození</label>
              <input type="date" value={editDob} onChange={e=>setEditDob(e.target.value)} style={{...inp,marginBottom:12,fontFamily:"'DM Mono',monospace"}}/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={saveEditUser} style={{...pBtn,flex:1}}>Uložit</button>
                <button onClick={()=>setEditUser(null)} style={{flex:1,padding:"11px",fontWeight:600,fontSize:14,background:"transparent",color:"var(--color-text-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",cursor:"pointer"}}>Zrušit</button>
              </div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {(allWsUsers[adminSelWs]||[]).sort((a,b)=>a.name.localeCompare(b.name)).map(u=>(
                <div key={u.id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)"}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:"var(--color-background-info)",color:"var(--color-text-info)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{u.name[0]}</div>
                  <div style={{flex:1}}><p style={{margin:0,fontSize:13,fontWeight:700,color:"var(--color-text-primary)",fontFamily:"'DM Sans',sans-serif"}}>{u.name}</p><p style={{margin:0,fontSize:10,color:"var(--color-text-secondary)"}}>{calcAge(u.dob)} let · {u.entryCount} záznamů · PIN: {u.pin?"nastaven":"❗ není"}</p></div>
                  <button onClick={()=>resetPin(u.id,adminSelWs)} style={{fontSize:10,padding:"3px 8px",background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:6,cursor:"pointer",color:"var(--color-text-secondary)"}}>PIN</button>
                  <button onClick={()=>{setEditUser(u.id);setEditName(u.name);setEditDob(u.dob);}} style={{fontSize:10,padding:"3px 8px",background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:6,cursor:"pointer",color:"var(--color-text-secondary)"}}>Upravit</button>
                  <button onClick={()=>deleteAdminUser(u.id,adminSelWs)} style={{fontSize:10,padding:"3px 8px",background:"transparent",border:"0.5px solid var(--color-border-danger)",borderRadius:6,cursor:"pointer",color:"var(--color-text-danger)"}}>Smazat</button>
                </div>
              ))}
              {(allWsUsers[adminSelWs]||[]).length===0&&<p style={{fontSize:13,color:"var(--color-text-secondary)"}}>Skupina zatím nemá žádné hráče.</p>}
            </div>
          )}
        </>}
      </>}

      {/* PTS TAB */}
      {adminTab==="pts"&&<>
        <p style={SL}>Body za jednotku</p>
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:"1rem"}}>
          {ACTIVITY_META.map(a=>{
            const current=ptsEdit[a.key]??pts[a.key]??DEFAULT_PTS[a.key];
            const changed=ptsEdit[a.key]!==undefined&&ptsEdit[a.key]!==DEFAULT_PTS[a.key];
            return(
              <div key={a.key} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"var(--color-background-primary)",border:`0.5px solid ${changed?"var(--color-border-warning)":"var(--color-border-tertiary)"}`,borderRadius:"var(--border-radius-md)"}}>
                <div style={{width:34,height:34,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,background:a.color+"22",color:a.color,flexShrink:0}}>{a.icon}</div>
                <div style={{flex:1}}><p style={{margin:0,fontSize:13,fontWeight:700,fontFamily:"'DM Sans',sans-serif",color:"var(--color-text-primary)"}}>{a.label}</p><p style={{margin:0,fontSize:10,color:"var(--color-text-secondary)"}}>výchozí: {DEFAULT_PTS[a.key]} b/{a.unit}</p></div>
                <input type="number" min="0" step="0.01" value={current} onChange={e=>setPtsEdit(p=>({...p,[a.key]:parseFloat(e.target.value)||0}))} style={{width:70,textAlign:"right",padding:"7px 8px",fontSize:14,background:"var(--color-background-secondary)",border:`0.5px solid ${changed?"var(--color-border-warning)":"var(--color-border-tertiary)"}`,borderRadius:"var(--border-radius-md)",color:"var(--color-text-primary)",outline:"none",fontFamily:"'DM Mono',monospace"}}/>
                <span style={{fontSize:11,color:"var(--color-text-secondary)",minWidth:28}}>b/{a.unit}</span>
              </div>
            );
          })}
        </div>
        <button onClick={()=>setPtsEdit({...DEFAULT_PTS})} style={{...pBtn,background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",border:"0.5px solid var(--color-border-tertiary)",marginBottom:8}}>Obnovit výchozí hodnoty</button>
        <button onClick={savePts} disabled={ptsSaving} style={pBtn}>{ptsSaving?"Ukládám…":ptsFlash?"✓ Uloženo!":"Uložit koeficienty"}</button>
        <p style={{marginTop:12,fontSize:11,color:"var(--color-text-secondary)",textAlign:"center"}}>Koeficienty platí globálně pro všechny skupiny.</p>
      </>}
    </div>
  );

  // ── shared nav ────────────────────────────────────────────────────────────
  const TopBar=()=>(
    <div style={topBarStyle}>
      <div>
        <p style={{margin:0,fontWeight:700,fontSize:15,fontFamily:"'DM Sans',sans-serif",color:"var(--color-text-primary)"}}>{user?.name}</p>
        <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)",fontFamily:"'DM Mono',monospace"}}>{workspace?.name}</p>
      </div>
      <button onClick={logout} style={{fontSize:11,color:"var(--color-text-secondary)",background:"transparent",border:"0.5px solid var(--color-border-tertiary)",padding:"4px 10px",borderRadius:20,cursor:"pointer"}}>Odhlásit</button>
    </div>
  );
  const Nav=()=>(
    <div style={navWrap}>
      {[["log","Záznam"],["leaderboard","Žebříček"],["teams","Týmy"],["stats","Moje"]].map(([v,l])=>(
        <button key={v} onClick={()=>{setView(v);if(v==="teams")setTeamView("list");}} style={nB(view===v)}>{l}</button>
      ))}
    </div>
  );

  // ── LOG ───────────────────────────────────────────────────────────────────
  if(view==="log"){
    const age=calcAge(user.dob),score=calcScore(form,age,pts),streak=calcStreak(entries[uid]||{});
    const weekGoal=parseFloat(goals[uid])||0;
    const weekScore=Object.entries(entries[uid]||{}).filter(([d])=>d>=weekAgoStr()).reduce((s,[,e])=>s+calcScore(e,age,pts),0);
    const goalPct=weekGoal>0?Math.min(100,(weekScore/weekGoal)*100):0;
    return(
      <div style={P}>
        <style>{FONT}</style>
        <TopBar/><Nav/>
        <Err/>
        <input type="date" value={logDate} max={todayStr()} onChange={e=>{setLogDate(e.target.value);setForm(entries[uid]?.[e.target.value]||{});}} style={{...inp,marginBottom:"1rem",fontFamily:"'DM Mono',monospace"}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:"1rem"}}>
          <div style={sc}><p style={{margin:"0 0 4px",fontSize:10,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",color:"var(--color-text-secondary)"}}>Skóre</p><p style={{margin:0,fontSize:22,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"var(--color-text-primary)"}}>{score.toFixed(1)}</p></div>
          <div style={sc}><p style={{margin:"0 0 4px",fontSize:10,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",color:"var(--color-text-secondary)"}}>Věk. koef.</p><p style={{margin:0,fontSize:22,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"var(--color-text-primary)"}}>×{ageMult(age).toFixed(2)}</p></div>
          <div style={sc}><p style={{margin:"0 0 4px",fontSize:10,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",color:"var(--color-text-secondary)"}}>Streak</p><p style={{margin:0,fontSize:22,fontWeight:700,fontFamily:"'DM Mono',monospace",color:streak>=7?"#f97316":"var(--color-text-primary)"}}>{streak}{streak>0?" 🔥":""}</p></div>
        </div>
        {weekGoal>0&&<div style={{...sc,marginBottom:"1rem"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><p style={{margin:0,fontSize:11,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",color:"var(--color-text-secondary)"}}>Týdenní cíl</p><span style={{fontSize:12,fontFamily:"'DM Mono',monospace",color:"var(--color-text-secondary)"}}>{weekScore.toFixed(0)} / {weekGoal} b</span></div><div style={{height:6,background:"var(--color-border-tertiary)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${goalPct}%`,background:goalPct>=100?"#34d399":"#38bdf8",borderRadius:3}}/></div>{goalPct>=100&&<p style={{margin:"6px 0 0",fontSize:11,color:"#34d399",fontWeight:700}}>Cíl splněn! 🎉</p>}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {ACTIVITIES.map(a=>(
            <div key={a.key} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)"}}>
              <div style={{width:34,height:34,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,background:a.color+"22",color:a.color,flexShrink:0}}>{a.icon}</div>
              <div style={{flex:1,minWidth:0}}><p style={{margin:0,fontSize:13,fontWeight:700,fontFamily:"'DM Sans',sans-serif",color:"var(--color-text-primary)"}}>{a.label}</p><p style={{margin:0,fontSize:10,color:"var(--color-text-secondary)"}}>{a.pts} b/{a.unit} · {a.sub}</p></div>
              <input type="number" min="0" step={a.unit==="km"?"0.1":"1"} value={form[a.key]||""} placeholder="—" onChange={e=>setForm(f=>({...f,[a.key]:e.target.value}))} style={{width:64,textAlign:"right",padding:"7px 8px",fontSize:14,background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",color:"var(--color-text-primary)",outline:"none",fontFamily:"'DM Mono',monospace"}}/>
              <span style={{fontSize:11,color:"var(--color-text-secondary)",minWidth:20}}>{a.unit}</span>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginTop:"1rem"}}>
          <button onClick={saveEntry} disabled={saving} style={{...pBtn,flex:1}}>{saving?"Ukládám…":flash?"✓ Uloženo!":"Uložit výkon"}</button>
          {entries[uid]?.[logDate]&&<button onClick={deleteEntry} disabled={saving} style={{padding:"11px 14px",fontWeight:600,fontSize:13,background:"transparent",color:"var(--color-text-danger)",border:"0.5px solid var(--color-border-danger)",borderRadius:"var(--border-radius-md)",cursor:"pointer",flexShrink:0}}>Smazat</button>}
        </div>
        {Object.keys(pts).some(k=>pts[k]!==DEFAULT_PTS[k])&&<div style={{marginTop:"0.75rem",padding:"8px 12px",background:"var(--color-background-warning)",borderRadius:"var(--border-radius-md)",fontSize:11,color:"var(--color-text-warning)"}}>Koeficienty byly upraveny administrátorem.</div>}
      </div>
    );
  }

  // ── LEADERBOARD ───────────────────────────────────────────────────────────
  if(view==="leaderboard"){
    const actSeason=lbMode.startsWith("season:")?seasons[lbMode.slice(7)]:null;
    const lb=actSeason?buildLB(null,actSeason.start_date,actSeason.end_date):buildLB();
    const sorted=Object.entries(lb).sort((a,b)=>b[1].sc-a[1].sc);
    const myRank=sorted.findIndex(([id])=>id===uid)+1;
    const actW={};
    for(const a of ACTIVITY_META){let best=null,bestV=-1;for(const[,d] of Object.entries(lb))if((d.acts[a.key]||0)>bestV){bestV=d.acts[a.key];best=d.name;}if(bestV>0)actW[a.key]={name:best,val:bestV};}
    return(
      <div style={P}>
        <style>{FONT}</style>
        <TopBar/><Nav/>
        <Err/>
        {lbMode==="global"?(
          <div style={{display:"flex",gap:4,marginBottom:"1rem"}}>
            {[["today","Dnes"],["week","Týden"],["all","Vše"]].map(([k,l])=>(<button key={k} onClick={()=>setPeriod(k)} style={cB(period===k)}>{l}</button>))}
          </div>
        ):(
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:"1rem"}}>
            <button onClick={()=>setLbMode("global")} style={{fontSize:20,background:"none",border:"none",cursor:"pointer",color:"var(--color-text-secondary)",padding:0}}>‹</button>
            <div style={{flex:1}}><p style={{margin:0,fontSize:14,fontWeight:700,color:"var(--color-text-primary)",fontFamily:"'DM Sans',sans-serif"}}>{actSeason?.name}</p><p style={{margin:0,fontSize:11,fontFamily:"'DM Mono',monospace",color:"var(--color-text-secondary)"}}>{actSeason?.start_date} → {actSeason?.end_date}</p></div>
            <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,...(actSeason?seasonLabel(actSeason):{}),}}>{actSeason?seasonLabel(actSeason).text:""}</span>
          </div>
        )}
        {lbMode==="global"&&globalSeasons.length>0&&(
          <div style={{marginBottom:"1rem"}}>
            <p style={SL}>Výzvy</p>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {globalSeasons.sort(([,a],[,b])=>b.start_date.localeCompare(a.start_date)).map(([sid,s])=>{
                const lbl=seasonLabel(s),dl=daysLeft(s),st=seasonStatus(s);
                return(<button key={sid} onClick={()=>setLbMode(`season:${sid}`)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",cursor:"pointer",width:"100%",textAlign:"left"}}>
                  <div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}><span style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20,background:lbl.bg,color:lbl.color}}>{lbl.text}</span>{st==="active"&&dl>=0&&<span style={{fontSize:10,color:"var(--color-text-secondary)"}}>zbývá {dl} dní</span>}</div><p style={{margin:0,fontSize:13,fontWeight:700,fontFamily:"'DM Sans',sans-serif",color:"var(--color-text-primary)"}}>{s.name}</p><p style={{margin:0,fontSize:10,fontFamily:"'DM Mono',monospace",color:"var(--color-text-secondary)"}}>{s.start_date} → {s.end_date}</p></div>
                  <span style={{fontSize:18,color:"var(--color-text-secondary)"}}>›</span>
                </button>);
              })}
            </div>
          </div>
        )}
        {myRank>0&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",padding:"10px 14px",marginBottom:"1rem"}}><span style={{fontSize:12,color:"var(--color-text-secondary)"}}>Tvoje pořadí</span><span style={{fontSize:24,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"var(--color-text-primary)"}}># {myRank}</span><span style={{fontSize:12,color:"var(--color-text-secondary)"}}>z {sorted.length} hráčů</span></div>}
        <p style={SL}>Celkové pořadí</p>
        <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:"1.5rem"}}>
          {sorted.length===0&&<p style={{fontSize:13,color:"var(--color-text-secondary)"}}>Zatím žádná data.</p>}
          {sorted.map(([id,d],i)=>{const streak=calcStreak(entries[id]||{});return<div key={id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:id===uid?"var(--color-background-info)":"var(--color-background-secondary)",border:`0.5px solid ${id===uid?"var(--color-border-info)":"transparent"}`,borderRadius:"var(--border-radius-md)"}}><span style={{fontSize:16,minWidth:28,color:RANK_CLR[i]||"var(--color-text-secondary)",fontWeight:700}}>{MEDALS[i]||`${i+1}.`}</span><div style={{width:26,height:26,borderRadius:"50%",background:"var(--color-background-info)",color:"var(--color-text-info)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{d.name[0]}</div><span style={{flex:1,fontWeight:600,fontSize:14,fontFamily:"'DM Sans',sans-serif",color:"var(--color-text-primary)"}}>{d.name}</span>{streak>=3&&<span style={{fontSize:10,color:"#f97316",fontWeight:700}}>{streak}🔥</span>}<span style={{fontSize:11,color:"var(--color-text-secondary)",marginRight:4}}>{d.age}r.</span><span style={{fontSize:16,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"var(--color-text-primary)"}}>{d.sc.toFixed(1)}</span><span style={{fontSize:10,color:"var(--color-text-secondary)"}}>b</span></div>;})}
        </div>
        <p style={SL}>Vítězové disciplín</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
          {ACTIVITY_META.filter(a=>actW[a.key]).sort((a,b)=>actW[b.key].val-actW[a.key].val).map(a=>(
            <div key={a.key} style={{padding:"10px 12px",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)"}}>
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:5}}><div style={{width:22,height:22,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,background:a.color+"22",color:a.color,flexShrink:0}}>{a.icon}</div><span style={{fontSize:11,color:"var(--color-text-secondary)"}}>{a.label}</span></div>
              <p style={{margin:"0 0 2px",fontSize:13,fontWeight:700,fontFamily:"'DM Sans',sans-serif",color:"var(--color-text-primary)"}}>{actW[a.key].name}</p>
              <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)",fontFamily:"'DM Mono',monospace"}}>{a.unit==="km"?actW[a.key].val.toFixed(1):Math.round(actW[a.key].val)} {a.unit}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── TEAMS ─────────────────────────────────────────────────────────────────
  if(view==="teams"){
    if(teamView==="list") return(
      <div style={P}>
        <style>{FONT}</style><TopBar/><Nav/><Err/>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
          <p style={{...SL,margin:0}}>Moje týmy</p>
          <button onClick={()=>setTeamView("create")} style={{fontSize:12,fontWeight:700,padding:"5px 14px",background:"var(--color-text-primary)",color:"var(--color-background-primary)",border:"none",borderRadius:20,cursor:"pointer"}}>+ Nový tým</button>
        </div>
        {myTeamIds.length===0&&<p style={{fontSize:13,color:"var(--color-text-secondary)"}}>Zatím nejsi v žádném týmu.</p>}
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {myTeamIds.map(tid=>{const t=teams[tid];if(!t)return null;const mc=(members[tid]||[]).length,tsc=Object.values(seasons).filter(s=>s.team_id===tid).length;return(
            <button key={tid} onClick={()=>{setActiveTeam(tid);setTeamView("detail");setTeamTab("score");setTeamSeasonMode("all");setShowTSForm(false);}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",cursor:"pointer",width:"100%",textAlign:"left"}}>
              <div style={{width:38,height:38,borderRadius:"var(--border-radius-md)",background:"#38bdf8"+"22",color:"#38bdf8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,flexShrink:0}}>T</div>
              <div style={{flex:1}}><p style={{margin:0,fontSize:14,fontWeight:700,fontFamily:"'DM Sans',sans-serif",color:"var(--color-text-primary)"}}>{t.name}</p><p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>{mc} {mc===1?"člen":"členů"}{tsc>0?` · ${tsc} výzev`:""}{t.created_by===uid?" · tvůj tým":""}</p></div>
              <span style={{fontSize:18,color:"var(--color-text-secondary)"}}>›</span>
            </button>
          );})}
        </div>
      </div>
    );

    if(teamView==="create") return(
      <div style={P}>
        <style>{FONT}</style><TopBar/><Nav/><Err/>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1.5rem"}}>
          <button onClick={()=>setTeamView("list")} style={{fontSize:20,background:"none",border:"none",cursor:"pointer",color:"var(--color-text-secondary)",padding:0}}>‹</button>
          <p style={{...SL,margin:0}}>Nový tým</p>
        </div>
        <div style={card}>
          <input placeholder="Název týmu" value={newTeamName} onChange={e=>setNewTeamName(e.target.value)} style={{...inp,marginBottom:12}} onKeyDown={e=>e.key==="Enter"&&createTeam()}/>
          <button onClick={createTeam} disabled={!newTeamName.trim()||saving} style={pBtn}>{saving?"Vytvářím…":"Vytvořit tým →"}</button>
        </div>
      </div>
    );

    if(teamView==="detail"&&activeTeam){
      const team=teams[activeTeam];if(!team){setTeamView("list");return null;}
      const teamSeasonsList=Object.entries(seasons).filter(([,s])=>s.team_id===activeTeam);
      const actSeason=teamSeasonMode.startsWith("season:")?seasons[teamSeasonMode.slice(7)]:null;
      const tMemberIds=members[activeTeam]||[];
      const lb=(()=>{
        const t2=todayStr(),w2=weekAgoStr(),result={};
        for(const id of tMemberIds){
          const u=users[id];if(!u)continue;
          const days=entries[id]||{};let sc2=0;const acts={};
          for(const a of ACTIVITY_META)acts[a.key]=0;
          for(const[date,e] of Object.entries(days)){
            if(actSeason){if(date<actSeason.start_date||date>actSeason.end_date)continue;}
            else{if(teamPeriod==="today"&&date!==t2)continue;if(teamPeriod==="week"&&date<w2)continue;}
            sc2+=calcScore(e,calcAge(u.dob),pts);
            for(const a of ACTIVITY_META)acts[a.key]+=parseFloat(e[a.key])||0;
          }
          result[id]={sc:sc2,name:u.name,age:calcAge(u.dob),acts};
        }
        return result;
      })();
      const sorted=Object.entries(lb).sort((a,b)=>b[1].sc-a[1].sc);
      const myRank=sorted.findIndex(([id])=>id===uid)+1;
      const inviteUrl=`${window.location.origin}${window.location.pathname}?invite=${team.invite_code}&ws=${workspace.code}`;
      return(
        <div style={P}>
          <style>{FONT}</style><TopBar/><Nav/><Err/>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1rem"}}>
            <button onClick={()=>setTeamView("list")} style={{fontSize:20,background:"none",border:"none",cursor:"pointer",color:"var(--color-text-secondary)",padding:0}}>‹</button>
            <div style={{flex:1}}><p style={{margin:0,fontSize:16,fontWeight:700,fontFamily:"'DM Sans',sans-serif",color:"var(--color-text-primary)"}}>{team.name}</p><p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>{tMemberIds.length} členů</p></div>
            <button onClick={()=>leaveTeam(activeTeam)} style={{fontSize:11,padding:"4px 10px",background:"transparent",border:"0.5px solid var(--color-border-danger)",borderRadius:20,cursor:"pointer",color:"var(--color-text-danger)"}}>Opustit</button>
          </div>
          <div style={{...card,marginBottom:"1rem"}}>
            <p style={{...SL,marginBottom:8}}>Pozvánka do týmu</p>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input readOnly value={inviteUrl} style={{...inp,flex:1,fontSize:10,fontFamily:"'DM Mono',monospace",cursor:"text"}}/>
              <button onClick={()=>navigator.clipboard.writeText(inviteUrl)} style={{padding:"9px 14px",fontWeight:700,fontSize:12,background:"var(--color-text-primary)",color:"var(--color-background-primary)",border:"none",borderRadius:"var(--border-radius-md)",cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>Kopírovat</button>
            </div>
            <p style={{margin:"6px 0 0",fontSize:11,color:"var(--color-text-secondary)"}}>Odkaz obsahuje i kód skupiny — příjemce se rovnou dostane do správné skupiny.</p>
          </div>
          <div style={{marginBottom:"1rem"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
              <p style={{...SL,margin:0}}>Výzvy týmu</p>
              {!showTSForm&&<button onClick={()=>{setShowTSForm(true);setSeasonForm({name:"",start_date:"",end_date:""}); }} style={{fontSize:11,fontWeight:700,padding:"4px 12px",background:"var(--color-text-primary)",color:"var(--color-background-primary)",border:"none",borderRadius:20,cursor:"pointer"}}>+ Nová výzva</button>}
            </div>
            {showTSForm&&<SeasonFormCard onSubmit={()=>createSeason(activeTeam)} onCancel={()=>setShowTSForm(false)}/>}
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              <button onClick={()=>setTeamSeasonMode("all")} style={{...cB(teamSeasonMode==="all"),flex:"none",padding:"5px 12px",fontSize:11}}>Bez výzvy</button>
              {teamSeasonsList.sort(([,a],[,b])=>b.start_date.localeCompare(a.start_date)).map(([sid,s])=>{const lbl=seasonLabel(s);return<button key={sid} onClick={()=>setTeamSeasonMode(`season:${sid}`)} style={{...cB(teamSeasonMode===`season:${sid}`),flex:"none",padding:"5px 12px",fontSize:11,display:"flex",alignItems:"center",gap:5}}><span style={{width:6,height:6,borderRadius:"50%",background:lbl.color,flexShrink:0,display:"inline-block"}}/>{s.name}</button>;})}
            </div>
            {actSeason&&tMemberIds.includes(uid)&&actSeason.created_by===uid&&<button onClick={()=>{deleteSeason(teamSeasonMode.slice(7));setTeamSeasonMode("all");}} style={{marginTop:6,fontSize:11,padding:"3px 10px",background:"transparent",border:"0.5px solid var(--color-border-danger)",borderRadius:6,cursor:"pointer",color:"var(--color-text-danger)"}}>Smazat tuto výzvu</button>}
          </div>
          {teamSeasonMode==="all"&&<div style={{display:"flex",gap:4,marginBottom:"1rem"}}>{[["today","Dnes"],["week","Týden"],["all","Vše"]].map(([k,l])=>(<button key={k} onClick={()=>setTeamPeriod(k)} style={cB(teamPeriod===k)}>{l}</button>))}</div>}
          {actSeason&&<div style={{...card,marginBottom:"1rem",background:"var(--color-background-secondary)"}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,...seasonLabel(actSeason)}}>{seasonLabel(actSeason).text}</span><div style={{flex:1}}><p style={{margin:0,fontSize:13,fontWeight:700,color:"var(--color-text-primary)",fontFamily:"'DM Sans',sans-serif"}}>{actSeason.name}</p><p style={{margin:0,fontSize:10,fontFamily:"'DM Mono',monospace",color:"var(--color-text-secondary)"}}>{actSeason.start_date} → {actSeason.end_date}</p></div>{seasonStatus(actSeason)==="active"&&<span style={{fontSize:11,color:"var(--color-text-secondary)"}}>zbývá {daysLeft(actSeason)} dní</span>}</div></div>}
          {myRank>0&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",padding:"10px 14px",marginBottom:"1rem"}}><span style={{fontSize:12,color:"var(--color-text-secondary)"}}>Tvoje pořadí</span><span style={{fontSize:24,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"var(--color-text-primary)"}}># {myRank}</span><span style={{fontSize:12,color:"var(--color-text-secondary)"}}>z {sorted.length}</span></div>}
          <div style={{display:"flex",gap:3,background:"var(--color-background-secondary)",padding:3,borderRadius:"var(--border-radius-md)",marginBottom:"1rem"}}>
            {[["score","Body"],["activity","Aktivity"]].map(([t,l])=>(<button key={t} onClick={()=>setTeamTab(t)} style={nB(teamTab===t)}>{l}</button>))}
          </div>
          {teamTab==="score"&&<><p style={SL}>Žebříček bodů</p><div style={{display:"flex",flexDirection:"column",gap:5}}>{sorted.length===0&&<p style={{fontSize:13,color:"var(--color-text-secondary)"}}>Zatím žádná data.</p>}{sorted.map(([id,d],i)=>(<div key={id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:id===uid?"var(--color-background-info)":"var(--color-background-secondary)",border:`0.5px solid ${id===uid?"var(--color-border-info)":"transparent"}`,borderRadius:"var(--border-radius-md)"}}><span style={{fontSize:16,minWidth:28,color:RANK_CLR[i]||"var(--color-text-secondary)",fontWeight:700}}>{MEDALS[i]||`${i+1}.`}</span><div style={{width:26,height:26,borderRadius:"50%",background:"var(--color-background-info)",color:"var(--color-text-info)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{d.name[0]}</div><span style={{flex:1,fontWeight:600,fontSize:14,fontFamily:"'DM Sans',sans-serif",color:"var(--color-text-primary)"}}>{d.name}</span><span style={{fontSize:11,color:"var(--color-text-secondary)",marginRight:4}}>{d.age}r.</span><span style={{fontSize:16,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"var(--color-text-primary)"}}>{d.sc.toFixed(1)}</span><span style={{fontSize:10,color:"var(--color-text-secondary)"}}>b</span></div>))}</div></>}
          {teamTab==="activity"&&<><p style={SL}>Porovnání aktivit</p>{ACTIVITY_META.map(a=>{const vals=sorted.map(([id,d])=>({name:d.name,val:d.acts[a.key]||0,isMe:id===uid})).sort((x,y)=>y.val-x.val);const maxVal=Math.max(...vals.map(v=>v.val),1);if(vals.every(v=>v.val===0))return null;return(<div key={a.key} style={{...card,marginBottom:"0.75rem"}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><div style={{width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,background:a.color+"22",color:a.color,flexShrink:0}}>{a.icon}</div><p style={{margin:0,fontSize:13,fontWeight:700,fontFamily:"'DM Sans',sans-serif",color:"var(--color-text-primary)"}}>{a.label}</p></div><div style={{display:"flex",flexDirection:"column",gap:6}}>{vals.filter(v=>v.val>0).map((v,i)=>(<div key={v.name}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,fontWeight:v.isMe?700:400,color:v.isMe?"var(--color-text-primary)":"var(--color-text-secondary)",fontFamily:"'DM Sans',sans-serif"}}>{i===0?"🥇 ":""}{v.name}</span><span style={{fontSize:12,fontFamily:"'DM Mono',monospace",color:"var(--color-text-primary)",fontWeight:700}}>{a.unit==="km"?v.val.toFixed(1):Math.round(v.val)} {a.unit}</span></div><div style={{height:5,background:"var(--color-border-tertiary)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${(v.val/maxVal)*100}%`,background:v.isMe?a.color:"var(--color-text-secondary)",borderRadius:3,opacity:v.isMe?1:0.4}}/></div></div>))}</div></div>);})}</>}
        </div>
      );
    }
  }

  // ── STATS ─────────────────────────────────────────────────────────────────
  if(view==="stats"){
    const myDays=entries[uid]||{},dates=Object.keys(myDays).sort().reverse();
    const age=calcAge(user.dob),total=dates.reduce((s,d)=>s+calcScore(myDays[d],age,pts),0);
    const streak=calcStreak(myDays),weekGoal=parseFloat(goals[uid])||0;
    const weekScore=Object.entries(myDays).filter(([d])=>d>=weekAgoStr()).reduce((s,[,e])=>s+calcScore(e,age,pts),0);
    const goalPct=weekGoal>0?Math.min(100,(weekScore/weekGoal)*100):0;
    const totals={};for(const a of ACTIVITY_META)totals[a.key]=0;
    for(const e of Object.values(myDays))for(const a of ACTIVITY_META)totals[a.key]+=(parseFloat(e[a.key])||0);
    const chartDays=Array.from({length:14},(_,i)=>dateMinusDays(13-i));
    const chartScores=chartDays.map(d=>calcScore(myDays[d]||{},age,pts));
    const maxSc=Math.max(...chartScores,1);
    return(
      <div style={P}>
        <style>{FONT}</style><TopBar/><Nav/><Err/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:"1rem"}}>
          <div style={sc}><p style={{margin:"0 0 3px",fontSize:10,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",color:"var(--color-text-secondary)"}}>Celkem bodů</p><p style={{margin:0,fontSize:20,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"var(--color-text-primary)"}}>{total.toFixed(0)}</p></div>
          <div style={sc}><p style={{margin:"0 0 3px",fontSize:10,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",color:"var(--color-text-secondary)"}}>Aktivní dny</p><p style={{margin:0,fontSize:20,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"var(--color-text-primary)"}}>{dates.length}</p></div>
          <div style={sc}><p style={{margin:"0 0 3px",fontSize:10,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",color:"var(--color-text-secondary)"}}>Streak</p><p style={{margin:0,fontSize:20,fontWeight:700,fontFamily:"'DM Mono',monospace",color:streak>=7?"#f97316":"var(--color-text-primary)"}}>{streak}{streak>0?" 🔥":""}</p></div>
        </div>
        <div style={{...card,marginBottom:"1rem"}}>
          <p style={{...SL,marginBottom:8}}>Týdenní cíl (body)</p>
          <div style={{display:"flex",gap:8,marginBottom:weekGoal>0?10:0}}>
            <input type="number" min="0" value={goalInput} onChange={e=>setGoalInput(e.target.value)} placeholder="Nastav cíl na tento týden" style={{...inp,flex:1,fontFamily:"'DM Mono',monospace"}}/>
            <button onClick={saveGoal} style={{padding:"9px 14px",fontWeight:700,fontSize:13,background:"var(--color-text-primary)",color:"var(--color-background-primary)",border:"none",borderRadius:"var(--border-radius-md)",cursor:"pointer",flexShrink:0}}>{goalFlash?"✓":"Uložit"}</button>
          </div>
          {weekGoal>0&&<><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:11,color:"var(--color-text-secondary)"}}>Tento týden</span><span style={{fontSize:12,fontFamily:"'DM Mono',monospace",color:"var(--color-text-secondary)"}}>{weekScore.toFixed(0)} / {weekGoal} b</span></div><div style={{height:6,background:"var(--color-border-tertiary)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${goalPct}%`,background:goalPct>=100?"#34d399":"#38bdf8",borderRadius:3}}/></div>{goalPct>=100&&<p style={{margin:"6px 0 0",fontSize:11,color:"#34d399",fontWeight:700}}>Cíl splněn! 🎉</p>}</>}
        </div>
        <p style={SL}>Aktivita — posledních 14 dní</p>
        <div style={{...card,marginBottom:"1rem",padding:"1rem"}}>
          <div style={{display:"flex",alignItems:"flex-end",gap:3,height:64}}>
            {chartDays.map((d,i)=>{const s2=chartScores[i],h=s2>0?Math.max(4,Math.round((s2/maxSc)*56)):2;return<div key={d} style={{flex:1}}><div title={`${d}: ${s2.toFixed(1)} b`} style={{width:"100%",height:h,background:d===todayStr()?"#38bdf8":s2>0?"#c084fc":"var(--color-border-tertiary)",borderRadius:"3px 3px 0 0"}}/></div>;})}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}><span style={{fontSize:9,color:"var(--color-text-secondary)",fontFamily:"'DM Mono',monospace"}}>{chartDays[0].slice(5)}</span><span style={{fontSize:9,color:"var(--color-text-secondary)",fontFamily:"'DM Mono',monospace"}}>dnes</span></div>
        </div>
        <p style={SL}>Celkové součty</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:"1.25rem"}}>
          {ACTIVITY_META.filter(a=>totals[a.key]>0).map(a=>(<div key={a.key} style={{padding:"10px 12px",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)"}}><div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}><div style={{width:20,height:20,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,background:a.color+"22",color:a.color,fontWeight:700}}>{a.icon}</div><span style={{fontSize:11,color:"var(--color-text-secondary)"}}>{a.label}</span></div><p style={{margin:0,fontSize:16,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"var(--color-text-primary)"}}>{a.unit==="km"?totals[a.key].toFixed(1):Math.round(totals[a.key])}<span style={{fontSize:11,fontWeight:400,color:"var(--color-text-secondary)",marginLeft:3}}>{a.unit}</span></p></div>))}
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <p style={{...SL,margin:0}}>Historie</p>
          <button onClick={()=>exportCSV(user.name,myDays,pts,age)} style={{fontSize:11,fontWeight:600,padding:"4px 12px",background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:20,cursor:"pointer",color:"var(--color-text-secondary)"}}>Exportovat CSV ↓</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {dates.length===0&&<p style={{fontSize:13,color:"var(--color-text-secondary)"}}>Žádné záznamy.</p>}
          {dates.map(d=>(<div key={d} style={{padding:"10px 12px",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:12,fontWeight:600,fontFamily:"'DM Mono',monospace",color:"var(--color-text-secondary)"}}>{d}</span><span style={{fontSize:14,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"var(--color-text-primary)"}}>{calcScore(myDays[d],age,pts).toFixed(1)} b</span></div><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{ACTIVITY_META.filter(a=>parseFloat(myDays[d][a.key])>0).map(a=>(<span key={a.key} style={{fontSize:10,background:a.color+"20",color:a.color,padding:"2px 8px",borderRadius:20,fontWeight:700}}>{a.label} {a.unit==="km"?parseFloat(myDays[d][a.key]).toFixed(1):Math.round(parseFloat(myDays[d][a.key]))} {a.unit}</span>))}</div></div>))}
        </div>
      </div>
    );
  }
}