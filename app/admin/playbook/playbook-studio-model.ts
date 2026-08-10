export type Unit = "offense" | "defense" | "special-teams";
export type Season = { id:string; year:number; name:string; isCurrent:boolean };
export type Slot = { id:string; slotKey:string; positionLabel:string; positionGroup:string; roleLabel:string; x:number; y:number; eligiblePositions:string; sortOrder:number };
export type Formation = { id:string; name:string; personnel:string; family:string; strengthRule:string; description:string; tags:string; slots:Slot[] };
export type Player = { id:string; jerseyNumber:number|null; firstName:string; lastName:string; primaryPosition:string; secondaryPosition:string; unit:string; availability:string };
export type Depth = { position:string; positionGroup:string; rank:number; playerId:string; firstName:string; lastName:string; jerseyNumber:number|null; availability:string };
export type Point = { x:number; y:number };
export type Assignment = { id:string; positionLabel:string; playerId:string|null; role:string; assignment:string; technique:string; keyRead:string; x:number; y:number; endX?:number|null; endY?:number|null; visualType:string; path:Point[]; preSnapPath?:Point[]; zoneWidth?:number; zoneHeight?:number };
export type Play = { id:string; formationId:string|null; formationName:string; unit:string; name:string; concept:string; status:string; version:number; updatedAt:string; assignments:Assignment[] };
export type Payload = { seasons:Season[]; season:Season; unit:Unit; formations:Formation[]; plays:Play[]; roster:Player[]; depthChartSnapshot:{id:string;label:string}|null; depthChart:Depth[] };
export type Rating = { playerId:string; performanceRating:number|null; skillRating:number|null; compositeRating:number|null; sampleSize:number; skillSampleSize:number };
export type RouteKind = "hook"|"post"|"go"|"slant"|"out"|"bubble"|"corner"|"custom";
export type RouteSegment = { yards:number; angle:number };
export type CustomRoute = { id:string; name:string; segments:RouteSegment[]; createdAt:string };
export type RouteDraft = { slotKey:string; kind:RouteKind; distance:number; breakDistance:number; angle:number; customRouteId?:string; rawPath?:Point[] };
export type SlotOverride = { x:number; y:number };
export type LineupSnapshot = { id:string; label:string; seasonId:string; unit:Unit; formationId:string; rating:number|null; createdAt:string; slots:Array<{slotKey:string;x:number;y:number;playerId:string|null}> };
export type OpponentDiagramPlayer = { id:string; label:string; x:number; y:number };
export type OpponentDiagramRoute = { id:string; target:string; kind:RouteKind; distance:number; breakDistance:number; angle:number; customRouteId?:string; rawPath?:Point[] };
export type ScoutClip = { id:string; title:string; videoUrl:string; sourceFileName?:string; unit:string; quarter:string; gameClock:string; down:number; distance:number; fieldHalf:"own"|"opponent"; yardLine:number; hash:"Left"|"Middle"|"Right"; personnel:string; formation:string; motion:string; playType:string; concept:string; result:string; yardsGained:number; tags:string[]; notes:string; diagramPlayers:OpponentDiagramPlayer[]; diagramRoutes:OpponentDiagramRoute[]; createdAt:string };
export type ScoutGame = { id:string; opponent:string; date:string; season:number; competition:string; location:string; rascalsScore:number; opponentScore:number; clips:ScoutClip[] };
export type Tab = "lineup"|"playbook"|"scouting"|"depth"|"performance"|"compare"|"trends";

export const routeLabels:Record<RouteKind,string>={hook:"Hook",post:"Post",go:"Go",slant:"Slant",out:"Out",bubble:"Bubble",corner:"Corner",custom:"Eigene Route"};
export const tabs:Array<[Tab,string]>=[["lineup","Aufstellung"],["playbook","Spielzüge & Playbook"],["scouting","Gegneranalyse"],["depth","Depth Chart"],["performance","Performance"],["compare","Vergleich"],["trends","Trends"]];
export const scoutTags=["Early Down","3rd Down","Red Zone","2-Minute","Backed Up","Shot Play","Pressure","Tempo"];
export const scoutFormationOptions:Record<string,string[]>={Offense:["Gun Trips Right","Gun Trips Left","Gun Doubles","Ace","I-Formation","Pistol","Empty"],Defense:["4-3 Over","4-3 Under","3-4 Odd","Nickel 4-2-5","Dime 3-2-6","Goal Line"],"Special Teams":["Punt","Punt Return","Field Goal","Kickoff","Kick Return"]};
export const unitLabel=(u:Unit)=>u==="special-teams"?"SPECIAL TEAMS":u.toUpperCase();
export const norm=(v:string)=>v.toUpperCase().replace(/[^A-Z0-9]/g,"");
export const unavailable=(v:string)=>["out","inactive","unavailable","ir"].includes(v.toLowerCase());
export const tone=(v:number|null)=>v==null?"unknown":v>=80?"strong":v>=70?"solid":v>=60?"watch":"risk";
export const avg=(values:number[])=>values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):null;

export async function loadStudioStore<T>(kind:"plays"|"routes"|"scouting"):Promise<T|null>{try{const r=await fetch(`/admin/api/playbook-studio?kind=${kind}`,{cache:"no-store"});if(!r.ok)return null;const b=await r.json() as {data:T|null};return b.data??null}catch{return null}}
export async function saveStudioStore(kind:"plays"|"routes"|"scouting",data:unknown){const r=await fetch("/admin/api/playbook-studio",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({kind,data})});if(!r.ok){const b=await r.json().catch(()=>({}));throw new Error(b.error??"Playbook-Daten konnten nicht gespeichert werden.")}}

export function routePath(slot:Pick<Slot,"x"|"y">,route:RouteDraft|OpponentDiagramRoute,customRoutes:CustomRoute[]){
 if(route.rawPath?.length)return route.rawPath;
 const start={x:slot.x,y:slot.y},inside=slot.x<50?1:-1,outside=-inside;
 const vertical=(yards:number)=>yards/1.2;
 if(route.kind==="custom"){const def=customRoutes.find(x=>x.id===route.customRouteId);return(def?.segments??[]).reduce<Point[]>((pts,s)=>{const p=pts[pts.length-1],rad=s.angle*Math.PI/180;pts.push({x:p.x+inside*Math.sin(rad)*s.yards/53.33*100,y:p.y-Math.cos(rad)*s.yards/120*100});return pts},[start])}
 if(route.kind==="go")return[start,{x:start.x,y:start.y-vertical(route.distance)}];
 if(route.kind==="slant"){const rad=route.angle*Math.PI/180;return[start,{x:start.x+inside*Math.sin(rad)*route.distance/53.33*100,y:start.y-Math.cos(rad)*route.distance/120*100}]}
 const stem={x:start.x,y:start.y-vertical(route.distance)};
 if(route.kind==="hook")return[start,stem,{x:stem.x+inside*2,y:stem.y+2}];
 if(route.kind==="out")return[start,stem,{x:stem.x+outside*route.breakDistance/53.33*100,y:stem.y}];
 if(route.kind==="bubble")return[start,{x:start.x+outside*route.distance/53.33*100,y:start.y-2}];
 const rad=route.angle*Math.PI/180,dir=route.kind==="corner"?outside:inside;
 return[start,stem,{x:stem.x+dir*Math.sin(rad)*route.breakDistance/53.33*100,y:stem.y-Math.cos(rad)*route.breakDistance/120*100}];
}

export function opponentMarkers(unit:string,formation:string):OpponentDiagramPlayer[]{
 if(unit==="Defense")return[{id:"de1",label:"DE1",x:22,y:59},{id:"dt",label:"DT",x:38,y:59},{id:"nt",label:"NT",x:52,y:59},{id:"de2",label:"DE2",x:68,y:59},{id:"will",label:"WILL",x:32,y:73},{id:"mlb",label:"MLB",x:50,y:73},{id:"sam",label:"SAM",x:68,y:73},{id:"cb1",label:"CB1",x:10,y:84},{id:"fs",label:"FS",x:42,y:90},{id:"ss",label:"SS",x:60,y:90},{id:"cb2",label:"CB2",x:90,y:84}];
 if(unit==="Special Teams")return[{id:"gun1",label:"GUN1",x:15,y:60},{id:"t1",label:"T1",x:28,y:60},{id:"g1",label:"G1",x:40,y:60},{id:"ls",label:"LS",x:50,y:60},{id:"g2",label:"G2",x:60,y:60},{id:"t2",label:"T2",x:72,y:60},{id:"gun2",label:"GUN2",x:85,y:60},{id:"p",label:"P",x:50,y:84}];
 const tripsRight=formation.includes("Trips Right"),empty=formation==="Empty",iFormation=formation==="I-Formation";
 return[{id:"wr1",label:"WR1",x:10,y:60},{id:"lt",label:"LT",x:35,y:60},{id:"lg",label:"LG",x:42,y:60},{id:"c",label:"C",x:50,y:60},{id:"rg",label:"RG",x:58,y:60},{id:"rt",label:"RT",x:65,y:60},{id:"wr2",label:"WR2",x:90,y:60},{id:"te",label:"TE",x:tripsRight?74:70,y:60},{id:"fb",label:"FB",x:tripsRight?82:28,y:empty?68:iFormation?82:68},{id:"qb",label:"QB",x:50,y:76},{id:"rb",label:"RB",x:empty?20:50,y:empty?68:iFormation?91:88}];
}
