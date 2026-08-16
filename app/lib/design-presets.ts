import type { BuilderPage, BuilderSectionStyle, BuilderSectionType, BuilderTheme, SiteBuilderState } from "./site-builder";
import { applyLayoutPreset, layoutPresets, type LayoutPresetId } from "./layout-presets";

export type DesignPreset = {
  id: string;
  name: string;
  description: string;
  category: "dark" | "light" | "sport" | "premium" | "custom";
  builtin: boolean;
  palette: string[];
  theme: Partial<BuilderTheme>;
  defaults: Partial<BuilderSectionStyle>;
  byType: Partial<Record<BuilderSectionType, Partial<BuilderSectionStyle>>>;
  variants?: Partial<Record<BuilderSectionType, string>>;
  sectionStyles?: Array<{ type: BuilderSectionType; variant?: string; style: BuilderSectionStyle }>;
  layoutId?: LayoutPresetId;
  createdAt?: string;
};

const base = (background:string,textColor:string,accentColor:string):Partial<BuilderSectionStyle> => ({
  background,textColor,accentColor,paddingTop:76,paddingBottom:76,maxWidth:1600,rounded:0,border:"",headingScale:1,
});

export const builtInDesignPresets: DesignPreset[] = [
  {
    id:"rascals-standard",name:"Rascals Standard",layoutId:"original",builtin:true,category:"premium",
    description:"Das aktuelle Rascals Originaldesign – dunkler Hero, rote kompakte Zahlenleiste, dunkler Spielplan und helle Editorial-Bereiche.",
    palette:["#050d18","#e7192d","#ffffff","#f4f4f1"],
    theme:{background:"#ffffff",surface:"#f4f4f1",text:"#071421",muted:"#667386",accent:"#e7192d",headerBackground:"#050d18",headerText:"#ffffff",contentWidth:1600,radius:0,headingWeight:950,headingTracking:-.045,headingTransform:"uppercase",bodyLineHeight:1.65},
    defaults:{textColor:"#071421",accentColor:"#e7192d",paddingTop:78,paddingBottom:78,maxWidth:1600,rounded:0,border:"",headingScale:1},
    variants:{hero:"cinematic",stats:"strip",games:"scoreboard",split:"image-left",news:"editorial",sponsors:"ticker",cta:"panel",gallery:"masonry",timeline:"drive",cards:"editorial",text:"editorial"},
    byType:{
      hero:{background:"#050d18",textColor:"#ffffff",accentColor:"#e7192d",minHeight:650,paddingTop:92,paddingBottom:92,align:"left"},
      stats:{background:"#e7192d",textColor:"#ffffff",accentColor:"#ffffff",paddingTop:18,paddingBottom:18,align:"center",maxWidth:1920},
      games:{background:"#050d18",textColor:"#ffffff",accentColor:"#e7192d",paddingTop:76,paddingBottom:76},
      split:{background:"#ffffff",textColor:"#071421",paddingTop:0,paddingBottom:0},
      news:{background:"#f4f4f1",textColor:"#071421",accentColor:"#e7192d",paddingTop:82,paddingBottom:82},
      sponsors:{background:"#ffffff",textColor:"#071421",align:"center",paddingTop:62,paddingBottom:62},
      cta:{background:"#071421",textColor:"#ffffff",accentColor:"#e7192d",align:"center",minHeight:390,paddingTop:78,paddingBottom:78},
      gallery:{background:"#050d18",textColor:"#ffffff"},timeline:{background:"#030a13",textColor:"#ffffff",accentColor:"#e7192d",align:"center"},cards:{background:"#ffffff",textColor:"#071421"},text:{background:"#ffffff",textColor:"#071421"},
    },
  },
  {
    id:"rascals-classic",name:"Klassik",layoutId:"classic",builtin:true,category:"light",
    description:"Eine klassische, vertraute Vereinswebsite: heller Aufbau, klare Inhaltsblöcke, ruhige Navigation und traditionelle Seitenführung.",
    palette:["#ffffff","#f3f5f7","#18263a","#b51d2c"],
    theme:{background:"#ffffff",surface:"#f3f5f7",text:"#18263a",muted:"#657184",accent:"#b51d2c",headerBackground:"#ffffff",headerText:"#18263a",contentWidth:1320,radius:8,headingWeight:800,headingTracking:-.02,headingTransform:"none",bodyLineHeight:1.7},
    defaults:{...base("#ffffff","#18263a","#b51d2c"),paddingTop:72,paddingBottom:72,maxWidth:1320,rounded:8,border:"#e2e7ec"},
    variants:{hero:"split",split:"image-right",text:"default",games:"clean",stats:"strip",cards:"compact",news:"clean",gallery:"grid",sponsors:"clean",cta:"default",timeline:"compact"},
    byType:{
      hero:{background:"#f3f5f7",textColor:"#18263a",minHeight:520,paddingTop:64,paddingBottom:64},
      split:{background:"#ffffff",textColor:"#18263a",paddingTop:56,paddingBottom:56},text:{background:"#ffffff",textColor:"#18263a"},
      games:{background:"#f3f5f7",textColor:"#18263a",accentColor:"#b51d2c",paddingTop:64,paddingBottom:64},
      stats:{background:"#18263a",textColor:"#ffffff",accentColor:"#ffffff",paddingTop:30,paddingBottom:30},
      cards:{background:"#ffffff",textColor:"#18263a"},news:{background:"#ffffff",textColor:"#18263a"},gallery:{background:"#f3f5f7",textColor:"#18263a"},
      sponsors:{background:"#ffffff",textColor:"#18263a",align:"center"},cta:{background:"#b51d2c",textColor:"#ffffff",accentColor:"#ffffff",align:"center",minHeight:280},timeline:{background:"#f3f5f7",textColor:"#18263a",accentColor:"#b51d2c"},
    },
  },
  {
    id:"rascals-performance",name:"Performance",layoutId:"performance",builtin:true,category:"sport",
    description:"Ein komplett neuer Pro-Team-Look: tiefes Navy, elektrische Akzente, große KPIs, starke Bildflächen und ein Performance-Dashboard-Gefühl.",
    palette:["#020814","#0b1730","#ff263d","#7bdcff"],
    theme:{background:"#020814",surface:"#0b1730",text:"#f6f9ff",muted:"#8ea1bb",accent:"#ff263d",headerBackground:"#020814",headerText:"#ffffff",contentWidth:1500,radius:18,headingWeight:1000,headingTracking:-.055,headingTransform:"uppercase",bodyLineHeight:1.55},
    defaults:{...base("#071122","#f6f9ff","#ff263d"),paddingTop:86,paddingBottom:86,maxWidth:1500,rounded:18,border:"rgba(123,220,255,.14)"},
    variants:{hero:"centered",stats:"bold",games:"scoreboard",cards:"bold",gallery:"cinematic",split:"image-left",timeline:"vertical",cta:"banner",news:"clean",sponsors:"ticker",text:"centered"},
    byType:{
      hero:{background:"#020814",textColor:"#ffffff",accentColor:"#ff263d",minHeight:720,paddingTop:110,paddingBottom:110,align:"center"},
      stats:{background:"#ff263d",textColor:"#ffffff",accentColor:"#ffffff",paddingTop:46,paddingBottom:46,align:"center"},
      games:{background:"#071122",textColor:"#ffffff",accentColor:"#7bdcff",paddingTop:78,paddingBottom:78},cards:{background:"#020814",textColor:"#ffffff",accentColor:"#ff263d"},
      gallery:{background:"#020814",textColor:"#ffffff"},split:{background:"#0b1730",textColor:"#ffffff",paddingTop:0,paddingBottom:0},timeline:{background:"#020814",textColor:"#ffffff",accentColor:"#7bdcff"},
      cta:{background:"linear-gradient(135deg,#ff263d,#a70f27)",textColor:"#ffffff",accentColor:"#ffffff",align:"center",minHeight:330},news:{background:"#0b1730",textColor:"#ffffff",accentColor:"#7bdcff"},sponsors:{background:"#ffffff",textColor:"#020814",align:"center"},text:{background:"#071122",textColor:"#ffffff",align:"center"},
    },
  },
  {
    id:"rascals-editorial",name:"Editorial",layoutId:"editorial",builtin:true,category:"premium",
    description:"Eine völlig andere Sports-Magazine-Website: warme Editorial-Flächen, News zuerst, asymmetrische Inhalte und hochwertige Magazin-Typografie.",
    palette:["#f1ede4","#151515","#9e210f","#ffffff"],
    theme:{background:"#f1ede4",surface:"#ffffff",text:"#151515",muted:"#6d685f",accent:"#9e210f",headerBackground:"#151515",headerText:"#ffffff",contentWidth:1420,radius:0,headingWeight:850,headingTracking:-.035,headingTransform:"none",bodyLineHeight:1.75},
    defaults:{...base("#f1ede4","#151515","#9e210f"),paddingTop:96,paddingBottom:96,maxWidth:1420,rounded:0,border:""},
    variants:{news:"editorial",hero:"minimal",split:"editorial",gallery:"masonry",games:"clean",text:"editorial",stats:"cards",timeline:"compact",cards:"editorial",sponsors:"clean",cta:"panel"},
    byType:{
      news:{background:"#f1ede4",textColor:"#151515",accentColor:"#9e210f",paddingTop:92,paddingBottom:92},
      hero:{background:"#151515",textColor:"#ffffff",accentColor:"#9e210f",minHeight:560,paddingTop:88,paddingBottom:88},
      split:{background:"#ffffff",textColor:"#151515",paddingTop:70,paddingBottom:70},gallery:{background:"#151515",textColor:"#ffffff",paddingTop:86,paddingBottom:86},
      games:{background:"#ffffff",textColor:"#151515",accentColor:"#9e210f"},text:{background:"#f1ede4",textColor:"#151515"},stats:{background:"#ffffff",textColor:"#151515",accentColor:"#9e210f"},
      timeline:{background:"#151515",textColor:"#ffffff",accentColor:"#9e210f"},cards:{background:"#f1ede4",textColor:"#151515"},sponsors:{background:"#ffffff",textColor:"#151515",align:"center"},cta:{background:"#9e210f",textColor:"#ffffff",accentColor:"#ffffff",align:"left",minHeight:320},
    },
  },
];

function cloneStyle(style: BuilderSectionStyle): BuilderSectionStyle {
  return { ...style, tablet: style.tablet ? { ...style.tablet } : undefined, mobile: style.mobile ? { ...style.mobile } : undefined };
}

export function applyDesignPreset(state: SiteBuilderState, pageId: string, preset: DesignPreset): SiteBuilderState {
  const layout = preset.layoutId ? layoutPresets.find(item => item.id === preset.layoutId) : undefined;
  const arranged = layout ? applyLayoutPreset(state, pageId, layout) : state;
  const sequenceCounters = new Map<BuilderSectionType, number>();
  const sectionPools = new Map<BuilderSectionType, Array<{variant?:string;style:BuilderSectionStyle}>>();
  for (const entry of preset.sectionStyles || []) {
    const pool = sectionPools.get(entry.type) || [];
    pool.push({ variant: entry.variant, style: entry.style });
    sectionPools.set(entry.type, pool);
  }
  const pages = arranged.pages.map((page) => {
    if (page.id !== pageId) return page;
    const sections = page.sections.map((section) => {
      const index = sequenceCounters.get(section.type) || 0;
      sequenceCounters.set(section.type, index + 1);
      const captured = sectionPools.get(section.type)?.[index];
      const nextStyle: BuilderSectionStyle = {
        ...section.style,
        ...preset.defaults,
        ...(preset.byType[section.type] || {}),
        ...(captured ? cloneStyle(captured.style) : {}),
      };
      return { ...section, variant: captured?.variant || preset.variants?.[section.type] || section.variant, style: nextStyle };
    });
    return { ...page, sections };
  });
  return { ...arranged, theme: { ...arranged.theme, ...preset.theme }, pages };
}

export function capturePageDesign(state: SiteBuilderState, page: BuilderPage, id: string, name: string, description = "Eigenes gespeichertes Design"): DesignPreset {
  const palette = [state.theme.background, state.theme.surface, state.theme.accent, state.theme.text].filter(Boolean).slice(0, 4);
  return {
    id,name,description,category:"custom",builtin:false,palette,theme:{...state.theme},defaults:{},byType:{},
    sectionStyles: page.sections.map((section) => ({ type: section.type, variant: section.variant, style: cloneStyle(section.style) })),
    createdAt:new Date().toISOString(),
  };
}
