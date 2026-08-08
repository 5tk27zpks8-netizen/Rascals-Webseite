"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminCard, AdminNotice, AdminShell } from "../../_components/AdminShell";
import "./linebackers.css";

type Season={id:string;year:number;name:string;isCurrent:boolean};
type Player={id:string;rosterMembershipId:string;firstName:string;lastName:string;jerseyNumber:number|null;position:string;secondaryPosition:string;availability:string;rosterStatus:string;starter:boolean;captain:boolean};
type Evaluation={id:string;playerId:string;seasonId:string;skillKey:string;current:number;target:number;priority:number;confidence:number;note:string;context:string;evaluatedAt:string;evaluatedBy:string};
type Skill={key:string;label:string;category:string;description:string;sortOrder:number;current:number;target:number;priority:number;confidence:number;note:string;needScore:number;delta:number|null;lastEvaluatedAt:string|null;lastEvaluatedBy:string;history:Evaluation[]};
type Goal={id:string;playerId:string;seasonId:string;skillKey:string|null;title:string;targetRating:number|null;dueDate:string|null;status:"open"|"in-progress"|"achieved"|"paused";note:string;createdBy:string;updatedBy:string;createdAt:string;updatedAt:string};
type GroupNeed={key:string;label:string;category:string;count:number;current:number;target:number;priority:number;needScore:number;coveragePct:number};
type Payload={
  seasons:Season[];season:Season;players:Player[];player:Player|null;skills?:Skill[];goals?:Goal[];groupNeeds:GroupNeed[];
  evidence?:{officialStats:Record<string,number>;attendancePct:number|null;performanceIndex:number|null;performanceEntries:number};
  summary?:{currentIndex:number|null;needIndex:number|null;evaluated:number;totalSkills:number;improved:number;declined:number;openGoals:number};
};
type Mode="player"|"position";

type SkillDraft={current:number;target:number;priority:number;confidence:number;note:string};

const statLabels:Record<string,string>={tackles:"Tackles",tackles_solo:"Solo",tackles_assisted:"Assists",tfl:"TFL",sacks:"Sacks",qb_hits:"QB Hits",interceptions:"INT",pass_breakups:"PBU",forced_fumbles:"FF",fumble_recoveries:"FR",coverage_tackles:"ST Tackles"};

export function LinebackerDevelopmentManager(){
  const[data,setData]=useState<Payload|null>(null);
  const[seasonId,setSeasonId]=useState("");
  const[playerId,setPlayerId]=useState("");
  const[mode,setMode]=useState<Mode>("player");
  const[drafts,setDrafts]=useState<Record<string,SkillDraft>>({});
  const[notice,setNotice]=useState("");
  const[loading,setLoading]=useState(true);
  const[saving,setSaving]=useState("");
  const[goalSkill,setGoalSkill]=useState("");
  const[goalTitle,setGoalTitle]=useState("");
  const[goalTarget,setGoalTarget]=useState("5");
  const[goalDue,setGoalDue]=useState("");
  const[goalNote,setGoalNote]=useState("");

  useEffect(()=>{void boot()},[]);

  async function boot(){
    const params=new URLSearchParams(window.location.search);
    await load(params.get("season")||undefined,params.get("player")||undefined);
  }

  async function load(nextSeason?:string,nextPlayer?:string){
    setLoading(true);setNotice("");
    try{
      const params=new URLSearchParams();if(nextSeason)params.set("seasonId",nextSeason);if(nextPlayer)params.set("playerId",nextPlayer);
      const response=await fetch(`/admin/api/development/linebackers?${params.toString()}`);
      if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error??"Linebacker Development konnte nicht geladen werden.")}
      const body=await response.json() as Payload;
      setData(body);setSeasonId(body.season.id);setPlayerId(body.player?.id??body.players[0]?.id??"");
      const nextDrafts:Record<string,SkillDraft>={};for(const skill of body.skills??[])nextDrafts[skill.key]={current:skill.current,target:skill.target,priority:skill.priority,confidence:skill.confidence,note:skill.note};setDrafts(nextDrafts);
      if(!goalSkill&&body.skills?.[0])setGoalSkill(body.skills[0].key);
    }catch(error){setNotice(error instanceof Error?error.message:"Fehler beim Laden.")}finally{setLoading(false)}
  }

  async function changeSeason(id:string){setSeasonId(id);setPlayerId("");updateUrl(id,"");await load(id,undefined)}
  async function changePlayer(id:string){setPlayerId(id);updateUrl(seasonId,id);await load(seasonId,id)}
  function updateUrl(season=seasonId,player=playerId){const p=new URLSearchParams();if(season)p.set("season",season);if(player)p.set("player",player);window.history.replaceState(null,"",`/admin/development/linebackers?${p.toString()}`)}
  function patchSkill(key:string,field:keyof SkillDraft,value:string|number){setDrafts(current=>({...current,[key]:{...(current[key]??{current:3,target:5,priority:2,confidence:3,note:""}),[field]:value}}))}

  async function saveEvaluation(skill:Skill){
    if(!data?.player)return;
    const draft=drafts[skill.key];if(!draft)return;
    setSaving(skill.key);setNotice("");
    try{
      const response=await fetch("/admin/api/development/linebackers",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"evaluate",playerId:data.player.id,seasonId:data.season.id,skillKey:skill.key,...draft,evaluatedAt:new Date().toISOString().slice(0,10)})});
      if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error??"Bewertung konnte nicht gespeichert werden.")}
      await load(data.season.id,data.player.id);setNotice(`${skill.label} als neue Evaluation gespeichert.`);
    }catch(error){setNotice(error instanceof Error?error.message:"Speichern fehlgeschlagen.")}finally{setSaving("")}
  }

  async function addGoal(){
    if(!data?.player||!goalTitle.trim())return setNotice("Bitte eine Zielbezeichnung eingeben.");
    setSaving("goal");setNotice("");
    try{
      const response=await fetch("/admin/api/development/linebackers",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"goal",playerId:data.player.id,seasonId:data.season.id,skillKey:goalSkill||null,title:goalTitle,target:Number(goalTarget)||null,dueDate:goalDue||null,note:goalNote})});
      if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error??"Development Goal konnte nicht angelegt werden.")}
      setGoalTitle("");setGoalDue("");setGoalNote("");await load(data.season.id,data.player.id);setNotice("Development Goal angelegt.");
    }catch(error){setNotice(error instanceof Error?error.message:"Ziel konnte nicht gespeichert werden.")}finally{setSaving("")}
  }

  async function setGoalStatus(goalId:string,status:Goal["status"]){
    setSaving(goalId);setNotice("");
    try{
      const response=await fetch("/admin/api/development/linebackers",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({action:"goal-status",goalId,status})});
      if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error??"Zielstatus konnte nicht geändert werden.")}
      await load(seasonId,playerId);setNotice("Zielstatus aktualisiert.");
    }catch(error){setNotice(error instanceof Error?error.message:"Zielstatus konnte nicht geändert werden.")}finally{setSaving("")}
  }

  const topNeeds=useMemo(()=>[...(data?.groupNeeds??[])].filter(item=>item.count>0).slice(0,8),[data]);
  const evaluatedCoverage=useMemo(()=>{const players=data?.players.length??0;if(!players)return 0;const values=(data?.groupNeeds??[]).filter(item=>item.count>0).map(item=>item.coveragePct);return values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):0},[data]);
  const officialStats=Object.entries(data?.evidence?.officialStats??{}).filter(([key,value])=>value!==0&&statLabels[key]).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,8);

  return <AdminShell active="development" title="Linebacker Development Lab" eyebrow="RASCALS OS · POSITION DEVELOPMENT PILOT" actions={<><a className="cms-button secondary" href="/admin/development">Development Overview</a><a className="cms-button secondary" href="/admin/stats/analytics">Stats Analytics</a></>}>
    {notice&&<AdminNotice tone={notice.includes("gespeichert")||notice.includes("angelegt")||notice.includes("aktualisiert")?"success":"error"}>{notice}</AdminNotice>}

    <AdminCard className="lb-hero">
      <div><small>POSITION ROOM · LINEBACKERS</small><h2>Coach Evaluation + Evidence + Development Goals</h2><p>Der Pilot verbindet positionsspezifische Skill-Evaluations, Official Stats, Attendance/Performance und konkrete Entwicklungsziele. Jede neue Bewertung wird historisch gespeichert statt den vorherigen Stand zu überschreiben.</p></div>
      <div className="lb-filters"><label className="cms-field"><span>Saison</span><select value={seasonId} disabled={loading} onChange={e=>void changeSeason(e.target.value)}>{data?.seasons.map(season=><option key={season.id} value={season.id}>{season.name}{season.isCurrent?" · AKTUELL":""}</option>)}</select></label><label className="cms-field"><span>Linebacker</span><select value={playerId} disabled={loading||!data?.players.length} onChange={e=>void changePlayer(e.target.value)}>{data?.players.map(player=><option key={player.id} value={player.id}>#{player.jerseyNumber??"–"} {player.firstName} {player.lastName} · {player.position}</option>)}</select></label></div>
    </AdminCard>

    <div className="lb-tabs"><button className={mode==="player"?"active":""} onClick={()=>setMode("player")}>Player Development Canvas</button><button className={mode==="position"?"active":""} onClick={()=>setMode("position")}>LB Position Room</button></div>

    {!data?.player&&<AdminNotice tone="info">In dieser Saison ist aktuell kein Spieler mit LB/MLB/ILB/OLB/WILL/MIKE/SAM als Primary oder Secondary Position im Season Roster vorhanden.</AdminNotice>}

    {mode==="player"&&data?.player&&<>
      <div className="lb-kpis"><Metric label="Current Skill Index" value={data.summary?.currentIndex} suffix="/100"/><Metric label="Need Index" value={data.summary?.needIndex} suffix="/100" risk/><Metric label="Evaluated Skills" value={data.summary?.evaluated} suffix={`/${data.summary?.totalSkills??0}`}/><Metric label="Improved" value={data.summary?.improved} suffix=" Skills"/><Metric label="Open Goals" value={data.summary?.openGoals} suffix=""/><Metric label="Availability" value={null} text={data.player.availability.toUpperCase()}/></div>

      <div className="lb-evidence-grid">
        <AdminCard><div className="cms-section-head"><div><small>OBJECTIVE EVIDENCE</small><h2>Official On-Field Output</h2></div><a href={`/admin/stats/analytics?season=${encodeURIComponent(data.season.id)}&player=${encodeURIComponent(data.player.id)}`}>Stats öffnen →</a></div><div className="lb-stat-grid">{officialStats.map(([key,value])=><span key={key}><b>{value}</b><small>{statLabels[key]}</small></span>)}{!officialStats.length&&<p className="cms-muted">Noch keine Official Stats für diesen Spieler in der Saison.</p>}</div></AdminCard>
        <AdminCard><div className="cms-section-head"><div><small>COACH / TRAINING EVIDENCE</small><h2>Availability & Performance</h2></div><a href="/admin/performance">Performance →</a></div><div className="lb-evidence"><span><small>TRAINING ATTENDANCE</small><b>{data.evidence?.attendancePct==null?"–":`${data.evidence.attendancePct}%`}</b></span><span><small>PERFORMANCE INDEX</small><b>{data.evidence?.performanceIndex==null?"–":`${data.evidence.performanceIndex}/100`}</b></span><span><small>EVIDENCE ENTRIES</small><b>{data.evidence?.performanceEntries??0}</b></span></div><p className="cms-muted">Diese Werte sind Kontext für den Coach – sie ersetzen keine Skill-Evaluation.</p></AdminCard>
      </div>

      <AdminCard className="lb-skill-card-wrap"><div className="cms-section-head"><div><small>POSITION-SPECIFIC SKILL MODEL</small><h2>Linebacker Skill Matrix</h2></div><span className="cms-muted">1–5 Rating · jede Speicherung erzeugt Historie</span></div><div className="lb-skills">{data.skills?.map(skill=>{const draft=drafts[skill.key]??{current:skill.current,target:skill.target,priority:skill.priority,confidence:skill.confidence,note:skill.note};const need=Math.round(Math.max(0,draft.target-draft.current)/4*(Math.max(1,Math.min(3,draft.priority))/3)*100);return <article key={skill.key} className={need>=50?"risk":""}><div className="lb-skill-head"><div><small>{skill.category}</small><h3>{skill.label}</h3><p>{skill.description}</p></div><span className={`lb-need ${need>=50?"hot":need>=25?"mid":"low"}`}><b>{need}</b><small>NEED</small></span></div><div className="lb-rating-row"><label>IST<select value={draft.current} onChange={e=>patchSkill(skill.key,"current",Number(e.target.value))}>{[1,2,3,4,5].map(v=><option key={v}>{v}</option>)}</select></label><label>ZIEL<select value={draft.target} onChange={e=>patchSkill(skill.key,"target",Number(e.target.value))}>{[1,2,3,4,5].map(v=><option key={v}>{v}</option>)}</select></label><label>PRIO<select value={draft.priority} onChange={e=>patchSkill(skill.key,"priority",Number(e.target.value))}><option value={1}>Normal</option><option value={2}>Wichtig</option><option value={3}>Fokus</option></select></label><label>CONF<select value={draft.confidence} onChange={e=>patchSkill(skill.key,"confidence",Number(e.target.value))}>{[1,2,3,4,5].map(v=><option key={v}>{v}</option>)}</select></label></div><div className="lb-progress"><i style={{width:`${draft.current/5*100}%`}}/><span style={{left:`${draft.target/5*100}%`}}/></div><label className="cms-field"><span>Coach Note / Evidence</span><textarea rows={2} value={draft.note} onChange={e=>patchSkill(skill.key,"note",e.target.value)} placeholder="Beobachtung, Film-Referenz, technischer Fokus…"/></label><div className="lb-skill-foot"><span>{skill.delta==null?"Noch kein Vergleich":skill.delta>0?`▲ +${skill.delta.toFixed(1)} seit letzter Evaluation`:skill.delta<0?`▼ ${skill.delta.toFixed(1)} seit letzter Evaluation`:"→ unverändert"}{skill.lastEvaluatedAt?` · ${formatDate(skill.lastEvaluatedAt)}`:""}</span><button className="cms-button" disabled={saving===skill.key} onClick={()=>void saveEvaluation(skill)}>{saving===skill.key?"Speichert…":"Neue Evaluation speichern"}</button></div>{skill.history.length>1&&<details className="lb-history"><summary>Historie ({skill.history.length})</summary><div>{skill.history.map(item=><span key={item.id}><b>{formatDate(item.evaluatedAt)}</b><em>{item.current} → Ziel {item.target}</em><small>{item.evaluatedBy||"Coach"}</small></span>)}</div></details>}</article>})}</div></AdminCard>

      <div className="lb-goal-layout">
        <AdminCard><div className="cms-section-head"><div><small>INDIVIDUAL DEVELOPMENT PLAN</small><h2>Development Goals</h2></div></div><div className="lb-goals">{data.goals?.map(goal=><article key={goal.id}><div><small>{goal.skillKey?data.skills?.find(skill=>skill.key===goal.skillKey)?.label??goal.skillKey:"GENERAL"}</small><h3>{goal.title}</h3><p>{goal.note||"Kein Zusatzhinweis"}</p><span>{goal.targetRating?`Target Rating ${goal.targetRating}`:""}{goal.dueDate?` · Due ${formatDate(goal.dueDate)}`:""}</span></div><select disabled={saving===goal.id} value={goal.status} onChange={e=>void setGoalStatus(goal.id,e.target.value as Goal["status"])}><option value="open">OPEN</option><option value="in-progress">IN PROGRESS</option><option value="achieved">ACHIEVED</option><option value="paused">PAUSED</option></select></article>)}{!data.goals?.length&&<p className="cms-muted">Noch keine Development Goals angelegt.</p>}</div></AdminCard>
        <AdminCard><div className="cms-section-head"><div><small>NEW GOAL</small><h2>Ziel anlegen</h2></div></div><div className="lb-goal-form"><label className="cms-field"><span>Skill</span><select value={goalSkill} onChange={e=>setGoalSkill(e.target.value)}><option value="">Allgemeines Ziel</option>{data.skills?.map(skill=><option key={skill.key} value={skill.key}>{skill.label}</option>)}</select></label><label className="cms-field"><span>Ziel</span><input value={goalTitle} onChange={e=>setGoalTitle(e.target.value)} placeholder="z. B. Run Fit auf verlässliches Starter-Niveau bringen"/></label><label className="cms-field"><span>Target Rating</span><select value={goalTarget} onChange={e=>setGoalTarget(e.target.value)}>{[1,2,3,4,5].map(v=><option key={v}>{v}</option>)}</select></label><label className="cms-field"><span>Due Date</span><input type="date" value={goalDue} onChange={e=>setGoalDue(e.target.value)}/></label><label className="cms-field"><span>Plan / Coaching Point</span><textarea rows={3} value={goalNote} onChange={e=>setGoalNote(e.target.value)} placeholder="Drills, Film, technische Cues, Review-Rhythmus…"/></label><button className="cms-button" disabled={saving==="goal"} onClick={()=>void addGoal()}>{saving==="goal"?"Speichert…":"Development Goal anlegen"}</button></div></AdminCard>
      </div>
    </>}

    {mode==="position"&&<>
      <div className="lb-kpis"><Metric label="LB Room Size" value={data?.players.length??0} suffix=""/><Metric label="Evaluation Coverage" value={evaluatedCoverage} suffix="%"/><Metric label="Top Need" value={topNeeds[0]?.needScore??0} suffix="/100" risk/><Metric label="Game Ready" value={data?.players.filter(p=>p.availability==="full"&&p.rosterStatus==="active").length??0} suffix={`/${data?.players.length??0}`}/></div>
      <div className="lb-position-grid"><AdminCard><div className="cms-section-head"><div><small>POSITION ROOM INTELLIGENCE</small><h2>Gemeinsame LB Entwicklungsfelder</h2></div></div><div className="lb-needs">{topNeeds.map((need,index)=><article key={need.key}><b>{index+1}</b><div><strong>{need.label}</strong><span>{need.category} · {need.count}/{data?.players.length??0} bewertet · Coverage {need.coveragePct}%</span></div><div><strong>{need.needScore}</strong><small>NEED</small></div><i><span style={{width:`${need.needScore}%`}}/></i></article>)}{!topNeeds.length&&<p className="cms-muted">Noch keine LB Skill-Evaluationen vorhanden.</p>}</div></AdminCard><AdminCard><div className="cms-section-head"><div><small>LB ROOM</small><h2>Personnel Snapshot</h2></div></div><div className="lb-room-list">{data?.players.map(player=><button key={player.id} onClick={()=>{setMode("player");void changePlayer(player.id)}}><span><b>#{player.jerseyNumber??"–"} {player.firstName} {player.lastName}</b><small>{player.position}{player.secondaryPosition?` / ${player.secondaryPosition}`:""}</small></span><em>{player.availability.toUpperCase()}</em>{player.starter&&<strong>STARTER</strong>}</button>)}</div></AdminCard></div>
      <AdminCard><div className="cms-section-head"><div><small>COACHING DECISION SUPPORT</small><h2>Training Priority Translation</h2></div><a className="cms-button secondary" href="/admin/development">Training Planner →</a></div><div className="lb-priority-grid">{topNeeds.slice(0,6).map(need=><article key={need.key}><small>{need.category}</small><h3>{need.label}</h3><b>{need.needScore>=60?"HIGH PRIORITY":need.needScore>=30?"TARGETED WORK":"MAINTAIN"}</b><p>Ø Ist {need.current.toFixed(1)} · Ziel {need.target.toFixed(1)} · Priorität {need.priority.toFixed(1)}</p></article>)}</div></AdminCard>
    </>}
  </AdminShell>
}

function Metric({label,value,suffix,text,risk=false}:{label:string;value:number|null|undefined;suffix:string;text?:string;risk?:boolean}){return <div className={`lb-metric ${risk?"risk":""}`}><small>{label}</small><strong>{text??(value??"–")}<i>{text?"":suffix}</i></strong></div>}
function formatDate(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}).format(date)}
