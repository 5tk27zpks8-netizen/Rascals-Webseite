import type { BuilderPage, BuilderSection, SiteBuilderState } from "./site-builder";

const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;

function findPage(state:SiteBuilderState|undefined,page:BuilderPage){
  return state?.pages.find(candidate=>candidate.id===page.id||candidate.slug===page.slug);
}

function findSection(page:BuilderPage|undefined,section:BuilderSection){
  return page?.sections.find(candidate=>candidate.id===section.id);
}

export function isLegacyFullBleed(section:BuilderSection){
  return (section.type==="hero"&&section.variant==="legacy-home")||(section.type==="cta"&&section.variant==="legacy-join");
}

function chooseChangedMedia(previous:BuilderSection|undefined,incoming:BuilderSection){
  const image=incoming.image||"";
  const background=incoming.style.backgroundImage||"";
  if(image===background)return image;

  if(previous){
    const oldImage=previous.image||"";
    const oldBackground=previous.style.backgroundImage||"";
    const imageChanged=image!==oldImage;
    const backgroundChanged=background!==oldBackground;

    if(imageChanged&&!backgroundChanged)return image;
    if(backgroundChanged&&!imageChanged)return background;
    if(imageChanged&&backgroundChanged){
      if(image===background)return image;
      if(image===oldBackground&&background!==oldImage)return background;
      if(background===oldImage&&image!==oldBackground)return image;
      return image||background;
    }
  }

  return image||background;
}

/**
 * Old Rascals Original hero/CTA data contains the same full-bleed picture in
 * two properties. Keep those properties synchronized at the persistence
 * boundary. This function is intentionally NOT used when merely reading a
 * draft; reads must never overwrite a user's newer value.
 */
export function reconcileSiteBuilderMedia(previous:SiteBuilderState|undefined,incoming:SiteBuilderState):SiteBuilderState{
  const next=clone(incoming);
  for(const page of next.pages){
    const previousPage=findPage(previous,page);
    for(const section of page.sections){
      if(!isLegacyFullBleed(section))continue;
      if((section.style.backgroundMode||"color")!=="image")continue;
      const previousSection=findSection(previousPage,section);
      const media=chooseChangedMedia(previousSection,section);
      if(!media)continue;
      section.image=media;
      section.style.backgroundImage=media;
    }
  }
  return next;
}
