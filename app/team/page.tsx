import { listActivePlayers } from "../lib/football";
import "./team.css";

export const metadata={title:"Team · Hellenstein Rascals",description:"Kader der Hellenstein Rascals."};

const unitLabels={offense:"OFFENSE",defense:"DEFENSE","special-teams":"SPECIAL TEAMS"} as const;

export default async function TeamPage(){
 const players=await listActivePlayers();
 const units=["offense","defense","special-teams"] as const;
 return <main className="team-public">
  <header className="team-public-head"><a href="/">← Startseite</a><span>HELLENSTEIN RASCALS</span><h1>MEET THE <i>ROSTER.</i></h1><p>Spieler, Positionen und Profile der Hellenstein Rascals.</p></header>
  <section className="team-public-body">
   {units.map(unit=>{const group=players.filter(p=>p.unit===unit);if(!group.length)return null;return <section key={unit} className="team-unit">
    <div className="team-unit-title"><small>2026 ROSTER</small><h2>{unitLabels[unit]}</h2></div>
    <div className="team-roster-grid">{group.map(p=>{
      const badges=[
        p.starter?{type:"starter",icon:"☆",label:"STARTER"}:null,
        p.captain?{type:"captain",icon:"C",label:"CAPTAIN"}:null,
        p.rookie?{type:"rookie",icon:"R",label:"ROOKIE"}:null,
      ].filter(Boolean) as {type:string;icon:string;label:string}[];
      const number=String(p.jerseyNumber??0).padStart(2,"0");
      return <a href={`/team/${p.slug}`} className="player-card-premium" key={p.id} aria-label={`${p.firstName} ${p.lastName}, ${p.position}`}>
        <div className="pc-frame-corner pc-tl"/><div className="pc-frame-corner pc-tr"/><div className="pc-frame-corner pc-bl"/><div className="pc-frame-corner pc-br"/>
        <div className="pc-header"><span/><div><img src="/rascals-logo-transparent-4k.png" alt=""/><b>RASCALS</b></div><span/></div>
        <img className="pc-ghost-logo" src="/rascals-logo-transparent-4k.png" alt="" aria-hidden="true"/>
        <div className="pc-smoke pc-smoke-left"/><div className="pc-smoke pc-smoke-right"/>
        <div className="pc-photo-wrap">
          {p.portrait?<img className="pc-photo" src={p.portrait} alt={`${p.firstName} ${p.lastName}`}/>:<div className="pc-photo-placeholder"><span>#{number}</span><small>SPIELERFOTO</small></div>}
        </div>
        <div className="pc-photo-shade"/>
        <div className="pc-info">
          <div className="pc-number">{number}</div>
          <div className="pc-meta">
            <p>{p.position}{p.secondaryPosition?` / ${p.secondaryPosition}`:""}</p>
            <h3>{p.firstName} {p.lastName}</h3>
            {badges.length>0&&<div className={`pc-badges pc-badges-${badges.length}`}>{badges.map(b=><span className={`pc-badge ${b.type}`} key={b.type}><i>{b.icon}</i><b>{b.label}</b></span>)}</div>}
          </div>
        </div>
      </a>
    })}</div>
   </section>})}
   {!players.length&&<div className="team-empty">Spieler erscheinen hier automatisch, sobald sie im CMS angelegt und als öffentlich sichtbar markiert wurden.</div>}
  </section>
 </main>
}
