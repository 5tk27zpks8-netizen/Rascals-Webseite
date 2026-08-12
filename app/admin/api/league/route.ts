import { bindings } from "../../../lib/cms";
import { ensureFootballSchema } from "../../../lib/football";
import { requireCmsPermission } from "../../../lib/permissions";

async function authorize(){return requireCmsPermission("games")}

export async function GET(){
 const actor=await authorize();if(actor instanceof Response)return actor;
 await ensureFootballSchema();const{DB}=bindings();
 const row=await DB.prepare("SELECT league,season FROM teams WHERE id='mens' LIMIT 1").first<Record<string,unknown>>();
 return Response.json({league:String(row?.league??"Bezirksliga"),season:Number(row?.season??2026)});
}

export async function PUT(request:Request){
 const actor=await authorize();if(actor instanceof Response)return actor;
 await ensureFootballSchema();const body=await request.json() as {league?:string;season?:number};
 const league=String(body.league??"").trim();if(!league)return Response.json({error:"Liga ist erforderlich."},{status:400});
 const season=Number(body.season??2026)||2026;const{DB}=bindings();
 await DB.prepare("UPDATE teams SET league=?,season=?,updated_at=CURRENT_TIMESTAMP WHERE id='mens'").bind(league,season).run();
 return Response.json({league,season});
}
