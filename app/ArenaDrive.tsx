"use client";

import { useEffect, useRef } from "react";
import {
  FIELD_YARDS_LONG,
  FIELD_YARDS_WIDE,
  createCrowdTexture,
  createFlagTexture,
  createScoreboardTexture,
  createTurfTexture,
} from "./lib/arena-textures";

/**
 * THE DRIVE — the scroll engine and the stadium behind the Arena design.
 *
 * Scrolling this page is not scrolling a document: it walks the camera from
 * the Rascals' own 20 to the opponent's end zone. Content arrives at the yard
 * markers it belongs to and the broadcast overlay counts the drive down with
 * it. That is the structural idea — the page is a possession, not a stack.
 *
 * The stadium is built to real proportions (120 × 53⅓ yards) so it reads as a
 * field rather than a suggestion of one: painted numbers, hash marks every
 * yard, sidelines, both end zones, goal posts on the end lines, raked stands
 * with a crowd down both touchlines, and club flags stirring on the poles.
 *
 * One scroll handler and one animation frame drive camera, panels and overlay
 * from the same value, so they cannot disagree. The camera eases behind the
 * real scroll — that lag is what makes it feel like travelling — while the
 * panels and overlay track the scroll exactly, because easing the content
 * left the final panel unreachable at the bottom of the page.
 *
 * The drive engages only on a wide screen with a fine pointer and no
 * reduced-motion preference. Everywhere else the class is never added and CSS
 * leaves the panels in normal document flow.
 */

/** Scene units per yard. Every other measurement derives from this. */
const YARD = 1.7;
const FIELD_LONG = FIELD_YARDS_LONG * YARD;
const FIELD_WIDE = FIELD_YARDS_WIDE * YARD;

/** Our goal line sits at z = 0; the drive runs towards negative z. */
const OWN_GOAL_Z = 0;
const OPP_GOAL_Z = -100 * YARD;
const OWN_END_Z = 10 * YARD;
const OPP_END_Z = OPP_GOAL_Z - 10 * YARD;

/** Own 20, to a few yards deep in the opposing end zone. */
const START_Z = OWN_GOAL_Z - 20 * YARD;
const END_Z = OPP_GOAL_Z - 6 * YARD;

type Three = typeof import("three");

/**
 * The camera plan.
 *
 * A camera that only ever runs straight down the middle makes every stop look
 * like the same picture with different words on it. Each stop gets a framing
 * instead — low and wide at the kickoff, high over midfield, angled in from
 * the touchline for the teams, down at the posts for the touchdown — and the
 * drive interpolates between them. The z position still comes from the scroll,
 * so the shots ride the possession rather than replacing it.
 */
type Shot = {
  /** Where in the drive this framing is fully in force. */
  at: number;
  /** Camera offset across the field and its height. */
  x: number;
  y: number;
  /** Where it is aimed: across, height, and how far ahead. */
  lx: number;
  ly: number;
  ahead: number;
  fov: number;
  roll: number;
};

const SHOTS: Shot[] = [
  { at: 0.04, x: 0, y: 5, lx: 0, ly: 3.4, ahead: 76, fov: 64, roll: 0 },
  { at: 0.175, x: -15, y: 10.5, lx: 5, ly: 2.6, ahead: 52, fov: 55, roll: 0.014 },
  { at: 0.305, x: 7, y: 21, lx: -3, ly: 0.4, ahead: 62, fov: 51, roll: -0.011 },
  { at: 0.45, x: 27, y: 9.2, lx: -12, ly: 2.6, ahead: 40, fov: 58, roll: 0.021 },
  { at: 0.615, x: -22, y: 17, lx: 9, ly: 1.4, ahead: 56, fov: 53, roll: -0.016 },
  { at: 0.78, x: 13, y: 6.8, lx: -6, ly: 3.2, ahead: 44, fov: 60, roll: 0.015 },
  { at: 0.97, x: 0, y: 4.4, lx: 0, ly: 8, ahead: 40, fov: 54, roll: 0 },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Ease between framings so a shot arrives rather than slides. */
function sampleShot(t: number): Shot {
  if (t <= SHOTS[0].at) return SHOTS[0];
  const last = SHOTS[SHOTS.length - 1];
  if (t >= last.at) return last;

  let index = 0;
  while (index < SHOTS.length - 2 && t > SHOTS[index + 1].at) index += 1;
  const a = SHOTS[index];
  const b = SHOTS[index + 1];
  const raw = (t - a.at) / (b.at - a.at);
  const k = raw * raw * (3 - 2 * raw);

  return {
    at: t,
    x: lerp(a.x, b.x, k),
    y: lerp(a.y, b.y, k),
    lx: lerp(a.lx, b.lx, k),
    ly: lerp(a.ly, b.ly, k),
    ahead: lerp(a.ahead, b.ahead, k),
    fov: lerp(a.fov, b.fov, k),
    roll: lerp(a.roll, b.roll, k),
  };
}

/**
 * A gooseneck goal post standing on the end line.
 *
 * `outward` points away from the field. The pole is set back behind the end
 * line and the arm reaches forward, so the crossbar and uprights stand
 * directly over the line — which is the way round a real post is built, and
 * the opposite of how this was assembled before.
 */
function buildGoal(THREE: Three, endLineZ: number, outward: 1 | -1) {
  const material = new THREE.MeshStandardMaterial({ color: 0xe8bf3d, roughness: 0.42, metalness: 0.45 });
  const goal = new THREE.Group();
  const setBack = 6;

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 10, 28), material);
  base.position.set(0, 5, outward * setBack);

  // The arm from the pole out over the end line.
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, setBack, 24), material);
  arm.rotation.x = Math.PI / 2;
  arm.position.set(0, 10, outward * (setBack / 2));

  const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 6.2 * YARD, 28), material);
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.set(0, 10, 0);
  goal.add(base, arm, crossbar);

  for (const x of [-3.1 * YARD, 3.1 * YARD]) {
    const upright = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 17, 24), material);
    upright.position.set(x, 18.5, 0);
    goal.add(upright);
  }

  goal.position.z = endLineZ;
  return goal;
}

/** A raked stand down one touchline, with a crowd in it. */
function buildStand(THREE: Three, crowd: import("three").Texture, side: 1 | -1) {
  const group = new THREE.Group();
  const length = FIELD_LONG + 40;
  const centreZ = (OWN_END_Z + OPP_END_Z) / 2;

  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(length, 4),
    new THREE.MeshBasicMaterial({ color: 0x0a1220, toneMapped: false }),
  );
  wall.rotation.y = (-side * Math.PI) / 2;
  wall.position.set(side * (FIELD_WIDE / 2 + 6), 2.2, centreZ);
  group.add(wall);

  // The crowd carries its own light level: lighting it from the pitch left
  // the stands as two black walls, which is not what a full ground looks
  // like from the field.
  const deck = new THREE.Mesh(
    new THREE.PlaneGeometry(length, 26),
    new THREE.MeshBasicMaterial({ map: crowd, toneMapped: false, side: THREE.DoubleSide }),
  );
  deck.rotation.y = (-side * Math.PI) / 2;
  deck.rotation.x = -0.42;
  deck.position.set(side * (FIELD_WIDE / 2 + 13), 12.5, centreZ);
  group.add(deck);

  // A dark roof, so the stand reads as enclosed rather than as a floating wall.
  const roof = new THREE.Mesh(
    new THREE.PlaneGeometry(length, 16),
    new THREE.MeshBasicMaterial({ color: 0x04070c, toneMapped: false, side: THREE.DoubleSide }),
  );
  roof.rotation.x = -Math.PI / 2;
  roof.position.set(side * (FIELD_WIDE / 2 + 21), 25, centreZ);
  group.add(roof);

  return group;
}

/**
 * A stand behind an end zone.
 *
 * Without these the ground simply stopped: past the end line there was open
 * black, which is what made the far background read as nothing at all. A
 * stadium is a closed bowl, so both ends get a bank of seats and a roof.
 */
function buildEndStand(THREE: Three, crowd: import("three").Texture | null, z: number, outward: 1 | -1) {
  const group = new THREE.Group();
  const width = FIELD_WIDE + 46;

  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 5),
    new THREE.MeshBasicMaterial({ color: 0x0a1220, toneMapped: false }),
  );
  wall.position.set(0, 2.5, z + outward * -4);
  wall.rotation.y = outward > 0 ? Math.PI : 0;
  group.add(wall);

  if (crowd) {
    const deck = new THREE.Mesh(
      new THREE.PlaneGeometry(width, 24),
      new THREE.MeshBasicMaterial({ map: crowd, toneMapped: false, side: THREE.DoubleSide }),
    );
    deck.position.set(0, 12, z);
    deck.rotation.y = outward > 0 ? Math.PI : 0;
    deck.rotation.x = outward > 0 ? -0.4 : 0.4;
    group.add(deck);
  }

  const roof = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 18),
    new THREE.MeshBasicMaterial({ color: 0x04070c, toneMapped: false, side: THREE.DoubleSide }),
  );
  roof.rotation.x = -Math.PI / 2;
  roof.position.set(0, 24, z + outward * 8);
  group.add(roof);

  return group;
}

/** Club flags on poles along both touchlines. */
function buildFlags(THREE: Three, flag: import("three").Texture) {
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(5, 3.2);
  const material = new THREE.MeshStandardMaterial({ map: flag, side: THREE.DoubleSide, roughness: 0.85 });
  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x9aa7b8, roughness: 0.5, metalness: 0.5 });

  for (let i = 0; i < 13; i += 1) {
    const z = 12 - i * 16;
    for (const side of [-1, 1] as const) {
      const x = side * (FIELD_WIDE / 2 + 5);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 12, 8), poleMaterial);
      pole.position.set(x, 6, z);
      group.add(pole);

      const cloth = new THREE.Mesh(geometry, material);
      cloth.position.set(x + side * 2.6, 9.4, z);
      cloth.userData.phase = i * 0.7 + (side > 0 ? 1.6 : 0);
      group.add(cloth);
    }
  }
  return group;
}

/**
 * A floodlight pylon: a lattice mast carrying a bank of lamps.
 *
 * The lights were shining out of nothing before, which is the single clearest
 * tell that a scene is a demo. Giving the light a structure to come from is
 * what makes the ground read as built.
 */
function buildPylon(THREE: Three, x: number, z: number) {
  const group = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x2a3444, roughness: 0.6, metalness: 0.7 });

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.1, 46, 8), steel);
  mast.position.y = 23;
  group.add(mast);

  // Cross braces, so the mast reads as a lattice rather than a pipe.
  for (let i = 1; i < 6; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9 - i * 0.08, 0.09, 5, 10), steel);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = i * 7.4;
    group.add(ring);
  }

  const rig = new THREE.Mesh(new THREE.BoxGeometry(11, 5.4, 1), steel);
  rig.position.set(0, 47, 0);
  group.add(rig);

  const lampMaterial = new THREE.MeshBasicMaterial({ color: 0xfdfbf2, toneMapped: false });
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.86, 12), lampMaterial);
      lamp.position.set(-4.4 + col * 2.2, 45.9 + row * 2.2, -0.6);
      lamp.rotation.y = Math.PI;
      group.add(lamp);
    }
  }

  group.position.set(x, 0, z);
  group.lookAt(0, 40, z);
  return group;
}

/** The board behind the far end zone, carrying the real next fixture. */
function buildScoreboard(THREE: Three, texture: import("three").Texture, z: number) {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(76, 30, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x0b111b, roughness: 0.8 }),
  );
  frame.position.set(0, 25, 0);
  group.add(frame);

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(72, 27),
    // Fog off: a bright board cuts through night haze instead of dissolving
    // into it, which is what makes it read as a light source.
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, fog: false }),
  );
  face.position.set(0, 25, 1.3);
  group.add(face);

  const legs = new THREE.MeshStandardMaterial({ color: 0x151d2a, roughness: 0.9 });
  for (const x of [-26, 26]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 11, 16), legs);
    leg.position.set(x, 5.5, 0);
    group.add(leg);
  }

  group.position.z = z;
  return group;
}

export function ArenaDrive() {
  const canvasHost = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const page = document.querySelector<HTMLElement>(".drive-page");
    const host = canvasHost.current;
    if (!page || !host) return;

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const wide = window.matchMedia("(min-width: 1000px)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || !wide || reduced) return;

    page.classList.add("is-driving");

    const panels = Array.from(page.querySelectorAll<HTMLElement>("[data-from]"));
    const chainLinks = new Map<string, HTMLElement>();
    page.querySelectorAll<HTMLElement>("[data-chain]").forEach((link) => {
      if (link.dataset.chain) chainLinks.set(link.dataset.chain, link);
    });
    const scrollTotal = () => document.body.scrollHeight - window.innerHeight;

    /* While driving the panels are fixed, so an anchor has nothing to scroll
       to. The chain instead scrolls the page to the middle of the target
       panel's stretch of the drive, which is the same thing expressed in the
       only coordinate this page really has. */
    const onChainClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>(".drive-chain a");
      if (!link) return;
      const panel = page.querySelector<HTMLElement>(link.hash);
      if (!panel?.dataset.from) return;
      event.preventDefault();
      const from = Number(panel.dataset.from);
      const to = Number(panel.dataset.to ?? 1);
      window.scrollTo({ top: ((from + to) / 2) * scrollTotal(), behavior: "smooth" });
    };
    page.addEventListener("click", onChainClick);
    const yardOut = page.querySelector<HTMLElement>("[data-hud-yard]");
    const downOut = page.querySelector<HTMLElement>("[data-hud-down]");
    const barOut = page.querySelector<HTMLElement>("[data-hud-bar]");
    const captionOut = page.querySelector<HTMLElement>("[data-hud-caption]");

    let disposed = false;
    let frame = 0;
    let progress = 0;
    let eased = 0;
    let cleanup: (() => void) | undefined;

    const readProgress = () => {
      const total = scrollTotal();
      progress = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
    };

    /** Down and distance, so the overlay reads like a broadcast, not a scrollbar. */
    const downFor = (value: number) => {
      if (value > 0.86) return "TOUCHDOWN";
      if (value > 0.7) return "1ST & 10";
      if (value > 0.53) return "2ND & 7";
      if (value > 0.37) return "1ST & 10";
      if (value > 0.24) return "2ND & 6";
      if (value > 0.11) return "1ST & 10";
      return "KICKOFF";
    };

    /* The overlay only rewrites what actually changed. Reassigning the same
       string every frame restarts the tick animation and makes the readout
       flicker, which is exactly the kind of detail that reads as unfinished. */
    let lastYard = "";
    let lastDown = "";
    let lastHere = "";
    let yardTick: Animation | undefined;

    const paintOverlay = () => {
      const absolute = 20 + progress * 80;
      const yard = absolute >= 99
        ? "TOUCHDOWN"
        : `${absolute > 50 ? "OPP" : "OWN"} ${String(Math.round(absolute > 50 ? 100 - absolute : absolute)).padStart(2, "0")}`;

      if (yardOut && yard !== lastYard) {
        lastYard = yard;
        yardOut.textContent = yard;
        /* Restarting a CSS class animation means forcing a synchronous
           layout, and the ball position changes many times a second while
           scrolling. On a page carrying a WebGL scene and several
           backdrop-filtered panels that reflow storm stalled every other
           transition on the page for most of a second. The Web Animations
           API restarts the same tick without touching layout. */
        yardTick?.cancel();
        yardTick = yardOut.animate(
          [
            { opacity: 0.25, transform: "translateY(-0.14em)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 260, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
        );
      }

      const down = downFor(progress);
      if (downOut && down !== lastDown) {
        lastDown = down;
        downOut.textContent = down;
      }
      if (captionOut) {
        captionOut.textContent = progress > 0.86
          ? "Endzone erreicht"
          : progress < 0.02 ? "Der Drive beginnt" : `${Math.round(progress * 100)} % über das Feld`;
      }
      if (barOut) barOut.style.setProperty("--drive", `${(progress * 100).toFixed(1)}%`);

      let here = "";
      let briefing = false;
      for (const panel of panels) {
        const from = Number(panel.dataset.from ?? 0);
        const to = Number(panel.dataset.to ?? 1);
        const on = progress >= from && progress <= to;
        panel.classList.toggle("is-on", on);
        if (on) {
          here = panel.id;
          briefing = panel.classList.contains("is-wide");
        }
      }

      /* A rack focus. When a stop carries a list to read, the ground falls out
         of focus behind it — the same thing a camera does when the subject
         changes. It is also what stops the two layers reading as a render with
         a box on top. */
      page.classList.toggle("is-reading", briefing);

      if (here !== lastHere) {
        chainLinks.get(lastHere)?.classList.remove("is-here");
        chainLinks.get(here)?.classList.add("is-here");
        lastHere = here;
      }
    };

    void (async () => {
      // Postprocessing is what separates a lit scene from a photographed one:
      // without bloom the floodlights and the board are just bright pixels,
      // with it they throw light into the air around them.
      const [THREE, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
        import("three"),
        import("three/examples/jsm/postprocessing/EffectComposer.js"),
        import("three/examples/jsm/postprocessing/RenderPass.js"),
        import("three/examples/jsm/postprocessing/UnrealBloomPass.js"),
        import("three/examples/jsm/postprocessing/OutputPass.js"),
      ]);
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x03070d, 1);
      // Without tone mapping the floodlights clip the turf to a flat mint
      // green. ACES keeps the highlights and lets the grass stay grass.
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.06;
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x040a13, 0.0068);

      const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 600);
      const centreZ = (OWN_END_Z + OPP_END_Z) / 2;

      /* The composer renders into its own target, so the renderer's own
         antialiasing never applies — which is why edges came back stepped and
         the posts looked chewed. An explicitly multisampled half-float target
         restores smooth edges and gives bloom real headroom to work in. */
      const drawing = renderer.getDrawingBufferSize(new THREE.Vector2());
      const composerTarget = new THREE.WebGLRenderTarget(drawing.x, drawing.y, {
        type: THREE.HalfFloatType,
        samples: 4,
      });
      const composer = new EffectComposer(renderer, composerTarget);
      composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      composer.setSize(window.innerWidth, window.innerHeight);
      composer.addPass(new RenderPass(scene, camera));
      // The threshold has to sit above the lit turf. Painted yard lines under
      // floodlight are already near white, so a lower cut smeared the markings
      // into the grass instead of glowing the lamps.
      const bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.44,
        0.32,
        1.15,
      );
      composer.addPass(bloom);
      composer.addPass(new OutputPass());

      // --- the pitch --------------------------------------------------
      const turfCanvas = createTurfTexture();
      const turfTexture = turfCanvas ? new THREE.CanvasTexture(turfCanvas) : null;
      if (turfTexture) {
        turfTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        turfTexture.colorSpace = THREE.SRGBColorSpace;
      }
      const field = new THREE.Mesh(
        new THREE.PlaneGeometry(FIELD_WIDE, FIELD_LONG),
        new THREE.MeshStandardMaterial({ map: turfTexture ?? undefined, color: 0xffffff, roughness: 0.96, metalness: 0 }),
      );
      field.rotation.x = -Math.PI / 2;
      field.position.z = centreZ;
      scene.add(field);

      // Grass surround, so the pitch does not float in the void.
      const surround = new THREE.Mesh(
        new THREE.PlaneGeometry(FIELD_WIDE + 70, FIELD_LONG + 70),
        new THREE.MeshStandardMaterial({ color: 0x11301d, roughness: 1 }),
      );
      surround.rotation.x = -Math.PI / 2;
      surround.position.set(0, -0.06, centreZ);
      scene.add(surround);

      // --- stands and flags -------------------------------------------
      const crowdCanvas = createCrowdTexture();
      const crowdTexture = crowdCanvas ? new THREE.CanvasTexture(crowdCanvas) : null;
      if (crowdTexture) {
        crowdTexture.colorSpace = THREE.SRGBColorSpace;
        crowdTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        scene.add(buildStand(THREE, crowdTexture, 1), buildStand(THREE, crowdTexture, -1));
      }

      scene.add(buildGoal(THREE, OWN_END_Z, 1));
      scene.add(buildGoal(THREE, OPP_END_Z, -1));
      scene.add(buildEndStand(THREE, crowdTexture, OWN_END_Z + 26, 1));
      scene.add(buildEndStand(THREE, crowdTexture, OPP_END_Z - 26, -1));

      // The board carries whatever the schedule says is next. It is drawn
      // once with a placeholder and repainted when the fetch lands, so a slow
      // network never holds the scene up.
      let boardTexture: import("three").CanvasTexture | null = null;
      const boardCanvas = createScoreboardTexture({ competition: "HELLENSTEIN RASCALS" });
      if (boardCanvas) {
        boardTexture = new THREE.CanvasTexture(boardCanvas);
        boardTexture.colorSpace = THREE.SRGBColorSpace;
        boardTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        scene.add(buildScoreboard(THREE, boardTexture, OPP_END_Z - 82));
        /* A stadium board shows what happened, not what is scheduled: the
           last game that was actually played, with its real score. The list
           arrives oldest first, so the last finished game is the last match. */
        void fetch("/api/public/games")
          .then((response) => (response.ok ? response.json() : null))
          .then((data: { items?: Array<Record<string, unknown>> } | null) => {
            const played = (data?.items ?? []).filter((item) => String(item.status ?? "") === "final");
            const last = played[played.length - 1];
            if (!last || disposed || !boardTexture) return;
            const home = String(last.homeAway ?? "") === "home";
            const kickoff = last.kickoff ? new Date(String(last.kickoff)) : null;
            const repainted = createScoreboardTexture({
              competition: home ? "LETZTES SPIEL · HEIM" : "LETZTES SPIEL · AUSWÄRTS",
              opponent: String(last.opponent ?? "GAST"),
              home: Number(last.rascalsScore ?? 0),
              away: Number(last.opponentScore ?? 0),
              kickoff: kickoff
                ? "ENDSTAND · " + kickoff.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
                : "ENDSTAND",
            });
            if (!repainted) return;
            boardTexture.image = repainted;
            boardTexture.needsUpdate = true;
          })
          .catch(() => undefined);
      }

      const flagCanvas = createFlagTexture();
      const flagTexture = flagCanvas ? new THREE.CanvasTexture(flagCanvas) : null;
      if (flagTexture) flagTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      let flags: import("three").Group | null = null;
      if (flagTexture) {
        flagTexture.colorSpace = THREE.SRGBColorSpace;
        flags = buildFlags(THREE, flagTexture);
        scene.add(flags);
      }

      // --- floodlights -------------------------------------------------
      // Night: almost nothing from the sky, so the floodlights do the work
      // and the corners of the ground fall away into the dark.
      scene.add(new THREE.HemisphereLight(0x24405f, 0x0a1a0f, 0.55));
      scene.add(new THREE.AmbientLight(0x18273d, 0.45));

      /* A cone drawn at a flat opacity is a paper triangle, however faint. A
         beam of light is dense where you look through the most of it and
         nothing where the surface faces you, and it dies out before it reaches
         the grass — so the alpha is built from the viewing angle and the
         height rather than being a constant. */
      const shaftMaterial = new THREE.ShaderMaterial({
        uniforms: { uStrength: { value: 0.2 }, uColor: { value: new THREE.Color(0xbcd8ff) } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        vertexShader: `
          varying vec3 vNormalW;
          varying vec3 vViewW;
          varying float vUp;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vNormalW = normalize(normalMatrix * normal);
            vViewW = normalize(-mv.xyz);
            vUp = uv.y;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform float uStrength;
          uniform vec3 uColor;
          varying vec3 vNormalW;
          varying vec3 vViewW;
          varying float vUp;
          void main() {
            float rim = 1.0 - abs(dot(normalize(vNormalW), normalize(vViewW)));
            float body = pow(clamp(rim, 0.0, 1.0), 2.2);
            float fall = smoothstep(0.0, 0.72, vUp);
            float a = body * fall * uStrength;
            if (a < 0.004) discard;
            gl_FragColor = vec4(uColor, a);
          }
        `,
      });

      const shafts: import("three").Mesh[] = [];
      for (let i = 0; i < 5; i += 1) {
        const z = 12 - i * (FIELD_LONG / 4.4);
        for (const side of [-1, 1] as const) {
          const x = side * (FIELD_WIDE / 2 + 30);
          scene.add(buildPylon(THREE, x, z));
          const lamp = new THREE.SpotLight(0xeef4ff, 11000, 320, 0.82, 0.5, 2);
          lamp.position.set(x, 46, z);
          lamp.target.position.set(x * 0.15, 0, z - 12);
          scene.add(lamp, lamp.target);

          const shaft = new THREE.Mesh(
            new THREE.ConeGeometry(20, 46, 24, 1, true),
            shaftMaterial.clone(),
          );
          shaft.position.set(x * 0.66, 24, z - 6);
          shaft.rotation.z = side > 0 ? 0.34 : -0.34;
          scene.add(shaft);
          shafts.push(shaft);
        }
      }

      // --- camera flashes in the stands ---------------------------------
      // A still crowd is a photograph. A handful of flashes going off is what
      // makes a stand read as people rather than as a texture.
      const flashCount = 220;
      const flashPositions = new Float32Array(flashCount * 3);
      const flashPhase = new Float32Array(flashCount);
      for (let i = 0; i < flashCount; i += 1) {
        const side = Math.random() > 0.5 ? 1 : -1;
        flashPositions[i * 3] = side * (FIELD_WIDE / 2 + 10 + Math.random() * 9);
        flashPositions[i * 3 + 1] = 8 + Math.random() * 13;
        flashPositions[i * 3 + 2] = OWN_END_Z + 10 - Math.random() * (FIELD_LONG + 30);
        flashPhase[i] = Math.random() * 100;
      }
      const flashGeometry = new THREE.BufferGeometry();
      flashGeometry.setAttribute("position", new THREE.BufferAttribute(flashPositions, 3));
      flashGeometry.setAttribute("phase", new THREE.BufferAttribute(flashPhase, 1));
      // Each flash needs its own moment, so the timing lives per point in a
      // shader; a shared material opacity would fire the whole stand at once.
      const flashMaterial = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `
          attribute float phase;
          uniform float uTime;
          varying float vAlpha;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            float t = fract(uTime * 0.22 + phase);
            vAlpha = pow(max(0.0, 1.0 - t * 16.0), 2.0);
            gl_PointSize = (30.0 * vAlpha + 1.0) * (60.0 / max(1.0, -mv.z));
          }
        `,
        fragmentShader: `
          varying float vAlpha;
          void main() {
            float m = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
            if (vAlpha * m < 0.01) discard;
            gl_FragColor = vec4(1.0, 0.96, 0.88, vAlpha * m);
          }
        `,
      });
      const flashes = new THREE.Points(flashGeometry, flashMaterial);
      scene.add(flashes);

      // --- night air ----------------------------------------------------
      const dustCount = 1400;
      const dustPositions = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount; i += 1) {
        dustPositions[i * 3] = (Math.random() - 0.5) * (FIELD_WIDE + 60);
        dustPositions[i * 3 + 1] = Math.random() * 30;
        dustPositions[i * 3 + 2] = OWN_END_Z - Math.random() * (FIELD_LONG + 40);
      }
      const dustGeometry = new THREE.BufferGeometry();
      dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
      const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({
        color: 0xdbe9ff, size: 0.16, transparent: true, opacity: 0.4, depthWrite: false,
      }));
      scene.add(dust);

      // --- input ---------------------------------------------------------
      const pointer = { x: 0, y: 0 };
      const onPointerMove = (event: PointerEvent) => {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
      };
      const onResize = () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
        bloom.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        readProgress();
      };

      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("scroll", readProgress, { passive: true });
      window.addEventListener("resize", onResize);
      readProgress();
      eased = progress;

      const start = performance.now();
      const tick = () => {
        frame = requestAnimationFrame(tick);
        const time = (performance.now() - start) / 1000;

        eased += (progress - eased) * 0.07;

        // A camera that is perfectly still between scrolls reads as a
        // screenshot. A slow breath keeps the ground alive without ever
        // competing with the scroll.
        const breath = Math.sin(time * 0.31) * 0.4;
        const sway = Math.sin(time * 0.19 + 1.3) * 0.7;
        const shot = sampleShot(eased);

        if (Math.abs(camera.fov - shot.fov) > 0.01) {
          camera.fov = shot.fov;
          camera.updateProjectionMatrix();
        }

        camera.position.set(
          shot.x + pointer.x * 3.4 + sway,
          shot.y - pointer.y * 1.2 + breath,
          START_Z + (END_Z - START_Z) * eased,
        );
        camera.lookAt(
          shot.lx + pointer.x * 1.8 + sway * 0.35,
          shot.ly,
          camera.position.z - shot.ahead,
        );
        camera.rotation.z = shot.roll + Math.sin(time * 0.23) * 0.004;

        flashMaterial.uniforms.uTime.value = time;
        dust.rotation.y = time * 0.008;
        for (const [index, shaft] of shafts.entries()) {
          const material = shaft.material as import("three").ShaderMaterial;
          material.uniforms.uStrength.value = 0.19 + Math.sin(time * 1.2 + index) * 0.035;
        }
        // Flags stir in the night air rather than hanging dead on the pole.
        if (flags) {
          for (const child of flags.children) {
            const phase = child.userData.phase as number | undefined;
            if (phase === undefined) continue;
            child.rotation.y = Math.sin(time * 1.6 + phase) * 0.26;
            child.rotation.z = Math.sin(time * 2.3 + phase) * 0.05;
          }
        }

        paintOverlay();
        composer.render();
      };
      tick();

      cleanup = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("scroll", readProgress);
        window.removeEventListener("resize", onResize);
        scene.traverse((object) => {
          const mesh = object as import("three").Mesh;
          mesh.geometry?.dispose?.();
          const material = mesh.material as import("three").Material | import("three").Material[] | undefined;
          if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
          else material?.dispose?.();
        });
        turfTexture?.dispose();
        crowdTexture?.dispose();
        flagTexture?.dispose();
        boardTexture?.dispose();
        flashMaterial.dispose();
        shaftMaterial.dispose();
        composer.dispose();
        composerTarget.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        page.classList.remove("is-driving");
      };
    })();

    return () => {
      disposed = true;
      page.removeEventListener("click", onChainClick);
      page.classList.remove("is-driving");
      cleanup?.();
    };
  }, []);

  return <div className="drive-canvas" ref={canvasHost} aria-hidden="true" />;
}
