"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminCard, AdminNotice, AdminShell } from "../../../_components/AdminShell";
import "./records.css";

type Player={id:string;firstName:string;lastName:string;position:string;jerseyNumber:number|null};
type Achievement={id:string;label:string;type:string;quantity:number;note:string;awardedAt:string};
type Stat={key:string;value:number};

const statOptions=[
  ["touchdowns","Touchdowns"],["interceptions","Interceptions"],["sacks","Sacks"],["tackles","Tackles"],["forced_fumbles","Forced Fumbles"],
  ["receiving_td","Receiving TD"],["rushing_td","Rushing TD"],["passing_td","Passing TD"],["field_goals","Field Goals"],
] as const;

function suggested(position:string){
 const p=position.toUpperCase();
 if(["QB"].includes(p))return ["passing_td","touchdowns"];
 if(["RB","FB"].includes(p))return ["rushing_td","touchdowns"];
 if(["WR","TE"].includes(p))return ["receiving_td","touchdowns"];
 if(["LB","MLB","ILB","OLB"].includes(p))return ["tackles","sacks","interceptions","forced_fumbles","touchdowns"];
 if(["CB","DB","FS","SS"].includes(p))return ["interceptions","tackles","forced_fumbles","touchdowns"];
 if(["DL","DE","DT","NT"].includes(p))return ["sacks","tackles","forced_fumbles"];
 if(["K"].includes(p))return ["field_goals"];
 return statOptions.map(x=>x[0]);
}

export function PlayerRecordsManager({playerId}:{playerId:string}){
 const[player,setPlayer]=useState<Player|null>(null);const[achievements,setAchievements]=useState<Achievement[]>([]);const[stats,setStats]=useState<Stat[]>([]);const[notice,setNotice]=useState("");
 const[label,setLabel]=useState("");const[note,setNote]=useState("");const[quantity,setQuantity]=useState(1);const[statKey,setStatKey]=useState("touchdowns");const[statValue,setStatValue]=useState(1);
 useEffect(()=>{void load()},[playerId]);
 async function load(){try{const[p,r]=await Promise.all([fetch("/admin/api/players"),fetch(`/admin/api/player-records?playerId=${encodeURIComponent(playerId)}`)]);if(!p.ok||!r.ok)throw new Error("Daten konnten nicht geladen werden.");const pb=await p.json() as {items:Player[]};const rb=await r.json() as {achievements:Achievement[];stats:Stat[]};setPlayer(pb.items.find(x=>x.id===playerId)??null);setAchievements(rb.achievements);setStats(rb.stats)}catch(e){setNotice(e instanceof Error?e.message:"Fehler")}}
 const allowed=useMemo(()=>new Set(suggested(player?.position??"")),[player]);
 const visibleStats=statOptions.filter(([key])=>allowed.has(key));
 async function addAchievement(){if(!label.trim())return setNotice("Bitte eine Trophäe benennen.");const r=await fetch("/admin/api/player-records",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({playerId,kind:"achievement",label,type:"trophy",quantity,note})});if(!r.ok)return setNotice("Trophäe konnte nicht gespeichert werden.");setLabel("");setNote("");setQuantity(1);setNotice("Trophäe vergeben.");await load()}
 async function addStat(){const r=await fetch("/admin/api/player-records",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({playerId,kind:"stat",statKey,statValue})});if(!r.ok)return setNotice("Statistik konnte nicht gespeichert werden.");setNotice("Statistik aktualisiert.");await load()}
 return <AdminShell active="players" title="Stats & Trophäen" actions={<a className="cms-button secondary" href="/admin/players">← Spieler</a>}>
  {notice&&<AdminNotice tone={notice.includes("konnte")||notice.includes("Bitte")?"error":"success"}>{notice}</AdminNotice>}
  <div className="records-grid">
   <AdminCard><small>SPIELER</small><h2>#{player?.jerseyNumber??"–"} {player?.firstName??""} {player?.lastName??""}</h2><p className="cms-muted">{player?.position??""} · Saison 2026</p></AdminCard>
   <AdminCard><small>EINFACHE SAISONSTATS</small><h2>Statistik hinzufügen</h2><div className="record-form"><label className="cms-field"><span>Statistik</span><select value={statKey} onChange={e=>setStatKey(e.target.value)}>{visibleStats.map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label><label className="cms-field"><span>Wert hinzufügen</span><input type="number" value={statValue} onChange={e=>setStatValue(Number(e.target.value))}/></label><button className="cms-button" onClick={()=>void addStat()}>＋ Hinzufügen</button></div><div className="stat-summary">{visibleStats.map(([key,name])=><div key={key}><strong>{stats.find(s=>s.key===key)?.value??0}</strong><span>{name}</span></div>)}</div></AdminCard>
   <AdminCard><small>COACH TROPHIES</small><h2>Achievement vergeben</h2><div className="record-form"><label className="cms-field"><span>Trophäe</span><input value={label} onChange={e=>setLabel(e.target.value)} placeholder="z. B. Game MVP, Pick Six, Player of the Week"/></label><label className="cms-field"><span>Anzahl</span><input type="number" min="1" value={quantity} onChange={e=>setQuantity(Math.max(1,Number(e.target.value)))}/></label><label className="cms-field wide"><span>Notiz</span><input value={note} onChange={e=>setNote(e.target.value)} placeholder="optional"/></label><button className="cms-button" onClick={()=>void addAchievement()}>🏆 Vergeben</button></div><div className="trophy-list">{achievements.map(a=><article key={a.id}><b>🏆 {a.label}{a.quantity>1?` ×${a.quantity}`:""}</b><span>{a.note||"Coach Achievement"}</span><small>{new Date(a.awardedAt).toLocaleDateString("de-DE")}</small></article>)}{!achievements.length&&<p className="cms-muted">Noch keine Trophäen vergeben.</p>}</div></AdminCard>
  </div>
 </AdminShell>
}
