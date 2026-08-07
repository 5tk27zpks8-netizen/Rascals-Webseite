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
      const badges=[p.starter?"STARTER":"",p.captain?"CAPTAIN":"",p.rookie?"ROOKIE":""].filter(Boolean);
      return <a href={`/team/${p.slug}`} className="player-card" key={p.id} aria-label={`${p.firstName} ${p.lastName}, ${p.position}`}>
       <div className="player-card-topmark"><img src="/rascals-logo-transparent-4k.png" alt=""/><b>RASCALS</b></div>
       <img className="player-card-ghost-logo" src="/rascals-logo-transparent-4k.png" alt="" aria-hidden="true"/>
       <div className="player-card-image">
        {p.portrait?<img src={p.portrait} alt={`${p.firstName} ${p.lastName}`}/>:<div className="player-card-placeholder"><span>#{p.jerseyNumber??"00"}</span><small>PLAYER PHOTO</small></div>}
       </div>
       <div className="player-card-gradient"/>
       <div className="player-card-content">
        <strong className="player-card-number">{String(p.jerseyNumber??0).padStart(2,"0")}</strong>
        <div className="player-card-identity"><p>{p.position}{p.secondaryPosition?` / ${p.secondaryPosition}`:""}</p><h3>{p.firstName} {p.lastName}</h3></div>
        {badges.length>0&&<div className={`player-card-badges count-${badges.length}`}>{badges.map(b=><span key={b}>{b}</span>)}</div>}
       </div>
      </a>
    })}</div>
   </section>})}
   {!players.length&&<div className="team-empty">Spieler erscheinen hier automatisch, sobald sie im CMS angelegt und als öffentlich sichtbar markiert wurden.</div>}
  </section>
 </main>
}
