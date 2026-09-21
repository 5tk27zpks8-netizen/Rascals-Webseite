"use client";

import { useEffect, useRef } from "react";
import { subscribeDrive, type DriveFrame } from "./lib/drive-scroll";
import {
  FIELD_YARDS_LONG,
  FIELD_YARDS_WIDE,
  createAdBoardTexture,
  createCloudTexture,
  createFlagTexture,
  createSoftDotTexture,
  createScoreboardTexture,
  createTurfNormalTexture,
  createTurfRoughnessTexture,
  createTurfTexture,
  paintMidfieldMark,
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

/** Own 20, to just over the opposing goal line. */
const START_Z = OWN_GOAL_Z - 20 * YARD;
/* The eight, not six yards deep in the end zone. The drive used to run on to
   four yards short of the end line, where the posts fill the frame and there
   is nothing of the end zone left in front of the camera to be looked at.
   Coming to rest short of the line leaves all ten yards of it laid out ahead
   under the posts, which is the picture the whole page drives towards. */
const END_Z = OPP_GOAL_Z + 8 * YARD;

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
  /* Arriving, and looking at what it arrived in. `ahead` decides this shot:
     the field ends seventeen units past the goal line, so aiming much beyond
     that lands the middle of the frame out on the grass behind the ground —
     which is how the drive came to finish on an empty green slab under the
     posts. Nineteen puts the aim on the end line, and a shallow tilt from
     seven and a half keeps the end zone laid out in perspective rather than
     passing underneath. */
  { at: 0.97, x: 0, y: 9, lx: 0, ly: 0.9, ahead: 28, fov: 56, roll: 0 },
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
/**
 * The night above the ground.
 *
 * A flat clear colour is what made the sky read as a switched-off screen: real
 * night is not one value, it lifts towards the horizon where the city and the
 * floodlights bounce off the air, and it is never perfectly clean. This is an
 * inside-out sphere with that gradient painted in the shader, plus faint
 * dithering so the long fade does not band on a dark display, and a field of
 * stars that thins out towards the horizon the way haze thins it in life.
 */
/**
 * A daytime sky: gradient dome, sun, drifting cloud, and birds in it.
 *
 * The dome is shaded rather than textured, so it stays sharp however close the
 * camera gets and costs one draw call. The gradient runs from a deep zenith
 * blue down through a pale band at the horizon, which is what the air actually
 * does — a flat blue ceiling is the clearest tell that a sky was painted
 * rather than lit.
 *
 * Clouds are billboards, not geometry. A cloud that turns with the camera
 * reads as a cloud from every angle on the drive; modelled ones would have to
 * be built, lit and sorted for no gain at this distance.
 *
 * The birds are two triangles each, flapping on their own clock and circling
 * on a slow drift. They are the only thing up there that moves against the
 * sky, and a still sky is a photograph.
 */
/**
 * The sky's material, made once and used twice.
 *
 * It is the dome you look at, and it is also the thing the scene is lit by —
 * see buildSkyEnvironment. Those two have to be the same sky or the sun in a
 * reflection points somewhere the sun is not, so there is one definition of it
 * and both take a material from here.
 */
function makeSkyMaterial(THREE: Three, forLighting = false) {
  /* THE SAME SKY, BUT NOT THE SAME NUMBERS — AND THIS IS NOT A FUDGE.
     
     The colours below are deliberately deeper than the sky should be, because
     the filmic curve at the end of the pipeline desaturates as it brightens
     and pulls them back. That compensation is correct for a dome you look
     straight at, once, through that curve.
     
     It is wrong for a dome you are gathering light from. Indirect light lands
     in the midtones, where the curve barely desaturates at all, so the
     compensation is applied a second time and never taken off: measured, the
     bowl gained +16.5 levels of blue against +2.1 of red, which is a cast, not
     daylight. A shaded face outdoors is blue; it is not that blue, because the
     sky it sees is washed with sun.
     
     So the lighting copy undoes the compensation instead of inheriting it:
     half a step back towards daylight white, and none of the lift. Same
     gradient, same sun, same place in the sky — just the sky's real colour
     rather than the one drawn to survive the curve. */
  const daylight = new THREE.Color(0xe3ebf4);
  const high = new THREE.Color(0x1d5fc0);
  const low = new THREE.Color(0x7fb3e0);
  if (forLighting) {
    high.lerp(daylight, 0.5);
    low.lerp(daylight, 0.5);
  }

  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uHigh: { value: high },
      uLow: { value: low },
      uSun: { value: new THREE.Color(0xfff3d6) },
      uIntensity: { value: forLighting ? 1 : 1.12 },
      uSunDir: { value: new THREE.Vector3(0.30, 0.86, -0.42).normalize() },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uHigh;
      uniform vec3 uLow;
      uniform vec3 uSun;
      uniform vec3 uSunDir;
      uniform float uIntensity;
      varying vec3 vPos;

      /* Cheap hash dither. A gradient this smooth bands into visible steps
         on an 8-bit display; a sub-step of noise breaks the steps up. */
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main() {
        vec3 dir = normalize(vPos);
        float h = clamp(dir.y * 1.1 + 0.04, 0.0, 1.0);
        vec3 col = mix(uLow, uHigh, pow(h, 0.78));

        /* The sun itself, and the wash of light around it. Without the wash
           the disc is a sticker on a flat blue wall. */
        float d = max(0.0, dot(dir, normalize(uSunDir)));
        col += uSun * pow(d, 900.0) * 1.4;
        col += uSun * pow(d, 7.0) * 0.30;

        /* Lifted a little above the colour it should end up being, because
           the filmic curve in the output pass pulls everything down. Only a
           little: that curve also desaturates as it brightens, so pushing
           harder buys a whiter sky rather than a bluer one — which is the
           trap, and the reason the colours here are deeper than they look. */
        col *= uIntensity;

        col += (hash(gl_FragCoord.xy) - 0.5) * 0.010;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

/**
 * THE SKY, TURNED INTO LIGHT.
 *
 * Everything in here was lit by three analytic lights and nothing else: a sun,
 * a hemisphere term and a flat ambient. That is why it read as a render rather
 * than as a photograph, and it is not something an effect pass can fix. A
 * standard material with no environment has nothing to reflect, so every
 * surface returns the same wash from every angle — which is the definition of
 * looking like plastic.
 *
 * Outdoors, almost nothing you see is lit by the sun directly. It is lit by
 * the sky, and the sky is not one colour: it is bright near the sun, deep
 * overhead, pale at the horizon, and the ground throws green back up into
 * everything above it. A hemisphere light approximates that with two colours
 * and no direction at all.
 *
 * So the sky is rendered — the same dome, from makeSkyMaterial, so the sun in
 * a reflection is where the sun is — into a prefiltered radiance map, together
 * with a disc of turf to carry the bounce off the pitch. Every standard
 * material in the bowl then samples the actual sky for its own normal and its
 * own roughness.
 *
 * It costs one render of two objects at setup and nothing per frame, and it
 * downloads nothing: no HDRI file, no second request, no licence to carry.
 */
function buildSkyEnvironment(THREE: Three, renderer: import("three").WebGLRenderer) {
  const source = new THREE.Scene();

  const dome = new THREE.Mesh(new THREE.SphereGeometry(520, 32, 20), makeSkyMaterial(THREE, true));
  source.add(dome);

  /* The pitch, as a light source. Leave it out and everything in the bowl is
     lit from below by pale blue sky through the floor, which is the single
     most synthetic thing an outdoor scene can do — undersides go cold and
     faces lose the green kick that says "standing on grass". Unlit on purpose:
     this disc is radiance to be gathered, not a surface to be shaded. */
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(500, 24),
    new THREE.MeshBasicMaterial({ color: 0x5c7a3a, side: THREE.DoubleSide, fog: false }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.5;
  source.add(ground);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(source, 0, 1, 1200);

  /* The render target's texture outlives all of this; everything that was only
     needed to draw into it does not. */
  dome.geometry.dispose();
  (dome.material as import("three").Material).dispose();
  ground.geometry.dispose();
  ground.material.dispose();
  pmrem.dispose();

  return target;
}

function buildSky(THREE: Three, clouds: import("three").Texture | null) {
  const group = new THREE.Group();

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(520, 40, 24),
    makeSkyMaterial(THREE),
  );
  group.add(dome);

  // --- cloud ----------------------------------------------------------
  const cloudGroup = new THREE.Group();
  if (clouds) {
    const cloudMaterial = new THREE.MeshBasicMaterial({
      map: clouds,
      transparent: true,
      depthWrite: false,
      fog: false,
      opacity: 0.92,
    });
    for (let i = 0; i < 16; i += 1) {
      const scale = 90 + Math.random() * 180;
      const sprite = new THREE.Mesh(new THREE.PlaneGeometry(scale, scale * 0.52), cloudMaterial);
      const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
      const radius = 260 + Math.random() * 160;
      /* The bowl only leaves sky between roughly ten and thirty degrees up
         from a camera standing on the field. Higher than that and the cloud
         deck is real, correct and permanently out of frame. */
      sprite.position.set(
        Math.cos(angle) * radius,
        70 + Math.random() * 110,
        Math.sin(angle) * radius,
      );
      /* Each cloud keeps its own orbit angle so the drift below can advance
         them all without any of them sharing a position. */
      sprite.userData.angle = angle;
      sprite.userData.radius = radius;
      cloudGroup.add(sprite);
    }
  }
  group.add(cloudGroup);

  // --- birds ------------------------------------------------------------
  /* One buffer for the whole flock. Each bird is two triangles sharing a
     centre vertex, and the wings are hinged in the vertex shader off a phase
     stored per vertex, so a flock of forty costs one draw call and no
     per-frame geometry work. */
  const FLOCK = 42;
  const birdPositions = new Float32Array(FLOCK * 6 * 3);
  const birdWing = new Float32Array(FLOCK * 6);
  const birdPhase = new Float32Array(FLOCK * 6);
  const birdOrigin = new Float32Array(FLOCK * 6 * 3);

  for (let i = 0; i < FLOCK; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 90 + Math.random() * 230;
    const ox = Math.cos(angle) * radius;
    const oy = 46 + Math.random() * 80;
    const oz = Math.sin(angle) * radius;
    const span = 1.5 + Math.random() * 1.6;
    const phase = Math.random() * Math.PI * 2;

    /* left wing: centre, tip, trailing — then the mirror for the right. */
    const local = [
      [0, 0, 0], [-span, 0, -span * 0.42], [0, 0, -span * 0.5],
      [0, 0, 0], [span, 0, -span * 0.42], [0, 0, -span * 0.5],
    ];
    const wingFlags = [0, 1, 0, 0, -1, 0];

    for (let v = 0; v < 6; v += 1) {
      const index = i * 6 + v;
      birdPositions[index * 3] = local[v][0];
      birdPositions[index * 3 + 1] = local[v][1];
      birdPositions[index * 3 + 2] = local[v][2];
      birdOrigin[index * 3] = ox;
      birdOrigin[index * 3 + 1] = oy;
      birdOrigin[index * 3 + 2] = oz;
      birdWing[index] = wingFlags[v];
      birdPhase[index] = phase;
    }
  }

  const birdGeometry = new THREE.BufferGeometry();
  birdGeometry.setAttribute("position", new THREE.BufferAttribute(birdPositions, 3));
  birdGeometry.setAttribute("aOrigin", new THREE.BufferAttribute(birdOrigin, 3));
  birdGeometry.setAttribute("aWing", new THREE.BufferAttribute(birdWing, 1));
  birdGeometry.setAttribute("aPhase", new THREE.BufferAttribute(birdPhase, 1));

  const birds = new THREE.Mesh(
    birdGeometry,
    new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      fog: false,
      depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute vec3 aOrigin;
        attribute float aWing;
        attribute float aPhase;
        uniform float uTime;
        varying float vFade;

        void main() {
          /* The whole flock turns slowly about the ground, each bird on its
             own radius, so they never form a rigid pattern. */
          float turn = uTime * 0.021 + aPhase * 0.12;
          float c = cos(turn);
          float s = sin(turn);
          vec3 origin = vec3(
            aOrigin.x * c - aOrigin.z * s,
            aOrigin.y + sin(uTime * 0.5 + aPhase) * 3.4,
            aOrigin.x * s + aOrigin.z * c
          );

          vec3 local = position;
          // Wings hinge about the body rather than sliding up and down.
          local.y += abs(aWing) * sin(uTime * 5.2 + aPhase) * 1.15;

          vec4 mv = modelViewMatrix * vec4(origin + local, 1.0);
          // Faded with distance so the far side of the flock sinks into haze.
          vFade = 1.0 - smoothstep(180.0, 460.0, -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vFade;
        void main() {
          if (vFade < 0.02) discard;
          gl_FragColor = vec4(vec3(0.13, 0.16, 0.22), vFade * 0.82);
        }
      `,
    }),
  );
  group.add(birds);

  group.renderOrder = -1;
  return { group, birds, clouds: cloudGroup };
}

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

  goal.traverse((node) => {
    if ((node as import("three").Mesh).isMesh) node.castShadow = true;
  });
  goal.position.z = endLineZ;
  return goal;
}

/** The four crowd strips a terrace stacks up its rake. */

/** Rows of seats, the depth of one step, and the height of one. */
const TERRACE_RISER = 1.08;
const TERRACE_TREAD = 1.62;
/** One crowd strip spans this much of the stand, so the gangways land here. */
const TERRACE_TILE = 19;

/**
 * A raked terrace: real steps, a crowd standing in them, a roof over the top.
 *
 * The stands used to be three planes — a dark wall, one crowd texture stretched
 * end to end, and a flat roof. From the pitch that is a printed backdrop, and it
 * was the most obviously unbuilt thing left in the ground. So the rake is now a
 * stepped profile extruded down the length of the stand: the floodlights find
 * real edges on it, the front lip throws a real line of shadow, and the steps
 * stay visible in the gaps the crowd leaves.
 *
 * The crowd is one alpha strip per row, standing on its own step. Rows at the
 * front cross in front of rows behind as the camera travels, which is the whole
 * reason to build it this way rather than tilt a single plane.
 *
 * Nothing here adds a light. Ten floodlights are already in the scene and they
 * are aimed at the grass, so the light inside the stand is baked: the concrete
 * carries a vertex ramp that brightens towards the roof and the crowd rows lift
 * with it, matching the strip lights along the roof's leading edge.
 *
 * Built in its own space — +X is depth away from the pitch, +Z runs along the
 * stand, the front edge sits at x = 0 — so the same terrace serves a touchline
 * and an end by being turned.
 */
/**
 * THE CROWD, AS PEOPLE RATHER THAN AS WALLPAPER.
 *
 * Every stand was filled by painting rows of spectators onto flat planes: one
 * plane per row, a canvas strip repeated along it, cut out with an alphaTest.
 * That is the single most childish thing in the bowl and no amount of light
 * was going to rescue it, because a painted plane has no silhouette to catch
 * the light with. Worse, since the sky became the scene's light source the
 * crowd was the one thing in here that could not receive it at all — it was
 * drawn unlit, by definition.
 *
 * So the stands are filled with geometry now: a torso and a head each, two
 * instanced draws for the whole ground. What that buys is not detail — nobody
 * can see detail on a spectator two hundred units away — it is the three
 * things a painted strip cannot do at any resolution:
 *
 *   they occlude each other, so the rows read as depth instead of as layers;
 *   they are lit, so the stand darkens properly under its own roof;
 *   and they differ, so the block reads as a crowd instead of as a pattern.
 *
 * Variation is the whole job, and it is cheap: a shirt colour per person, a
 * height, a shoulder angle, and — the one that does the most work — empty
 * seats. A stand that is a hundred per cent full is the tell that gives away
 * every fake crowd; leaving a seat in eight empty, and cutting the gangways
 * out properly, is what makes it read as a ground with people in it.
 */

/* A home crowd: mostly coats, denim and grey, with a real share of the club's
   own colours through it. The list is the weighting — four of these twenty are
   navy or red, so the club comes up a fifth of the time. A third, which is
   where this started, turns the stand into a flag. */
const CROWD_SHIRTS = [
  0x2b3244, 0x39404f, 0x1e2330, 0x4a5160, 0x6e7686, 0x8b93a1,
  0x9fa8b5, 0xc9ced6, 0xe6e9ee, 0x3c4a63, 0x55637d, 0x7a6a58,
  0x4f5a48, 0x6b5f52, 0x2f3a33, 0x8a8f99,
  0x21254b, 0x21254b, 0x9e210f, 0xb8351f,
];

const CROWD_SKIN = [0xc79a74, 0xa9764f, 0x7d5334, 0xe0b48f, 0x5c3b25, 0x8e6a4a];

/** One person's worth of seat, in scene units. A unit is about 0.54m here. */
const SEAT_PITCH = 0.95;

/**
 * Fill a terrace with people.
 *
 * Seeded rather than random: the same stand comes out the same way on every
 * load, so a screenshot taken to compare two builds is comparing the builds
 * and not two different crowds.
 */
function buildCrowd(
  THREE: Three,
  options: { rows: number; length: number; base: number; seed: number },
) {
  const { rows, length, base, seed } = options;
  const group = new THREE.Group();

  /* A small deterministic generator. Nothing clever — it only has to be
     repeatable and not obviously periodic across a few thousand draws. */
  let state = seed >>> 0;
  const rand = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };

  const half = length / 2;
  const usable = length - 3.2;
  const perRow = Math.max(1, Math.floor(usable / SEAT_PITCH));
  const capacity = perRow * rows;

  /* Torso and head are two instanced meshes over one set of transforms rather
     than one merged mesh, which keeps this free of a geometry-merging helper
     for the sake of a single extra draw call. */
  const torso = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.55, 1.1, 0.83),
    new THREE.MeshStandardMaterial({ roughness: 0.86, metalness: 0 }),
    capacity,
  );
  const head = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.19, 0),
    new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0 }),
    capacity,
  );

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const euler = new THREE.Euler();
  const colour = new THREE.Color();

  /* The gangways, cut where the hoardings already tile, so the aisles line up
     with the architecture instead of landing wherever they fall. */
  const aisles = Math.max(1, Math.round(length / TERRACE_TILE));
  const aislePitch = length / aisles;

  let n = 0;
  for (let row = 0; row < rows; row += 1) {
    /* Each row offset by a third of a seat from the one in front, so a
       spectator looks between the two heads ahead rather than at the back of
       one — which is both how seating is actually laid out and what stops the
       stand reading as a grid. */
    const stagger = (row % 3) * (SEAT_PITCH / 3);
    for (let seat = 0; seat < perRow; seat += 1) {
      const z = -half + 1.6 + stagger + seat * SEAT_PITCH;

      // In a gangway? Then nobody is standing there.
      const toAisle = Math.abs(((z + half) % aislePitch) - aislePitch / 2);
      if (toAisle > aislePitch / 2 - 0.85) continue;

      /* An empty seat in eight, and emptier towards the back corners, which is
         where a ground actually thins out. */
      const backness = row / Math.max(1, rows - 1);
      if (rand() < 0.11 + backness * 0.1) continue;

      const height = 0.9 + rand() * 0.22;
      position.set(
        row * TERRACE_TREAD + TERRACE_TREAD * 0.46,
        base + row * TERRACE_RISER + 0.62 * height,
        z,
      );
      euler.set(0, (rand() - 0.5) * 0.5, (rand() - 0.5) * 0.08);
      quaternion.setFromEuler(euler);
      scale.set(1, height, 0.92 + rand() * 0.16);
      matrix.compose(position, quaternion, scale);
      torso.setMatrixAt(n, matrix);

      position.y = base + row * TERRACE_RISER + 1.29 * height;
      scale.set(1, 1, 1);
      matrix.compose(position, quaternion, scale);
      head.setMatrixAt(n, matrix);

      torso.setColorAt(n, colour.setHex(CROWD_SHIRTS[(rand() * CROWD_SHIRTS.length) | 0]));
      head.setColorAt(n, colour.setHex(CROWD_SKIN[(rand() * CROWD_SKIN.length) | 0]));
      n += 1;
    }
  }

  for (const mesh of [torso, head]) {
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    /* Lit, and taking the roof's shadow — that is the point of the exercise.
       Not casting, though: a spectator contributes nothing to a shadow map
       spread across the whole ground, and eleven thousand of them contribute
       it eleven thousand times. */
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    /* An InstancedMesh derives its bounds from the geometry, not from where
       the instances actually are, so without this the whole stand is culled
       the moment the origin leaves the frustum. */
    mesh.computeBoundingSphere();
    group.add(mesh);
  }

  return group;
}

function buildTerrace(
  THREE: Three,
  options: {
    length: number;
    rows: number;
    base: number;
    roof: boolean;
    boards: import("three").Texture | null;
    /* Picks this stand's crowd. Different per stand so the two touchlines are
       not the same people twice, fixed per stand so a build can be compared
       against another build rather than against a reshuffle. */
    seed: number;
  },
) {
  const { length, rows, base, roof, boards, seed } = options;
  const group = new THREE.Group();
  const depth = rows * TERRACE_TREAD;
  const top = base + rows * TERRACE_RISER;
  const half = length / 2;

  // --- the concrete ---------------------------------------------------
  const profile = new THREE.Shape();
  profile.moveTo(0, base - 4.2); // the wall below the front row
  profile.lineTo(0, base);
  for (let i = 0; i < rows; i += 1) {
    profile.lineTo((i + 1) * TERRACE_TREAD, base + i * TERRACE_RISER); // tread
    profile.lineTo((i + 1) * TERRACE_TREAD, base + (i + 1) * TERRACE_RISER); // riser
  }
  profile.lineTo(depth + 2.6, top); // the back wall's inner face
  profile.lineTo(depth + 2.6, base - 4.2);
  profile.closePath();

  const shell = new THREE.ExtrudeGeometry(profile, { depth: length, bevelEnabled: false });
  shell.translate(0, 0, -half);

  /* The baked light. Nothing reaches inside a stand from the pitch, so the
     ramp does the work the missing lights would: dark at the foot where the
     front rows shut the light out, opening up towards the strip lights on the
     roof's leading edge. Vertex colours rather than a map, because an extruded
     profile has no UV layout worth mapping to. */
  const position = shell.getAttribute("position");
  const tint = new Float32Array(position.count * 3);
  /* Concrete in daylight, with the roof shading the back rows. Ran the other
     way and far darker when the only light in here came off the roof lip. */
  const low = new THREE.Color(0xb9c3d1);
  const high = new THREE.Color(0x6a7488);
  const mix = new THREE.Color();
  for (let i = 0; i < position.count; i += 1) {
    const t = Math.min(1, Math.max(0, (position.getY(i) - (base - 4.2)) / (top - base + 4.2)));
    mix.copy(low).lerp(high, Math.pow(t, 0.72));
    tint[i * 3] = mix.r;
    tint[i * 3 + 1] = mix.g;
    tint[i * 3 + 2] = mix.b;
  }
  shell.setAttribute("color", new THREE.BufferAttribute(tint, 3));
  shell.computeVertexNormals();

  const concrete = new THREE.Mesh(
    shell,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.94,
      metalness: 0,
    }),
  );
  concrete.receiveShadow = true;
  concrete.castShadow = true;
  group.add(concrete);

  // --- the crowd ------------------------------------------------------
  group.add(buildCrowd(THREE, { rows, length, base, seed }));

  // --- the front wall and the hoardings --------------------------------
  const frontWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 4.2, length),
    new THREE.MeshStandardMaterial({ color: 0x141b27, roughness: 0.9 }),
  );
  frontWall.position.set(-0.35, base - 2.1, 0);
  frontWall.receiveShadow = true;
  group.add(frontWall);

  /* The band of hoardings that runs round every ground at this level. Left
     unlit — a printed board in open daylight is close enough to evenly lit
     that shading it buys nothing — but tone-mapped, so it sits in the same
     exposure as everything around it rather than glowing out of it. */
  if (boards) {
    const band = boards.clone();
    band.needsUpdate = true;
    band.wrapS = THREE.RepeatWrapping;
    band.wrapT = THREE.ClampToEdgeWrapping;
    /* One tile carries four boards, and a board at this level is about
       five metres wide. Repeating any harder squeezes the names into a smear,
       which is what a board covered in unreadable text looks like from the
       halfway line. */
    band.repeat.set(Math.max(1, Math.round(length / 68)), 1);
    const hoarding = new THREE.Mesh(
      new THREE.PlaneGeometry(length, 2.9),
      new THREE.MeshBasicMaterial({ map: band }),
    );
    hoarding.rotation.y = -Math.PI / 2;
    hoarding.position.set(-0.78, base - 2.5, 0);
    group.add(hoarding);
  }

  // --- the roof --------------------------------------------------------
  if (roof) {
    const steel = new THREE.MeshStandardMaterial({ color: 0x59657a, roughness: 0.52, metalness: 0.5 });
    const roofY = top + 5.6;
    const overhang = 3.4;

    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(depth + 6 + overhang, 0.6, length),
      new THREE.MeshStandardMaterial({ color: 0x38414f, roughness: 0.88 }),
    );
    deck.position.set((depth + 6) / 2 - overhang / 2, roofY, 0);
    group.add(deck);

    /* The leading edge. A roof that ends on a cut line is a plane; a roof with
       a fascia beam under a strip of light is a stand, and the strip is what
       the crowd ramp below is lit by. */
    const fascia = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.9, length), steel);
    fascia.position.set(-overhang, roofY - 1.0, 0);
    group.add(fascia);

    /* Fittings along the fascia, dark because it is the middle of the day and
       nobody has switched them on. They are still worth having: the run of
       them gives the roof its length as the camera travels past. */
    const lamps = Math.max(4, Math.round(length / 12));
    // Instanced: sixty identical fittings round the ground is sixty draw calls
    // for four batches' worth of work.
    const fittings = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.9, 0.3, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x2c3340, roughness: 0.4, metalness: 0.3 }),
      lamps,
    );
    const place = new THREE.Object3D();
    for (let i = 0; i < lamps; i += 1) {
      place.position.set(-overhang + 0.35, roofY - 1.95, -half + (length * (i + 0.5)) / lamps);
      place.updateMatrix();
      fittings.setMatrixAt(i, place.matrix);
    }
    fittings.instanceMatrix.needsUpdate = true;
    group.add(fittings);

    /* Trusses and back columns. These are what give the stand parallax: the
       camera travels the length of the ground, and a roof with nothing holding
       it up never moves against what is behind it. */
    const bays = Math.max(3, Math.round(length / 21));
    const trussGeometry = new THREE.BoxGeometry(depth + 6, 0.42, 0.42);
    const columnGeometry = new THREE.CylinderGeometry(0.42, 0.52, roofY - (base - 4.2), 8);
    for (let i = 0; i <= bays; i += 1) {
      const z = -half + (i * length) / bays;

      const truss = new THREE.Mesh(trussGeometry, steel);
      truss.position.set((depth + 6) / 2 - overhang, roofY - 0.62, z);
      group.add(truss);

      const brace = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.3, 0.3), steel);
      brace.position.set(-overhang + 3.2, roofY - 2.3, z);
      brace.rotation.z = -0.52;
      group.add(brace);

      const column = new THREE.Mesh(columnGeometry, steel);
      column.position.set(depth + 4.4, (roofY + base - 4.2) / 2, z);
      group.add(column);
    }
  }

  return group;
}

/** A raked stand down one touchline. */
function buildStand(
  THREE: Three,
  boards: import("three").Texture | null,
  side: 1 | -1,
) {
  const group = buildTerrace(THREE, {
    length: FIELD_LONG + 40,
    rows: 15,
    base: 4.4,
    roof: true,
    boards,
    seed: side > 0 ? 0x5eed01 : 0x5eed02,
  });
  group.position.set(side * (FIELD_WIDE / 2 + 8), 0, (OWN_END_Z + OPP_END_Z) / 2);
  group.rotation.y = side > 0 ? 0 : Math.PI;
  return group;
}

/**
 * A stand behind an end zone.
 *
 * Without these the ground simply stopped: past the end line there was open
 * black, which is what made the far background read as nothing at all. A
 * stadium is a closed bowl, so both ends get a bank of seats and a roof.
 */
function buildEndStand(
  THREE: Three,
  boards: import("three").Texture | null,
  z: number,
  outward: 1 | -1,
) {
  const group = buildTerrace(THREE, {
    length: FIELD_WIDE + 46,
    rows: 12,
    base: 4.4,
    roof: true,
    boards,
    seed: outward > 0 ? 0x5eed03 : 0x5eed04,
  });
  group.position.set(0, 0, z);
  // Turned a quarter so the rake climbs away from the end line.
  group.rotation.y = outward > 0 ? -Math.PI / 2 : Math.PI / 2;
  return group;
}

/**
 * Club flags along the front edge of both roofs.
 *
 * These used to stand on the touchline at head height, which was fine when the
 * stand behind them was a flat plane and wrong the moment it became a terrace:
 * a flag at nine units is level with the fourth row, so thirteen of them read
 * as posters pasted across the crowd. On the roof lip they are where a ground
 * actually flies them, they break the roofline instead of the stand, and they
 * are the one thing in the scene that moves against the sky.
 */
function buildFlags(THREE: Three, flag: import("three").Texture) {
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(4.4, 2.8);
  const material = new THREE.MeshStandardMaterial({ map: flag, side: THREE.DoubleSide, roughness: 0.85 });
  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x9aa7b8, roughness: 0.5, metalness: 0.5 });
  const poleGeometry = new THREE.CylinderGeometry(0.11, 0.11, 8.4, 8);

  // The lip of the touchline roofs, worked out the same way the terrace does.
  const roofY = 4.4 + 15 * TERRACE_RISER + 5.6;
  const lipX = FIELD_WIDE / 2 + 8 - 3.4;

  for (let i = 0; i < 9; i += 1) {
    const z = 4 - i * 23;
    for (const side of [-1, 1] as const) {
      const x = side * lipX;
      const pole = new THREE.Mesh(poleGeometry, poleMaterial);
      pole.position.set(x, roofY + 4.2, z);
      group.add(pole);

      const cloth = new THREE.Mesh(geometry, material);
      cloth.position.set(x + side * 2.3, roofY + 6.6, z);
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

  /* Glass, not light. The lamp faces were self-lit white, which is right for
     a night match and reads as ten rows of switched-on bulbs at midday. */
  const lampMaterial = new THREE.MeshStandardMaterial({
    color: 0x8fa2b8,
    roughness: 0.25,
    metalness: 0.15,
  });
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

/**
 * A football, and the man waiting for it.
 *
 * The ball flies with the drive rather than along a fixed line of its own: it
 * stays ahead and to the right of the camera and closes that gap as the drive
 * runs out, so at any point on the page it reads as a pass already in the air
 * and at the end it arrives in the end zone. Its arc is a real parabola over
 * the length of the throw, and it spins about its long axis with the axis laid
 * along the direction of travel — a football that flies without spinning, or
 * spins about the wrong axis, is the first thing anyone who plays notices.
 *
 * The receiver is built from primitives on purpose. At the distance the drive
 * ever sees him he is a silhouette: helmet, shoulders, jersey, arms up. Detail
 * beyond that would cost geometry nobody can resolve, and a figure that tries
 * for realism and misses is worse than one that reads as a marker.
 */
/** The board behind the far end zone, carrying the real next fixture. */
function buildScoreboard(THREE: Three, texture: import("three").Texture, z: number) {
  const group = new THREE.Group();
  /* High enough to clear the end stand in front of it. At its old height the
     roof truss of that stand ran straight through the score, which is the one
     thing on the board anybody reads. */
  const BOARD_Y = 40;

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(76, 30, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x0b111b, roughness: 0.8 }),
  );
  frame.position.set(0, BOARD_Y, 0);
  group.add(frame);

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(72, 27),
    // Fog off: a bright board cuts through night haze instead of dissolving
    // into it, which is what makes it read as a light source.
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, fog: false }),
  );
  face.position.set(0, BOARD_Y, 1.3);
  group.add(face);

  const legs = new THREE.MeshStandardMaterial({ color: 0x151d2a, roughness: 0.9 });
  for (const x of [-26, 26]) {
    const stalk = BOARD_Y - 15;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.6, stalk, 16), legs);
    leg.position.set(x, stalk / 2, 0);
    group.add(leg);
  }

  group.position.z = z;
  return group;
}

/**
 * A single framing, held for the whole drive.
 *
 * The cards that fly through this ground are CSS elements pinned to the middle
 * of the screen: they do not live in the scene and cannot follow a camera that
 * moves. So every move the cinematic plan makes — swinging twenty-seven units
 * across the field, rolling the horizon, running the lens from 51mm to 64 —
 * happens to the world while the squad stays nailed where it was. The two
 * cannot agree, and the result reads as broken rather than as filmed.
 *
 * Steady mode drops all of it. The camera runs straight down the middle at one
 * height, one lens, level, and the only thing that changes is how far down the
 * field it has travelled — which is exactly what the cards are doing too.
 */
const STEADY: Shot = { at: 0, x: 0, y: 7.2, lx: 0, ly: 3.6, ahead: 46, fov: 58, roll: 0 };

export function ArenaDrive({ steady = false }: { steady?: boolean } = {}) {
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
    let unsubscribeDrive: (() => void) | undefined;
    let progress = 0;
    let eased = 0;
    let cleanup: (() => void) | undefined;


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
          /* How far through this stop we are, 0..1. A panel whose content is
             longer than the screen — the roster band — rides this instead of
             needing a scroller of its own, which the drive has taken over. */
          const span = to - from;
          panel.style.setProperty("--panel-progress", span > 0 ? ((progress - from) / span).toFixed(4) : "0");
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
      const [THREE, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { ShaderPass }] = await Promise.all([
        import("three"),
        import("three/examples/jsm/postprocessing/EffectComposer.js"),
        import("three/examples/jsm/postprocessing/RenderPass.js"),
        import("three/examples/jsm/postprocessing/UnrealBloomPass.js"),
        import("three/examples/jsm/postprocessing/OutputPass.js"),
        import("three/examples/jsm/postprocessing/ShaderPass.js"),
      ]);
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x03070d, 1);
      // Without tone mapping the floodlights clip the turf to a flat mint
      // green. ACES keeps the highlights and lets the grass stay grass.
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      /* ACES desaturates as it brightens, so this is deliberately a small
         step: the last time the exposure was pushed to carry the daylight on
         its own the sky went white. The light belongs in the lights. */
      renderer.toneMappingExposure = 1.12;

      /* Shadows are what stop everything reading as pasted onto the grass: the
         posts, the pylons and the stands all sat on the pitch without touching
         it. Only two lamps cast — a shadow map per floodlight would cost ten
         extra passes a frame for detail nobody can separate once they overlap. */
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      /* Daylight haze, not night. Pale and thin: it should soften the far
         stand rather than swallow it, and it has to sit near the colour of the
         sky behind it or the horizon reads as a band of smog. */
      scene.fog = new THREE.FogExp2(0xc6dcee, 0.0016);

      /* The sky, as the thing that lights the bowl. See buildSkyEnvironment.
         Set on the scene rather than per material so every standard surface in
         here picks it up, including the ones built before this line runs. */
      const environment = buildSkyEnvironment(THREE, renderer);
      scene.environment = environment.texture;
      /* Scaled so the picture keeps the brightness it had. The point of this
         change is not a brighter stadium — it is the same amount of light
         arriving with a direction, a sun in it and a green bounce off the
         grass, instead of arriving flat from everywhere. A brighter frame
         would flatter the change and prove nothing about it.
         
         So this is measured, not chosen. Two frames rendered at 1.0 and 0.6
         against the frame this replaces, over the pitch and the stands
         separately: the added luminance is linear in this number and crosses
         zero at 0.41 on the pitch and 0.425 on the stands. At 0.41 the light
         level is the one that was there before and only its structure has
         changed, which is the whole claim. */
      scene.environmentIntensity = 0.41;

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
      /* Bloom is a night lever. At night the lamps were the only thing over the
         threshold; in daylight the painted yard lines are near white before it
         is even applied, so a cut of 1.05 caught the whole pitch and made the
         markings glow off the grass. Raised well clear of lit paint and its
         strength halved, it now only touches the sun itself. */
      const bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.09,
        0.5,
        1.9,
      );
      composer.addPass(bloom);

      /* The last thing between a render and a photograph. A lens darkens at
         the corners, a sensor has noise, and glass splits colour a little at
         the edge of the frame. None of it is visible on its own; together it
         is the difference between looking at geometry and looking at footage.
         Applied after tone mapping so the grain sits in the picture rather
         than being crushed by the curve. */
      const filmPass = new ShaderPass({
        uniforms: {
          tDiffuse: { value: null },
          uTime: { value: 0 },
          uAmount: { value: 0.013 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform float uTime;
          uniform float uAmount;
          varying vec2 vUv;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }

          void main() {
            vec2 c = vUv - 0.5;
            float r2 = dot(c, c);

            // Chromatic aberration, edges only, well under a pixel at centre.
            float disp = r2 * 0.0022;
            vec3 col;
            col.r = texture2D(tDiffuse, vUv + c * disp).r;
            col.g = texture2D(tDiffuse, vUv).g;
            col.b = texture2D(tDiffuse, vUv - c * disp).b;

            /* Vignette, falling off smoothly rather than as a drawn ring.
               Light-handed: a heavy one belongs to a night match, where the
               corners of the ground really are dark. In daylight it just
               makes the picture look like it is being viewed through a tube. */
            float vig = smoothstep(0.92, 0.22, r2 * 1.65);
            col *= mix(0.88, 1.0, vig);

            // Grain, scaled by darkness: shadows are where a sensor is noisy.
            float luma = dot(col, vec3(0.299, 0.587, 0.114));
            float g = hash(vUv * 900.0 + fract(uTime) * 91.7) - 0.5;
            col += g * uAmount * (1.0 - luma * 0.75);

            gl_FragColor = vec4(col, 1.0);
          }
        `,
      });
      composer.addPass(filmPass);
      composer.addPass(new OutputPass());

      // --- the pitch --------------------------------------------------
      const turfCanvas = createTurfTexture();
      const turfTexture = turfCanvas ? new THREE.CanvasTexture(turfCanvas) : null;
      if (turfTexture) {
        turfTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        turfTexture.colorSpace = THREE.SRGBColorSpace;
        /* The club mark at the 50 is a real image, so it arrives after the
           painted field. Drop it in and refresh the map when it lands; until
           then the painted wordmark holds the circle. */
        if (turfCanvas) {
          void paintMidfieldMark(turfCanvas, "/rascals-logo-transparent-4k.png").then((painted) => {
            if (painted && !disposed) turfTexture.needsUpdate = true;
          });
        }
      }
      /* Grain, not paint. The colour map says where the bands are; these say
         which way the grass lies and how it scatters, which is what makes the
         bands shift as the camera travels and stops the pitch reading as a
         printed sheet. Tiled, because fibre detail has no fixed position. */
      const makeTiled = (canvas: HTMLCanvasElement | null, repeat: number) => {
        if (!canvas) return undefined;
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeat, repeat * 2.25);
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return texture;
      };
      const turfNormal = makeTiled(createTurfNormalTexture(), 16);
      const turfRough = makeTiled(createTurfRoughnessTexture(), 16);

      const field = new THREE.Mesh(
        new THREE.PlaneGeometry(FIELD_WIDE, FIELD_LONG),
        new THREE.MeshStandardMaterial({
          map: turfTexture ?? undefined,
          normalMap: turfNormal,
          normalScale: new THREE.Vector2(0.85, 0.85),
          roughnessMap: turfRough,
          color: 0xffffff,
          roughness: 1,
          metalness: 0,
        }),
      );
      field.rotation.x = -Math.PI / 2;
      field.position.z = centreZ;
      field.receiveShadow = true;
      scene.add(field);

      // Grass surround, so the pitch does not float in the void.
      const surround = new THREE.Mesh(
        new THREE.PlaneGeometry(FIELD_WIDE + 70, FIELD_LONG + 70),
        new THREE.MeshStandardMaterial({ color: 0x2f5b32, roughness: 1 }),
      );
      surround.rotation.x = -Math.PI / 2;
      surround.position.set(0, -0.06, centreZ);
      scene.add(surround);

      // --- stands and flags -------------------------------------------
      const boardCanvasAds = createAdBoardTexture();
      const adTexture = boardCanvasAds ? new THREE.CanvasTexture(boardCanvasAds) : null;
      if (adTexture) {
        adTexture.colorSpace = THREE.SRGBColorSpace;
        adTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }

      scene.add(
        buildStand(THREE, adTexture, 1),
        buildStand(THREE, adTexture, -1),
      );

      const cloudCanvas = createCloudTexture();
      const cloudTexture = cloudCanvas ? new THREE.CanvasTexture(cloudCanvas) : null;
      if (cloudTexture) {
        cloudTexture.colorSpace = THREE.SRGBColorSpace;
        cloudTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }
      const sky = buildSky(THREE, cloudTexture);
      scene.add(sky.group);

      /* The pass, and the man under it. Only on the roster drive: the panel
         page has its own things to look at and a ball crossing them would be
         one more moving object competing with the copy. */
      scene.add(buildGoal(THREE, OWN_END_Z, 1));
      scene.add(buildGoal(THREE, OPP_END_Z, -1));
      /* Fourteen units back from the end line, not twenty-six. At twenty-six
         the bowl had a band of bare grass behind each end wide enough to read
         as a gap in the ground, and the shot that ends the drive looks
         straight down it. A stand at this level sits close behind the posts. */
      scene.add(buildEndStand(THREE, adTexture, OWN_END_Z + 14, 1));
      scene.add(buildEndStand(THREE, adTexture, OPP_END_Z - 14, -1));

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
        /* A stadium board shows what happened, not what is scheduled: the last
           game that was actually played, with its real score and the side it
           was played against.

           Picked by date rather than by the order the list happens to arrive
           in. The endpoint sorts on COALESCE(kickoff,'9999-12-31'), so a
           finished game with no kickoff recorded sorts past every real one and
           would be handed back as "the last match" — a fixture nobody can date
           taking the board over from a result everyone watched. Taking the
           newest actual date skips those. */
        void fetch("/api/public/games")
          .then((response) => (response.ok ? response.json() : null))
          .then((data: { items?: Array<Record<string, unknown>> } | null) => {
            const played = (data?.items ?? [])
              .filter((item) => String(item.status ?? "") === "final" && item.kickoff)
              .sort((a, b) => String(a.kickoff).localeCompare(String(b.kickoff)));
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

      // --- daylight ------------------------------------------------------
      /* One sun and the sky it lights, instead of ten lamps. A daytime ground
         is lit by a single hard source and an enormous soft one — the sun and
         the whole dome above it — and reproducing that with the floodlight rig
         would be ten shadow-casting cones fighting each other for the same
         surfaces at ten times the cost.

         Direction matches the sun painted on the dome, or the shadows fall one
         way and the glare comes from another. */
      /* High. At the thirty degrees this started at, the touchline stand threw
         a shadow forty units out across the pitch and half the playing surface
         sat in it — true to the geometry and a dull picture. Near sixty the
         shadows are short and the ground is lit. */
      const SUN_DIR = new THREE.Vector3(0.30, 0.86, -0.42).normalize();

      const sun = new THREE.DirectionalLight(0xfff4e2, 2.6);
      sun.position.copy(SUN_DIR).multiplyScalar(260);
      sun.target.position.set(0, 0, (OWN_END_Z + OPP_END_Z) / 2);
      sun.castShadow = true;
      /* One shadow camera has to cover the whole ground, so it gets a big map.
         Tight near and far planes around the bowl keep the depth precision
         usable at that span. */
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.near = 40;
      sun.shadow.camera.far = 620;
      sun.shadow.camera.left = -170;
      sun.shadow.camera.right = 170;
      sun.shadow.camera.top = 210;
      sun.shadow.camera.bottom = -210;
      sun.shadow.bias = -0.0009;
      sun.shadow.normalBias = 0.6;
      scene.add(sun, sun.target);

      /* Sky above, grass below. This is what fills the shadowed side of
         everything in an outdoor scene, and it is why a shaded face outdoors
         is blue rather than black. */
      /* Sky fill, and it carries the daylight rather than the sun does.

         Everything the drive looks at but the pitch is in its own shade: the
         crowd sits under a roof, the stands face inwards, the far side is
         backlit. With the fill this low all of that fell to the ambient term
         and the ground read as an overcast evening whatever the sun was doing
         to the grass. Raising the sky term is what actually lights a stadium
         in the middle of the afternoon. */
      /* Both of these used to carry the daylight on their own, at 2.35 and
         0.46, because there was nothing else to carry it. The environment does
         that job now and does it properly, so what is left here is a floor
         rather than the light itself: deep inside a stand, under the roof and
         behind fifteen rows of concrete, a prefiltered map at this resolution
         has very little to hand back, and without a small constant term those
         pockets crush to black. */
      scene.add(new THREE.HemisphereLight(0xa8cdf0, 0x3c5c31, 0.42));
      scene.add(new THREE.AmbientLight(0xe6effa, 0.1));

      // The pylons still stand in daylight; they just are not doing anything.
      for (let i = 0; i < 5; i += 1) {
        const z = 12 - i * (FIELD_LONG / 4.4);
        for (const side of [-1, 1] as const) {
          scene.add(buildPylon(THREE, side * (FIELD_WIDE / 2 + 30), z));
        }
      }


      // --- night air ----------------------------------------------------
      const dustCount = 1400;
      const dustPositions = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount; i += 1) {
        const y = Math.random() * 30;
        /* Point size attenuates with distance, so a mote that happens to sit
           a unit from the lens fills a tenth of the screen. The camera runs
           down the middle of the field at about head height for the whole
           drive, so the air keeps out of that corridor: below thirteen units
           the motes start clear of the centre and drift outward from there. */
        const clear = y < 13 ? 12 : 0;
        const side = Math.random() > 0.5 ? 1 : -1;
        dustPositions[i * 3] = side * (clear + Math.random() * (FIELD_WIDE / 2 + 30 - clear));
        dustPositions[i * 3 + 1] = y;
        dustPositions[i * 3 + 2] = OWN_END_Z - Math.random() * (FIELD_LONG + 40);
      }
      const dustGeometry = new THREE.BufferGeometry();
      dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
      /* Round and additive. Left unmapped these are hard white squares, and
         the ones that drift close to the camera read as litter on the lens
         rather than as air. */
      const dotCanvas = createSoftDotTexture();
      const dotTexture = dotCanvas ? new THREE.CanvasTexture(dotCanvas) : null;
      const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({
        color: 0xdbe9ff,
        size: 0.28,
        map: dotTexture ?? undefined,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
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
      };

      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("resize", onResize);

      /* The scene draws inside the drive's frame rather than in a loop of its
         own, and that is the point of the rewrite.

         It used to keep a private requestAnimationFrame loop and a private
         integrator chasing its own reading of the scroll, while the squad
         pinned in front of it kept a second pair. Two smoothed numbers for one
         motion drift, and ground sliding under a settled foreground is what
         read as being thrown backwards.

         Now drive-scroll smooths once and hands the result to everything on
         the same frame. The camera is a strictly increasing function of that
         one number, so travelling backwards is not something that needs
         guarding against — there is no expression here that can produce it. */
      const tick = (drive: DriveFrame) => {
        const time = drive.time;
        const dt = drive.dt;
        eased = progress = drive.progress;
        (sky.birds.material as import("three").ShaderMaterial).uniforms.uTime.value = time;
        /* The cloud deck turns far more slowly than anything else in frame.
           Any faster and a sky that should feel settled starts to scud. */
        sky.clouds.rotation.y = time * 0.0035;
        filmPass.uniforms.uTime.value = time;

        // A camera that is perfectly still between scrolls reads as a
        // screenshot. A slow breath keeps the ground alive without ever
        // competing with the scroll.
        /* A camera that is perfectly still between scrolls reads as a
           screenshot, so it breathes — but only where there is nothing pinned
           to the screen for it to disagree with. In steady mode even that goes,
           along with the pointer parallax: a card that does not move while the
           ground slides under the mouse is the same disagreement in miniature. */
        const breath = steady ? 0 : Math.sin(time * 0.31) * 0.4;
        const sway = steady ? 0 : Math.sin(time * 0.19 + 1.3) * 0.7;
        const lead = steady ? 0 : pointer.x;
        const tilt = steady ? 0 : pointer.y;
        const shot = steady ? STEADY : sampleShot(eased);

        /* There is no weave here any more, and its absence is deliberate.

           The camera used to wind down the field on a sine of the scroll while
           the squad stayed pinned to the screen. The ground swung, the cards
           did not, and a foreground that refuses to follow its background is
           read as a shove — at exactly the two or three places down the page
           where that sine was steepest.

           The winding is still there. It moved into the formation itself, in
           PlayerDeck: the cards are laid out along a curve instead of the
           camera being flown along one. You thread the same snaking column,
           and because the curve is baked into where the cards stand rather
           than into how the camera moves, nothing in the picture can disagree
           with anything else. In steady mode the camera now travels in a
           straight line and changes nothing but its distance down the field. */

        if (Math.abs(camera.fov - shot.fov) > 0.01) {
          camera.fov = shot.fov;
          camera.updateProjectionMatrix();
        }

        camera.position.set(
          shot.x + lead * 3.4 + sway,
          shot.y - tilt * 1.2 + breath,
          START_Z + (END_Z - START_Z) * eased,
        );
        camera.lookAt(
          shot.lx + lead * 1.8 + sway * 0.35,
          shot.ly,
          camera.position.z - shot.ahead,
        );
        camera.rotation.z = steady ? 0 : shot.roll + Math.sin(time * 0.23) * 0.004;

        // The dome rides with the camera: a sky you can drive out from under
        // is a ceiling, and at this travel distance it would show.
        sky.group.position.set(camera.position.x, 0, camera.position.z);

        dust.rotation.y = time * 0.008;
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

      unsubscribeDrive = subscribeDrive(tick);

      cleanup = () => {
        unsubscribeDrive?.();
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("resize", onResize);
        scene.traverse((object) => {
          const mesh = object as import("three").Mesh;
          mesh.geometry?.dispose?.();
          const material = mesh.material as import("three").Material | import("three").Material[] | undefined;
          if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
          else material?.dispose?.();
        });
        turfTexture?.dispose();
        adTexture?.dispose();
        dotTexture?.dispose();
        cloudTexture?.dispose();
        flagTexture?.dispose();
        boardTexture?.dispose();
        composer.dispose();
        composerTarget.dispose();
        /* The prefiltered sky is a render target and holds GPU memory of its
           own; the scene dropping its reference is not enough to free it. */
        scene.environment = null;
        environment.dispose();
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
  }, [steady]);

  return <div className="drive-canvas" ref={canvasHost} aria-hidden="true" />;
}
