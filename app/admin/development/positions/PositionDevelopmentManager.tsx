"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminCard, AdminNotice, AdminShell } from "../../_components/AdminShell";
import "./position-development.css";

type GroupKey = "QB" | "RB" | "WRTE" | "OL" | "DL" | "LB" | "DB" | "ST";
type Group = { key: GroupKey; label: string; unit: string; aliases: string[]; statKeys: string[] };
type Season = { id: string; year: number; name: string; isCurrent: boolean };
type Player = { id: string; jerseyNumber: number | null; firstName: string; lastName: string; position: string; secondaryPosition: string; availability: string; rosterStatus: string; starter: boolean; captain: boolean };
type Evaluation = { id: string; playerId: string; seasonId: string; skillKey: string; current: number; target: number; priority: number; confidence: number; note: string; evaluatedAt: string; evaluatedBy: string; context: string };
type Drill = { id: string; title: string; phase: string; intensity: string; minMinutes: number; maxMinutes: number; description: string; coachingPoints: string; relevance: number };
type SkillBase = { key: string; label: string; category: string; positionGroup: string; description: string; sortOrder: number };
type GroupNeed = SkillBase & { count: number; current: number; target: number; priority: number; confidence: number; needScore: number; coveragePct: number; trainingScore: number; trend: number | null; state: "evaluate-first" | "focus" | "improve" | "maintain"; drills: Drill[] };
type Skill = SkillBase & { current: number; target: number; priority: number; confidence: number; note: string; needScore: number; delta: number | null; lastEvaluatedAt: string | null; lastEvaluatedBy: string; history: Evaluation[]; drills: Drill[] };
type Goal = { id: string; skillKey: string | null; title: string; targetRating: number | null; dueDate: string | null; status: "open" | "in-progress" | "achieved" | "paused"; note: string; updatedAt: string };
type PlayerDetail = { profile: Player; skills: Skill[]; goals: Goal[]; evidence: { officialStats: Record<string, number>; attendancePct: number | null; performanceEntries: number }; summary: { evaluated: number; totalSkills: number; coveragePct: number; currentIndex: number | null; needIndex: number | null; improved: number; declined: number; openGoals: number } };
type Payload = { groups: Group[]; group: Group; seasons: Season[]; season: Season; players: Player[]; selectedPlayerId: string; skills: SkillBase[]; groupNeeds: GroupNeed[]; player: PlayerDetail | null; settings: { targetCoveragePct: number; reviewCadenceDays: number }; summary: { players: number; coveragePct: number; currentIndex: number | null; needIndex: number | null; focusSkills: number; evaluateFirst: number } };
type Draft = { current: number; target: number; priority: number; confidence: number; note: string };
type Mode = "room" | "player" | "goals";

const statLabels: Record<string, string> = {
  pass_attempts: "ATT", pass_completions: "CMP", passing_yards: "PASS YDS", passing_td: "PASS TD", interceptions_thrown: "INT",
  carries: "CAR", rushing_yards: "RUSH YDS", rushing_td: "RUSH TD", targets: "TGT", receptions: "REC", receiving_yards: "REC YDS",
  receiving_td: "REC TD", yac: "YAC", drops: "DROP", tackles: "TACK", tackles_solo: "SOLO", tackles_assisted: "AST", tfl: "TFL",
  sacks: "SACK", qb_hits: "QBH", interceptions: "INT", pass_breakups: "PBU", forced_fumbles: "FF", fumble_recoveries: "FR",
  field_goals_made: "FGM", field_goals_attempted: "FGA", pat_made: "PAT", punts: "PUNT", punt_yards: "PUNT YDS",
  kick_return_yards: "KR YDS", punt_return_yards: "PR YDS", coverage_tackles: "ST TACK", blocked_kicks: "BLK",
};

export function PositionDevelopmentManager() {
  const [data, setData] = useState<Payload | null>(null);
  const [group, setGroup] = useState<GroupKey>("QB");
  const [seasonId, setSeasonId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [mode, setMode] = useState<Mode>("room");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [goalSkill, setGoalSkill] = useState("");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("5");
  const [goalDue, setGoalDue] = useState("");
  const [goalNote, setGoalNote] = useState("");
  const [targetCoverage, setTargetCoverage] = useState(80);
  const [cadence, setCadence] = useState(28);

  useEffect(() => { void boot(); }, []);

  async function boot() {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get("group") || "QB").toUpperCase();
    const initialGroup: GroupKey = ["QB", "RB", "WRTE", "OL", "DL", "LB", "DB", "ST"].includes(raw) ? raw as GroupKey : "QB";
    setGroup(initialGroup);
    await load(initialGroup, params.get("season") || undefined, params.get("player") || undefined);
  }

  async function load(nextGroup: GroupKey = group, nextSeason?: string, nextPlayer?: string) {
    setLoading(true);
    setNotice("");
    try {
      const params = new URLSearchParams({ group: nextGroup });
      if (nextSeason) params.set("seasonId", nextSeason);
      if (nextPlayer) params.set("playerId", nextPlayer);
      const response = await fetch(`/admin/api/development/positions?${params.toString()}`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Position Development konnte nicht geladen werden.");
      }
      const body = await response.json() as Payload;
      setData(body);
      setGroup(body.group.key);
      setSeasonId(body.season.id);
      setPlayerId(body.selectedPlayerId);
      setTargetCoverage(body.settings.targetCoveragePct);
      setCadence(body.settings.reviewCadenceDays);
      const nextDrafts: Record<string, Draft> = {};
      for (const skill of body.player?.skills ?? []) nextDrafts[skill.key] = { current: skill.current, target: skill.target, priority: skill.priority, confidence: skill.confidence, note: skill.note };
      setDrafts(nextDrafts);
      const validGoalSkill = body.player?.skills.some((skill) => skill.key === goalSkill) ? goalSkill : body.player?.skills[0]?.key ?? "";
      setGoalSkill(validGoalSkill);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Fehler beim Laden.");
    } finally {
      setLoading(false);
    }
  }

  function syncUrl(nextGroup = group, nextSeason = seasonId, nextPlayer = playerId) {
    const params = new URLSearchParams({ group: nextGroup });
    if (nextSeason) params.set("season", nextSeason);
    if (nextPlayer) params.set("player", nextPlayer);
    window.history.replaceState(null, "", `/admin/development/positions?${params.toString()}`);
  }

  async function changeGroup(next: GroupKey) {
    setGroup(next);
    setPlayerId("");
    setGoalSkill("");
    syncUrl(next, seasonId, "");
    await load(next, seasonId, undefined);
  }

  async function changeSeason(next: string) {
    setSeasonId(next);
    setPlayerId("");
    setGoalSkill("");
    syncUrl(group, next, "");
    await load(group, next, undefined);
  }

  async function changePlayer(next: string) {
    setPlayerId(next);
    setGoalSkill("");
    syncUrl(group, seasonId, next);
    await load(group, seasonId, next);
  }

  function patch(key: string, field: keyof Draft, value: string | number) {
    setDrafts((current) => ({ ...current, [key]: { ...(current[key] ?? { current: 3, target: 5, priority: 2, confidence: 3, note: "" }), [field]: value } }));
  }

  async function saveEvaluation(skill: Skill) {
    if (!data?.player) return;
    const draft = drafts[skill.key];
    if (!draft) return;
    setSaving(skill.key);
    setNotice("");
    try {
      const response = await fetch("/admin/api/development/positions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "evaluate", group, seasonId: data.season.id, playerId: data.player.profile.id, skillKey: skill.key, ...draft, evaluatedAt: new Date().toISOString().slice(0, 10) }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Evaluation konnte nicht gespeichert werden.");
      }
      await load(group, data.season.id, data.player.profile.id);
      setNotice(`${skill.label} gespeichert.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving("");
    }
  }

  async function addGoal() {
    if (!data?.player || !goalTitle.trim()) return setNotice("Bitte eine Zielbezeichnung eingeben.");
    setSaving("goal");
    setNotice("");
    try {
      const response = await fetch("/admin/api/development/positions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "goal", group, seasonId: data.season.id, playerId: data.player.profile.id, skillKey: goalSkill || null, title: goalTitle, target: Number(goalTarget) || null, dueDate: goalDue || null, note: goalNote }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Goal konnte nicht angelegt werden.");
      }
      setGoalTitle("");
      setGoalDue("");
      setGoalNote("");
      await load(group, data.season.id, data.player.profile.id);
      setNotice("Development Goal angelegt.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Goal konnte nicht gespeichert werden.");
    } finally {
      setSaving("");
    }
  }

  async function setGoalStatus(id: string, status: Goal["status"]) {
    setSaving(id);
    setNotice("");
    try {
      const response = await fetch("/admin/api/development/positions", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "goal-status", goalId: id, status }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Status konnte nicht geändert werden.");
      }
      await load(group, seasonId, playerId);
      setNotice("Goal-Status aktualisiert.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Statusänderung fehlgeschlagen.");
    } finally {
      setSaving("");
    }
  }

  async function saveSettings() {
    if (!data) return;
    setSaving("settings");
    setNotice("");
    try {
      const response = await fetch("/admin/api/development/positions", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "settings", seasonId: data.season.id, group, targetCoveragePct: targetCoverage, reviewCadenceDays: cadence }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Settings konnten nicht gespeichert werden.");
      }
      await load(group, data.season.id, playerId);
      setNotice("Position-Settings gespeichert.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Settings konnten nicht gespeichert werden.");
    } finally {
      setSaving("");
    }
  }

  const topNeeds = useMemo(() => data?.groupNeeds.filter((item) => item.count > 0).slice(0, 8) ?? [], [data]);
  const evidence = Object.entries(data?.player?.evidence.officialStats ?? {}).filter(([, value]) => value !== 0).slice(0, 10);

  return <AdminShell active="positiondev" title="Position Development" eyebrow="RASCALS OS · GENERIC DEVELOPMENT FRAMEWORK" actions={<><a className="cms-button secondary" href="/admin/development/linebackers">LB Lab</a><a className="cms-button secondary" href="/admin/stats/analytics">Stats Analytics</a></>}>
    {notice && <AdminNotice tone={notice.includes("gespeichert") || notice.includes("angelegt") || notice.includes("aktualisiert") ? "success" : "error"}>{notice}</AdminNotice>}

    <AdminCard className="pd-hero">
      <div><small>ONE ENGINE · MULTIPLE POSITION ROOMS</small><h2>{data?.group.label ?? "Position Development"}</h2><p>QB, RB, WR/TE, OL, DL, LB, DB und Special Teams nutzen dieselbe Evaluation-, Goal-, Trend-, Drill- und Evidence-Architektur. Positionsspezifisch ändern sich Skill-Modell und relevante Daten.</p></div>
      <div className="pd-filters">
        <label className="cms-field"><span>Positionsgruppe</span><select value={group} disabled={loading} onChange={(event) => void changeGroup(event.target.value as GroupKey)}>{data?.groups.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
        <label className="cms-field"><span>Saison</span><select value={seasonId} disabled={loading} onChange={(event) => void changeSeason(event.target.value)}>{data?.seasons.map((season) => <option key={season.id} value={season.id}>{season.name}{season.isCurrent ? " · AKTUELL" : ""}</option>)}</select></label>
        <label className="cms-field"><span>Spieler</span><select value={playerId} disabled={loading || !data?.players.length} onChange={(event) => void changePlayer(event.target.value)}>{data?.players.map((player) => <option key={player.id} value={player.id}>#{player.jerseyNumber ?? "–"} {player.firstName} {player.lastName} · {player.position}</option>)}</select></label>
      </div>
    </AdminCard>

    <div className="pd-tabs"><button className={mode === "room" ? "active" : ""} onClick={() => setMode("room")}>Position Room</button><button className={mode === "player" ? "active" : ""} onClick={() => setMode("player")}>Player Evaluation</button><button className={mode === "goals" ? "active" : ""} onClick={() => setMode("goals")}>Goals</button></div>
    <div className="pd-kpis"><Metric label="Players" value={data?.summary.players}/><Metric label="Coverage" value={data?.summary.coveragePct} suffix="%"/><Metric label="Current Index" value={data?.summary.currentIndex} suffix="/100"/><Metric label="Need Index" value={data?.summary.needIndex} suffix="/100" risk/><Metric label="Focus Skills" value={data?.summary.focusSkills}/><Metric label="Evaluate First" value={data?.summary.evaluateFirst}/></div>

    {!data?.players.length && <AdminNotice tone="info">Für {data?.group.label ?? "diese Positionsgruppe"} ist in dieser Saison aktuell kein Spieler im Season Roster zugeordnet.</AdminNotice>}

    {mode === "room" && data && <>
      <div className="pd-room-grid">
        <AdminCard><div className="cms-section-head"><div><small>POSITION NEED MATRIX</small><h2>Top Entwicklungsfelder</h2></div></div><div className="pd-needs">{topNeeds.map((need, index) => <article key={need.key}><b>{index + 1}</b><div><strong>{need.label}</strong><span>{need.category} · {need.count}/{data.players.length} bewertet{need.drills[0] ? ` · ${need.drills[0].title}` : ""}</span></div><em>{need.current || "–"} → {need.target || "–"}</em><Status state={need.state} score={need.trainingScore}/><strong>{need.coveragePct}%</strong></article>)}{!topNeeds.length && <p className="cms-muted">Noch keine Evaluationen für diese Positionsgruppe.</p>}</div></AdminCard>
        <AdminCard><div className="cms-section-head"><div><small>DATA QUALITY</small><h2>Review Standard</h2></div></div><label className="cms-field"><span>Ziel Evaluation Coverage</span><input type="number" min={40} max={100} value={targetCoverage} onChange={(event) => setTargetCoverage(Number(event.target.value))}/></label><label className="cms-field"><span>Review-Rhythmus in Tagen</span><input type="number" min={7} max={120} value={cadence} onChange={(event) => setCadence(Number(event.target.value))}/></label><button className="cms-button" disabled={saving === "settings"} onClick={() => void saveSettings()}>{saving === "settings" ? "Speichert…" : "Standard speichern"}</button><p className="cms-muted">Unter 40 % Coverage markiert die Engine einen Skill zunächst als EVALUATE FIRST statt daraus vorschnell einen Trainingsschwerpunkt abzuleiten.</p></AdminCard>
      </div>
      <AdminCard><div className="cms-section-head"><div><small>GROUP MATRIX</small><h2>{data.group.label}</h2></div><span className="cms-muted">Latest Evaluation pro Player + Skill</span></div><div className="pd-table-wrap"><table className="pd-table"><thead><tr><th>Skill</th><th>Current</th><th>Target</th><th>Need</th><th>Training</th><th>Coverage</th><th>Trend</th><th>Primary Drill</th></tr></thead><tbody>{data.groupNeeds.map((need) => <tr key={need.key}><td><b>{need.label}</b><small>{need.category}</small></td><td>{need.count ? need.current : "–"}</td><td>{need.count ? need.target : "–"}</td><td>{need.count ? need.needScore : "–"}</td><td><Status state={need.state} score={need.trainingScore}/></td><td>{need.coveragePct}%</td><td><Trend value={need.trend}/></td><td>{need.drills[0]?.title ?? "–"}</td></tr>)}</tbody></table></div></AdminCard>
    </>}

    {mode === "player" && data?.player && <>
      <div className="pd-player-kpis"><Metric label="Player Coverage" value={data.player.summary.coveragePct} suffix="%"/><Metric label="Current" value={data.player.summary.currentIndex} suffix="/100"/><Metric label="Need" value={data.player.summary.needIndex} suffix="/100" risk/><Metric label="Improved" value={data.player.summary.improved}/><Metric label="Declined" value={data.player.summary.declined}/><Metric label="Open Goals" value={data.player.summary.openGoals}/></div>
      <div className="pd-evidence">
        <AdminCard><div className="cms-section-head"><div><small>OFFICIAL EVIDENCE</small><h2>On-Field Output</h2></div></div><div className="pd-stat-grid">{evidence.map(([key, value]) => <span key={key}><b>{value}</b><small>{statLabels[key] ?? key}</small></span>)}{!evidence.length && <p className="cms-muted">Noch keine relevanten Official Stats vorhanden oder Stats sind für diese Positionsgruppe nicht der primäre Evidence-Typ.</p>}</div></AdminCard>
        <AdminCard><div className="cms-section-head"><div><small>TRAINING EVIDENCE</small><h2>Availability Context</h2></div></div><div className="pd-stat-grid"><span><b>{data.player.evidence.attendancePct == null ? "–" : `${data.player.evidence.attendancePct}%`}</b><small>ATTENDANCE</small></span><span><b>{data.player.evidence.performanceEntries}</b><small>PERFORMANCE ENTRIES</small></span><span><b>{data.player.profile.availability.toUpperCase()}</b><small>AVAILABILITY</small></span></div></AdminCard>
      </div>
      <div className="pd-skill-grid">{data.player.skills.map((skill) => {
        const draft = drafts[skill.key] ?? { current: skill.current, target: skill.target, priority: skill.priority, confidence: skill.confidence, note: skill.note };
        const need = Math.round(Math.max(0, draft.target - draft.current) / 4 * (Math.max(1, Math.min(3, draft.priority)) / 3) * 100);
        return <AdminCard key={skill.key} className="pd-skill"><div className="pd-skill-head"><div><small>{skill.category}</small><h3>{skill.label}</h3><p>{skill.description}</p></div><b className={need >= 50 ? "hot" : ""}>{need}</b></div><div className="pd-ratings"><label>IST<select value={draft.current} onChange={(event) => patch(skill.key, "current", Number(event.target.value))}>{[1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}</select></label><label>ZIEL<select value={draft.target} onChange={(event) => patch(skill.key, "target", Number(event.target.value))}>{[1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}</select></label><label>PRIO<select value={draft.priority} onChange={(event) => patch(skill.key, "priority", Number(event.target.value))}>{[1, 2, 3].map((value) => <option key={value}>{value}</option>)}</select></label><label>CONF<select value={draft.confidence} onChange={(event) => patch(skill.key, "confidence", Number(event.target.value))}>{[1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}</select></label></div><label className="cms-field"><span>Coach Note / Evidence</span><textarea rows={2} value={draft.note} onChange={(event) => patch(skill.key, "note", event.target.value)}/></label>{skill.drills[0] && <details className="pd-drill"><summary>{skill.drills[0].title} · {skill.drills[0].phase.toUpperCase()}</summary><p>{skill.drills[0].description}</p><small>{skill.drills[0].coachingPoints}</small></details>}<div className="pd-skill-foot"><span><Trend value={skill.delta}/>{skill.lastEvaluatedAt ? ` · ${formatDate(skill.lastEvaluatedAt)}` : " · noch keine Evaluation"}</span><button className="cms-button" disabled={saving === skill.key} onClick={() => void saveEvaluation(skill)}>{saving === skill.key ? "Speichert…" : "Evaluation speichern"}</button></div></AdminCard>;
      })}</div>
    </>}

    {mode === "goals" && data?.player && <>
      <div className="pd-goal-grid">
        <AdminCard><div className="cms-section-head"><div><small>NEW DEVELOPMENT GOAL</small><h2>Ziel anlegen</h2></div></div><label className="cms-field"><span>Skill</span><select value={goalSkill} onChange={(event) => setGoalSkill(event.target.value)}><option value="">Positionsübergreifend</option>{data.player.skills.map((skill) => <option key={skill.key} value={skill.key}>{skill.label}</option>)}</select></label><label className="cms-field"><span>Ziel</span><input value={goalTitle} onChange={(event) => setGoalTitle(event.target.value)} placeholder="z. B. Pass Set stabil auf Starter-Niveau"/></label><label className="cms-field"><span>Target Rating</span><select value={goalTarget} onChange={(event) => setGoalTarget(event.target.value)}>{[3, 4, 5].map((value) => <option key={value}>{value}</option>)}</select></label><label className="cms-field"><span>Due Date</span><input type="date" value={goalDue} onChange={(event) => setGoalDue(event.target.value)}/></label><label className="cms-field"><span>Plan / Notiz</span><textarea rows={3} value={goalNote} onChange={(event) => setGoalNote(event.target.value)}/></label><button className="cms-button" disabled={saving === "goal"} onClick={() => void addGoal()}>{saving === "goal" ? "Speichert…" : "Goal anlegen"}</button></AdminCard>
        <AdminCard><div className="cms-section-head"><div><small>INDIVIDUAL DEVELOPMENT PLAN</small><h2>Aktive Ziele</h2></div></div><div className="pd-goals">{data.player.goals.map((goal) => <article key={goal.id}><div><small>{goal.skillKey ? data.player?.skills.find((skill) => skill.key === goal.skillKey)?.label ?? "Skill" : "General"}</small><h3>{goal.title}</h3><p>{goal.note || "Keine Zusatznotiz."}</p><span>{goal.dueDate ? `Due ${formatDate(goal.dueDate)}` : "Kein Due Date"}{goal.targetRating ? ` · Target ${goal.targetRating}/5` : ""}</span></div><label className="cms-field"><span>Status</span><select value={goal.status} disabled={saving === goal.id} onChange={(event) => void setGoalStatus(goal.id, event.target.value as Goal["status"])}><option value="open">Open</option><option value="in-progress">In Progress</option><option value="paused">Paused</option><option value="achieved">Achieved</option></select></label></article>)}{!data.player.goals.length && <p className="cms-muted">Noch keine Development Goals für diesen Spieler.</p>}</div></AdminCard>
      </div>
    </>}
  </AdminShell>;
}

function Metric({ label, value, suffix = "", risk = false }: { label: string; value: number | null | undefined; suffix?: string; risk?: boolean }) {
  return <div className={`pd-metric ${risk ? "risk" : ""}`}><small>{label}</small><b>{value == null ? "–" : value}{value != null ? suffix : ""}</b></div>;
}

function Status({ state, score }: { state: GroupNeed["state"]; score: number }) {
  return <span className={`pd-status ${state}`}>{state.replace("-", " ").toUpperCase()}{state !== "evaluate-first" ? ` · ${score}` : ""}</span>;
}

function Trend({ value }: { value: number | null }) {
  if (value == null) return <span className="pd-trend flat">–</span>;
  return <span className={`pd-trend ${value > 0 ? "up" : value < 0 ? "down" : "flat"}`}>{value > 0 ? "▲" : value < 0 ? "▼" : "→"} {Math.abs(value).toFixed(1)}</span>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}
