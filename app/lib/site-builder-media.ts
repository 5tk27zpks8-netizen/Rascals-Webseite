import type { BuilderPage, BuilderSection, SiteBuilderState } from "./site-builder";

const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;

function findPage(state:SiteBuilderState|undefined,page:BuilderPage){
  return state?.pages.find(candidate=>candidate.id===page.id||candidate.slug===page.slug);
}

function findSection(page:BuilderPage|undefined,section:BuilderSection){
  return page?.sections.find(candidate=>candidate.id===section.id);
}

function isLegacyFullBleed(section:BuilderSection){
  return (section.type==="hero"&&section.variant==="legacy-home")||(section.type==="cta"&&section.variant==="legacy-join");
}

function chooseMedia(previous:BuilderSection|undefined,incoming:BuilderSection){
  const image=incoming.image||"";
  const background=incoming.style.backgroundImage||"";
  if(image===background)return image;

  const oldImage=previous?.image||"";
  const oldBackground=previous?.style.backgroundImage||"";
  const imageChanged=image!==oldImage;
  const backgroundChanged=background!==oldBackground;

  // The V4 editor currently exposes the same full-bleed legacy image in two
  // places: Content > Bild and Design > Hintergrundbild. Detect which control
  // changed and keep both stored properties in lock-step.
  if(imageChanged&&!backgroundChanged)return image;
  if(backgroundChanged&&!imageChanged)return background;

  if(image&&!background)return image;
  if(background&&!image)return background;

  // Existing drafts created before this reconciliation can already contain two
  // different values. Content > Bild is the primary legacy image control, so it
  // is the safest repair source for that old inconsistent state.
  return image||background;
}

export function reconcileSiteBuilderMedia(previous:SiteBuilderState|undefined,incoming:SiteBuilderState):SiteBuilderState{
  const next=clone(incoming);
  for(const page of next.pages){
    const previousPage=findPage(previous,page);
    for(const section of page.sections){
      if(!isLegacyFullBleed(section))continue;
      if((section.style.backgroundMode||"color")!=="image")continue;
      const previousSection=findSection(previousPage,section);
      const media=chooseMedia(previousSection,section);
      if(!media)continue;
      section.image=media;
      section.style.backgroundImage=media;
    }
  }
  return next;
}
