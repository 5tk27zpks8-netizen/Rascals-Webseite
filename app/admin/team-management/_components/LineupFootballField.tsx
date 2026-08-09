"use client";

import "./lineup-football-field.css";

export type LineupUnit = "offense" | "defense" | "special-teams";

export type LineupDepthEntry = {
  position: string;
  rank: number;
  playerId: string;
  jerseyNumber: number | null;
  firstName: string;
  lastName: string;
  availability: string;
};

type Props = {
  unit: LineupUnit;
  positions: Array<[string, LineupDepthEntry[]]>;
  selectedPosition: string;
  onSelectPosition: (position: string) => void;
  getRating: (playerId?: string) => number | null;
};

const ALIGNMENTS: Record<LineupUnit, Record<string, [number, number]>> = {
  offense: {
    X: [17, 30], WR: [17, 30], WR1: [17, 30], WR2: [83, 30], Z: [83, 30], SLOT: [76, 39],
    TE: [30, 47], LT: [39, 48], LG: [44.5, 48], C: [50, 48], RG: [55.5, 48], RT: [61, 48],
    QB: [50, 65], RB: [43, 81], HB: [43, 81], FB: [59, 79],
  },
  defense: {
    DE: [36, 50], DT: [44, 50], NT: [50, 50], EDGE: [64, 50],
    WILL: [39, 39], MIKE: [50, 37], SAM: [61, 39], OLB: [64, 39], ILB: [46, 39],
    CB: [16, 29], NB: [76, 34], NICKEL: [76, 34], FS: [44, 18], SS: [62, 21], S: [53, 19],
  },
  "special-teams": {
    LS: [50, 51], P: [50, 80], K: [50, 78], KR: [50, 24], PR: [50, 26],
  },
};

const ratingClass = (rating: number | null) => rating == null ? "none" : rating >= 80 ? "good" : rating >= 70 ? "mid" : "risk";
const formatRating = (rating: number | null) => rating == null || !Number.isFinite(rating) ? "—" : rating.toFixed(1);

function alignment(unit: LineupUnit, position: string, index: number): [number, number] {
  const key = position.toUpperCase();
  if (ALIGNMENTS[unit][key]) return ALIGNMENTS[unit][key];
  if (unit === "offense" && key.startsWith("WR")) return key.endsWith("2") ? [83, 30] : [17, 30];
  return [18 + (index % 6) * 13, 31 + Math.floor(index / 6) * 23];
}

function FieldSvg() {
  const yardYs = [120, 165, 210, 255, 300, 345, 390, 435, 480, 525];
  const labels = [10, 20, 30, 40, 50, 40, 30, 20, 10, 0];
  const xAtY = (y: number, side: "left" | "right") => {
    const t = (y - 40) / 520;
    return side === "left" ? 200 - 170 * t : 1000 + 170 * t;
  };
  return <svg className="lf-field-svg" viewBox="0 0 1200 600" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="lfTurf" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#376f24"/><stop offset=".55" stopColor="#2c6320"/><stop offset="1" stopColor="#1f501b"/>
      </linearGradient>
      <linearGradient id="lfEnd" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#b03220"/><stop offset="1" stopColor="#861c12"/>
      </linearGradient>
      <pattern id="lfGrass" width="14" height="14" patternUnits="userSpaceOnUse">
        <rect width="14" height="14" fill="transparent"/><path d="M0 2H14 M0 9H14" stroke="rgba(255,255,255,.025)" strokeWidth="1"/>
      </pattern>
      <filter id="lfShadow"><feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#000" floodOpacity=".55"/></filter>
    </defs>

    <polygon points="200,40 1000,40 1170,560 30,560" fill="url(#lfTurf)" filter="url(#lfShadow)"/>
    <polygon points="200,40 1000,40 1023,110 177,110" fill="url(#lfEnd)" stroke="rgba(255,255,255,.92)" strokeWidth="4"/>
    <polygon points="200,40 1000,40 1170,560 30,560" fill="url(#lfGrass)"/>
    <polyline points="200,40 30,560" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="4"/>
    <polyline points="1000,40 1170,560" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="4"/>

    {yardYs.map((y, i) => <g key={y}>
      <line x1={xAtY(y,"left")} y1={y} x2={xAtY(y,"right")} y2={y} stroke="rgba(255,255,255,.62)" strokeWidth={i===4?3:2}/>
      <text x={xAtY(y,"left")+34} y={y+8} className="lf-yard-number left">{labels[i]}</text>
      <text x={xAtY(y,"right")-34} y={y+8} className="lf-yard-number right">{labels[i]}</text>
    </g>)}

    {Array.from({length: 45}).map((_, i) => {
      const y=117+i*9.5; const left=xAtY(y,"left"), right=xAtY(y,"right"); const width=right-left;
      return <g key={i} opacity=".6">
        <line x1={left+width*.38} y1={y} x2={left+width*.405} y2={y} stroke="#fff" strokeWidth="2"/>
        <line x1={left+width*.595} y1={y} x2={left+width*.62} y2={y} stroke="#fff" strokeWidth="2"/>
      </g>;
    })}

    <line x1="545" y1="110" x2="470" y2="560" stroke="rgba(255,255,255,.5)" strokeWidth="2" strokeDasharray="10 10"/>
    <line x1="655" y1="110" x2="730" y2="560" stroke="rgba(255,255,255,.5)" strokeWidth="2" strokeDasharray="10 10"/>
    <text x="600" y="87" textAnchor="middle" className="lf-endzone-text">RASCALS</text>
  </svg>;
}

export function LineupFootballField({unit,positions,selectedPosition,onSelectPosition,getRating}:Props){
  return <div className="lf-shell">
    <div className="lf-stadium-glow"/>
    <div className="lf-field-wrap">
      <FieldSvg/>
      <div className="lf-player-layer">
        {positions.map(([position,entries],index)=>{
          const [x,y]=alignment(unit,position,index);
          const starter=entries.find(e=>e.rank===1)??entries[0];
          const backup=entries.find(e=>e.rank===2);
          const sr=getRating(starter?.playerId); const br=getRating(backup?.playerId);
          return <button key={position} type="button" className={`lf-node ${selectedPosition===position?"selected":""}`} style={{left:`${x}%`,top:`${y}%`}} onClick={()=>onSelectPosition(position)}>
            <div className={`lf-starter ${ratingClass(sr)}`}><b>{position}</b><span>#{starter?.jerseyNumber??"–"}</span><strong>{formatRating(sr)}</strong></div>
            {backup&&<div className="lf-backup"><b>B</b><span>#{backup.jerseyNumber??"–"}</span><strong>{formatRating(br)}</strong></div>}
          </button>;
        })}
      </div>
      {!positions.length&&<div className="lf-empty">Für diese Unit ist noch kein Depth Chart gepflegt.</div>}
    </div>
    <div className="lf-legend"><span><i className="good"/>Starter stark</span><span><i className="mid"/>solide</span><span><i className="risk"/>Fokus</span><span><i className="backup"/>Backup</span></div>
  </div>;
}
