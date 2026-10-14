import { bindings, ensureCmsSchema } from "./cms";

export type BuilderSectionType="hero"|"text"|"split"|"stats"|"cards"|"gallery"|"timeline"|"cta"|"spacer"|"games"|"news"|"sponsors"|"gameday"|"units";
export type BuilderAlign="left"|"center"|"right";
export type BuilderBackgroundMode="color"|"gradient"|"image"|"video";
export type BuilderElementResponsiveStyle={fontSize?:number;lineHeight?:number;letterSpacing?:number;align?:BuilderAlign;paddingX?:number;paddingY?:number};
export type BuilderElementStyle={color?:string;background?:string;fontFamily?:string;fontSize?:number;fontWeight?:number;italic?:boolean;letterSpacing?:number;lineHeight?:number;textTransform?:"none"|"uppercase"|"lowercase";align?:BuilderAlign;borderColor?:string;borderWidth?:number;borderRadius?:number;paddingX?:number;paddingY?:number;opacity?:number;objectPositionX?:number;objectPositionY?:number;scale?:number;width?:number;height?:number;heightBasis?:number;offsetX?:number;offsetY?:number;objectFit?:"cover"|"contain";imageAlign?:BuilderAlign;boxShadow?:string;tablet?:BuilderElementResponsiveStyle;mobile?:BuilderElementResponsiveStyle};
export type BuilderItem={id:string;eyebrow?:string;title?:string;subtitle?:string;text?:string;value?:string;image?:string;icon?:string;linkLabel?:string;linkUrl?:string;elementStyles?:Record<string,BuilderElementStyle>};
export type BuilderResponsiveStyle={paddingTop?:number;paddingBottom?:number;minHeight?:number;align?:BuilderAlign;maxWidth?:number;headingScale?:number};
export type BuilderSectionStyle={background?:string;textColor?:string;accentColor?:string;paddingTop?:number;paddingBottom?:number;minHeight?:number;align?:BuilderAlign;maxWidth?:number;rounded?:number;border?:string;borderWidth?:number;borderStyle?:"solid"|"dashed"|"dotted"|"none";boxShadow?:string;opacity?:number;headingScale?:number;backgroundMode?:BuilderBackgroundMode;backgroundImage?:string;backgroundVideo?:string;backgroundGradient?:string;overlayColor?:string;overlayOpacity?:number;backgroundPosition?:string;backgroundFixed?:boolean;tablet?:BuilderResponsiveStyle;mobile?:BuilderResponsiveStyle};
export type BuilderSection={id:string;type:BuilderSectionType;variant?:string;visible:boolean;eyebrow?:string;title?:string;accent?:string;text?:string;image?:string;image2?:string;buttonLabel?:string;buttonUrl?:string;style:BuilderSectionStyle;items:BuilderItem[];elementStyles?:Record<string,BuilderElementStyle>};
export type BuilderPage={id:string;name:string;slug:string;enabled:boolean;showInNav:boolean;navLabel:string;title?:string;description?:string;sections:BuilderSection[]};
export type BuilderTheme={background:string;surface:string;text:string;muted:string;accent:string;headerBackground:string;headerText:string;contentWidth:number;radius:number;logoUrl:string;brandTop:string;brandBottom:string;navCtaLabel:string;navCtaUrl:string;footerTitle:string;footerSubtitle:string;headingFont:string;bodyFont:string;headingWeight:number;headingTracking:number;bodyLineHeight:number;headingTransform:"uppercase"|"none";bodyFontSize?:number;bodyFontWeight?:number;bodyItalic?:boolean;bodyLetterSpacing?:number;headingItalic?:boolean};
export type SiteBuilderState={version:number;theme:BuilderTheme;pages:BuilderPage[];editorInitialized?:boolean};

const LEGACY_KEY="site_builder";
const DRAFT_KEY="site_builder_draft_v3";
const PUBLISHED_KEY="site_builder_published_v3";
/* THE ICONS COME FROM THIS SERVER NOW.

   These were fetched from api.iconify.design at render time — one request to
   a third party per icon, on a phone, before the page could finish drawing
   itself. Behind a restrictive network they simply failed and the page lost
   content; everywhere else they cost a DNS lookup, a TLS handshake and a
   round trip each for about half a kilobyte of artwork.

   The same icons are published as data on npm, so they were extracted once
   and now sit in /public/icons: thirteen files, eight kilobytes in total,
   served from the same origin as everything else.

   A name outside the set still falls through to the service rather than
   rendering nothing, so an icon chosen in the CMS that nobody has localised
   keeps working. */
const LOCAL_ICONS:Record<string,string>={
  "noto:american-football":"football-color",
  "ion:american-football-outline":"football",
  "mdi:trophy-outline":"trophy-outline",
  "mdi:whistle-outline":"whistle",
  "streamline-ultimate:american-football-helmet":"helmet",
  "mdi:account-group-outline":"team",
  "mdi:shield-check-outline":"shield",
  "mdi:heart-outline":"heart",
  "mdi:target":"target",
  "mdi:star-outline":"star",
  "bi:trophy":"trophy",
  "mdi:map-marker-outline":"map-marker",
  "mdi:trending-up":"trending-up",
};
const icon=(name:string,color="e7192d")=>LOCAL_ICONS[name]
  ?`/icons/${LOCAL_ICONS[name]}.svg`
  :`https://api.iconify.design/${name.replace(":","/")}.svg?color=%23${color}`;
const sid=(name:string)=>`seed-${name}`;
const isLight=(bg:string)=>["#fff","#ffffff","#f4f4f1","#f5f5f2"].includes(bg.toLowerCase());
const style=(background="#050d18",align:BuilderAlign="left",minHeight=0):BuilderSectionStyle=>({background,textColor:isLight(background)?"#071421":"#ffffff",accentColor:"#e7192d",paddingTop:70,paddingBottom:70,minHeight,align,maxWidth:1600,rounded:0,border:"",borderWidth:0,borderStyle:"solid",boxShadow:"",opacity:1,headingScale:1,backgroundMode:"color",backgroundImage:"",backgroundVideo:"",backgroundGradient:"linear-gradient(135deg,#050d18,#0b1725)",overlayColor:"#020812",overlayOpacity:.45,backgroundPosition:"center",backgroundFixed:false,tablet:{paddingTop:58,paddingBottom:58,minHeight,align,maxWidth:1200,headingScale:.9},mobile:{paddingTop:42,paddingBottom:42,minHeight:0,align,maxWidth:720,headingScale:.72}});
const hero=(id:string,eyebrow:string,title:string,accent:string,text:string,image:string):BuilderSection=>({id:sid(id),type:"hero",variant:"cinematic",visible:true,eyebrow,title,accent,text,image,buttonLabel:"",buttonUrl:"",style:style("#050d18","left",560),items:[],elementStyles:{}});
const cta=(id:string):BuilderSection=>({id:sid(id),type:"cta",variant:"panel",visible:true,eyebrow:"YOUR NEXT PLAY",title:"READY TO JOIN",accent:"THE FAMILY?",text:"Du brauchst keine Erfahrung. Nur den Willen, Teil von etwas Größerem zu werden.",buttonLabel:"Probetraining anfragen",buttonUrl:"mailto:football@hsb1846.de",style:style("#071421","center",360),items:[],elementStyles:{}});

function templates():BuilderPage[]{return [
{id:"page-home",name:"Startseite",slug:"",enabled:false,showInNav:false,navLabel:"Startseite",title:"Hellenstein Rascals",description:"American Football in Heidenheim",sections:[
{...hero("home-hero","AMERICAN FOOTBALL · HEIDENHEIM","HART. ECHT.","RASCALS.","Ein Team. Eine Familie. Bereit für den nächsten Snap.","/helmet-hero-4k.webp"),buttonLabel:"Teil des Teams werden",buttonUrl:"mailto:football@hsb1846.de"},
{id:sid("home-stats"),type:"stats",variant:"strip",visible:true,eyebrow:"HELLENSTEIN RASCALS",title:"TEAM IN ZAHLEN",style:style("#071421","center"),items:[{id:"founded",value:"2023",title:"GEGRÜNDET"},{id:"field",value:"11",title:"SPIELER AUF DEM FELD"},{id:"family",value:"1",title:"RASCALS FAMILY"},{id:"home",value:"100%",title:"HEIDENHEIM"}],elementStyles:{}},
{id:sid("home-games"),type:"games",variant:"scoreboard",visible:true,eyebrow:"SAISON",title:"NÄCHSTE GAMES.",text:"Alle bestätigten Begegnungen der Rascals auf einen Blick.",style:style("#050d18","left"),items:[],elementStyles:{}},
{id:sid("home-news"),type:"news",variant:"editorial",visible:true,eyebrow:"INSIDE RASCALS",title:"FROM THE HUDDLE.",style:style("#f4f4f1","left"),items:[],elementStyles:{}},
{id:sid("home-story"),type:"split",variant:"image-left",visible:true,eyebrow:"MEHR ALS FOOTBALL",title:"EIN TEAM.",accent:"EINE FAMILIE.",text:"Seit 2023 bringen wir American Football zurück unter den Hellenstein. Bei uns zählen Einsatz, Fairness und der Mensch unter dem Helm.",image:"/team-victory-4k.webp",buttonLabel:"Unsere Geschichte",buttonUrl:"/ueber-uns",style:style("#ffffff","left"),items:[],elementStyles:{}},
{id:sid("home-sponsors"),type:"sponsors",variant:"ticker",visible:true,title:"PROUDLY POWERED BY",style:style("#ffffff","center"),items:[],elementStyles:{}},cta("home-cta")]},
{id:"page-about",name:"Über uns",slug:"ueber-uns",enabled:false,showInNav:true,navLabel:"Über uns",title:"Über uns · Hellenstein Rascals",description:"Die Geschichte der Hellenstein Rascals.",sections:[hero("about-hero","ÜBER UNS","HELLENSTEIN","RASCALS","Ein Team. Eine Stadt. Eine Mission.","/helmet-hero-4k.webp"),{id:sid("about-intro"),type:"text",variant:"editorial",visible:true,eyebrow:"DER ERSTE SNAP",title:"FOOTBALL IST TEAMARBEIT.",text:"Am 24. Mai 2023 wurde die American-Football-Abteilung des Heidenheimer Sportbunds gegründet. Das Ziel: sportlichen Ehrgeiz, Spaß und familiäre Identität zusammenbringen.",style:style("#ffffff","left"),items:[],elementStyles:{}},{id:sid("about-timeline"),type:"timeline",variant:"drive",visible:true,eyebrow:"UNSERE REISE.",title:"FROM FIRST SNAP TO NEXT LEVEL.",style:style("#030a13","center"),elementStyles:{},items:[{id:"2023",title:"2023",subtitle:"KICKOFF · AUFBAULIGA",text:"Gründung der Hellenstein Rascals. Der erste Schritt auf unserem Weg.",icon:icon("mdi:whistle-outline")},{id:"2025",title:"2025",subtitle:"NEXT DOWN · KREISLIGA",value:"139 : 137",text:"Viele Spiele, viele Lektionen und ein Team, das zusammen gewachsen ist.",icon:icon("ion:american-football-outline")},{id:"2026",title:"2026",subtitle:"MOVING THE CHAINS · KREISOBERLIGA",value:"170 : 66",text:"Mehr Erfahrung, mehr Wille, mehr Team. Der verdiente Aufstieg in die Kreisoberliga.",icon:icon("streamline-ultimate:american-football-helmet")},{id:"2027",title:"2027",subtitle:"NEXT LEVEL · BEZIRKSLIGA",text:"Unser nächstes Ziel: die Bezirksliga. Wir arbeiten. Wir glauben. Wir werden bereit sein.",icon:icon("bi:trophy")}]},{id:sid("about-values"),type:"cards",variant:"grid",visible:true,eyebrow:"WOFÜR WIR STEHEN",title:"RASCALS VALUES",style:style("#071421","left"),elementStyles:{},items:[{id:"team",title:"TEAMGEIST",text:"Wir gewinnen zusammen, wir lernen zusammen.",icon:icon("mdi:account-group-outline")},{id:"fair",title:"FAIRNESS",text:"Respekt gilt auf und neben dem Feld.",icon:icon("mdi:shield-check-outline")},{id:"dev",title:"ENTWICKLUNG",text:"Jeder Rep bringt uns als Team weiter.",icon:icon("mdi:trending-up")},{id:"home",title:"HEIMAT",text:"Heidenheim ist in unserem Namen und Herzen.",icon:icon("mdi:map-marker-outline")}]},cta("about-cta")]},
{id:"page-team",name:"Team",slug:"team",enabled:false,showInNav:true,navLabel:"Team",title:"Team · Hellenstein Rascals",description:"Roster, Coaches und Teams der Hellenstein Rascals.",sections:[hero("team-hero","ROSTER & COACHES","ONE TEAM.","ALL IN.","Auf dem Feld zählt nicht, wo du angefangen hast – sondern was du für das Team gibst.","/team-juniors-new-4k.webp"),{id:sid("team-cards"),type:"cards",variant:"editorial",visible:true,eyebrow:"RASCALS FAMILY",title:"DEIN PLATZ IM TEAM.",text:"Football-Erfahrung ist für den Einstieg nicht nötig; Motivation und Verlässlichkeit schon.",style:style("#ffffff","left"),elementStyles:{},items:[{id:"seniors",title:"TACKLE FOOTBALL",subtitle:"SENIORS · AB 18",text:"Wettkampf, Technik und Athletik – mit einem Team, das dich fordert und trägt.",image:"/team-walk-4k.webp"},{id:"juniors",title:"NEXT GENERATION",subtitle:"JUNIORS · 14–18",text:"Grundlagen sicher lernen, Verantwortung übernehmen und als Spieler wachsen.",image:"/team-juniors-new-4k.webp"}]},cta("team-cta")]},
{id:"page-sponsoring",name:"Sponsoring",slug:"sponsoring",enabled:false,showInNav:true,navLabel:"Sponsoring",title:"Sponsoring · Hellenstein Rascals",description:"Partner und Sponsoring der Hellenstein Rascals.",sections:[hero("sponsor-hero","PARTNER DER RASCALS","BUILD WITH","THE RASCALS.","Gemeinsam schaffen wir Sichtbarkeit, Nachwuchsarbeit und Football in der Region.","/team-entry-4k.webp"),{id:sid("sponsor-live"),type:"sponsors",variant:"ticker",visible:true,title:"UNSERE PARTNER",style:style("#ffffff","center"),items:[],elementStyles:{}},cta("sponsor-cta")]},
{id:"page-shop",name:"Shop",slug:"shop",enabled:false,showInNav:true,navLabel:"Shop",title:"Shop · Hellenstein Rascals",description:"Offizielle Rascals Teamwear.",sections:[hero("shop-hero","OFFICIAL TEAMWEAR","WEAR THE","RASCALS.","Zeig deine Farben – auf der Tribüne, im Training und überall dazwischen.","/shop-product-4k.webp"),{id:sid("shop-cta"),type:"cta",variant:"panel",visible:true,eyebrow:"RASCALS SHOP",title:"OFFICIAL",accent:"TEAMWEAR.",text:"Direkt im offiziellen Rascals Shop bestellen.",buttonLabel:"Zum Shop",buttonUrl:"https://hellenstein-rascals.myshopify.com",style:style("#071421","center",360),items:[],elementStyles:{}}]},
{id:"page-news",name:"News",slug:"news",enabled:false,showInNav:true,navLabel:"News",title:"News · Hellenstein Rascals",description:"News und Stories der Hellenstein Rascals.",sections:[hero("news-hero","INSIDE RASCALS","FROM THE","HUDDLE.","News, Gamedays und Geschichten aus der Rascals Family.","/team-players-4k.webp"),{id:sid("news-feed"),type:"news",variant:"editorial",visible:true,eyebrow:"LATEST",title:"NEWS & STORIES",style:style("#f4f4f1","left"),items:[],elementStyles:{}}]},
{id:"page-gallery",name:"Galerie",slug:"galerie",enabled:false,showInNav:true,navLabel:"Galerie",title:"Galerie · Hellenstein Rascals",description:"Bilder der Hellenstein Rascals.",sections:[hero("gallery-hero","RASCALS IN ACTION","GAME DAY.","CAPTURED.","Momente auf und neben dem Feld.","/team-huddle-4k.webp"),{id:sid("gallery-grid"),type:"gallery",variant:"masonry",visible:true,eyebrow:"SIDELINE STORIES",title:"GALERIE",style:style("#050d18","left"),elementStyles:{},items:[{id:"g1",image:"/team-entry-4k.webp",title:"Game Day"},{id:"g2",image:"/team-players-4k.webp",title:"Rascals"},{id:"g3",image:"/team-celebrate-4k.webp",title:"Team"},{id:"g4",image:"/team-huddle-4k.webp",title:"Huddle"},{id:"g5",image:"/team-walk-4k.webp",title:"All In"}]}]}
]}

/**
 * UNDOING A RENAME THAT GOT AS FAR AS THE DATABASE.
 *
 * The club was briefly renamed to Heidenheim Rascals here, and because every
 * string in the builder exists twice — once as the template a fresh site is
 * built from, once in D1 in whatever has been published since — that rename
 * also ran on the way out of the database. Taking it back out of the code
 * takes it out of the template only. If anything was published while it was
 * live, D1 now holds the wrong name, and D1 wins.
 *
 * So it is taken back out of the database too, once, and then this stops.
 *
 * NARROW ON PURPOSE. Heidenheim is the town, and it was in these pages long
 * before any of this: "American Football · Heidenheim", "89522 Heidenheim",
 * "Eine Abteilung des Heidenheimer Sportbunds 1846 e.V.", a whole panel
 * about the town being in the club's name. A blanket swap back would eat all
 * of them. Only the club's own name is touched — the word paired with
 * Rascals, the brand line itself, and the two sentences that were reworded
 * when the castle came out of them.
 *
 * On a state that was never republished none of these match and nothing
 * happens, which is the point: it is safe to run either way.
 */
const BRAND_RESTORED_IN = 5;
const BRAND_LINK = /\b(?:https?:\/\/|mailto:|www\.)\S+/gi;

function restoreBrand(value: string): string {
  const links: string[] = [];
  const masked = value.replace(BRAND_LINK, (match) => `\u0000${links.push(match) - 1}\u0000`);
  const restored = masked
    .replace(/American Football zur\u00fcck nach Heidenheim/g, "American Football zur\u00fcck unter den Hellenstein")
    .replace(/Seit 2023 zur\u00fcck in Heidenheim/g, "Seit 2023 zur\u00fcck unter dem Hellenstein")
    .replace(/HEIDENHEIM RASCALS/g, "HELLENSTEIN RASCALS")
    .replace(/Heidenheim Rascals/g, "Hellenstein Rascals");
  return restored.replace(/\u0000(\d+)\u0000/g, (_, index) => links[Number(index)]);
}

function restoreStored<T>(value: T): T {
  if (typeof value === "string") return restoreBrand(value) as unknown as T;
  if (Array.isArray(value)) return value.map(restoreStored) as unknown as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, restoreStored(item)])) as unknown as T;
  }
  return value;
}

/* The brand line is the one place a bare "HEIDENHEIM" is the club rather than
   the town, so it is the one place it may be swapped on its own. */
function restoreBrandLine(state: Partial<SiteBuilderState>): Partial<SiteBuilderState> {
  const restored = restoreStored(state);
  if (restored.theme?.brandTop?.trim().toUpperCase() === "HEIDENHEIM") {
    restored.theme = { ...restored.theme, brandTop: "HELLENSTEIN" };
  }
  return restored;
}

/**
 * THE NEWS BELONG UNDER THE SCHEDULE.
 *
 * On the start page the order was schedule, then the club's story, then the
 * news. Whoever comes to the site for the next fixture reads it and then has
 * to scroll past a standing paragraph to find out what actually happened last
 * weekend — the one thing on the page that changes.
 *
 * Moved in the template above, and moved here as well, for the same reason
 * the club's name had to be: the start page that is live is the one in D1,
 * and it carries its own copy of this order. Changing only the template
 * changes only what a site built from scratch would look like.
 *
 * Deliberately not a blind swap of two neighbours. It puts the news directly
 * after the fixtures wherever either of them has since been moved to, does
 * nothing if the page has no fixtures or no news block, and does nothing if
 * they are already in that order — so a page somebody has rearranged by hand
 * is not shuffled a second time.
 */
const NEWS_MOVED_IN = 6;

function newsUnderTheSchedule(state: Partial<SiteBuilderState>): Partial<SiteBuilderState> {
  const pages = state.pages;
  if (!Array.isArray(pages)) return state;
  return {
    ...state,
    pages: pages.map((page) => {
      if (cleanSlug(page?.slug ?? "") !== "") return page;
      const sections = page?.sections;
      if (!Array.isArray(sections)) return page;
      const games = sections.findIndex((section) => section?.type === "games");
      const news = sections.findIndex((section) => section?.type === "news");
      if (games < 0 || news < 0 || news === games + 1) return page;
      const rest = sections.filter((_, index) => index !== news);
      const after = rest.findIndex((section) => section?.type === "games");
      return { ...page, sections: [...rest.slice(0, after + 1), sections[news], ...rest.slice(after + 1)] };
    }),
  };
}

/**
 * THE UNITS BLOCK ON THE START PAGE, MERGED INTO ONE SQUAD.
 *
 * Offense, Defense and Special Teams, numbered 01 02 03, each with its own
 * strapline, its own paragraph and its own way through to the roster. The
 * split had already gone from /team, from the Arena and from the team block
 * in the classic design; this was the last place still telling people the
 * club fields three units, and the three links now all went to the same
 * undivided roster.
 *
 * It has to happen here because this one is not markup. The section is a
 * builder section and its three cards are rows in D1 that somebody typed, so
 * there is nothing in the repository to edit — the numerals came out of the
 * renderer, and everything the cards say comes out of here.
 *
 * The photographs stay, and so does one link: the leftmost card keeps the way
 * through to the squad and the other two give theirs up.
 *
 * GATED ON RECOGNISING THE SPLIT. None of this runs unless the cards are
 * actually named after the three units, so a units section somebody has since
 * repurposed for something else is left exactly as it is.
 */
const UNITS_MERGED_IN = 7;

const UNIT_NAMES = /^(offense|defense|defence|special[\s-]?teams?|spezial[\s-]?teams?)$/i;

function mergeUnitSections(state: Partial<SiteBuilderState>): Partial<SiteBuilderState> {
  const pages = state.pages;
  if (!Array.isArray(pages)) return state;
  return {
    ...state,
    pages: pages.map((page) => {
      const sections = page?.sections;
      if (!Array.isArray(sections)) return page;
      let touched = false;
      const next = sections.map((section) => {
        if (section?.type !== "units" || !Array.isArray(section.items)) return section;
        if (!section.items.some((item) => UNIT_NAMES.test((item?.title ?? "").trim()))) return section;
        touched = true;
        let linkKept = false;
        const items = section.items.map((item) => {
          const keep = !linkKept && Boolean(item?.linkUrl);
          if (keep) linkKept = true;
          return {
            ...item,
            title: "",
            subtitle: "",
            text: "",
            linkLabel: keep ? item.linkLabel : "",
            linkUrl: keep ? item.linkUrl : "",
          };
        });
        /* The heading is one field — "DREI EINHEITEN. EIN TEAM." — and the
           section renderer never prints the accent, so only the counting half
           comes out and what is left of the line stands on its own. Blanking
           the whole title instead left the block with no heading at all.
           The strapline underneath explained what each unit was for and has
           nothing left to explain. */
        const title = (section.title ?? "").replace(/drei\s+(einheiten|units)\.?\s*/i, "").trim();
        const text = /\bunits?\b/i.test(section.text ?? "") ? "" : section.text;
        return { ...section, title: title || "EIN TEAM.", text, items };
      });
      return touched ? { ...page, sections: next } : page;
    }),
  };
}

/**
 * The teamwear shop, ahead of "Ein Team. Eine Familie." rather than behind it.
 *
 * Identified by where its button goes rather than by what it is called: the
 * shop is the one section on the page pointing at the club's Shopify address,
 * whatever type it was built as and whatever heading it carries. Nothing
 * happens if there is no such section, or no section to put it in front of.
 */
function shopAheadOfTheStory(state: Partial<SiteBuilderState>): Partial<SiteBuilderState> {
  const pages = state.pages;
  if (!Array.isArray(pages)) return state;
  const shopLink = (section: { buttonUrl?: string; items?: { linkUrl?: string }[] }) =>
    /myshopify\.com/i.test(section?.buttonUrl ?? "") ||
    (Array.isArray(section?.items) && section.items.some((item) => /myshopify\.com/i.test(item?.linkUrl ?? "")));
  return {
    ...state,
    pages: pages.map((page) => {
      const sections = page?.sections;
      if (!Array.isArray(sections)) return page;
      const shop = sections.findIndex(shopLink);
      const story = sections.findIndex((section) => /eine\s+familie/i.test(`${section?.title ?? ""} ${section?.accent ?? ""}`));
      if (shop < 0 || story < 0 || shop === story || shop === story - 1) return page;
      const rest = sections.filter((_, index) => index !== shop);
      const before = rest.findIndex((section) => /eine\s+familie/i.test(`${section?.title ?? ""} ${section?.accent ?? ""}`));
      return { ...page, sections: [...rest.slice(0, before), sections[shop], ...rest.slice(before)] };
    }),
  };
}

export const defaultSiteBuilderState:SiteBuilderState={version:UNITS_MERGED_IN,editorInitialized:false,theme:{background:"#050d18",surface:"#0b1725",text:"#ffffff",muted:"#9aa7b7",accent:"#e7192d",headerBackground:"#050d18",headerText:"#ffffff",contentWidth:1600,radius:0,logoUrl:"/rascals-logo-768.webp",brandTop:"HELLENSTEIN",brandBottom:"RASCALS",navCtaLabel:"Mitmachen",navCtaUrl:"mailto:football@hsb1846.de",footerTitle:"HELLENSTEIN RASCALS",footerSubtitle:"American Football · Heidenheim",headingFont:"Inter, Arial, sans-serif",bodyFont:"Inter, Arial, sans-serif",headingWeight:950,headingTracking:-.04,bodyLineHeight:1.65,headingTransform:"uppercase",bodyFontSize:16,bodyFontWeight:400,bodyItalic:false,bodyLetterSpacing:0,headingItalic:false},pages:templates()};

function cleanSlug(value:string){return value.trim().toLowerCase().replace(/^\/+|\/+$/g,"").replace(/[^a-z0-9äöüß-]+/g,"-").replace(/-+/g,"-")}
function numberOr(value:unknown,fallback:number){const n=Number(value);return Number.isFinite(n)?n:fallback}
function clamp(value:unknown,min:number,max:number,fallback:number){return Math.min(max,Math.max(min,numberOr(value,fallback)))}
function alignOr(value:unknown,fallback:BuilderAlign="left"):BuilderAlign{return value==="center"||value==="right"||value==="left"?value:fallback}
function normalizeResponsive(input:BuilderResponsiveStyle|undefined,fallback:BuilderResponsiveStyle):BuilderResponsiveStyle{const value=input??{};return{paddingTop:Math.max(0,numberOr(value.paddingTop,fallback.paddingTop??0)),paddingBottom:Math.max(0,numberOr(value.paddingBottom,fallback.paddingBottom??0)),minHeight:Math.max(0,numberOr(value.minHeight,fallback.minHeight??0)),align:alignOr(value.align,fallback.align??"left"),maxWidth:Math.max(280,numberOr(value.maxWidth,fallback.maxWidth??1200)),headingScale:clamp(value.headingScale,.45,1.8,fallback.headingScale??1)}}
function normalizeElementResponsive(input:BuilderElementResponsiveStyle|undefined):BuilderElementResponsiveStyle|undefined{if(!input)return undefined;return{fontSize:input.fontSize==null?undefined:clamp(input.fontSize,6,240,16),lineHeight:input.lineHeight==null?undefined:clamp(input.lineHeight,.7,3,1.2),letterSpacing:input.letterSpacing==null?undefined:clamp(input.letterSpacing,-.2,.5,0),align:input.align?alignOr(input.align):undefined,paddingX:input.paddingX==null?undefined:clamp(input.paddingX,0,200,0),paddingY:input.paddingY==null?undefined:clamp(input.paddingY,0,200,0)}}
function normalizeElementStyle(input:BuilderElementStyle|undefined):BuilderElementStyle{const value=input??{};return{color:value.color||undefined,background:value.background||undefined,fontFamily:value.fontFamily||undefined,fontSize:value.fontSize==null?undefined:clamp(value.fontSize,6,240,16),fontWeight:value.fontWeight==null?undefined:clamp(value.fontWeight,100,1000,400),italic:value.italic===true,letterSpacing:value.letterSpacing==null?undefined:clamp(value.letterSpacing,-.2,.5,0),lineHeight:value.lineHeight==null?undefined:clamp(value.lineHeight,.7,3,1.2),textTransform:value.textTransform==="uppercase"||value.textTransform==="lowercase"?value.textTransform:"none",align:value.align?alignOr(value.align):undefined,borderColor:value.borderColor||undefined,borderWidth:value.borderWidth==null?undefined:clamp(value.borderWidth,0,20,0),borderRadius:value.borderRadius==null?undefined:clamp(value.borderRadius,0,200,0),paddingX:value.paddingX==null?undefined:clamp(value.paddingX,0,200,0),paddingY:value.paddingY==null?undefined:clamp(value.paddingY,0,200,0),opacity:value.opacity==null?undefined:clamp(value.opacity,0,1,1),objectPositionX:value.objectPositionX==null?undefined:clamp(value.objectPositionX,0,100,50),objectPositionY:value.objectPositionY==null?undefined:clamp(value.objectPositionY,0,100,50),scale:value.scale==null?undefined:clamp(value.scale,.2,3,1),width:value.width==null?undefined:clamp(value.width,5,100,100),height:value.height==null?undefined:clamp(value.height,0,1600,0),heightBasis:value.heightBasis==null?undefined:clamp(value.heightBasis,320,2560,1440),offsetX:value.offsetX==null?undefined:clamp(value.offsetX,-600,600,0),offsetY:value.offsetY==null?undefined:clamp(value.offsetY,-600,600,0),objectFit:value.objectFit==="contain"?"contain":value.objectFit==="cover"?"cover":undefined,imageAlign:value.imageAlign?alignOr(value.imageAlign):undefined,boxShadow:value.boxShadow||undefined,tablet:normalizeElementResponsive(value.tablet),mobile:normalizeElementResponsive(value.mobile)}}
function normalizeElementStyles(input:Record<string,BuilderElementStyle>|undefined){if(!input)return{};return Object.fromEntries(Object.entries(input).map(([key,value])=>[key,normalizeElementStyle(value)]))}
function normalizeItem(item:BuilderItem):BuilderItem{return{id:item.id||crypto.randomUUID(),eyebrow:item.eyebrow??"",title:item.title??"",subtitle:item.subtitle??"",text:item.text??"",value:item.value??"",image:item.image??"",icon:item.icon??"",linkLabel:item.linkLabel??"",linkUrl:item.linkUrl??"",elementStyles:normalizeElementStyles(item.elementStyles)}}
function normalizeSection(section:Partial<BuilderSection>):BuilderSection{const s=section.style??{};const desktopAlign=alignOr(s.align,"left");const desktopMin=Math.max(0,numberOr(s.minHeight,0));return{id:section.id||crypto.randomUUID(),type:section.type||"text",variant:section.variant||"default",visible:section.visible!==false,eyebrow:section.eyebrow??"",title:section.title??"",accent:section.accent??"",text:section.text??"",image:section.image??"",image2:section.image2??"",buttonLabel:section.buttonLabel??"",buttonUrl:section.buttonUrl??"",elementStyles:normalizeElementStyles(section.elementStyles),style:{background:s.background||"#050d18",textColor:s.textColor||"#ffffff",accentColor:s.accentColor||"#e7192d",paddingTop:Math.max(0,numberOr(s.paddingTop,64)),paddingBottom:Math.max(0,numberOr(s.paddingBottom,64)),minHeight:desktopMin,align:desktopAlign,maxWidth:Math.max(320,numberOr(s.maxWidth,1600)),rounded:Math.max(0,numberOr(s.rounded,0)),border:s.border||"",borderWidth:clamp(s.borderWidth,0,20,s.border?1:0),borderStyle:s.borderStyle==="dashed"||s.borderStyle==="dotted"||s.borderStyle==="none"?s.borderStyle:"solid",boxShadow:s.boxShadow||"",opacity:clamp(s.opacity,0,1,1),headingScale:clamp(s.headingScale,.45,1.8,1),backgroundMode:s.backgroundMode==="gradient"||s.backgroundMode==="image"||s.backgroundMode==="video"?s.backgroundMode:"color",backgroundImage:s.backgroundImage||"",backgroundVideo:s.backgroundVideo||"",backgroundGradient:s.backgroundGradient||"linear-gradient(135deg,#050d18,#0b1725)",overlayColor:s.overlayColor||"#020812",overlayOpacity:clamp(s.overlayOpacity,0,1,.45),backgroundPosition:s.backgroundPosition||"center",backgroundFixed:s.backgroundFixed===true,tablet:normalizeResponsive(s.tablet,{paddingTop:56,paddingBottom:56,minHeight:desktopMin,align:desktopAlign,maxWidth:1200,headingScale:.9}),mobile:normalizeResponsive(s.mobile,{paddingTop:40,paddingBottom:40,minHeight:0,align:desktopAlign,maxWidth:720,headingScale:.72})},items:Array.isArray(section.items)?section.items.map(normalizeItem):[]}}
function normalizePage(page:Partial<BuilderPage>):BuilderPage{return{id:page.id||crypto.randomUUID(),name:page.name||"Neue Seite",slug:cleanSlug(page.slug||""),enabled:page.enabled===true,showInNav:page.showInNav===true,navLabel:page.navLabel||page.name||"Seite",title:page.title||"",description:page.description||"",sections:Array.isArray(page.sections)?page.sections.map(normalizeSection):[]}}
function migratePages(input:Partial<SiteBuilderState>):BuilderPage[]{const incoming=Array.isArray(input.pages)?input.pages:[];const base=templates();const merged=base.map(template=>{const previous=incoming.find(page=>page.id===template.id||cleanSlug(page.slug||"")===template.slug);if(!previous)return template;const normalized=normalizePage(previous);return normalized.sections.length?normalized:{...template,enabled:normalized.enabled,showInNav:normalized.showInNav,navLabel:normalized.navLabel,title:normalized.title||template.title,description:normalized.description||template.description}});const custom=incoming.filter(page=>!base.some(template=>template.id===page.id||template.slug===cleanSlug(page.slug||""))).map(normalizePage);return[...merged,...custom]}
function normalizeState(incoming:Partial<SiteBuilderState>):SiteBuilderState{const stored=numberOr(incoming.version,1);const restored:Partial<SiteBuilderState>=stored<BRAND_RESTORED_IN?restoreBrandLine(incoming):incoming;const moved:Partial<SiteBuilderState>=stored<NEWS_MOVED_IN?newsUnderTheSchedule(restored):restored;const input:Partial<SiteBuilderState>=stored<UNITS_MERGED_IN?shopAheadOfTheStory(mergeUnitSections(moved)):moved;const raw=input.theme??{};const theme:BuilderTheme={...defaultSiteBuilderState.theme,...raw,contentWidth:Math.max(800,numberOr(raw.contentWidth,1600)),radius:Math.max(0,numberOr(raw.radius,0)),headingWeight:clamp(raw.headingWeight,100,1000,950),headingTracking:clamp(raw.headingTracking,-.12,.2,-.04),bodyLineHeight:clamp(raw.bodyLineHeight,1,2.4,1.65),headingTransform:raw.headingTransform==="none"?"none":"uppercase",bodyFontSize:clamp(raw.bodyFontSize,8,40,16),bodyFontWeight:clamp(raw.bodyFontWeight,100,1000,400),bodyLetterSpacing:clamp(raw.bodyLetterSpacing,-.1,.2,0),bodyItalic:raw.bodyItalic===true,headingItalic:raw.headingItalic===true};const pages=numberOr(input.version,1)<2?migratePages(input):Array.isArray(input.pages)?input.pages.map(normalizePage):templates();return{version:UNITS_MERGED_IN,editorInitialized:input.editorInitialized===true,theme,pages}}
async function readKey(key:string):Promise<SiteBuilderState|null>{await ensureCmsSchema();const{DB}=bindings();const row=await DB.prepare("SELECT value FROM cms_settings WHERE key = ?").bind(key).first<{value:string}>();if(!row?.value)return null;try{return normalizeState(JSON.parse(row.value) as SiteBuilderState)}catch{return null}}
async function writeKey(key:string,state:SiteBuilderState){await ensureCmsSchema();const normalized=normalizeState(state);const{DB}=bindings();await DB.prepare(`INSERT INTO cms_settings (key,value,updated_at) VALUES (?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`).bind(key,JSON.stringify(normalized)).run();return normalized}
export async function readSiteBuilderState():Promise<SiteBuilderState>{return await readKey(DRAFT_KEY)??await readKey(LEGACY_KEY)??defaultSiteBuilderState}
export async function writeSiteBuilderState(state:SiteBuilderState){return await writeKey(DRAFT_KEY,{...state,editorInitialized:true})}
export async function readPublishedSiteBuilderState():Promise<SiteBuilderState>{return await readKey(PUBLISHED_KEY)??await readKey(LEGACY_KEY)??defaultSiteBuilderState}
export async function publishSiteBuilderState(state:SiteBuilderState){const normalized=await writeKey(PUBLISHED_KEY,{...state,editorInitialized:true});await writeKey(DRAFT_KEY,normalized);return normalized}
export function normalizeSiteBuilderState(state:Partial<SiteBuilderState>){return normalizeState(state)}
export function findBuilderPage(state:SiteBuilderState,slug:string){const normalized=cleanSlug(slug);return state.pages.find(page=>page.slug===normalized)}