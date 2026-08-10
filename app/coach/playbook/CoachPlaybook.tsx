"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  base11Personnel,
  performanceCards,
  playerProfiles,
  snapshots,
  type FormationSlot,
  type PlayerProfile,
} from "../../data/coach";
import styles from "./playbook.module.css";

const navigation = [
  ["ÜB", "Übersicht"], ["TK", "Team & Kader"], ["SA", "Spieler & Analyse"], ["TR", "Training"],
  ["SP", "Spielbetrieb"], ["PS", "Playbook & Scheme"], ["SC", "Scouting"], ["IM", "Injury Management"],
];

const unitRows = [
  ["Passing Game", "B+", 78.1], ["Rushing Game", "A-", 82.3], ["Offensive Line", "B", 73.2],
  ["Skill Positions", "A-", 81.2], ["Situational", "B+", 76.9],
] as const;

const routeLabels = {
  hook: "Hook",
  post: "Post",
  go: "Go",
  slant: "Slant",
  out: "Out",
  bubble: "Bubble",
  corner: "Corner",
} as const;

type RouteKind = keyof typeof routeLabels;
type RouteSegment = { yards: number; angle: number };
type CustomRouteDefinition = { id: string; name: string; segments: RouteSegment[]; createdAt: string };

type PlayRoute = {
  id: string;
  slotId: string;
  kind: RouteKind | "custom";
  distance: number;
  breakDistance: number;
  angle: number;
  customRouteId?: string;
  customName?: string;
  customSegments?: RouteSegment[];
};

type SavedPlay = {
  id: string;
  name: string;
  formation: string;
  lineup: FormationSlot[];
  routes: PlayRoute[];
  lineOfScrimmageY: number;
  createdAt: string;
};

type ScoutUnit = "Offense" | "Defense" | "Special Teams";
type OpponentDiagramPlayer = { id: string; label: string; x: number; y: number };
type OpponentDiagramRoute = {
  id: string;
  target: string;
  kind: RouteKind | "custom";
  distance: number;
  breakDistance: number;
  angle: number;
  customRouteId?: string;
  customName?: string;
  customSegments?: RouteSegment[];
};
type OpponentClip = {
  id: string;
  title: string;
  videoUrl: string;
  sourceFileName?: string;
  unit: ScoutUnit;
  quarter: string;
  gameClock: string;
  down: number;
  distance: number;
  fieldHalf: "own" | "opponent";
  yardLine: number;
  hash: "Left" | "Middle" | "Right";
  personnel: string;
  formation: string;
  motion: string;
  playType: string;
  concept: string;
  result: string;
  yardsGained: number;
  tags: string[];
  notes: string;
  diagramPlayers?: OpponentDiagramPlayer[];
  diagramRoutes?: OpponentDiagramRoute[];
  createdAt: string;
};

type OpponentGame = {
  id: string;
  opponent: string;
  date: string;
  season: number;
  competition: string;
  location: "home" | "away" | "neutral";
  rascalsScore: number;
  opponentScore: number;
  clips: OpponentClip[];
};

const scoutFormationOptions: Record<ScoutUnit, string[]> = {
  Offense: ["Gun Trips Right", "Gun Trips Left", "Gun Doubles", "Ace", "I-Formation", "Pistol", "Empty"],
  Defense: ["4-3 Over", "4-3 Under", "3-4 Odd", "Nickel 4-2-5", "Dime 3-2-6", "Goal Line"],
  "Special Teams": ["Punt", "Punt Return", "Field Goal", "Kickoff", "Kick Return"],
};

const scoutTags = ["Early Down", "3rd Down", "Red Zone", "2-Minute", "Backed Up", "Shot Play", "Pressure", "Tempo"];

const initialOpponentGames: OpponentGame[] = [
  {
    id: "game-neckar-2026",
    opponent: "Neckar Hammers",
    date: "2026-06-21",
    season: 2026,
    competition: "GFL2 Süd",
    location: "home",
    rascalsScore: 28,
    opponentScore: 24,
    clips: [
      { id: "neckar-1", title: "Q1 11:42 – Inside Zone", videoUrl: "", unit: "Offense", quarter: "Q1", gameClock: "11:42", down: 1, distance: 10, fieldHalf: "own", yardLine: 34, hash: "Right", personnel: "11", formation: "Gun Trips Right", motion: "None", playType: "Run", concept: "Inside Zone", result: "6 Yards", yardsGained: 6, tags: ["Early Down"], notes: "RB liest den 3-tech. Trips-Seite wird bevorzugt, wenn der Apex weit außen steht.", createdAt: "21.06.2026, 18:10" },
      { id: "neckar-2", title: "Q2 06:18 – Mesh", videoUrl: "", unit: "Offense", quarter: "Q2", gameClock: "06:18", down: 3, distance: 6, fieldHalf: "opponent", yardLine: 42, hash: "Middle", personnel: "11", formation: "Gun Doubles", motion: "Jet", playType: "Pass", concept: "Mesh", result: "1st Down", yardsGained: 9, tags: ["3rd Down", "Tempo"], notes: "Jet-Motion identifiziert Man Coverage. RB läuft den Wheel als Alert.", createdAt: "21.06.2026, 18:16" },
      { id: "neckar-3", title: "Q3 03:27 – Nickel Fire Zone", videoUrl: "", unit: "Defense", quarter: "Q3", gameClock: "03:27", down: 2, distance: 8, fieldHalf: "own", yardLine: 46, hash: "Left", personnel: "Nickel", formation: "Nickel 4-2-5", motion: "None", playType: "Pressure", concept: "Field Fire Zone", result: "Sack", yardsGained: -7, tags: ["Pressure"], notes: "Nickel kommt von der Field Side, Boundary DE droppt in die Hot Lane.", createdAt: "21.06.2026, 18:22" },
    ],
  },
  {
    id: "game-stuttgart-2025",
    opponent: "Stuttgart Silver Arrows",
    date: "2025-09-14",
    season: 2025,
    competition: "GFL2 Süd",
    location: "away",
    rascalsScore: 20,
    opponentScore: 27,
    clips: [],
  },
];

const slotNames: Record<string, string> = {
  "wr-left": "WR1",
  "wr-right": "WR2",
  te: "TE",
  lt: "LT",
  lg: "LG",
  c: "C",
  rg: "RG",
  rt: "RT",
  qb: "QB",
  rb: "RB",
  fb: "FB",
};

const targetOptions = ["O-LINE", "WR1", "WR2", "TE", "LT", "LG", "C", "RG", "RT", "QB", "RB", "FB"];
const routeTargets = ["WR1", "WR2", "TE", "RB", "FB"];

type UnitName = "Offense" | "Defense" | "Special Teams";
type UnitStarter = { position: string; number: number; name: string; rating: number; status?: string };
type MetricItem = { label: string; value: string; rank: number; trend: number[] };

const unitMeta: Record<UnitName, { rating: number; grade: string; label: string; rank: number; groups: Array<[string, number]> }> = {
  Offense: { rating: 78.4, grade: "B+", label: "Starter Offense", rank: 3, groups: [["Passing", 78.1], ["Rushing", 82.3], ["O-Line", 76.8], ["Skill", 81.2]] },
  Defense: { rating: 79.8, grade: "A-", label: "Starter Defense", rank: 2, groups: [["D-Line", 80.4], ["Linebacker", 78.7], ["Secondary", 80.2], ["Pressure", 79.6]] },
  "Special Teams": { rating: 76.9, grade: "B", label: "Starter Special Teams", rank: 5, groups: [["Kicking", 81.2], ["Punting", 77.4], ["Return", 74.1], ["Coverage", 75.3]] },
};

const nonOffenseStarters: Record<Exclude<UnitName, "Offense">, UnitStarter[]> = {
  Defense: [
    { position: "CB1", number: 24, name: "Marco Stein", rating: 82.4 }, { position: "FS", number: 21, name: "Julian Beck", rating: 80.8 },
    { position: "SS", number: 27, name: "Nick Horn", rating: 78.9 }, { position: "CB2", number: 32, name: "Samir Kahn", rating: 79.7 },
    { position: "WILL", number: 44, name: "Lars Kuhn", rating: 77.8 }, { position: "MLB", number: 52, name: "Kai Werner", rating: 83.1 },
    { position: "SAM", number: 56, name: "Eric Vogt", rating: 76.4 }, { position: "DE", number: 91, name: "Tom Seidel", rating: 81.7 },
    { position: "DT", number: 95, name: "Milan Roth", rating: 78.5 }, { position: "NT", number: 99, name: "Ben Stark", rating: 80.1 },
    { position: "DE", number: 93, name: "Jan Kraft", rating: 79.3 },
  ],
  "Special Teams": [
    { position: "K", number: 4, name: "Nils Winter", rating: 84.2 }, { position: "P", number: 6, name: "Ole Kern", rating: 79.1 },
    { position: "LS", number: 48, name: "Tim Haas", rating: 77.8 }, { position: "H", number: 12, name: "Timo Fischer", rating: 76.4 },
    { position: "KR", number: 11, name: "Elias Hartmann", rating: 82.1 }, { position: "PR", number: 81, name: "Leon Wagner", rating: 78.6 },
    { position: "GUN1", number: 17, name: "Luis Brandt", rating: 73.8 }, { position: "GUN2", number: 19, name: "Mats Link", rating: 74.6 },
    { position: "PP", number: 34, name: "David Weber", rating: 75.2 }, { position: "COV1", number: 41, name: "Finn Kurz", rating: 72.9 },
    { position: "COV2", number: 37, name: "Paul Berg", rating: 73.5 },
  ],
};

const unitPerformanceCards: Record<UnitName, MetricItem[]> = {
  Offense: performanceCards,
  Defense: [
    { label: "Gesamt Defense Rating", value: "79.8", rank: 2, trend: [7, 8, 7, 9, 10, 9, 11, 10, 12, 13, 12] },
    { label: "Points Allowed", value: "18.4", rank: 3, trend: [10, 9, 8, 9, 7, 8, 6, 7, 5, 6, 5] },
    { label: "Yards Allowed", value: "312.6", rank: 4, trend: [11, 10, 9, 10, 8, 7, 8, 6, 7, 5, 6] },
    { label: "Sacks per Game", value: "3.1", rank: 2, trend: [5, 7, 6, 8, 9, 8, 10, 9, 11, 12, 13] },
    { label: "3rd Down Stop", value: "62%", rank: 3, trend: [6, 8, 7, 9, 10, 9, 11, 12, 11, 13, 14] },
    { label: "Takeaway Margin", value: "+1.2", rank: 2, trend: [5, 6, 7, 8, 7, 9, 10, 11, 10, 12, 13] },
  ],
  "Special Teams": [
    { label: "Special Teams Rating", value: "76.9", rank: 5, trend: [6, 7, 8, 7, 9, 8, 10, 9, 11, 10, 12] },
    { label: "Field Goal", value: "88%", rank: 4, trend: [8, 9, 9, 10, 9, 11, 10, 12, 11, 13, 13] },
    { label: "Net Punt", value: "41.8", rank: 3, trend: [6, 8, 7, 9, 8, 10, 11, 10, 12, 11, 13] },
    { label: "Return Average", value: "24.6", rank: 6, trend: [5, 6, 7, 6, 8, 7, 9, 8, 10, 9, 11] },
    { label: "Touchback", value: "71%", rank: 2, trend: [7, 8, 9, 10, 9, 11, 12, 11, 13, 14, 13] },
    { label: "Coverage Grade", value: "75.3", rank: 5, trend: [5, 7, 6, 8, 7, 9, 8, 10, 9, 11, 10] },
  ],
};

function byId(id: string) {
  return playerProfiles.find((player) => player.id === id)!;
}

function ratingTone(value: number) {
  if (value >= 80) return styles.good;
  if (value >= 73) return styles.okay;
  return styles.mutedRating;
}

function slotIdFromName(name: string) {
  const normalized = name.toUpperCase().replace(/\s+/g, "");
  if (normalized === "WR1") return "wr-left";
  if (normalized === "WR2") return "wr-right";
  return Object.entries(slotNames).find(([, value]) => value === normalized)?.[0];
}

function yardToFieldPercent(yard: number, half: "own" | "opponent") {
  const safeYard = Math.max(0, Math.min(50, yard));
  const progressFromOwnGoal = half === "own" ? safeYard : 100 - safeYard;
  return ((110 - progressFromOwnGoal) / 120) * 100;
}

function routePoints(slot: FormationSlot, route: PlayRoute) {
  const vertical = (yards: number) => (yards / 120) * 100;
  const horizontal = (yards: number) => (yards / (160 / 3)) * 100;
  const directionToMiddle = slot.x < 50 ? 1 : -1;
  const directionOutside = -directionToMiddle;
  const start = { x: slot.x, y: slot.y };

  if (route.kind === "custom" && route.customSegments?.length) {
    return route.customSegments.reduce<Array<{ x: number; y: number }>>((points, segment) => {
      const previous = points[points.length - 1];
      const radians = (Math.max(-90, Math.min(90, segment.angle)) * Math.PI) / 180;
      points.push({
        x: previous.x + directionToMiddle * horizontal(Math.sin(radians) * segment.yards),
        y: previous.y - vertical(Math.cos(radians) * segment.yards),
      });
      return points;
    }, [start]);
  }

  if (route.kind === "go") return [start, { x: slot.x, y: slot.y - vertical(route.distance) }];
  if (route.kind === "slant") {
    const radians = (route.angle * Math.PI) / 180;
    return [start, {
      x: slot.x + directionToMiddle * horizontal(Math.sin(radians) * route.distance),
      y: slot.y - vertical(Math.cos(radians) * route.distance),
    }];
  }
  if (route.kind === "bubble") {
    return [start, { x: slot.x + directionOutside * horizontal(route.distance * 0.55), y: slot.y - vertical(route.distance * 0.25) }, { x: slot.x + directionOutside * horizontal(route.distance), y: slot.y - vertical(route.distance * 0.45) }];
  }

  const stem = { x: slot.x, y: slot.y - vertical(route.distance) };
  if (route.kind === "hook") {
    return [start, stem, { x: stem.x + directionToMiddle * horizontal(1.2), y: stem.y + vertical(Math.min(1.5, route.distance / 3)) }];
  }
  if (route.kind === "out") {
    return [start, stem, { x: stem.x + directionOutside * horizontal(route.breakDistance), y: stem.y }];
  }

  const radians = (route.angle * Math.PI) / 180;
  const direction = route.kind === "corner" ? directionOutside : directionToMiddle;
  return [start, stem, {
    x: stem.x + direction * horizontal(Math.sin(radians) * route.breakDistance),
    y: stem.y - vertical(Math.cos(radians) * route.breakDistance),
  }];
}

function playRouteLabel(route: PlayRoute) {
  return route.kind === "custom" ? route.customName ?? "Eigene Route" : routeLabels[route.kind];
}

function MetricCard({ item }: { item: MetricItem }) {
  return (
    <article className={styles.metricCard}>
      <span>{item.label}</span>
      <strong>{item.value}</strong>
      <small>League Rank: {item.rank} <b>↑</b></small>
      <div className={styles.miniTrend} aria-hidden="true">
        {item.trend.map((point, index) => <i key={index} style={{ height: `${Math.max(18, point * 5)}%` }} />)}
      </div>
    </article>
  );
}

function RouteCanvas({ routes, slots }: { routes: PlayRoute[]; slots: FormationSlot[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function draw() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.scale(ratio, ratio);
      context.clearRect(0, 0, rect.width, rect.height);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#ffd21f";
      context.fillStyle = "#ffd21f";
      context.shadowColor = "rgba(0, 0, 0, .75)";
      context.shadowBlur = 4;
      context.lineWidth = 3;

      routes.forEach((route) => {
        const slot = slots.find((item) => item.id === route.slotId);
        if (!slot) return;
        const points = routePoints(slot, route).map((point) => ({ x: (point.x / 100) * rect.width, y: (point.y / 100) * rect.height }));
        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
        context.stroke();

        const end = points[points.length - 1];
        const previous = points[points.length - 2];
        const angle = Math.atan2(end.y - previous.y, end.x - previous.x);
        context.beginPath();
        context.moveTo(end.x, end.y);
        context.lineTo(end.x - 10 * Math.cos(angle - Math.PI / 6), end.y - 10 * Math.sin(angle - Math.PI / 6));
        context.lineTo(end.x - 10 * Math.cos(angle + Math.PI / 6), end.y - 10 * Math.sin(angle + Math.PI / 6));
        context.closePath();
        context.fill();

        context.shadowBlur = 2;
        context.font = "700 10px Arial";
        context.textAlign = slot.x > 65 ? "right" : "left";
        context.fillText(playRouteLabel(route).toUpperCase(), points[0].x + (slot.x > 65 ? -8 : 8), points[0].y - 8);
        context.textAlign = "left";
        context.shadowBlur = 4;
      });
    }

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [routes, slots]);

  return <canvas ref={canvasRef} className={styles.routeCanvas} aria-label="Gelbe Spielzugrouten" />;
}

function CustomRoutePreview({ segments }: { segments: RouteSegment[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    context.strokeStyle = "#284538";
    context.lineWidth = 1;
    for (let y = 20; y < height; y += 24) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
    }
    context.strokeStyle = "#ffd21f";
    context.fillStyle = "#ffd21f";
    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    let point = { x: width / 2, y: height - 18 };
    context.beginPath();
    context.moveTo(point.x, point.y);
    segments.forEach((segment) => {
      const radians = (Math.max(-90, Math.min(90, segment.angle)) * Math.PI) / 180;
      point = { x: point.x + Math.sin(radians) * segment.yards * 4.2, y: point.y - Math.cos(radians) * segment.yards * 4.2 };
      context.lineTo(point.x, point.y);
    });
    context.stroke();
    if (segments.length) {
      context.beginPath(); context.arc(point.x, point.y, 5, 0, Math.PI * 2); context.fill();
    }
  }, [segments]);

  return <canvas ref={canvasRef} className={styles.customRoutePreview} width="320" height="210" aria-label="Vorschau der eigenen Route" />;
}

function RouteLibraryModal({
  definitions,
  onSave,
  onDelete,
  onClose,
}: {
  definitions: CustomRouteDefinition[];
  onSave: (definition: CustomRouteDefinition) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [segments, setSegments] = useState<RouteSegment[]>([{ yards: 5, angle: 0 }]);
  const [error, setError] = useState("");

  function resetEditor() {
    setEditingId(null);
    setName("");
    setSegments([{ yards: 5, angle: 0 }]);
    setError("");
  }

  function edit(definition: CustomRouteDefinition) {
    setEditingId(definition.id);
    setName(definition.name);
    setSegments(definition.segments.map((segment) => ({ ...segment })));
    setError("");
  }

  function save() {
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Bitte einen Routennamen eingeben.");
      return;
    }
    if (!segments.length) {
      setError("Die Route benötigt mindestens ein Segment.");
      return;
    }
    onSave({
      id: editingId ?? `route-${Date.now()}`,
      name: cleanName,
      segments: segments.map((segment) => ({ yards: Math.max(1, Math.min(40, segment.yards)), angle: Math.max(-90, Math.min(90, segment.angle)) })),
      createdAt: new Date().toISOString(),
    });
    resetEditor();
  }

  return (
    <div className={styles.routeModalBackdrop} role="presentation">
      <section className={styles.routeLibraryModal} role="dialog" aria-modal="true" aria-label="Routenbibliothek">
        <header><div><span>Routenbibliothek</span><small>Eigene Routen entwickeln und im Playbook verwenden</small></div><button type="button" onClick={onClose} aria-label="Routenbibliothek schließen">×</button></header>
        <div className={styles.routeLibraryBody}>
          <div className={styles.routeEditor}>
            <div className={styles.routeEditorHeading}><h3>{editingId ? "Route bearbeiten" : "Neue Route"}</h3>{editingId && <button type="button" onClick={resetEditor}>Neue Route</button>}</div>
            <label>Routenname<input value={name} onChange={(event) => setName(event.target.value)} placeholder="z. B. Rascals Switch Break" /></label>
            <CustomRoutePreview segments={segments} />
            <p>Winkel: <b>0°</b> geradeaus · <b>+</b> nach innen · <b>−</b> nach außen</p>
            <div className={styles.segmentList}>
              {segments.map((segment, index) => (
                <div key={index}>
                  <span>{index + 1}</span>
                  <label>Yards<input type="number" min="1" max="40" value={segment.yards} onChange={(event) => setSegments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, yards: Number(event.target.value) } : item))} /></label>
                  <label>Winkel<input type="number" min="-90" max="90" value={segment.angle} onChange={(event) => setSegments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, angle: Number(event.target.value) } : item))} /></label>
                  <button type="button" onClick={() => setSegments((current) => current.filter((_, itemIndex) => itemIndex !== index))} disabled={segments.length === 1} aria-label={`Segment ${index + 1} entfernen`}>×</button>
                </div>
              ))}
            </div>
            <button className={styles.addSegmentButton} type="button" onClick={() => setSegments((current) => [...current, { yards: 5, angle: 0 }])}>+ Segment hinzufügen</button>
            {error && <small className={styles.routeError}>{error}</small>}
            <button className={styles.saveCustomRoute} type="button" onClick={save}>{editingId ? "Änderungen speichern" : "Route speichern"}</button>
          </div>

          <div className={styles.routeLibraryList}>
            <h3>Eigene Routen <span>{definitions.length}</span></h3>
            {definitions.length === 0 ? <p>Noch keine eigenen Routen. Erstelle links die erste Route.</p> : definitions.map((definition) => (
              <article key={definition.id}>
                <button type="button" onClick={() => edit(definition)}><span>{definition.name}</span><small>{definition.segments.length} Segmente · {definition.segments.reduce((sum, segment) => sum + segment.yards, 0)} Yards</small></button>
                <button type="button" onClick={() => onDelete(definition.id)} aria-label={`${definition.name} löschen`}>Löschen</button>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function RegulationField({
  slots,
  selectedSlot,
  routes,
  lineOfScrimmageY,
  compact,
  onSelect,
  onMove,
}: {
  slots: FormationSlot[];
  selectedSlot: string;
  routes: PlayRoute[];
  lineOfScrimmageY: number;
  compact: boolean;
  onSelect: (slot: FormationSlot) => void;
  onMove: (slotId: string, x: number, y: number) => void;
}) {
  const fiveYardLines = Array.from({ length: 21 }, (_, i) => i * 5);
  const oneYardMarks = Array.from({ length: 99 }, (_, i) => i + 1);
  const numberYards = Array.from({ length: 9 }, (_, i) => (i + 1) * 10);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [dragSlotId, setDragSlotId] = useState<string | null>(null);

  function moveFromPointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragSlotId || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const playLeft = rect.left;
    const playWidth = rect.width;
    const x = Math.max(3, Math.min(97, ((event.clientX - playLeft) / playWidth) * 100));
    const y = Math.max(8.7, Math.min(91.3, ((event.clientY - rect.top) / rect.height) * 100));
    onMove(dragSlotId, x, y);
  }

  return (
    <div
      ref={viewportRef}
      className={`${styles.fieldViewport} ${compact ? `${styles.regulationField} ${styles.compactField}` : styles.perspectiveField}`}
      onPointerMove={moveFromPointer}
      onPointerUp={() => setDragSlotId(null)}
      onPointerCancel={() => setDragSlotId(null)}
    >
      <div className={styles.stadiumGlow} />
      <div className={styles.fieldSurface} aria-label="Regelkonformes Footballfeld: 120 mal 53 ein Drittel Yards">
        <div className={`${styles.endZone} ${styles.endZoneTop}`}>
          <img src="/rascals-endzone-wordmark-v3.png" alt="Rascals" />
        </div>
        <div className={`${styles.endZone} ${styles.endZoneBottom}`}>
          <img src="/rascals-endzone-wordmark-v3.png" alt="" />
        </div>
        <span className={`${styles.boundary} ${styles.sideLeft}`} />
        <span className={`${styles.boundary} ${styles.sideRight}`} />
        <span className={`${styles.boundary} ${styles.endTop}`} />
        <span className={`${styles.boundary} ${styles.endBottom}`} />
        {fiveYardLines.map((yard) => (
          <span
            className={`${styles.fiveLine} ${yard === 0 || yard === 100 ? styles.goalLine : ""} ${yard === 50 ? styles.midLine : ""}`}
            key={yard}
            style={{ top: `${((10 + yard) / 120) * 100}%` }}
          />
        ))}
        {oneYardMarks.map((yard) => (
          <span className={styles.tickRow} key={yard} style={{ top: `${((10 + yard) / 120) * 100}%` }}>
            <i className={styles.sidelineTickLeft} />
            <i className={styles.hashLeft} />
            <i className={styles.hashRight} />
            <i className={styles.sidelineTickRight} />
          </span>
        ))}
        {numberYards.map((yard) => {
          const value = yard <= 50 ? yard : 100 - yard;
          const turned = yard > 50 ? styles.numberTurned : "";
          return (
            <span className={styles.numberRow} key={yard} style={{ top: `${((10 + yard) / 120) * 100}%` }}>
              <b className={turned}>{value}</b><b className={turned}>{value}</b>
            </span>
          );
        })}
      </div>
      <div className={styles.playLayer}>
        {compact && <div className={styles.scrimmageLine} style={{ top: `${lineOfScrimmageY}%` }}><span>LOS</span></div>}
        {compact && <RouteCanvas routes={routes} slots={slots} />}
        <div className={styles.playerLayer}>
          {slots.map((slot) => {
            const starter = byId(slot.starterId);
            const backup = slot.backupId ? byId(slot.backupId) : undefined;
            return (
              <button
                type="button"
                key={slot.id}
                className={`${styles.playerMarker} ${compact ? styles.compactMarker : ""} ${selectedSlot === slot.id ? styles.playerSelected : ""}`}
                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                onPointerDown={(event) => {
                  if (!compact) return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setDragSlotId(slot.id);
                  onSelect(slot);
                }}
                onClick={() => onSelect(slot)}
                aria-label={`${slotNames[slot.id]} ${starter.firstName} ${starter.lastName}, Nummer ${starter.number}, Rating ${starter.overall}`}
              >
                <span>{slotNames[slot.id]}</span>
                {!compact && <b>#{starter.number}</b>}
                {!compact && <em className={ratingTone(starter.overall)}>{starter.overall.toFixed(1)}</em>}
                {!compact && backup && <small>B · #{backup.number}<i>{backup.overall.toFixed(1)}</i></small>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PlayerSummary({ title, player, confidence }: { title: string; player: PlayerProfile; confidence: number }) {
  return (
    <article className={styles.playerSummary}>
      <header><span>{title}</span><b className={ratingTone(player.overall)}>{player.overall.toFixed(1)}</b></header>
      <h4>#{player.number} {player.firstName} {player.lastName}</h4>
      <div className={styles.playerStats}>
        <span><small>Rec/G</small>{player.metrics.receptionsPerGame?.toFixed(1) ?? "—"}</span>
        <span><small>Yds/G</small>{player.metrics.receivingYardsPerGame?.toFixed(1) ?? "—"}</span>
        <span><small>YPRR</small>{player.metrics.yardsPerRoute?.toFixed(2) ?? "—"}</span>
        <span><small>PFF</small>{player.metrics.pffGrade.toFixed(1)}</span>
      </div>
      <div className={styles.confidence}><small>Confidence</small><span><i style={{ width: `${confidence}%` }} /></span><b>{confidence}%</b></div>
    </article>
  );
}

function LineupOverview({
  unit,
  lineup,
  selectedSlotId,
  onUnitChange,
  onSelectSlot,
  onOpenPlaybook,
}: {
  unit: UnitName;
  lineup: FormationSlot[];
  selectedSlotId: string;
  onUnitChange: (unit: UnitName) => void;
  onSelectSlot: (slotId: string) => void;
  onOpenPlaybook: () => void;
}) {
  const meta = unitMeta[unit];
  const starters: UnitStarter[] = unit === "Offense"
    ? lineup.map((slot) => {
      const player = byId(slot.starterId);
      return { position: slotNames[slot.id], number: player.number, name: `${player.firstName} ${player.lastName}`, rating: player.overall, status: slot.id };
    })
    : nonOffenseStarters[unit];
  const strongest = [...starters].sort((a, b) => b.rating - a.rating)[0];
  const development = [...starters].sort((a, b) => a.rating - b.rating)[0];

  return (
    <section className={styles.lineupOverview}>
      <header className={styles.lineupToolbar}>
        <div className={styles.unitTabs}>
          {(["Offense", "Defense", "Special Teams"] as UnitName[]).map((label) => (
            <button type="button" className={unit === label ? styles.activeUnit : ""} onClick={() => onUnitChange(label)} key={label}>{label}</button>
          ))}
        </div>
        <button className={styles.openPlaybookButton} type="button" onClick={onOpenPlaybook}>Spielzüge &amp; Playbook öffnen</button>
      </header>

      <div className={styles.lineupBody}>
        <article className={styles.unitScoreCard}>
          <span>{meta.label}</span>
          <div><strong>{meta.rating.toFixed(1)}</strong><b>{meta.grade}</b></div>
          <small>League Rank: {meta.rank}</small>
          <div className={styles.unitBars}>
            {meta.groups.map(([label, value]) => <div key={label}><span>{label}</span><i><b style={{ width: `${value}%` }} /></i><em>{value.toFixed(1)}</em></div>)}
          </div>
          <dl className={styles.unitHighlights}>
            <div><dt>Stärkster Starter</dt><dd>{strongest.position} · {strongest.rating.toFixed(1)}</dd></div>
            <div><dt>Entwicklungsfeld</dt><dd>{development.position} · {development.rating.toFixed(1)}</dd></div>
          </dl>
        </article>

        <article className={styles.startersPanel}>
          <header><div><span>Starter-Aufstellung</span><small>{unit} · {starters.length} aktive Starter</small></div><b>Gesamt {meta.rating.toFixed(1)}</b></header>
          <div className={styles.startersGrid}>
            {starters.map((player, index) => (
              <button
                type="button"
                key={`${player.position}-${player.number}-${index}`}
                className={unit === "Offense" && player.status === selectedSlotId ? styles.starterSelected : ""}
                onClick={() => { if (unit === "Offense" && player.status) onSelectSlot(player.status); }}
              >
                <span>{player.position}</span>
                <b>#{player.number}</b>
                <strong>{player.name}</strong>
                <em className={ratingTone(player.rating)}>{player.rating.toFixed(1)}</em>
                <small>Starter · verfügbar</small>
              </button>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function mostCommon(values: string[]) {
  if (!values.length) return "—";
  const counts = values.reduce<Record<string, number>>((result, value) => ({ ...result, [value]: (result[value] ?? 0) + 1 }), {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function opponentMarkers(unit: ScoutUnit, formation: string) {
  if (unit === "Defense") return [
    { id: "de-left", label: "DE1", x: 22, y: 59 }, { id: "dt", label: "DT", x: 38, y: 59 }, { id: "nt", label: "NT", x: 52, y: 59 }, { id: "de-right", label: "DE2", x: 68, y: 59 },
    { id: "will", label: "WILL", x: 32, y: 73 }, { id: "mlb", label: "MLB", x: 50, y: 73 }, { id: "sam", label: "SAM", x: 68, y: 73 }, { id: "cb-left", label: "CB1", x: 10, y: 84 }, { id: "fs", label: "FS", x: 42, y: 90 }, { id: "ss", label: "SS", x: 60, y: 90 }, { id: "cb-right", label: "CB2", x: 90, y: 84 },
  ];
  if (unit === "Special Teams") return [
    { id: "gunner-left", label: "GUN1", x: 15, y: 60 }, { id: "tackle-left", label: "T1", x: 28, y: 60 }, { id: "guard-left", label: "G1", x: 40, y: 60 }, { id: "long-snapper", label: "LS", x: 50, y: 60 }, { id: "guard-right", label: "G2", x: 60, y: 60 }, { id: "tackle-right", label: "T2", x: 72, y: 60 }, { id: "gunner-right", label: "GUN2", x: 85, y: 60 }, { id: "punter", label: "P", x: 50, y: 84 },
  ];
  const tripsRight = formation.includes("Trips Right");
  const empty = formation === "Empty";
  const iFormation = formation === "I-Formation";
  return [
    { id: "wr1", label: "WR1", x: 10, y: 60 }, { id: "lt", label: "LT", x: 35, y: 60 }, { id: "lg", label: "LG", x: 42, y: 60 }, { id: "c", label: "C", x: 50, y: 60 }, { id: "rg", label: "RG", x: 58, y: 60 }, { id: "rt", label: "RT", x: 65, y: 60 },
    { id: "wr2", label: "WR2", x: 90, y: 60 }, { id: "te", label: "TE", x: tripsRight ? 74 : 70, y: 60 }, { id: "fb", label: "FB", x: tripsRight ? 82 : 28, y: empty ? 68 : iFormation ? 82 : 68 }, { id: "qb", label: "QB", x: 50, y: 76 }, { id: "rb", label: "RB", x: empty ? 20 : 50, y: empty ? 68 : iFormation ? 91 : 88 },
  ];
}

function OpponentTacticalField({ clip }: { clip: OpponentClip }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markers = clip.diagramPlayers?.length ? clip.diagramPlayers : opponentMarkers(clip.unit, clip.formation);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    context.strokeStyle = "#ffd21f";
    context.fillStyle = "#ffd21f";
    context.lineWidth = 5;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.shadowColor = "#000b";
    context.shadowBlur = 4;
    const point = (x: number, y: number) => ({ x: (x / 100) * width, y: (y / 100) * height });
    const path = (points: Array<[number, number]>) => {
      context.beginPath();
      points.forEach(([x, y], index) => {
        const next = point(x, y);
        if (index === 0) context.moveTo(next.x, next.y); else context.lineTo(next.x, next.y);
      });
      context.stroke();
      const end = point(points[points.length - 1][0], points[points.length - 1][1]);
      context.beginPath(); context.arc(end.x, end.y, 5, 0, Math.PI * 2); context.fill();
    };

    if (clip.diagramRoutes?.length) {
      clip.diagramRoutes.forEach((route) => {
        const marker = markers.find((player) => player.label === route.target);
        if (!marker) return;
        const start: [number, number] = [marker.x, marker.y];
        const vertical = (yards: number) => yards * 1.55;
        const horizontal = (yards: number) => yards * 1.25;
        const toMiddle = start[0] < 50 ? 1 : -1;
        const outside = -toMiddle;
        let points: Array<[number, number]> = [start];

        if (route.kind === "custom" && route.customSegments?.length) {
          points = route.customSegments.reduce<Array<[number, number]>>((result, segment) => {
            const previous = result[result.length - 1];
            const radians = (Math.max(-90, Math.min(90, segment.angle)) * Math.PI) / 180;
            result.push([previous[0] + toMiddle * horizontal(Math.sin(radians) * segment.yards), previous[1] - vertical(Math.cos(radians) * segment.yards)]);
            return result;
          }, [start]);
        } else if (route.kind === "go") {
          points.push([start[0], start[1] - vertical(route.distance)]);
        } else if (route.kind === "slant") {
          const radians = (route.angle * Math.PI) / 180;
          points.push([start[0] + toMiddle * horizontal(Math.sin(radians) * route.distance), start[1] - vertical(Math.cos(radians) * route.distance)]);
        } else if (route.kind === "bubble") {
          points.push([start[0] + outside * horizontal(route.distance * .55), start[1] - vertical(route.distance * .2)], [start[0] + outside * horizontal(route.distance), start[1] - vertical(route.distance * .35)]);
        } else {
          const stem: [number, number] = [start[0], start[1] - vertical(route.distance)];
          points.push(stem);
          if (route.kind === "hook") points.push([stem[0] + toMiddle * horizontal(1.2), stem[1] + vertical(1.3)]);
          else if (route.kind === "out") points.push([stem[0] + outside * horizontal(route.breakDistance), stem[1]]);
          else {
            const radians = (route.angle * Math.PI) / 180;
            const direction = route.kind === "corner" ? outside : toMiddle;
            points.push([stem[0] + direction * horizontal(Math.sin(radians) * route.breakDistance), stem[1] - vertical(Math.cos(radians) * route.breakDistance)]);
          }
        }
        path(points);
      });
      return;
    }

    if (clip.unit === "Defense") {
      path([[82, 84], [72, 70], [57, 58]]);
      if (clip.playType === "Pressure") path([[32, 73], [42, 64], [50, 57]]);
    } else if (clip.unit === "Special Teams") {
      path([[50, 84], [50, 55], [clip.hash === "Left" ? 28 : clip.hash === "Right" ? 72 : 50, 20]]);
    } else if (["Run", "RPO"].includes(clip.playType)) {
      const direction = /right|outside|stretch/i.test(clip.concept) ? 68 : /left|counter|power/i.test(clip.concept) ? 32 : 50;
      path([[50, 77], [50, 87], [direction, 54], [direction + (direction > 50 ? 7 : direction < 50 ? -7 : 0), 35]]);
    } else {
      path([[10, 60], [10, 30], [24, 16]]);
      path([[74, 60], [67, 35], [55, 22]]);
      path([[90, 60], [90, 38], [78, 38]]);
    }
  }, [clip]);

  return (
    <div className={styles.opponentField} aria-label={`Gegnerische ${clip.unit}-Formation ${clip.formation}`}>
      <div className={styles.opponentEndZone}>SCOUT</div>
      {[18, 34, 50, 66, 82].map((top) => <span className={styles.opponentYardLine} style={{ top: `${top}%` }} key={top} />)}
      <span className={styles.opponentLos} />
      <canvas ref={canvasRef} width="600" height="250" />
      {markers.map((player) => <i style={{ left: `${player.x}%`, top: `${player.y}%` }} key={player.id}>{player.label}</i>)}
      <small>{clip.fieldHalf === "own" ? "OWN" : "OPP"} {clip.yardLine} · {clip.hash.toUpperCase()} HASH</small>
    </div>
  );
}

type ClipDraft = Omit<OpponentClip, "id" | "createdAt">;

function emptyClipDraft(): ClipDraft {
  return {
    title: "", videoUrl: "", sourceFileName: "", unit: "Offense", quarter: "Q1", gameClock: "12:00", down: 1, distance: 10,
    fieldHalf: "own", yardLine: 25, hash: "Middle", personnel: "11", formation: "Gun Trips Right", motion: "None",
    playType: "Run", concept: "Inside Zone", result: "", yardsGained: 0, tags: [], notes: "", diagramPlayers: opponentMarkers("Offense", "Gun Trips Right"), diagramRoutes: [],
  };
}

function normalizeOpponentClip(clip: OpponentClip): OpponentClip {
  const legacyTargets: Record<string, string> = { X: "WR1", Z: "WR2", Y: "TE", H: "FB", F: "FB" };
  return {
    ...clip,
    diagramPlayers: clip.diagramPlayers?.length ? clip.diagramPlayers : opponentMarkers(clip.unit, clip.formation),
    diagramRoutes: (clip.diagramRoutes ?? []).map((route) => ({ ...route, target: legacyTargets[route.target] ?? route.target })),
  };
}

function OpponentAnalysis({ customRoutes, onOpenRouteLibrary, onNotice }: { customRoutes: CustomRouteDefinition[]; onOpenRouteLibrary: () => void; onNotice: (message: string) => void }) {
  const [games, setGames] = useState<OpponentGame[]>(() => initialOpponentGames.map((game) => ({ ...game, clips: game.clips.map(normalizeOpponentClip) })));
  const [selectedGameId, setSelectedGameId] = useState(initialOpponentGames[0].id);
  const [selectedClipId, setSelectedClipId] = useState(initialOpponentGames[0].clips[0]?.id ?? "");
  const [gameFormOpen, setGameFormOpen] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState<"All" | ScoutUnit>("All");
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [clipDraft, setClipDraft] = useState<ClipDraft>(emptyClipDraft);
  const [diagramTarget, setDiagramTarget] = useState<OpponentDiagramRoute["target"]>("WR1");
  const [diagramRouteSelection, setDiagramRouteSelection] = useState("preset:go");
  const [diagramDistance, setDiagramDistance] = useState(10);
  const [diagramBreakDistance, setDiagramBreakDistance] = useState(5);
  const [diagramAngle, setDiagramAngle] = useState(45);
  const [diagramPlayerTarget, setDiagramPlayerTarget] = useState("WR1");
  const [diagramPlayerX, setDiagramPlayerX] = useState(10);
  const [diagramPlayerY, setDiagramPlayerY] = useState(60);
  const [gameDraft, setGameDraft] = useState({ opponent: "", date: "2026-08-01", season: 2026, competition: "GFL2 Süd", location: "home" as OpponentGame["location"], rascalsScore: 0, opponentScore: 0 });

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("rascals-opponent-scouting");
      if (!stored) return;
      const parsed = (JSON.parse(stored) as OpponentGame[]).map((game) => ({ ...game, clips: game.clips.map(normalizeOpponentClip) }));
      if (parsed.length) {
        setGames(parsed);
        setSelectedGameId(parsed[0].id);
        setSelectedClipId(parsed[0].clips[0]?.id ?? "");
      }
    } catch {
      onNotice("Das lokale Gegnerarchiv konnte nicht gelesen werden.");
    }
  }, [onNotice]);

  const selectedGame = games.find((game) => game.id === selectedGameId) ?? games[0];
  const filteredGames = games.filter((game) => seasonFilter === "all" || String(game.season) === seasonFilter);
  const filteredClips = (selectedGame?.clips ?? []).filter((clip) => unitFilter === "All" || clip.unit === unitFilter);
  const selectedClip = filteredClips.find((clip) => clip.id === selectedClipId) ?? filteredClips[0];
  const seasons = [...new Set(games.map((game) => game.season))].sort((a, b) => b - a);
  const offenseClips = selectedGame?.clips.filter((clip) => clip.unit === "Offense") ?? [];
  const passRate = offenseClips.length ? Math.round((offenseClips.filter((clip) => ["Pass", "Screen", "Play Action"].includes(clip.playType)).length / offenseClips.length) * 100) : 0;
  const averageGain = offenseClips.length ? offenseClips.reduce((sum, clip) => sum + clip.yardsGained, 0) / offenseClips.length : 0;
  const draftDiagramPlayers = clipDraft.diagramPlayers ?? opponentMarkers(clipDraft.unit, clipDraft.formation);

  function persistGames(next: OpponentGame[]) {
    setGames(next);
    window.localStorage.setItem("rascals-opponent-scouting", JSON.stringify(next));
  }

  function saveGame(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!gameDraft.opponent.trim() || !gameDraft.date) {
      onNotice("Bitte Gegner und Spieldatum eintragen.");
      return;
    }
    const game: OpponentGame = { id: `opponent-${Date.now()}`, ...gameDraft, opponent: gameDraft.opponent.trim(), clips: [] };
    const next = [game, ...games].sort((a, b) => b.date.localeCompare(a.date));
    persistGames(next);
    setSelectedGameId(game.id);
    setSelectedClipId("");
    setGameFormOpen(false);
    onNotice(`Spiel Rascals gegen ${game.opponent} wurde im Gegnerarchiv angelegt.`);
  }

  function updateClip<K extends keyof ClipDraft>(key: K, value: ClipDraft[K]) {
    setClipDraft((current) => ({ ...current, [key]: value }));
  }

  function loadScoutFormation(unit: ScoutUnit, formation: string) {
    const players = opponentMarkers(unit, formation);
    const validLabels = new Set(players.map((player) => player.label));
    setClipDraft((current) => ({
      ...current,
      unit,
      formation,
      diagramPlayers: players,
      diagramRoutes: unit === "Offense" ? (current.diagramRoutes ?? []).filter((route) => validLabels.has(route.target)) : [],
    }));
    const first = players[0];
    if (first) {
      setDiagramPlayerTarget(first.label);
      setDiagramTarget(first.label);
      setDiagramPlayerX(first.x);
      setDiagramPlayerY(first.y);
    }
  }

  function selectDiagramPlayer(label: string) {
    const player = (clipDraft.diagramPlayers ?? opponentMarkers(clipDraft.unit, clipDraft.formation)).find((item) => item.label === label);
    setDiagramPlayerTarget(label);
    if (player) { setDiagramPlayerX(player.x); setDiagramPlayerY(player.y); }
  }

  function positionOpponentPlayer() {
    const players = clipDraft.diagramPlayers ?? opponentMarkers(clipDraft.unit, clipDraft.formation);
    const next = players.map((player) => player.label === diagramPlayerTarget
      ? { ...player, x: Math.max(4, Math.min(96, diagramPlayerX)), y: Math.max(18, Math.min(94, diagramPlayerY)) }
      : player);
    updateClip("diagramPlayers", next);
    setDiagramTarget(diagramPlayerTarget);
    onNotice(`${diagramPlayerTarget} wurde im Gegnerdiagramm frei positioniert.`);
  }

  function addOpponentDiagramRoute() {
    let route: OpponentDiagramRoute;
    if (diagramRouteSelection.startsWith("custom:")) {
      const definition = customRoutes.find((item) => item.id === diagramRouteSelection.slice(7));
      if (!definition) {
        onNotice("Die ausgewählte eigene Route wurde nicht gefunden.");
        return;
      }
      route = {
        id: `opponent-route-${Date.now()}`,
        target: diagramTarget,
        kind: "custom",
        distance: definition.segments.reduce((sum, segment) => sum + segment.yards, 0),
        breakDistance: 0,
        angle: 0,
        customRouteId: definition.id,
        customName: definition.name,
        customSegments: definition.segments.map((segment) => ({ ...segment })),
      };
    } else {
      route = {
        id: `opponent-route-${Date.now()}`,
        target: diagramTarget,
        kind: diagramRouteSelection.slice(7) as RouteKind,
        distance: Math.max(1, Math.min(40, diagramDistance)),
        breakDistance: Math.max(1, Math.min(25, diagramBreakDistance)),
        angle: Math.max(15, Math.min(90, diagramAngle)),
      };
    }
    setClipDraft((current) => ({ ...current, diagramRoutes: [...(current.diagramRoutes ?? []).filter((item) => item.target !== diagramTarget), route] }));
    onNotice(`${diagramTarget}: ${route.kind === "custom" ? route.customName : routeLabels[route.kind]} wurde ins Gegnerdiagramm eingefügt.`);
  }

  function saveClip(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGame || !clipDraft.title.trim()) {
      onNotice("Bitte einen Clip-Titel eintragen und ein Spiel auswählen.");
      return;
    }
    const clip: OpponentClip = {
      ...clipDraft,
      id: editingClipId ?? `clip-${Date.now()}`,
      title: clipDraft.title.trim(),
      down: Math.max(1, Math.min(4, clipDraft.down)),
      distance: Math.max(1, Math.min(99, clipDraft.distance)),
      yardLine: Math.max(1, Math.min(50, clipDraft.yardLine)),
      createdAt: new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(new Date()),
    };
    const next = games.map((game) => game.id === selectedGame.id
      ? { ...game, clips: [...game.clips.filter((item) => item.id !== clip.id), clip].sort((a, b) => a.quarter.localeCompare(b.quarter) || b.gameClock.localeCompare(a.gameClock)) }
      : game);
    persistGames(next);
    setSelectedClipId(clip.id);
    setEditingClipId(null);
    setClipDraft(emptyClipDraft());
    onNotice(`Scouting-Clip „${clip.title}“ wurde bei ${selectedGame.opponent} gespeichert.`);
  }

  function editClip(clip: OpponentClip) {
    const normalized = normalizeOpponentClip(clip);
    const { id, createdAt, ...draft } = normalized;
    setEditingClipId(id);
    setClipDraft(draft);
    const first = normalized.diagramPlayers?.[0];
    if (first) {
      setDiagramPlayerTarget(first.label);
      setDiagramTarget(first.label);
      setDiagramPlayerX(first.x);
      setDiagramPlayerY(first.y);
    }
    onNotice(`„${clip.title}“ ist zur Bearbeitung geladen.`);
  }

  if (!selectedGame) return null;

  return (
    <section className={styles.opponentScout}>
      <header className={styles.scoutHero}>
        <div><span>Opponent Scouting</span><h2>Gegneranalyse & Video Breakdown</h2><p>Spiele, Filmsequenzen, Formationen und Tendenzen dauerhaft pro Gegner organisieren.</p></div>
        <div><label>Saison<select value={seasonFilter} onChange={(event) => {
          const nextSeason = event.target.value;
          setSeasonFilter(nextSeason);
          const firstGame = games.find((game) => nextSeason === "all" || String(game.season) === nextSeason);
          if (firstGame) { setSelectedGameId(firstGame.id); setSelectedClipId(firstGame.clips[0]?.id ?? ""); }
        }}><option value="all">Alle Saisons</option>{seasons.map((season) => <option value={season} key={season}>{season}</option>)}</select></label><button type="button" onClick={() => setGameFormOpen((open) => !open)}>+ Spiel einpflegen</button></div>
      </header>

      {gameFormOpen && <form className={styles.gameEntryForm} onSubmit={saveGame}>
        <label>Gegner<input value={gameDraft.opponent} onChange={(event) => setGameDraft((current) => ({ ...current, opponent: event.target.value }))} placeholder="z. B. Neckar Hammers" /></label>
        <label>Spieldatum<input type="date" value={gameDraft.date} onChange={(event) => setGameDraft((current) => ({ ...current, date: event.target.value, season: Number(event.target.value.slice(0, 4)) }))} /></label>
        <label>Saison<input type="number" value={gameDraft.season} onChange={(event) => setGameDraft((current) => ({ ...current, season: Number(event.target.value) }))} /></label>
        <label>Wettbewerb<input value={gameDraft.competition} onChange={(event) => setGameDraft((current) => ({ ...current, competition: event.target.value }))} /></label>
        <label>Ort<select value={gameDraft.location} onChange={(event) => setGameDraft((current) => ({ ...current, location: event.target.value as OpponentGame["location"] }))}><option value="home">Heim</option><option value="away">Auswärts</option><option value="neutral">Neutral</option></select></label>
        <label>Rascals<input type="number" min="0" value={gameDraft.rascalsScore} onChange={(event) => setGameDraft((current) => ({ ...current, rascalsScore: Number(event.target.value) }))} /></label>
        <label>Gegner<input type="number" min="0" value={gameDraft.opponentScore} onChange={(event) => setGameDraft((current) => ({ ...current, opponentScore: Number(event.target.value) }))} /></label>
        <button type="submit">Spiel speichern</button>
      </form>}

      <div className={styles.scoutKpis}>
        <article><span>Erfasste Spiele</span><strong>{games.length}</strong><small>{seasons.length} Saisons im Archiv</small></article>
        <article><span>Clips dieses Spiels</span><strong>{selectedGame.clips.length}</strong><small>{offenseClips.length} Offense Snaps</small></article>
        <article><span>Pass Rate</span><strong>{passRate}%</strong><small>aus getaggten Offense Snaps</small></article>
        <article><span>Top Personnel</span><strong>{mostCommon(offenseClips.map((clip) => clip.personnel))}</strong><small>{mostCommon(offenseClips.map((clip) => clip.formation))}</small></article>
        <article><span>Ø Gain</span><strong>{averageGain.toFixed(1)}</strong><small>Yards pro Offense Clip</small></article>
      </div>

      <div className={styles.scoutWorkspace}>
        <aside className={styles.gameArchive}>
          <header><span>Spielarchiv</span><b>{filteredGames.length}</b></header>
          {filteredGames.map((game) => <button type="button" className={game.id === selectedGame.id ? styles.gameSelected : ""} onClick={() => { setSelectedGameId(game.id); setSelectedClipId(game.clips[0]?.id ?? ""); }} key={game.id}>
            <span>Rascals gegen</span><strong>{game.opponent}</strong><small>{new Intl.DateTimeFormat("de-DE").format(new Date(`${game.date}T12:00:00`))} · {game.competition}</small><em>{game.rascalsScore}:{game.opponentScore}<i>{game.clips.length} Clips</i></em>
          </button>)}
        </aside>

        <section className={styles.scoutReview}>
          <header><div><span>{selectedGame.season} · {selectedGame.competition}</span><h3>Rascals gegen {selectedGame.opponent}</h3><small>{new Intl.DateTimeFormat("de-DE", { dateStyle: "long" }).format(new Date(`${selectedGame.date}T12:00:00`))} · {selectedGame.location === "home" ? "Heimspiel" : selectedGame.location === "away" ? "Auswärtsspiel" : "Neutral"}</small></div><strong>{selectedGame.rascalsScore}<i>:</i>{selectedGame.opponentScore}</strong></header>
          {selectedClip ? <>
            <div className={styles.scoutViewer}>
              <div className={styles.videoPane}>
                {selectedClip.videoUrl ? <video controls src={selectedClip.videoUrl} /> : <div><b>VIDEO BREAKDOWN</b><span>{selectedClip.sourceFileName || "Noch kein Video-Link hinterlegt"}</span><small>{selectedClip.quarter} · {selectedClip.gameClock}</small></div>}
              </div>
              <OpponentTacticalField clip={selectedClip} />
            </div>
            <div className={styles.clipBreakdown}>
              <div><span>{selectedClip.unit}</span><h3>{selectedClip.title}</h3><p>{selectedClip.notes || "Keine Coach Notes hinterlegt."}</p></div>
              <dl>
                <div><dt>Situation</dt><dd>{selectedClip.down}. & {selectedClip.distance}</dd></div><div><dt>Ball</dt><dd>{selectedClip.fieldHalf === "own" ? "Own" : "Opp"} {selectedClip.yardLine}</dd></div>
                <div><dt>Personnel</dt><dd>{selectedClip.personnel}</dd></div><div><dt>Formation</dt><dd>{selectedClip.formation}</dd></div>
                <div><dt>Motion</dt><dd>{selectedClip.motion}</dd></div><div><dt>Concept</dt><dd>{selectedClip.concept}</dd></div>
                <div><dt>Result</dt><dd>{selectedClip.result || `${selectedClip.yardsGained} Yards`}</dd></div><div><dt>Tags</dt><dd>{selectedClip.tags.join(" · ") || "—"}</dd></div>
                <div><dt>Routes</dt><dd>{selectedClip.diagramRoutes?.length ? selectedClip.diagramRoutes.map((route) => route.target).join(" · ") : "Auto"}</dd></div>
              </dl>
              <button type="button" onClick={() => editClip(selectedClip)}>Im Editor bearbeiten</button>
            </div>
          </> : <div className={styles.emptyScoutState}><strong>Noch keine Clips für dieses Spiel</strong><span>Rechts eine Filmsequenz mit Football-Tags erfassen.</span></div>}

          <div className={styles.clipArchiveHeader}><h3>Filmsequenzen</h3><div>{(["All", "Offense", "Defense", "Special Teams"] as const).map((filter) => <button type="button" className={unitFilter === filter ? styles.clipFilterActive : ""} onClick={() => setUnitFilter(filter)} key={filter}>{filter === "All" ? "Alle" : filter}</button>)}</div></div>
          <div className={styles.clipArchive}>
            {filteredClips.map((clip) => <button type="button" className={clip.id === selectedClip?.id ? styles.clipSelected : ""} onClick={() => setSelectedClipId(clip.id)} key={clip.id}><span>{clip.quarter}<small>{clip.gameClock}</small></span><strong>{clip.title}<small>{clip.personnel} · {clip.formation}</small></strong><em>{clip.down}.&{clip.distance}<small>{clip.result || `${clip.yardsGained}Y`}</small></em></button>)}
          </div>
        </section>

        <aside className={styles.scoutEditor}>
          <header><div><span>{editingClipId ? "Sequenz bearbeiten" : "Neue Sequenz"}</span><small>Video taggen & Play speichern</small></div>{editingClipId && <button type="button" onClick={() => { setEditingClipId(null); setClipDraft(emptyClipDraft()); setDiagramTarget("WR1"); setDiagramPlayerTarget("WR1"); setDiagramPlayerX(10); setDiagramPlayerY(60); }}>Neu</button>}</header>
          <form onSubmit={saveClip}>
            <label className={styles.wideField}>Clip-Titel<input value={clipDraft.title} onChange={(event) => updateClip("title", event.target.value)} placeholder="z. B. Q1 08:24 – Counter GT" /></label>
            <label className={styles.wideField}>Video-URL / Cloudflare R2<input type="url" value={clipDraft.videoUrl.startsWith("blob:") ? "" : clipDraft.videoUrl} onChange={(event) => updateClip("videoUrl", event.target.value)} placeholder="https://…/clip.mp4" /></label>
            <label className={`${styles.wideField} ${styles.fileField}`}>Lokaler Videoclip<input type="file" accept="video/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) setClipDraft((current) => ({ ...current, videoUrl: URL.createObjectURL(file), sourceFileName: file.name })); }} /><span>{clipDraft.sourceFileName || "MP4, MOV oder WebM auswählen"}</span></label>
            <small className={styles.storageHint}>Lokale Datei: Vorschau in dieser Sitzung. Für dauerhafte Wiedergabe eine Video-URL/R2 verwenden.</small>
            <label>Unit<select value={clipDraft.unit} onChange={(event) => { const unit = event.target.value as ScoutUnit; loadScoutFormation(unit, scoutFormationOptions[unit][0]); }}><option>Offense</option><option>Defense</option><option>Special Teams</option></select></label>
            <label>Quarter<select value={clipDraft.quarter} onChange={(event) => updateClip("quarter", event.target.value)}><option>Q1</option><option>Q2</option><option>Q3</option><option>Q4</option><option>OT</option></select></label>
            <label>Game Clock<input value={clipDraft.gameClock} onChange={(event) => updateClip("gameClock", event.target.value)} placeholder="08:24" /></label>
            <label>Down<input type="number" min="1" max="4" value={clipDraft.down} onChange={(event) => updateClip("down", Number(event.target.value))} /></label>
            <label>Distance<input type="number" min="1" max="99" value={clipDraft.distance} onChange={(event) => updateClip("distance", Number(event.target.value))} /></label>
            <label>Feldseite<select value={clipDraft.fieldHalf} onChange={(event) => updateClip("fieldHalf", event.target.value as ClipDraft["fieldHalf"])}><option value="own">Own</option><option value="opponent">Opponent</option></select></label>
            <label>Yardline<input type="number" min="1" max="50" value={clipDraft.yardLine} onChange={(event) => updateClip("yardLine", Number(event.target.value))} /></label>
            <label>Hash<select value={clipDraft.hash} onChange={(event) => updateClip("hash", event.target.value as ClipDraft["hash"])}><option>Left</option><option>Middle</option><option>Right</option></select></label>
            <label>Personnel<input value={clipDraft.personnel} onChange={(event) => updateClip("personnel", event.target.value)} placeholder="11 / Nickel" /></label>
            <label className={styles.wideField}>Formation<select value={clipDraft.formation} onChange={(event) => loadScoutFormation(clipDraft.unit, event.target.value)}>{scoutFormationOptions[clipDraft.unit].map((formation) => <option key={formation}>{formation}</option>)}</select></label>
            {clipDraft.unit === "Offense" && <fieldset className={`${styles.opponentPlayBuilder} ${styles.wideField}`}>
              <legend>Opponent Play Builder</legend>
              <OpponentTacticalField clip={{ ...clipDraft, id: "draft-preview", createdAt: "" }} />
              <div className={styles.opponentPlayerControls}>
                <label>Spieler<select value={diagramPlayerTarget} onChange={(event) => selectDiagramPlayer(event.target.value)}>{draftDiagramPlayers.map((player) => <option value={player.label} key={player.id}>{player.label}</option>)}</select></label>
                <label>Horizontal %<input type="number" min="4" max="96" value={diagramPlayerX} onChange={(event) => setDiagramPlayerX(Number(event.target.value))} /></label>
                <label>Tiefe %<input type="number" min="18" max="94" value={diagramPlayerY} onChange={(event) => setDiagramPlayerY(Number(event.target.value))} /></label>
                <button type="button" onClick={positionOpponentPlayer}>Spieler positionieren</button>
              </div>
              <div className={styles.opponentRouteControls}>
                <label>Assignment für<select value={diagramTarget} onChange={(event) => setDiagramTarget(event.target.value)}>{draftDiagramPlayers.map((player) => <option value={player.label} key={player.id}>{player.label}</option>)}</select></label>
                <label>Route<select value={diagramRouteSelection} onChange={(event) => setDiagramRouteSelection(event.target.value)}><optgroup label="Standardrouten">{Object.entries(routeLabels).map(([value, label]) => <option value={`preset:${value}`} key={value}>{label}</option>)}</optgroup>{customRoutes.length > 0 && <optgroup label="Eigene Routen">{customRoutes.map((route) => <option value={`custom:${route.id}`} key={route.id}>{route.name}</option>)}</optgroup>}</select></label>
                {!diagramRouteSelection.startsWith("custom:") && <><label>Stem/Yards<input type="number" min="1" max="40" value={diagramDistance} onChange={(event) => setDiagramDistance(Number(event.target.value))} /></label><label>Break<input type="number" min="1" max="25" value={diagramBreakDistance} onChange={(event) => setDiagramBreakDistance(Number(event.target.value))} /></label><label>Winkel<input type="number" min="15" max="90" value={diagramAngle} onChange={(event) => setDiagramAngle(Number(event.target.value))} /></label></>}
              </div>
              <div className={styles.opponentRouteActions}><button type="button" onClick={addOpponentDiagramRoute}>Route / Assignment einfügen</button><button type="button" onClick={onOpenRouteLibrary}>Routenbibliothek</button></div>
              {(clipDraft.diagramRoutes?.length ?? 0) > 0 && <div className={styles.opponentRouteList}>{clipDraft.diagramRoutes!.map((route) => <button type="button" onClick={() => updateClip("diagramRoutes", clipDraft.diagramRoutes!.filter((item) => item.id !== route.id))} key={route.id}><span>{route.target} · {route.kind === "custom" ? route.customName : routeLabels[route.kind]}</span><b>×</b></button>)}</div>}
            </fieldset>}
            <label>Motion<select value={clipDraft.motion} onChange={(event) => updateClip("motion", event.target.value)}><option>None</option><option>Jet</option><option>Orbit</option><option>Return</option><option>Shift</option><option>Trade</option></select></label>
            <label>Play-Typ<select value={clipDraft.playType} onChange={(event) => updateClip("playType", event.target.value)}><option>Run</option><option>Pass</option><option>RPO</option><option>Screen</option><option>Play Action</option><option>Pressure</option><option>Coverage</option><option>Special Teams</option></select></label>
            <label className={styles.wideField}>Concept<input value={clipDraft.concept} onChange={(event) => updateClip("concept", event.target.value)} placeholder="Inside Zone, Mesh, Cover 3…" /></label>
            <label>Result<input value={clipDraft.result} onChange={(event) => updateClip("result", event.target.value)} placeholder="1st Down" /></label>
            <label>Yards<input type="number" min="-99" max="99" value={clipDraft.yardsGained} onChange={(event) => updateClip("yardsGained", Number(event.target.value))} /></label>
            <fieldset className={styles.tagPicker}><legend>Tendency Tags</legend>{scoutTags.map((tag) => <button type="button" className={clipDraft.tags.includes(tag) ? styles.tagActive : ""} onClick={() => updateClip("tags", clipDraft.tags.includes(tag) ? clipDraft.tags.filter((item) => item !== tag) : [...clipDraft.tags, tag])} key={tag}>{tag}</button>)}</fieldset>
            <label className={styles.wideField}>Coach Notes<textarea value={clipDraft.notes} onChange={(event) => updateClip("notes", event.target.value)} placeholder="Key, Read, Tendency, Adjustment…" /></label>
            <button className={styles.saveScoutClip} type="submit">{editingClipId ? "Änderungen speichern" : "Sequenz speichern"}</button>
          </form>
        </aside>
      </div>
    </section>
  );
}

export default function CoachPlaybook() {
  const [unit, setUnit] = useState<UnitName>("Offense");
  const [activeTab, setActiveTab] = useState("Aufstellung");
  const [formation, setFormation] = useState("Shotgun Trips Right");
  const [selectedSlotId, setSelectedSlotId] = useState("te");
  const [lineup, setLineup] = useState<FormationSlot[]>(base11Personnel);
  const [routes, setRoutes] = useState<PlayRoute[]>([]);
  const [lineOfScrimmageY, setLineOfScrimmageY] = useState(yardToFieldPercent(40, "own"));
  const [positionTarget, setPositionTarget] = useState("O-LINE");
  const [yardLine, setYardLine] = useState(40);
  const [yardHalf, setYardHalf] = useState<"own" | "opponent">("own");
  const [routeTarget, setRouteTarget] = useState("WR1");
  const [routeKind, setRouteKind] = useState<RouteKind>("hook");
  const [routeSelection, setRouteSelection] = useState("preset:hook");
  const [routeDistance, setRouteDistance] = useState(3);
  const [routeBreakDistance, setRouteBreakDistance] = useState(5);
  const [routeAngle, setRouteAngle] = useState(45);
  const [playName, setPlayName] = useState("Blue Trips Bubble");
  const [command, setCommand] = useState("WR1 Post 20Y 45° 5Y");
  const [savedPlays, setSavedPlays] = useState<SavedPlay[]>([]);
  const [customRoutes, setCustomRoutes] = useState<CustomRouteDefinition[]>([]);
  const [routeLibraryOpen, setRouteLibraryOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notice, setNotice] = useState("");

  const selectedSlot = lineup.find((slot) => slot.id === selectedSlotId) ?? lineup[1];
  const starter = byId(selectedSlot.starterId);
  const backup = selectedSlot.backupId ? byId(selectedSlot.backupId) : undefined;
  const positionSlots = useMemo(() => lineup.filter((slot) => slot.label === selectedSlot.label), [lineup, selectedSlot.label]);
  const isPlaybook = activeTab === "Spielzüge & Playbook";
  const isOpponentAnalysis = activeTab === "Gegneranalyse";
  const sectionTitle = isOpponentAnalysis ? "Gegneranalyse" : isPlaybook ? "Spielzüge & Playbook" : "Starter-Aufstellung";

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("rascals-playbook-plays");
      if (stored) setSavedPlays(JSON.parse(stored));
      const storedRoutes = window.localStorage.getItem("rascals-custom-routes");
      if (storedRoutes) setCustomRoutes(JSON.parse(storedRoutes));
    } catch {
      setNotice("Gespeicherte Spielzüge konnten nicht gelesen werden.");
    }
  }, []);

  function refresh() {
    setIsRefreshing(true);
    setNotice("");
    window.setTimeout(() => {
      setIsRefreshing(false);
      setNotice("Spielerprofile und Performance-Daten sind aktuell.");
    }, 650);
  }

  function saveSnapshot() {
    setNotice("Snapshot für Week 7 wurde lokal vorgemerkt.");
  }

  function swapDepth() {
    if (!selectedSlot.backupId) return;
    setLineup((current) => current.map((slot) => slot.id === selectedSlot.id
      ? { ...slot, starterId: slot.backupId!, backupId: slot.starterId }
      : slot));
    setNotice("Starter und Backup wurden für diese Formation getauscht.");
  }

  function targetSlotIds(target: string) {
    if (target === "O-LINE") return ["lt", "lg", "c", "rg", "rt"];
    const id = slotIdFromName(target);
    return id ? [id] : [];
  }

  function positionPlayers(target = positionTarget, yard = yardLine, half = yardHalf) {
    const ids = targetSlotIds(target);
    if (!ids.length) {
      setNotice(`Ziel „${target}“ wurde nicht gefunden.`);
      return;
    }
    const y = yardToFieldPercent(yard, half);
    setLineup((current) => current.map((slot) => ids.includes(slot.id) ? { ...slot, y } : slot));
    setLineOfScrimmageY(y);
    setNotice(`${target} steht jetzt auf der ${half === "own" ? "eigenen" : "gegnerischen"} ${yard}-Yard-Linie.`);
  }

  function addRoute(target = routeTarget, kind = routeKind, distance = routeDistance, angle = routeAngle, breakDistance = routeBreakDistance) {
    const slotId = slotIdFromName(target);
    if (!slotId) {
      setNotice(`Routenziel „${target}“ wurde nicht gefunden.`);
      return;
    }
    const nextRoute: PlayRoute = {
      id: `${slotId}-${Date.now()}`,
      slotId,
      kind,
      distance: Math.max(1, Math.min(60, distance)),
      breakDistance: Math.max(1, Math.min(30, breakDistance)),
      angle: Math.max(15, Math.min(90, angle)),
    };
    setRoutes((current) => [...current.filter((route) => route.slotId !== slotId), nextRoute]);
    setSelectedSlotId(slotId);
    setNotice(`${target}: ${routeLabels[kind]} wurde gelb eingezeichnet.`);
  }

  function addSelectedRoute() {
    if (!routeSelection.startsWith("custom:")) {
      addRoute();
      return;
    }
    const definition = customRoutes.find((route) => route.id === routeSelection.slice(7));
    const slotId = slotIdFromName(routeTarget);
    if (!definition || !slotId) {
      setNotice("Die ausgewählte eigene Route wurde nicht gefunden.");
      return;
    }
    const nextRoute: PlayRoute = {
      id: `${slotId}-${Date.now()}`,
      slotId,
      kind: "custom",
      distance: definition.segments.reduce((sum, segment) => sum + segment.yards, 0),
      breakDistance: 0,
      angle: 0,
      customRouteId: definition.id,
      customName: definition.name,
      customSegments: definition.segments.map((segment) => ({ ...segment })),
    };
    setRoutes((current) => [...current.filter((route) => route.slotId !== slotId), nextRoute]);
    setSelectedSlotId(slotId);
    setNotice(`${routeTarget}: ${definition.name} wurde gelb eingezeichnet.`);
  }

  function saveCustomRoute(definition: CustomRouteDefinition) {
    const next = [...customRoutes.filter((route) => route.id !== definition.id), definition].sort((a, b) => a.name.localeCompare(b.name, "de"));
    setCustomRoutes(next);
    window.localStorage.setItem("rascals-custom-routes", JSON.stringify(next));
    setRouteSelection(`custom:${definition.id}`);
    setNotice(`Eigene Route „${definition.name}“ wurde gespeichert und ausgewählt.`);
  }

  function deleteCustomRoute(id: string) {
    const definition = customRoutes.find((route) => route.id === id);
    const next = customRoutes.filter((route) => route.id !== id);
    setCustomRoutes(next);
    window.localStorage.setItem("rascals-custom-routes", JSON.stringify(next));
    if (routeSelection === `custom:${id}`) {
      setRouteSelection("preset:hook");
      setRouteKind("hook");
    }
    setNotice(`Route „${definition?.name ?? "Eigene Route"}“ wurde gelöscht.`);
  }

  function executeCommand() {
    const text = command.trim();
    if (!text) return;
    const playMatch = text.match(/^play\s+(.+?)\s+(WR1|WR2|TE|RB|FB)\s+/i);
    let actionable = text;
    if (playMatch) {
      setPlayName(playMatch[1].trim());
      actionable = text.slice(playMatch[0].toLowerCase().indexOf(playMatch[2].toLowerCase(), 5));
    }

    const positionMatch = actionable.match(/^(O[- ]?LINE|WR1|WR2|TE|LT|LG|C|RG|RT|QB|RB|FB)\s+auf\s+(\d{1,2})(?:\s*[- ]?yards?)?(?:\s+(eigene|eigenen|gegner|gegnerische|gegnerischen))?/i);
    if (positionMatch) {
      const target = positionMatch[1].toUpperCase().replace("OLINE", "O-LINE").replace("O LINE", "O-LINE");
      const yard = Math.min(50, Number(positionMatch[2]));
      const half = positionMatch[3]?.toLowerCase().startsWith("gegner") ? "opponent" : "own";
      setPositionTarget(target);
      setYardLine(yard);
      setYardHalf(half);
      positionPlayers(target, yard, half);
      return;
    }

    const routeMatch = actionable.match(/(WR1|WR2|TE|RB|FB)\s+(HOOK|POST|GO|SLANT|OUT|BUBBLE|CORNER)/i);
    if (routeMatch) {
      const target = routeMatch[1].toUpperCase();
      const kind = routeMatch[2].toLowerCase() as RouteKind;
      const numbers = actionable.slice(routeMatch.index! + routeMatch[0].length).match(/\d+(?:[.,]\d+)?/g)?.map((value) => Number(value.replace(",", "."))) ?? [];
      const distance = numbers[0] ?? (kind === "hook" ? 3 : 10);
      const angle = numbers[1] ?? 45;
      const breakDistance = numbers[2] ?? (numbers[1] && kind !== "post" ? numbers[1] : 5);
      setRouteTarget(target);
      setRouteKind(kind);
      setRouteSelection(`preset:${kind}`);
      setRouteDistance(distance);
      setRouteAngle(angle);
      setRouteBreakDistance(breakDistance);
      addRoute(target, kind, distance, angle, breakDistance);
      return;
    }

    setNotice("Befehl nicht erkannt. Beispiel: „O-Line auf 50 Yards“ oder „WR2 Hook 3Y“.");
  }

  function savePlay() {
    const cleanName = playName.trim();
    if (!cleanName) {
      setNotice("Bitte zuerst einen Namen für den Spielzug eingeben.");
      return;
    }
    const play: SavedPlay = {
      id: `${Date.now()}`,
      name: cleanName,
      formation,
      lineup: lineup.map((slot) => ({ ...slot })),
      routes: routes.map((route) => ({ ...route })),
      lineOfScrimmageY,
      createdAt: new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(new Date()),
    };
    const next = [play, ...savedPlays].slice(0, 12);
    setSavedPlays(next);
    window.localStorage.setItem("rascals-playbook-plays", JSON.stringify(next));
    setNotice(`Play „${cleanName}“ wurde gespeichert.`);
  }

  function loadPlay(play: SavedPlay) {
    setPlayName(play.name);
    setFormation(play.formation);
    setLineup(play.lineup.map((slot) => ({ ...slot })));
    setRoutes(play.routes.map((route) => ({ ...route })));
    setLineOfScrimmageY(play.lineOfScrimmageY);
    setNotice(`Play „${play.name}“ wurde geladen.`);
  }

  function resetPlay() {
    setLineup(base11Personnel.map((slot) => ({ ...slot })));
    setRoutes([]);
    setLineOfScrimmageY(yardToFieldPercent(40, "own"));
    setNotice("Aufstellung und Routen wurden zurückgesetzt.");
  }

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <a className={styles.brand} href="/" aria-label="Rascals Startseite"><img src="/rascals-logo-header.webp" alt="Rascals Football" /></a>
        <p className={styles.navCaption}>Football Operations</p>
        <nav aria-label="Football Operations">
          {navigation.map(([mark, label]) => (
            <a className={label === "Playbook & Scheme" ? styles.navActive : ""} href={label === "Playbook & Scheme" ? "/coach/playbook" : "#"} key={label}><span>{mark}</span>{label}</a>
          ))}
        </nav>
        <p className={styles.navCaption}>System</p>
        <nav aria-label="System"><a href="#"><span>BN</span>Benutzer</a><a href="#"><span>ES</span>Einstellungen</a><a href="#"><span>LG</span>Logs</a></nav>
        <section className={styles.nextGame}>
          <small>Nächstes Spiel</small><div><b>R</b><span>VS</span><b className={styles.opponent}>L</b></div>
          <strong>Rascals · Lions</strong><p>18.10.2026 · 15:00</p><p>Rascals Stadium</p><button type="button">Zum Gameday</button>
        </section>
      </aside>

      <section className={styles.content}>
        <header className={styles.topbar}>
          <button className={styles.menuButton} type="button" aria-label="Menü öffnen">☰</button><span>Playbook & Scheme</span><b>›</b><span>{sectionTitle}</span>
          <div className={styles.user}><span>3</span><b>CO</b><p>Coach<small>Head Coach</small></p></div>
        </header>

        <div className={styles.pageHeader}>
          <div><h1>{isOpponentAnalysis ? "Opponent Scouting – Film & Tendenzen" : isPlaybook ? "Spielzüge & Playbook" : `${unit} – Starter-Aufstellung`}</h1><span>{isOpponentAnalysis ? "Scouting Archive: All Seasons" : `Current Package: ${formation}`}</span></div>
          <div className={styles.headerActions}>
            <select aria-label="Saison" defaultValue="2026"><option value="2026">Season 2026</option><option value="2025">Season 2025</option></select>
            <select aria-label="Woche" defaultValue="7"><option value="7">Week 7</option><option value="6">Week 6</option></select>
            <button type="button" onClick={saveSnapshot}>Snapshot</button>
            <button className={styles.playbookHeaderButton} type="button" onClick={() => setActiveTab(isPlaybook ? "Aufstellung" : "Spielzüge & Playbook")}>{isPlaybook ? "Zur Aufstellung" : "Spielzüge & Playbook"}</button>
            <button className={styles.primaryAction} type="button" onClick={refresh}>{isRefreshing ? "Lädt…" : "Aktualisieren"}</button>
          </div>
        </div>
        {notice && <button className={styles.toast} type="button" onClick={() => setNotice("")}>{notice}<span>×</span></button>}
        {routeLibraryOpen && <RouteLibraryModal definitions={customRoutes} onSave={saveCustomRoute} onDelete={deleteCustomRoute} onClose={() => setRouteLibraryOpen(false)} />}

        <nav className={styles.tabs} aria-label="Playbook Bereiche">
          {["Aufstellung", "Spielzüge & Playbook", "Gegneranalyse", "Depth Chart", "Performance", "Vergleich", "Trends"].map((tab) => <button type="button" onClick={() => setActiveTab(tab)} className={activeTab === tab ? styles.activeTab : ""} key={tab}>{tab}</button>)}
        </nav>

        {isOpponentAnalysis ? <OpponentAnalysis customRoutes={customRoutes} onOpenRouteLibrary={() => setRouteLibraryOpen(true)} onNotice={setNotice} /> : !isPlaybook ? (
          <>
            <section className={styles.metrics} aria-label={`${unit} Kennzahlen`}>
              {unitPerformanceCards[unit].map((item) => <MetricCard item={item} key={item.label} />)}
            </section>

            {unit === "Offense" ? (
              <section className={styles.board}>
                <div className={styles.boardMain}>
                  <div className={styles.boardToolbar}>
                    <div className={styles.unitTabs}>{(["Offense", "Defense", "Special Teams"] as UnitName[]).map((label) => <button type="button" className={unit === label ? styles.activeUnit : ""} onClick={() => setUnit(label)} key={label}>{label}</button>)}</div>
                    <label>Formation<select value={formation} onChange={(event) => setFormation(event.target.value)}><option>Shotgun Trips Right</option><option>Shotgun Doubles</option><option>I-Formation Strong</option></select></label>
                    <label>View<select defaultValue="Offense"><option>Offense</option><option>Matchup</option></select></label>
                  </div>
                  <div className={`${styles.fieldWrap} ${styles.lineupFieldWrap}`}>
                    <RegulationField
                      slots={lineup}
                      selectedSlot={selectedSlotId}
                      routes={[]}
                      lineOfScrimmageY={lineOfScrimmageY}
                      compact={false}
                      onSelect={(slot) => setSelectedSlotId(slot.id)}
                      onMove={() => undefined}
                    />
                    <div className={styles.fieldLegend}><span><i />Starter</span><span><i />Backup</span><span><i />Inaktiv</span></div>
                  </div>
                </div>

                <aside className={styles.performancePanel}>
                  <header><span>Positions-Performance ({slotNames[selectedSlot.id]})</span><button type="button" aria-label="Panel schließen">×</button></header>
                  <div className={styles.positionTitle}><b>{selectedSlot.label}</b><span>{slotNames[selectedSlot.id]}</span><strong>{starter.overall.toFixed(1)}<small>Unit Rating</small></strong></div>
                  <PlayerSummary title="Starter" player={starter} confidence={92} />
                  {backup && <PlayerSummary title="Backup" player={backup} confidence={78} />}
                  {backup && <button className={styles.swapButton} type="button" onClick={swapDepth}>Backup einsetzen</button>}
                  {positionSlots.length > 1 && <small className={styles.unitHint}>{positionSlots.length} Slots dieser Position in der Formation</small>}
                </aside>
              </section>
            ) : (
              <LineupOverview
                unit={unit}
                lineup={lineup}
                selectedSlotId={selectedSlotId}
                onUnitChange={setUnit}
                onSelectSlot={setSelectedSlotId}
                onOpenPlaybook={() => setActiveTab("Spielzüge & Playbook")}
              />
            )}

            <section className={styles.lowerGrid}>
              <article className={styles.panel}><h3>Unit Breakdown</h3>{unitRows.map(([label, grade, value]) => <div className={styles.unitRow} key={label}><span>{label}</span><b>{grade}</b><em>{value}</em><i><span style={{ width: `${value}%` }} /></i></div>)}</article>
              <article className={styles.panel}><h3>Aufstellungs-Impact (Simulation)</h3><div className={styles.simHeader}><span>Szenario</span><span>Rating</span><span>Impact</span></div>{[["Aktuelle Aufstellung", "78.4", "+0.0"], ["TE #88 statt #87", "73.5", "-4.9"], ["WR2 #82 statt #11", "76.1", "-2.3"], ["Bestes Lineup (Auto)", "80.6", "+2.2"]].map((row, index) => <div className={`${styles.simRow} ${index === 0 || index === 3 ? styles.simGood : ""}`} key={row[0]}><span>{row[0]}</span><b>{row[1]}</b><b>{row[2]}</b></div>)}<button type="button" onClick={() => setNotice("Simulation wurde mit dem aktuellen Lineup neu berechnet.")}>Simulation neu berechnen</button></article>
              <article className={`${styles.panel} ${styles.depthPanel}`}><h3>Depth Chart – {unit}</h3><div>{lineup.map((slot) => <button type="button" key={slot.id} onClick={() => setSelectedSlotId(slot.id)}><b>{slotNames[slot.id]}</b><span>#{byId(slot.starterId).number}</span><em>{byId(slot.starterId).overall.toFixed(1)}</em><small>#{slot.backupId ? byId(slot.backupId).number : "—"}</small></button>)}</div><p>Basierend auf Bewertung, Leistung und Verfügbarkeit.</p></article>
              <article className={styles.panel}><h3>Letzte Aufstellungen</h3>{snapshots.map((snapshot) => <div className={styles.snapshot} key={snapshot.label}><span>{snapshot.label}</span><small>{snapshot.date}</small><b>{snapshot.rating.toFixed(1)}</b></div>)}<button type="button" onClick={() => setNotice("Snapshot-Archiv geöffnet.")}>Alle Snapshots anzeigen</button></article>
            </section>
          </>
        ) : (
          <section className={styles.playbookWorkspace}>
            <div className={styles.fieldColumn}>
              <div className={styles.playbookToolbar}>
                <div><b>Regulation Field</b><span>120 × 53⅓ Yards · 10-Yard-Endzonen</span></div>
                <label>Formation<select value={formation} onChange={(event) => setFormation(event.target.value)}><option>Shotgun Trips Right</option><option>Shotgun Doubles</option><option>I-Formation Strong</option></select></label>
              </div>
              <div className={styles.regulationFieldWrap}>
                <RegulationField
                  slots={lineup}
                  selectedSlot={selectedSlotId}
                  routes={routes}
                  lineOfScrimmageY={lineOfScrimmageY}
                  compact
                  onSelect={(slot) => setSelectedSlotId(slot.id)}
                  onMove={(slotId, x, y) => setLineup((current) => current.map((slot) => slot.id === slotId ? { ...slot, x, y } : slot))}
                />
                <div className={styles.fieldLegend}><span><i />Position</span><span><i />Gelbe Route</span><span className={styles.dragHint}>Marker ziehen oder yardgenau setzen</span></div>
              </div>
            </div>

            <aside className={styles.playbookAside}>
              <section className={styles.playDesignerPanel}>
                <header>
                  <span>Play Builder</span>
                  <div className={styles.builderHeaderActions}>
                    <button type="button" onClick={() => setRouteLibraryOpen(true)}>Routenbibliothek</button>
                    <b>LIVE</b>
                  </div>
                </header>
                <label className={styles.playName}>Play-Name<input value={playName} onChange={(event) => setPlayName(event.target.value)} /></label>

                <div className={styles.builderBlock}>
                  <h3>Yard-Position</h3>
                  <div className={styles.controlGrid}>
                    <label>Ziel<select value={positionTarget} onChange={(event) => setPositionTarget(event.target.value)}>{targetOptions.map((target) => <option key={target}>{target}</option>)}</select></label>
                    <label>Yard<input type="number" min="0" max="50" value={yardLine} onChange={(event) => setYardLine(Number(event.target.value))} /></label>
                    <label>Feldhälfte<select value={yardHalf} onChange={(event) => setYardHalf(event.target.value as "own" | "opponent")}><option value="own">Eigene</option><option value="opponent">Gegner</option></select></label>
                  </div>
                  <button type="button" onClick={() => positionPlayers()}>Auf Yard-Linie setzen</button>
                </div>

                <div className={styles.builderBlock}>
                  <h3>Gelbe Route</h3>
                  <div className={styles.controlGrid}>
                    <label>Spieler<select value={routeTarget} onChange={(event) => setRouteTarget(event.target.value)}>{routeTargets.map((target) => <option key={target}>{target}</option>)}</select></label>
                    <label>Route<select value={routeSelection} onChange={(event) => {
                      const value = event.target.value;
                      setRouteSelection(value);
                      if (value.startsWith("preset:")) setRouteKind(value.slice(7) as RouteKind);
                    }}>
                      <optgroup label="Standardrouten">{Object.entries(routeLabels).map(([value, label]) => <option value={`preset:${value}`} key={value}>{label}</option>)}</optgroup>
                      {customRoutes.length > 0 && <optgroup label="Eigene Routen">{customRoutes.map((route) => <option value={`custom:${route.id}`} key={route.id}>{route.name}</option>)}</optgroup>}
                    </select></label>
                    {!routeSelection.startsWith("custom:") && <>
                      <label>Stem/Yards<input type="number" min="1" max="60" value={routeDistance} onChange={(event) => setRouteDistance(Number(event.target.value))} /></label>
                      <label>Break/Yards<input type="number" min="1" max="30" value={routeBreakDistance} onChange={(event) => setRouteBreakDistance(Number(event.target.value))} /></label>
                      <label>Winkel<input type="number" min="15" max="90" value={routeAngle} onChange={(event) => setRouteAngle(Number(event.target.value))} /></label>
                    </>}
                  </div>
                  {routeSelection.startsWith("custom:") && (() => {
                    const selectedRoute = customRoutes.find((route) => `custom:${route.id}` === routeSelection);
                    return selectedRoute ? <div className={styles.customRouteSummary}><b>{selectedRoute.name}</b><span>{selectedRoute.segments.map((segment) => `${segment.yards}Y / ${segment.angle}°`).join(" → ")}</span></div> : null;
                  })()}
                  <button type="button" onClick={addSelectedRoute}>Route einzeichnen</button>
                </div>

                <div className={styles.commandBlock}>
                  <label>Coach-Befehl<input value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") executeCommand(); }} /></label>
                  <button type="button" onClick={executeCommand}>Ausführen</button>
                  <small>z. B. „WR2 Hook 3Y“ · „O-Line auf 50 Yards“</small>
                </div>

                {routes.length > 0 && <div className={styles.routeList}>{routes.map((route) => <button type="button" key={route.id} onClick={() => setRoutes((current) => current.filter((item) => item.id !== route.id))}><span>{slotNames[route.slotId]} · {playRouteLabel(route)} {route.distance}Y</span><b>×</b></button>)}</div>}
                <div className={styles.builderActions}><button type="button" onClick={resetPlay}>Zurücksetzen</button><button type="button" className={styles.savePlay} onClick={savePlay}>Play speichern</button></div>
                {savedPlays.length > 0 && <div className={styles.savedPlays}><h3>Gespeicherte Plays</h3>{savedPlays.slice(0, 4).map((play) => <button type="button" key={play.id} onClick={() => loadPlay(play)}><span>{play.name}<small>{play.formation}</small></span><b>{play.routes.length} Routes</b></button>)}</div>}
              </section>

              <section className={styles.selectedPlayerStrip}>
                <span>Ausgewählt</span><b>{slotNames[selectedSlot.id]}</b><strong>#{starter.number} · {starter.firstName} {starter.lastName}</strong><em className={ratingTone(starter.overall)}>{starter.overall.toFixed(1)}</em>
              </section>
            </aside>
          </section>
        )}
      </section>
    </main>
  );
}
