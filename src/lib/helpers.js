// Shared constants and pure helper functions extracted from App.jsx
export const DEFAULT_PTS = { shyby:8,anglicky:5,kliky:2,drepy:1.5,sedLehy:1,behKm:15,koloKm:4,plankSec:0.05,kroky:0.003,silovy:1.5,plavani:12,veslovani:10,kardio:0.8,pivoMale:-3,pivoVelke:-5,vino:-6,panak:-8 };
// Maximum reasonable values per activity per day — prevents gaming (e.g. logging 10 000 push-ups)
export const DAILY_CAPS = { shyby:200,anglicky:500,kliky:1000,drepy:2000,sedLehy:2000,behKm:100,koloKm:300,plankSec:3600,kroky:50000,silovy:240,plavani:40,veslovani:100,kardio:240 };
export const AM = [
  {key:"shyby",    label:"Shyby",      sub:"pull-ups", unit:"ks", icon:"⬆",color:"#c084fc"},
  {key:"anglicky", label:"Angličáky",  sub:"burpees",  unit:"ks", icon:"★",color:"#f97316"},
  {key:"kliky",    label:"Kliky",      sub:"push-ups", unit:"ks", icon:"▲",color:"#38bdf8"},
  {key:"drepy",    label:"Dřepy",      sub:"squats",   unit:"ks", icon:"↓",color:"#34d399"},
  {key:"sedLehy",  label:"Sed-lehy",   sub:"sit-ups",  unit:"ks", icon:"↔",color:"#a3e635"},
  {key:"behKm",    label:"Běh",        sub:"km",       unit:"km", icon:"▶",color:"#fbbf24"},
  {key:"koloKm",   label:"Kolo",       sub:"km",       unit:"km", icon:"○",color:"#fb7185"},
  {key:"plankSec", label:"Plank",      sub:"sekund",   unit:"s",  icon:"—",color:"#e879f9"},
  {key:"kroky",    label:"Kroky",      sub:"steps",    unit:"kr", icon:"◆",color:"#06b6d4"},
  {key:"silovy",   label:"Silový tr.", sub:"strength", unit:"min",icon:"◉",color:"#f43f5e"},
  {key:"plavani",  label:"Plavání",    sub:"swim",     unit:"km", icon:"~",color:"#0ea5e9"},
  {key:"veslovani",label:"Veslování",  sub:"rowing",   unit:"km", icon:"↑",color:"#8b5cf6"},
  {key:"kardio",   label:"Kardio",     sub:"cardio",   unit:"min",icon:"♥",color:"#10b981"},
  {key:"pivoMale", label:"Malé pivo",  sub:"0.3l",     unit:"ks", icon:"🍺",color:"#ef4444",negative:true},
  {key:"pivoVelke",label:"Velké pivo", sub:"0.5l",     unit:"ks", icon:"🍺",color:"#dc2626",negative:true},
  {key:"vino",     label:"Víno",       sub:"2dcl",     unit:"ks", icon:"🍷",color:"#b91c1c",negative:true},
  {key:"panak",    label:"Panák",      sub:"tvrdý",    unit:"ks", icon:"🥃",color:"#991b1b",negative:true},
];

export const getActs = pts => AM.map(a=>({...a,pts:pts[a.key]??DEFAULT_PTS[a.key]}));

export function calcAge(dob){if(!dob)return 30;const b=new Date(dob),t=new Date();let a=t.getFullYear()-b.getFullYear();if(t<new Date(t.getFullYear(),b.getMonth(),b.getDate()))a--;return a;}
export function ageMult(age){const p=parseInt(age);const a=(Number.isFinite(p)&&p>=0)?p:30;if(a>=30)return 1+(a-30)*0.015;return Math.max(0.85,1-(30-a)*0.005);}
export function calcScore(e,age,pts,actKeys=null){
  if(!e) return 0;
  let acts = getActs(pts);
  if(Array.isArray(actKeys) && actKeys.length) acts = acts.filter(a=>actKeys.includes(a.key));
  const positive = acts.filter(a=>!a.negative).reduce((s,a)=>s+(parseFloat(e[a.key])||0)*a.pts,0) * ageMult(age);
  const negative = acts.filter(a=>a.negative).reduce((s,a)=>s+(parseFloat(e[a.key])||0)*a.pts,0);
  return positive + negative;
}
export function todayStr(){return new Date().toISOString().split("T")[0];}
export function weekAgoStr(){const d=new Date();d.setDate(d.getDate()-7);return d.toISOString().split("T")[0];}
export function weekStartStr(){const d=new Date();const day=d.getDay();const diff=day===0?6:day-1;d.setDate(d.getDate()-diff);return d.toISOString().split("T")[0];}
export function dMinus(n){const d=new Date();d.setDate(d.getDate()-n);return d.toISOString().split("T")[0];}
export function calcStreak(days){if(!days||!Object.keys(days).length)return 0;let s=0,c=new Date();if(!days[todayStr()])c.setDate(c.getDate()-1);while(true){const d=c.toISOString().split("T")[0];if(!days[d])break;s++;c.setDate(c.getDate()-1);}return s;}
export function randCode(){return Math.random().toString(36).slice(2,8).toUpperCase();}
export function fmtVal(a,v){if(a.unit==="km")return parseFloat(v).toFixed(1);if(a.unit==="kr")return Math.round(v).toLocaleString();return Math.round(v);} 
export function exportCSV(name,days,pts,age){
  const h=["Datum","Skóre",...AM.map(a=>`${a.label} (${a.unit})`)];
  const r=Object.entries(days).sort(([a],[b])=>a.localeCompare(b)).map(([d,e])=>[d,calcScore(e,age,pts).toFixed(2),...AM.map(a=>parseFloat(e[a.key])||0)]);
  const csv=[h,...r].map(x=>x.join(";")).join("\n");
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);const el=document.createElement("a");el.href=url;el.download=`beatfit_${name}_${todayStr()}.csv`;el.click();URL.revokeObjectURL(url);
}
export function seasonStatus(s){const t=todayStr();if(t<s.start_date)return"upcoming";if(t>s.end_date)return"finished";return"active";}
export function seasonLabel(s){const st=seasonStatus(s);if(st==="upcoming")return{text:"Připravuje se",cls:"bf-badge-warn"};if(st==="finished")return{text:"Ukončeno",cls:"bf-badge-dim"};return{text:"Probíhá",cls:"bf-badge-success"};}
export function daysLeft(s){return Math.ceil((new Date(s.end_date)-new Date(todayStr()))/(1000*60*60*24));}

export const MEDALS=["🥇","🥈","🥉"];
export const RANK_CLR=["#f59e0b","#94a3b8","#b87333"];

export function daysBetweenInclusive(from, to){
  const a = new Date(from);
  const b = new Date(to);
  return Math.max(0, Math.floor((b - a) / (1000*60*60*24)) + 1);
}

// Compute effective cap (max points) for a given viewer limit setting and the viewed span.
// limit: {enabled, period: 'day'|'week'|'month', value}
// spanInfo: { period: 'today'|'week'|'all', fromDate?, toDate? }
export function computeEffectiveCap(limit, spanInfo){
  if(!limit||!limit.enabled) return null;
  const {period, fromDate, toDate} = spanInfo||{};
  let days = null;
  if(fromDate && toDate){ days = daysBetweenInclusive(fromDate,toDate); }
  else if(period==="today") days = 1;
  else if(period==="week") days = 7;
  else if(period==="all") days = null;

  // If user set daily limit, scale by days when possible
  if(limit.period==="day"){
    if(days!=null) return limit.value * days;
    return null;
  }
  // If user set weekly limit and we have days, scale by number of weeks
  if(limit.period==="week"){
    if(days!=null) return limit.value * Math.ceil(days/7);
    if(period==="week") return limit.value;
    return null;
  }
  // If user set monthly limit and we have days, scale by months (~30d)
  if(limit.period==="month"){
    if(days!=null) return limit.value * Math.ceil(days/30);
    if(period==="month") return limit.value;
    return null;
  }
  return null;
}
