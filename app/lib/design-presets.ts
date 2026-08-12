import type { BuilderPage, BuilderSectionStyle, BuilderSectionType, BuilderTheme, SiteBuilderState } from "./site-builder";

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
  createdAt?: string;
};

const darkBase: Partial<BuilderSectionStyle> = {
  background: "#050d18", textColor: "#ffffff", accentColor: "#e7192d", paddingTop: 72, paddingBottom: 72,
  maxWidth: 1600, rounded: 0, border: "", headingScale: 1,
};

export const builtInDesignPresets: DesignPreset[] = [
  {
    id:"rascals-dark",name:"Rascals Dark",description:"Das klare Rascals Standarddesign: Navy, Weiß und Rot mit sportlicher Typografie.",category:"dark",builtin:true,
    palette:["#050d18","#0b1725","#e7192d","#ffffff"],
    theme:{background:"#050d18",surface:"#0b1725",text:"#ffffff",muted:"#9aa7b7",accent:"#e7192d",headerBackground:"#050d18",headerText:"#ffffff",radius:0,headingWeight:950,headingTracking:-.04,headingTransform:"uppercase"},
    defaults:darkBase,
    variants:{hero:"cinematic",text:"editorial",split:"image-left",stats:"strip",cards:"grid",gallery:"masonry",timeline:"drive",games:"scoreboard",news:"editorial",sponsors:"ticker",cta:"panel"},
    byType:{hero:{background:"#050d18",textColor:"#ffffff",minHeight:600,paddingTop:86,paddingBottom:86},text:{background:"#ffffff",textColor:"#071421",paddingTop:84,paddingBottom:84},split:{background:"#ffffff",textColor:"#071421",paddingTop:0,paddingBottom:0},stats:{background:"#071421",textColor:"#ffffff",align:"center"},timeline:{background:"#030a13",textColor:"#ffffff",align:"center",paddingTop:82,paddingBottom:92},games:{background:"#050d18",textColor:"#ffffff"},news:{background:"#f4f4f1",textColor:"#071421"},sponsors:{background:"#ffffff",textColor:"#071421",align:"center"},cta:{background:"#071421",textColor:"#ffffff",align:"center",minHeight:360}},
  },
  {
    id:"stadium-night",name:"Stadium Night",description:"Dunkler, kontrastreicher Game-Night-Look mit viel Tiefe und starken roten Akzenten.",category:"sport",builtin:true,
    palette:["#02060b","#09111b","#d41224","#dfe6ee"],
    theme:{background:"#02060b",surface:"#09111b",text:"#f8fafc",muted:"#8492a3",accent:"#d41224",headerBackground:"#02060b",headerText:"#ffffff",radius:0,headingWeight:950,headingTracking:-.055,headingTransform:"uppercase"},
    defaults:{...darkBase,background:"#02060b",accentColor:"#d41224",paddingTop:82,paddingBottom:82},
    variants:{hero:"centered",text:"editorial",split:"image-right",stats:"bold",cards:"bold",gallery:"cinematic",timeline:"drive",games:"scoreboard",news:"editorial",sponsors:"ticker",cta:"banner"},
    byType:{hero:{background:"#02060b",minHeight:660,paddingTop:100,paddingBottom:100},text:{background:"#07101a",textColor:"#f8fafc"},split:{background:"#09111b",textColor:"#f8fafc",paddingTop:0,paddingBottom:0},stats:{background:"#0b1520",align:"center"},cards:{background:"#050b12"},gallery:{background:"#02060b"},timeline:{background:"#02060b",align:"center",paddingTop:90,paddingBottom:100},games:{background:"#02060b"},news:{background:"#07101a",textColor:"#ffffff"},sponsors:{background:"#09111b",textColor:"#ffffff",align:"center"},cta:{background:"#0b1520",align:"center",minHeight:390}},
  },
  {
    id:"clean-white",name:"Clean White",description:"Heller, ruhiger Premium-Look mit viel Weißraum und Navy als Kontrast.",category:"light",builtin:true,
    palette:["#f6f7f8","#ffffff","#071421","#b51d2c"],
    theme:{background:"#f6f7f8",surface:"#ffffff",text:"#071421",muted:"#697586",accent:"#b51d2c",headerBackground:"#ffffff",headerText:"#071421",radius:0,headingWeight:850,headingTracking:-.025,headingTransform:"none"},
    defaults:{background:"#ffffff",textColor:"#071421",accentColor:"#b51d2c",paddingTop:88,paddingBottom:88,maxWidth:1440,rounded:0,border:""},
    variants:{hero:"split",text:"editorial",split:"image-left",stats:"cards",cards:"compact",gallery:"grid",timeline:"compact",games:"clean",news:"editorial",sponsors:"ticker",cta:"panel"},
    byType:{hero:{background:"#071421",textColor:"#ffffff",minHeight:580,paddingTop:90,paddingBottom:90},text:{background:"#ffffff",textColor:"#071421"},split:{background:"#f6f7f8",textColor:"#071421",paddingTop:0,paddingBottom:0},stats:{background:"#ffffff",textColor:"#071421",align:"center"},cards:{background:"#f6f7f8",textColor:"#071421"},gallery:{background:"#ffffff",textColor:"#071421"},timeline:{background:"#071421",textColor:"#ffffff",align:"center"},games:{background:"#071421",textColor:"#ffffff"},news:{background:"#ffffff",textColor:"#071421"},sponsors:{background:"#f6f7f8",textColor:"#071421",align:"center"},cta:{background:"#071421",textColor:"#ffffff",align:"center",minHeight:340}},
  },
  {
    id:"premium-navy",name:"Premium Navy",description:"Edler Club-Look mit tiefem Navy, weicheren Flächen und subtilen Rundungen.",category:"premium",builtin:true,
    palette:["#10172c","#19233d","#9e210f","#f5f7fb"],
    theme:{background:"#10172c",surface:"#19233d",text:"#f5f7fb",muted:"#a5afbf",accent:"#9e210f",headerBackground:"#10172c",headerText:"#ffffff",radius:16,headingWeight:900,headingTracking:-.035,headingTransform:"uppercase"},
    defaults:{background:"#10172c",textColor:"#f5f7fb",accentColor:"#9e210f",paddingTop:82,paddingBottom:82,maxWidth:1500,rounded:16,border:"rgba(255,255,255,.08)"},
    variants:{hero:"cinematic",text:"editorial",split:"image-right",stats:"cards",cards:"editorial",gallery:"masonry",timeline:"compact",games:"clean",news:"editorial",sponsors:"ticker",cta:"panel"},
    byType:{hero:{rounded:0,border:"",minHeight:620,paddingTop:96,paddingBottom:96},text:{background:"#f5f7fb",textColor:"#10172c",rounded:0,border:""},split:{background:"#f5f7fb",textColor:"#10172c",paddingTop:0,paddingBottom:0,rounded:0,border:""},stats:{background:"#19233d",align:"center"},cards:{background:"#10172c"},timeline:{background:"#0c1325",align:"center",rounded:0,border:""},games:{background:"#10172c",rounded:0,border:""},news:{background:"#f5f7fb",textColor:"#10172c",rounded:0,border:""},sponsors:{background:"#ffffff",textColor:"#10172c",align:"center",rounded:0,border:""},cta:{background:"#19233d",align:"center",minHeight:380}},
  },
  {
    id:"game-day",name:"Game Day",description:"Kompakter, aggressiver Sports-Look für Spieltage, Recruiting und Saisonseiten.",category:"sport",builtin:true,
    palette:["#050505","#151515","#e7192d","#ffffff"],
    theme:{background:"#050505",surface:"#151515",text:"#ffffff",muted:"#9b9b9b",accent:"#e7192d",headerBackground:"#050505",headerText:"#ffffff",radius:0,headingWeight:1000,headingTracking:-.06,headingTransform:"uppercase"},
    defaults:{background:"#090909",textColor:"#ffffff",accentColor:"#e7192d",paddingTop:60,paddingBottom:60,maxWidth:1600,rounded:0,border:""},
    variants:{hero:"centered",text:"editorial",split:"image-left",stats:"bold",cards:"bold",gallery:"cinematic",timeline:"drive",games:"scoreboard",news:"editorial",sponsors:"ticker",cta:"banner"},
    byType:{hero:{background:"#050505",minHeight:640,paddingTop:86,paddingBottom:86},text:{background:"#111111"},split:{background:"#111111",paddingTop:0,paddingBottom:0},stats:{background:"#e7192d",textColor:"#ffffff",accentColor:"#ffffff",align:"center"},cards:{background:"#0b0b0b"},gallery:{background:"#050505"},timeline:{background:"#050505",align:"center"},games:{background:"#050505"},news:{background:"#111111",textColor:"#ffffff"},sponsors:{background:"#ffffff",textColor:"#111111",align:"center"},cta:{background:"#e7192d",textColor:"#ffffff",accentColor:"#ffffff",align:"center",minHeight:330}},
  },
  {
    id:"minimal",name:"Minimal",description:"Sehr reduziertes Design mit klarer Hierarchie, wenig Dekoration und maximaler Lesbarkeit.",category:"light",builtin:true,
    palette:["#ffffff","#f2f3f5","#111827","#9e210f"],
    theme:{background:"#ffffff",surface:"#f2f3f5",text:"#111827",muted:"#6b7280",accent:"#9e210f",headerBackground:"#ffffff",headerText:"#111827",radius:0,contentWidth:1280,headingWeight:800,headingTracking:-.02,headingTransform:"none"},
    defaults:{background:"#ffffff",textColor:"#111827",accentColor:"#9e210f",paddingTop:96,paddingBottom:96,maxWidth:1280,rounded:0,border:""},
    variants:{hero:"minimal",text:"editorial",split:"image-left",stats:"strip",cards:"compact",gallery:"grid",timeline:"compact",games:"clean",news:"editorial",sponsors:"ticker",cta:"panel"},
    byType:{hero:{background:"#111827",textColor:"#ffffff",minHeight:560,paddingTop:90,paddingBottom:90},text:{background:"#ffffff"},split:{background:"#f2f3f5",paddingTop:0,paddingBottom:0},stats:{background:"#ffffff",align:"center"},cards:{background:"#f2f3f5"},gallery:{background:"#ffffff"},timeline:{background:"#111827",textColor:"#ffffff",align:"center"},games:{background:"#111827",textColor:"#ffffff"},news:{background:"#ffffff"},sponsors:{background:"#f2f3f5",align:"center"},cta:{background:"#111827",textColor:"#ffffff",align:"center",minHeight:340}},
  },
];

function cloneStyle(style: BuilderSectionStyle): BuilderSectionStyle {
  return { ...style, tablet: style.tablet ? { ...style.tablet } : undefined, mobile: style.mobile ? { ...style.mobile } : undefined };
}

export function applyDesignPreset(state: SiteBuilderState, pageId: string, preset: DesignPreset): SiteBuilderState {
  const sequenceCounters = new Map<BuilderSectionType, number>();
  const sectionPools = new Map<BuilderSectionType, Array<{variant?:string;style:BuilderSectionStyle}>>();
  for (const entry of preset.sectionStyles || []) {
    const pool = sectionPools.get(entry.type) || [];
    pool.push({ variant: entry.variant, style: entry.style });
    sectionPools.set(entry.type, pool);
  }

  const pages = state.pages.map((page) => {
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

  return { ...state, theme: { ...state.theme, ...preset.theme }, pages };
}

export function capturePageDesign(state: SiteBuilderState, page: BuilderPage, id: string, name: string, description = "Eigenes gespeichertes Design"): DesignPreset {
  const palette = [state.theme.background, state.theme.surface, state.theme.accent, state.theme.text].filter(Boolean).slice(0, 4);
  return {
    id,name,description,category:"custom",builtin:false,palette,theme:{...state.theme},defaults:{},byType:{},
    sectionStyles: page.sections.map((section) => ({ type: section.type, variant: section.variant, style: cloneStyle(section.style) })),
    createdAt:new Date().toISOString(),
  };
}
