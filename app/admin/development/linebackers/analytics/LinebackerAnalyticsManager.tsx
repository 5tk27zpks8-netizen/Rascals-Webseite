"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminCard, AdminNotice, AdminShell } from "../../../_components/AdminShell";
import "./analytics.css";

type Season={id:string;year:number;name:string;isCurrent:boolean};
type Player={id:string;jerseyNumber:number|null;firstName:string;lastName:string;position:string;secondaryPosition:string;availability:string;rosterStatus:string;starter:boolean;captain:boolean};
type Evaluation={id:string;playerId:string;skillKey:string;current:number;target:number;priority:number;confidence:number;note:string;evaluatedAt:string;evaluatedBy:string};
type Drill={id:string;title:string;phase:string;intensity:string;minMinutes:number;maxMinutes:number;description:string;coachingPoints:string;relevance:number};
type SkillSummary={key:string;label:string;category:string;description:string;sortOrder:number;count:number;current:number;target:number;priority:number;confidence:number;needScore:number;trainingScore:number;coveragePct:number;delta:number|null;status:"evaluate-first"|"focus"|"improve"|"maintain";drills:Drill[]};
type PlayerSummary=Player&{evaluated:number;coveragePct:number;currentIndex:number|null;needIndex:number|null;trend:number|null;openGoals:number};
type SkillTrend={key:string;label:string;category:string;history:Evaluation[]};
type Progress={id:string;progressPct:number;note:string;recordedBy:string;recordedAt:string};
type Goal={id:string;playerId:string;skillKey:string|null;title:string;status:string;targetRating:number|null;dueDate:string|null;note:string;progressPct:number;progressHistory:Progress[];updatedAt:string};
type Recommendation={key:string;label:string;category:string;trainingScore:number;needScore:number;coveragePct:number;minutes:number;drills:Drill[]};
type Payload={
  seasons:Season[];season:Season;players:Player[];selectedPlayer:Player|null;selectedSkillTrends:SkillTrend[];goals:Goal[];
  skillSummaries:SkillSummary[];playerSummaries:PlayerSummary[];recommendations:Recommendation[];focusMinutes:number;
  summary:{linebackers:number;evaluationCoveragePct:number;currentIndex:number|null;needIndex:number|null;roomTrend:number|null;openGoals:number;achievedGoals:number;overdueGoals:number;averageGoalProgress:number|null};
};
type Mode="position"|"player"|"goals";
type GoalDraft=Record<string,{progress:string;note:string}>;

export function LinebackerAnalyticsManager(){
  const[data,setData]=useState<Payload|null>(null);
  const[seasonId,setSeasonId]=useState("");
  const[playerId,setPlayerId]=useState("");
  const[minutes,setMinutes]=useState(45);
  const[mode,setMode]=useState<Mode>("position");
  const[notice,setNotice]=useState("");
  const[loading,setLoading]=useState(true);
  const[saving,setSaving]=useState("");
  const[goalDrafts,setGoalDrafts]=useState<GoalDraft>({});

  useEffect(()=>{void boot()},[]);

  async function boot(){
    const params=new URLSearchParams(window.location.search);
    const initialMinutes=Math.max(20,Math.min(90,Number(params.get("minutes")||45)));
    setMinutes(initialMinutes);
    await load(params.get("season")||undefined,params.get("player")||undefined,initialMinutes);
  }

  async function load(nextSeason?:string,nextPlayer?:string,nextMinutes=minutes){
    setLoading(true);setNotice("");
    try{
      const params=new URLSearchParams({minutes:String(nextMinutes)});
      if(nextSeason)params.set("seasonId",nextSeason);
      if(nextPlayer)params.set("playerId",nextPlayer);
      const response=await fetch(`/admin/api/development/linebackers/analytics?${params.toString()}`);
      if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error??"LB Analytics konnten nicht geladen werden.")}
      const body=await response.json() as Payload;
      setData(body);setSeasonId(body.season.id);setPlayerId(body.selectedPlayer?.id??body.players[0]?.id??"");setMinutes(body.focusMinutes);
      const drafts:GoalDraft={};for(const goal of body.goals)drafts[goal.id]={progress:String(goal.progressPct),note:""};setGoalDrafts(drafts);
    }catch(error){setNotice(error instanceof Error?error.message:"Fehler beim Laden.")}finally{setLoading(false)}
  }

  function updateUrl(nextSeason=seasonId,nextPlayer=playerId,nextMinutes=minutes){
    const params=new URLSearchParams();if(nextSeason)params.set("season",nextSeason);if(nextPlayer)params.set("player",nextPlayer);params.set("minutes",String(nextMinutes));
    window.history.replaceState(null,"",`/admin/development/linebackers/analytics?${params.toString()}`);
  }

  async function changeSeason(id:string){setSeasonId(id);setPlayerId("");updateUrl(id,"",minutes);await load(id,undefined,minutes)}
  async function changePlayer(id:string){setPlayerId(id);updateUrl(seasonId,id,minutes);await load(seasonId,id,minutes)}
  async function changeMinutes(value:number){setMinutes(value);updateUrl(seasonId,playerId,value);await load(seasonId,playerId,value)}

  function patchGoal(id:string,field:"progress"|"note",value:string){setGoalDrafts(current=>({...current,[id]:{progress:current[id]?.progress??"0",note:current[id]?.note??"",[field]:value}}))}

  async function saveGoalProgress(goal:Goal){
    const draft=goalDrafts[goal.id]??{progress:String(goal.progressPct),note:""};
    setSaving(goal.id);setNotice("");
    try{
      const response=await fetch("/admin/api/development/linebackers/analytics",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"goal-progress",goalId:goal.id,progressPct:Number(draft.progress),note:draft.note})});
      if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error??"Goal-Fortschritt konnte nicht gespeichert werden.")}
      await load(seasonId,playerId,minutes);setNotice("Goal-Fortschritt gespeichert.");
    }catch(error){setNotice(error instanceof Error?error.message:"Speichern fehlgeschlagen.")}finally{setSaving("")}
  }

  const selectedSummary=useMemo(()=>data?.playerSummaries.find(player=>player.id===playerId)??null,[data,playerId]);
  const topSkills=useMemo(()=>data?.skillSummaries.filter(skill=>skill.count>0).slice(0,10)??[],[data]);
  const coverageGaps=useMemo(()=>data?.skillSummaries.filter(skill=>skill.status==="evaluate-first").slice(0,8)??[],[data]);

  return <AdminShell active="lbanalytics" title="LB Position Room" eyebrow="RASCALS OS · DEVELOPMENT ANALYTICS" actions={<><a className="cms-button secondary" href="/admin/development/linebackers">LB Lab</a><a className="cms-button secondary" href="/admin/stats/analytics">Stats Analytics</a></>}>
    {notice&&<AdminNotice tone={notice.includes("gespeichert")?"success":"error"}>{notice}</AdminNotice>}

    <AdminCard className="lba-hero">
      <div><small>POSITION ROOM INTELLIGENCE</small><h2>Linebacker Development Control</h2><p>Evaluation Trends, Goal Progress, Drill-Verknüpfungen und automatische Training Needs auf Basis der jeweils neuesten Coach-Evaluation pro Spieler und Skill.</p></div>
      <div className="lba-filters">
        <label className="cms-field"><span>Saison</span><select value={seasonId} disabled={loading} onChange={e=>void changeSeason(e.target.value)}>{data?.seasons.map(season=><option key={season.id} value={season.id}>{season.name}{season.isCurrent?" · AKTUELL":""}</option>)}</select></label>
        <label className="cms-field"><span>Linebacker</span><select value={playerId} disabled={loading||!data?.players.length} onChange={e=>void changePlayer(e.target.value)}>{data?.players.map(player=><option key={player.id} value={player.id}>#{player.jerseyNumber??"–"} {player.firstName} {player.lastName} · {player.position}</option>)}</select></label>
        <label className="cms-field"><span>LB Focus Period</span><select value={minutes} disabled={loading} onChange={e=>void changeMinutes(Number(e.target.value))}>{[30,45,60,75,90].map(value=><option key={value} value={value}>{value} Minuten</option>)}</select></label>
      </div>
    </AdminCard>

    <div className="lba-tabs"><button className={mode==="position"?"active":""} onClick={()=>setMode("position")}>Position Room</button><button className={mode==="player"?"active":""} onClick={()=>setMode("player")}>Player Trends</button><button className={mode==="goals"?"active":""} onClick={()=>setMode("goals")}>Goals & Progress</button></div>

    <div className="lba-kpis">
      <Metric label="Linebackers" value={data?.summary.linebackers}/>
      <Metric label="Evaluation Coverage" value={data?.summary.evaluationCoveragePct} suffix="%"/>
      <Metric label="Current Skill Index" value={data?.summary.currentIndex} suffix="/100"/>
      <Metric label="Need Index" value={data?.summary.needIndex} suffix="/100" risk/>
      <Metric label="Room Trend" value={data?.summary.roomTrend} suffix="" trend/>
      <Metric label="Open Goals" value={data?.summary.openGoals} suffix={data?.summary.overdueGoals?` · ${data.summary.overdueGoals} overdue`:""} risk={Boolean(data?.summary.overdueGoals)}/>
    </div>

    {!data?.players.length&&<AdminNotice tone="info">Für diese Saison sind aktuell keine Linebacker im Season Roster vorhanden.</AdminNotice>}

    {mode==="position"&&data&&<>
      <div className="lba-main-grid">
        <AdminCard className="lba-plan-card">
          <div className="cms-section-head"><div><small>AUTOMATIC TRAINING NEEDS</small><h2>{data.focusMinutes} Minuten LB Focus Period</h2></div><span className="cms-muted">Nur ausreichend bewertete Skills werden automatisch priorisiert.</span></div>
          <div className="lba-plan">{data.recommendations.map((item,index)=><article key={item.key}>
            <div className="lba-minutes"><b>{item.minutes}</b><small>MIN</small></div>
            <div className="lba-plan-copy"><small>FOCUS {index+1} · TRAINING SCORE {item.trainingScore}</small><h3>{item.label}</h3><p>Need {item.needScore}/100 · Evaluation Coverage {item.coveragePct}%</p>
              <div className="lba-drills">{item.drills.map(drill=><details key={drill.id}><summary><b>{drill.title}</b><span>{drill.phase.toUpperCase()} · {drill.intensity.toUpperCase()}</span></summary><p>{drill.description}</p><strong>Coaching Points</strong><p>{drill.coachingPoints}</p></details>)}</div>
            </div>
          </article>)}{!data.recommendations.length&&<p className="cms-muted">Noch nicht genug Evaluation Coverage für eine belastbare automatische LB-Trainingsempfehlung.</p>}</div>
        </AdminCard>

        <AdminCard>
          <div className="cms-section-head"><div><small>DATA QUALITY</small><h2>Evaluation Gaps</h2></div></div>
          <p className="cms-muted">Skills unter 40 % Coverage werden nicht aggressiv als Trainingsproblem interpretiert. Zuerst Datenbasis vervollständigen.</p>
          <div className="lba-gap-list">{coverageGaps.map(skill=><article key={skill.key}><span><b>{skill.label}</b><small>{skill.category}</small></span><strong>{skill.coveragePct}%</strong></article>)}{!coverageGaps.length&&<p className="cms-muted">Keine kritischen Evaluation-Coverage-Lücken.</p>}</div>
        </AdminCard>
      </div>

      <AdminCard>
        <div className="cms-section-head"><div><small>POSITION NEED MATRIX</small><h2>Aktuelle LB Entwicklungsfelder</h2></div><span className="cms-muted">Latest evaluation per Player + Skill</span></div>
        <div className="lba-table-wrap"><table className="lba-table"><thead><tr><th>Skill</th><th>Current</th><th>Target</th><th>Need</th><th>Training</th><th>Coverage</th><th>Trend</th><th>Primary Drill</th></tr></thead><tbody>{topSkills.map(skill=><tr key={skill.key} className={skill.status==="focus"?"risk":""}><td><b>{skill.label}</b><small>{skill.category}</small></td><td>{skill.current||"–"}</td><td>{skill.target||"–"}</td><td><strong>{skill.needScore}</strong></td><td><Status value={skill.status} score={skill.trainingScore}/></td><td>{skill.coveragePct}%</td><td><Trend value={skill.delta}/></td><td>{skill.drills[0]?.title??"–"}</td></tr>)}</tbody></table></div>
      </AdminCard>

      <AdminCard>
        <div className="cms-section-head"><div><small>PLAYER WATCHLIST</small><h2>Linebacker Development Overview</h2></div></div>
        <div className="lba-player-grid">{data.playerSummaries.map(player=><button key={player.id} onClick={()=>{setMode("player");void changePlayer(player.id)}}><span><b>#{player.jerseyNumber??"–"} {player.firstName} {player.lastName}</b><small>{player.position} · {player.availability.toUpperCase()}</small></span><div><em>CUR {player.currentIndex??"–"}</em><em>NEED {player.needIndex??"–"}</em><em>{player.coveragePct}% COV</em><Trend value={player.trend}/></div></button>)}</div>
      </AdminCard>
    </>}

    {mode==="player"&&data?.selectedPlayer&&<>
      <AdminCard className="lba-player-head"><div><small>PLAYER TREND</small><h2>#{data.selectedPlayer.jerseyNumber??"–"} {data.selectedPlayer.firstName} {data.selectedPlayer.lastName}</h2><p>{data.selectedPlayer.position} · {data.selectedPlayer.availability.toUpperCase()} · {data.selectedPlayer.starter?"STARTER":"DEPTH"}</p></div>{selectedSummary&&<div><span><small>CURRENT</small><b>{selectedSummary.currentIndex??"–"}</b></span><span><small>NEED</small><b>{selectedSummary.needIndex??"–"}</b></span><span><small>COVERAGE</small><b>{selectedSummary.coveragePct}%</b></span><span><small>TREND</small><b><Trend value={selectedSummary.trend}/></b></span></div>}</AdminCard>
      <div className="lba-trend-grid">{data.selectedSkillTrends.map(skill=><AdminCard key={skill.key} className="lba-trend-card"><div className="cms-section-head"><div><small>{skill.category}</small><h3>{skill.label}</h3></div><Trend value={skill.history.length>1?skill.history[skill.history.length-1].current-skill.history[skill.history.length-2].current:null}/></div><Sparkline history={skill.history}/><div className="lba-trend-history">{skill.history.slice(-4).reverse().map(item=><span key={item.id}><b>{item.current.toFixed(1)}</b><small>{formatDate(item.evaluatedAt)}</small><em>Conf {item.confidence}/5</em></span>)}</div></AdminCard>)}{!data.selectedSkillTrends.length&&<AdminNotice tone="info">Für diesen Spieler gibt es noch keine historische Skill-Evaluation.</AdminNotice>}</div>
    </>}

    {mode==="goals"&&data?.selectedPlayer&&<>
      <AdminCard className="lba-goal-head"><div><small>INDIVIDUAL DEVELOPMENT PLAN</small><h2>Goal Progress · #{data.selectedPlayer.jerseyNumber??"–"} {data.selectedPlayer.firstName} {data.selectedPlayer.lastName}</h2><p>Fortschritt wird als eigene Historie gespeichert. 100 % setzt das Goal automatisch auf Achieved.</p></div><a className="cms-button secondary" href={`/admin/development/linebackers?season=${encodeURIComponent(seasonId)}&player=${encodeURIComponent(playerId)}`}>Goal im LB Lab anlegen</a></AdminCard>
      <div className="lba-goals">{data.goals.map(goal=>{const draft=goalDrafts[goal.id]??{progress:String(goal.progressPct),note:""};return <AdminCard key={goal.id} className="lba-goal-card"><div className="lba-goal-title"><div><small>{goal.status.toUpperCase()}</small><h3>{goal.title}</h3><p>{goal.note||"Kein Goal-Plan hinterlegt."}</p></div><strong>{goal.progressPct}%</strong></div><div className="lba-goal-progress"><i style={{width:`${goal.progressPct}%`}}/></div><div className="lba-goal-meta"><span>Target Rating <b>{goal.targetRating??"–"}</b></span><span>Due <b>{formatDate(goal.dueDate)}</b></span><span>Updates <b>{goal.progressHistory.length}</b></span></div><div className="lba-goal-form"><label className="cms-field"><span>Fortschritt</span><input type="number" min="0" max="100" value={draft.progress} onChange={e=>patchGoal(goal.id,"progress",e.target.value)}/></label><label className="cms-field"><span>Progress Note</span><input value={draft.note} onChange={e=>patchGoal(goal.id,"note",e.target.value)} placeholder="Was hat sich konkret verbessert?"/></label><button className="cms-button" disabled={saving===goal.id} onClick={()=>void saveGoalProgress(goal)}>{saving===goal.id?"Speichert…":"Progress speichern"}</button></div>{goal.progressHistory.length>0&&<details className="lba-goal-history"><summary>Progress History</summary>{goal.progressHistory.map(item=><div key={item.id}><b>{item.progressPct}%</b><span>{item.note||"Ohne Notiz"}</span><small>{formatDateTime(item.recordedAt)} · {item.recordedBy||"Coach"}</small></div>)}</details>}</AdminCard>})}{!data.goals.length&&<AdminNotice tone="info">Für diesen Linebacker ist noch kein Development Goal angelegt.</AdminNotice>}</div>
    </>}
  </AdminShell>
}

function Metric({label,value,suffix="",risk=false,trend=false}:{label:string;value:number|null|undefined;suffix?:string;risk?:boolean;trend?:boolean}){return <article className={risk?"risk":""}><small>{label}</small><b>{trend?<Trend value={value??null}/>:value==null?"–":value}</b>{!trend&&<span>{suffix}</span>}</article>}
function Status({value,score}:{value:SkillSummary["status"];score:number}){const label=value==="evaluate-first"?"EVALUATE":value==="focus"?"FOCUS":value==="improve"?"IMPROVE":"MAINTAIN";return <em className={`lba-status ${value}`}>{label} · {score}</em>}
function Trend({value}:{value:number|null}){if(value==null)return <span className="lba-trend flat">–</span>;if(value>0)return <span className="lba-trend up">▲ +{value.toFixed(1)}</span>;if(value<0)return <span className="lba-trend down">▼ {value.toFixed(1)}</span>;return <span className="lba-trend flat">→ 0.0</span>}
function Sparkline({history}:{history:Evaluation[]}){if(history.length<2)return <div className="lba-spark-empty">Mindestens zwei Evaluationen für einen Trend erforderlich.</div>;const w=520,h=130,p=14;const points=history.map((item,index)=>{const x=p+(index/(history.length-1))*(w-p*2);const y=h-p-((item.current-1)/4)*(h-p*2);return{x,y,item}});return <svg className="lba-spark" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Skill Evaluation Trend"><line x1={p} x2={w-p} y1={h-p} y2={h-p}/><line x1={p} x2={w-p} y1={p} y2={p}/><polyline points={points.map(point=>`${point.x},${point.y}`).join(" ")} fill="none"/><g>{points.map(point=><circle key={point.item.id} cx={point.x} cy={point.y} r="4"/>)}</g></svg>}
function formatDate(value:string|null){if(!value)return"–";const date=new Date(value);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}).format(date)}
function formatDateTime(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}).format(date)}
