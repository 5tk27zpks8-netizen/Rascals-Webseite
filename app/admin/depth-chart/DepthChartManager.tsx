"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminCard, AdminNotice, AdminShell } from "../_components/AdminShell";
import "./depth-chart.css";

type Season = { id:string; year:number; name:string; status:"planning"|"active"|"completed"|"archived"; isCurrent:boolean };
type Unit = "offense" | "defense" | "special-teams";
type Snapshot = { id:string; seasonId:string; teamId:string; label:string; isCurrent:boolean; createdBy:string; createdAt:string };
type RosterPlayer = {
  playerId:string; jerseyNumber:number|null; firstName:string; lastName:string; portrait:string; primaryPosition:string; secondaryPosition:string;
  unit:string; rosterStatus:string; availability:string;
};
type DepthEntry = { id?:string; snapshotId?:string|null; positionGroup:string; position:string; playerId:string; rank:number; firstName?:string; lastName?:string; portrait?:string; jerseyNumber?:number|null; availability?:string; primaryPosition?:string };
type DepthPayload = { seasonId:string; teamId:string; snapshot:Snapshot|null; snapshots:Snapshot[]; roster:RosterPlayer[]; entries:DepthEntry[] };

type LayoutGroup = { label:string; slots:string[] };
const layout: Record<Unit, LayoutGroup[]> = {
  offense: [
    { label:"BACKFIELD", slots:["QB","RB","FB"] },
    { label:"RECEIVERS", slots:["X WR","Z WR","SLOT","TE"] },
    { label:"OFFENSIVE LINE", slots:["LT","LG","C","RG","RT"] },
  ],
  defense: [
    { label:"DEFENSIVE LINE", slots:["LDE","DT","NT","RDE"] },
    { label:"LINEBACKER", slots:["WILL","MIKE","SAM"] },
    { label:"SECONDARY", slots:["CB1","CB2","NICKEL","FS","SS"] },
  ],
  "special-teams": [
    { label:"KICKING", slots:["K","P","LS","HOLDER"] },
    { label:"RETURN", slots:["KR","PR"] },
    { label:"COVERAGE", slots:["GUNNER L","GUNNER R"] },
  ],
};
const ranks = [1,2,3] as const;

export function DepthChartManager(){
  const[seasons,setSeasons]=useState<Season[]>([]);
  const[seasonId,setSeasonId]=useState("");
  const[data,setData]=useState<DepthPayload|null>(null);
  const[entries,setEntries]=useState<DepthEntry[]>([]);
  const[unit,setUnit]=useState<Unit>("offense");
  const[versionLabel,setVersionLabel]=useState("");
  const[notice,setNotice]=useState("");
  const[loading,setLoading]=useState(true);
  const[saving,setSaving]=useState(false);

  useEffect(()=>{void boot()},[]);

  async function boot(){
    setLoading(true);
    try{
      const response=await fetch("/admin/api/seasons");
      if(!response.ok)throw new Error("Saisons konnten nicht geladen werden.");
      const body=await response.json() as {items:Season[]};
      setSeasons(body.items);
      const requestedSeason=new URLSearchParams(window.location.search).get("season");
      const current=(requestedSeason?body.items.find(item=>item.id===requestedSeason):undefined)??body.items.find(item=>item.isCurrent)??body.items[0];
      if(current){setSeasonId(current.id);await loadDepth(current.id)}
    }catch(error){setNotice(error instanceof Error?error.message:"Depth Chart konnte nicht geladen werden.")}finally{setLoading(false)}
  }

  async function loadDepth(nextSeasonId:string,snapshotId?:string){
    const params=new URLSearchParams({seasonId:nextSeasonId,teamId:"mens"});
    if(snapshotId)params.set("snapshotId",snapshotId);
    const response=await fetch(`/admin/api/depth-chart?${params.toString()}`);
    if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error??"Depth Chart konnte nicht geladen werden.")}
    const body=await response.json() as DepthPayload;
    setData(body);
    setEntries(body.entries.map(entry=>({...entry})));
    setVersionLabel("");
  }

  async function changeSeason(id:string){
    setSeasonId(id);setLoading(true);setNotice("");
    window.history.replaceState(null,"",`/admin/depth-chart?season=${encodeURIComponent(id)}`);
    try{await loadDepth(id)}catch(error){setNotice(error instanceof Error?error.message:"Roster konnte nicht geladen werden.")}finally{setLoading(false)}
  }

  async function changeSnapshot(id:string){
    setLoading(true);setNotice("");
    try{await loadDepth(seasonId,id||undefined)}catch(error){setNotice(error instanceof Error?error.message:"Version konnte nicht geladen werden.")}finally{setLoading(false)}
  }

  function setPlayer(positionGroup:string,position:string,rank:number,playerId:string){
    setEntries(current=>{
      const withoutSlot=current.filter(entry=>!(entry.position===position&&entry.rank===rank) && !(entry.position===position&&entry.playerId===playerId&&playerId));
      if(!playerId)return withoutSlot;
      return [...withoutSlot,{positionGroup,position,playerId,rank}];
    });
  }

  async function saveVersion(){
    if(!seasonId)return;
    setSaving(true);setNotice("");
    try{
      const response=await fetch("/admin/api/depth-chart",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({seasonId,teamId:"mens",label:versionLabel,entries:entries.map(({positionGroup,position,playerId,rank})=>({positionGroup,position,playerId,rank}))})});
      if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error??"Depth Chart konnte nicht gespeichert werden.")}
      const body=await response.json() as {snapshot:Snapshot;entryCount:number};
      await loadDepth(seasonId);
      setNotice(`Neue Depth-Chart-Version gespeichert · ${body.entryCount} Einträge.`);
    }catch(error){setNotice(error instanceof Error?error.message:"Speichern fehlgeschlagen.")}finally{setSaving(false)}
  }

  const currentGroups=layout[unit];
  const currentPositions=useMemo(()=>new Set(currentGroups.flatMap(group=>group.slots)),[currentGroups]);
  const unitEntries=entries.filter(entry=>currentPositions.has(entry.position));
  const totalSlots=currentGroups.reduce((sum,group)=>sum+group.slots.length,0);
  const startersAssigned=currentGroups.flatMap(group=>group.slots).filter(position=>entries.some(entry=>entry.position===position&&entry.rank===1)).length;
  const historical=Boolean(data?.snapshot&&!data.snapshot.isCurrent);

  return <AdminShell active="depthchart" title="Depth Chart" actions={<><a className="cms-button secondary" href="/admin/roster">Season Roster</a><button className="cms-button" disabled={saving||loading||!seasonId} onClick={()=>void saveVersion()}>{saving?"Speichert…":"Neue Version speichern"}</button></>}>
    {notice&&<AdminNotice tone={notice.includes("gespeichert")?"success":"error"}>{notice}</AdminNotice>}

    <div className="depth-toolbar">
      <label className="cms-field"><span>Saison</span><select value={seasonId} onChange={e=>void changeSeason(e.target.value)}>{seasons.map(season=><option key={season.id} value={season.id}>{season.name}{season.isCurrent?" · AKTUELL":""}</option>)}</select></label>
      <label className="cms-field"><span>Version / Historie</span><select value={data?.snapshot?.id??""} onChange={e=>void changeSnapshot(e.target.value)}><option value="">Noch keine Version</option>{data?.snapshots.map(snapshot=><option key={snapshot.id} value={snapshot.id}>{snapshot.isCurrent?"AKTUELL · ":""}{snapshot.label}</option>)}</select></label>
      <label className="cms-field depth-version-label"><span>Name der neuen Version (optional)</span><input value={versionLabel} onChange={e=>setVersionLabel(e.target.value)} placeholder="z. B. Week 3 · vs. Miners"/></label>
    </div>

    {historical&&<AdminNotice tone="info">Du siehst eine historische Version vom {formatDate(data?.snapshot?.createdAt)}. Änderungen überschreiben sie nicht: „Neue Version speichern“ erzeugt immer einen neuen Snapshot.</AdminNotice>}

    <div className="depth-kpis">
      <article><small>POSITIONEN</small><b>{totalSlots}</b></article>
      <article><small>STARTER BESETZT</small><b>{startersAssigned}/{totalSlots}</b></article>
      <article><small>DEPTH EINTRÄGE</small><b>{unitEntries.length}</b></article>
      <article className={totalSlots-startersAssigned>0?"warning":"ok"}><small>OFFENE STARTER</small><b>{totalSlots-startersAssigned}</b></article>
    </div>

    <div className="depth-tabs" role="tablist">
      <button className={unit==="offense"?"active":""} onClick={()=>setUnit("offense")}>OFFENSE</button>
      <button className={unit==="defense"?"active":""} onClick={()=>setUnit("defense")}>DEFENSE</button>
      <button className={unit==="special-teams"?"active":""} onClick={()=>setUnit("special-teams")}>SPECIAL TEAMS</button>
    </div>

    <div className="depth-groups">
      {currentGroups.map(group=><AdminCard key={group.label} className="depth-group">
        <div className="cms-section-head"><div><small>POSITION GROUP</small><h2>{group.label}</h2></div></div>
        <div className="depth-slots">
          {group.slots.map(position=><article className="depth-slot" key={position}>
            <header><b>{position}</b><span>{filledCount(entries,position)}/3</span></header>
            <div className="depth-ranks">
              {ranks.map(rank=>{
                const selectedId=entries.find(entry=>entry.position===position&&entry.rank===rank)?.playerId??"";
                const selectedPlayer=data?.roster.find(player=>player.playerId===selectedId);
                return <label key={rank} className={`depth-rank rank-${rank}`}>
                  <span><i>{rank}</i>{rank===1?"STARTER":rank===2?"BACKUP":"THIRD"}</span>
                  <select value={selectedId} onChange={e=>setPlayer(group.label,position,rank,e.target.value)}>
                    <option value="">— nicht besetzt —</option>
                    {sortedPlayers(data?.roster??[],position).map(player=><option key={player.playerId} value={player.playerId}>{playerLabel(player)}</option>)}
                  </select>
                  {selectedPlayer&&<div className="depth-player-mini">{selectedPlayer.portrait?<img src={selectedPlayer.portrait} alt=""/>:<div>#{selectedPlayer.jerseyNumber??"–"}</div>}<span><b>#{selectedPlayer.jerseyNumber??"–"} {selectedPlayer.firstName} {selectedPlayer.lastName}</b><small>{selectedPlayer.primaryPosition||"–"} · {availabilityLabel(selectedPlayer.availability)}</small></span><em className={selectedPlayer.availability}>{availabilityLabel(selectedPlayer.availability)}</em></div>}
                </label>
              })}
            </div>
          </article>)}
        </div>
      </AdminCard>)}
    </div>

    <AdminCard className="depth-history-card">
      <div className="cms-section-head"><div><small>HISTORICAL INTEGRITY</small><h2>Versionierung statt Überschreiben</h2></div></div>
      <p className="cms-muted">Jedes Speichern erzeugt einen neuen Depth-Chart-Snapshot. Frühere Aufstellungen bleiben erhalten und können jederzeit angesehen oder als Basis für eine neue Version verwendet werden.</p>
      <div className="depth-history-list">{data?.snapshots.slice(0,6).map(snapshot=><button key={snapshot.id} onClick={()=>void changeSnapshot(snapshot.id)}><span><b>{snapshot.label}</b><small>{formatDate(snapshot.createdAt)}{snapshot.createdBy?` · ${snapshot.createdBy}`:""}</small></span>{snapshot.isCurrent&&<em>AKTUELL</em>}</button>)}{!data?.snapshots.length&&<span className="cms-muted">Noch keine Depth-Chart-Version gespeichert.</span>}</div>
    </AdminCard>
  </AdminShell>
}

function filledCount(entries:DepthEntry[],position:string){return entries.filter(entry=>entry.position===position).length}
function availabilityLabel(value:string){return({full:"FULL",limited:"LIMITED",questionable:"QUESTIONABLE",out:"OUT","return-to-play":"RTP"} as Record<string,string>)[value]??value.toUpperCase()}
function playerLabel(player:RosterPlayer){return `#${player.jerseyNumber??"–"} · ${player.firstName} ${player.lastName} · ${player.primaryPosition||"–"} · ${availabilityLabel(player.availability)}`}
function formatDate(value?:string){if(!value)return"–";const date=new Date(value);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date)}
function compatiblePositions(slot:string){
  const map:Record<string,string[]>={QB:["QB"],RB:["RB","FB"],FB:["FB","RB"],"X WR":["WR"],"Z WR":["WR"],SLOT:["WR","TE"],TE:["TE","WR"],LT:["OL","T"],LG:["OL","G"],C:["C","OL"],RG:["OL","G"],RT:["OL","T"],LDE:["DE","DL"],RDE:["DE","DL"],DT:["DT","DL"],NT:["NT","DT","DL"],WILL:["LB","OLB","ILB","MLB"],MIKE:["MLB","ILB","LB"],SAM:["LB","OLB","ILB"],CB1:["CB","DB"],CB2:["CB","DB"],NICKEL:["CB","DB","SS"],FS:["FS","DB"],SS:["SS","DB"],K:["K"],P:["P"],LS:["LS"],HOLDER:["QB","P","K"],KR:["KR","WR","RB","DB"],PR:["PR","WR","RB","DB"],"GUNNER L":["WR","DB","CB","LB"],"GUNNER R":["WR","DB","CB","LB"]};
  return map[slot]??[];
}
function sortedPlayers(players:RosterPlayer[],slot:string){const compatible=new Set(compatiblePositions(slot));return [...players].sort((a,b)=>{const am=compatible.has(a.primaryPosition)?0:1;const bm=compatible.has(b.primaryPosition)?0:1;if(am!==bm)return am-bm;const aa=a.availability==="full"?0:1;const ba=b.availability==="full"?0:1;if(aa!==ba)return aa-ba;return (a.jerseyNumber??999)-(b.jerseyNumber??999)})}
