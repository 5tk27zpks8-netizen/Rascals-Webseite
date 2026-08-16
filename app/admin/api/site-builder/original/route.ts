import { applyDesignPreset, builtInDesignPresets } from "../../../../lib/design-presets";
import { readSiteBuilderState, writeSiteBuilderState } from "../../../../lib/site-builder";
import { appendSiteBuilderRevision } from "../../../../lib/site-builder-history";
import { requireCmsPermission } from "../../../../lib/permissions";

export async function POST(){
  const actor=await requireCmsPermission("website_edit");
  if(actor instanceof Response)return actor;
  const original=builtInDesignPresets.find(item=>item.id==="rascals-original");
  if(!original)return Response.json({error:"Originaldesign ist nicht verfügbar."},{status:500});

  const current=await readSiteBuilderState();
  let next=current;
  for(const page of current.pages){next=applyDesignPreset(next,page.id,original)}
  next={...next,theme:{...next.theme,...original.theme}};
  const saved=await writeSiteBuilderState(next);
  await appendSiteBuilderRevision(saved,actor,"draft");
  return Response.json({ok:true,state:saved});
}
