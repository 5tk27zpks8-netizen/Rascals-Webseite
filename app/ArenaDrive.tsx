"use client";

import { useEffect, useRef } from "react";
import { subscribeDrive, type DriveFrame } from "./lib/drive-scroll";
import {
  FIELD_YARDS_LONG,
  FIELD_YARDS_WIDE,
  createAdBoardTexture,
  createCloudTexture,
  createClothTexture,
  createFlagTexture,
  createTouchdownTexture,
  createSoftDotTexture,
  createCrowdFaceTexture,
  createTeamZoneTexture,
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

/** The club's two marks, measured off the files themselves.
    Every panel that carries one derives its height from these, so a panel can
    never again be cut to a shape the artwork does not fit. */
const CREST_ASPECT = 1555 / 1011;
const WORDMARK_ASPECT = 1649 / 311;

/** A roof banner's cloth. Written once, because the texture that gets printed
    and the sheet it gets printed on have to agree — and a stretched mark is
    exactly the bug this file has already had once. */
const BANNER_W = 6.2;
const BANNER_H = 9.0;

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

  /* THE JOINTS, WHICH IS WHERE THIS WAS COMING APART.

     Every tube here met the next one by butting a flat end cap against the
     side of a round pipe, and each of those meetings left a visible defect.
     The crossbar ended exactly on the uprights' centre lines, so the outer
     half of each upright hung off the end of it with nothing behind — the step
     you could see against the sky. The arm ended on the pole's axis the same
     way, and the pole's flat top cap sat half a tube proud of the arm resting
     on it.

     A real goal post is welded, and a weld is a fillet: material bridging the
     angle between two pipes. So every junction gets a ball slightly fatter
     than the tubes it joins, and every tube is run a little past its partner's
     centre line rather than stopping on it. Nothing is butted any more; the
     balls swallow the intersections, and there is no angle from which an end
     cap can be seen. */
  const TUBE = 0.26;
  const WELD = 0.34;
  /* Radial segments. These are the thinnest things in the scene held against
     the brightest part of it, which is the worst case for a faceted silhouette
     — a hexagonal edge on a post reads immediately where the same count on a
     floodlight pylon never would. */
  const SIDES = 32;

  const weld = (x: number, y: number, z: number) => {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(WELD, 16, 12), material);
    ball.position.set(x, y, z);
    return ball;
  };

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 10, SIDES), material);
  base.position.set(0, 5, outward * setBack);

  /* The arm runs from inside the pole out past the crossbar's axis, rather
     than stopping on it. */
  const armLength = setBack + TUBE * 2;
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, armLength, SIDES), material);
  arm.rotation.x = Math.PI / 2;
  arm.position.set(0, 10, outward * (setBack / 2));

  /* Wider than the rule book, on purpose and by request.

     Eighteen feet six is the regulation width and 3.1 yards a side is exactly
     that. This is 3.45, which puts the uprights about twenty and a half feet
     apart — a couple of feet over. The posts frame the shot at the end of the
     drive and at true width they read narrow from the middle of the field,
     which is a thing that happens to correct measurements seen through a wide
     lens rather than a mistake in them. */
  const halfSpan = 3.45 * YARD;
  /* Long enough to pass through both uprights instead of ending on them. */
  const crossbar = new THREE.Mesh(
    new THREE.CylinderGeometry(TUBE, TUBE, halfSpan * 2 + TUBE * 2, SIDES),
    material,
  );
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.set(0, 10, 0);

  goal.add(base, arm, crossbar);
  // The elbow where the arm leaves the pole, and where it meets the crossbar.
  goal.add(weld(0, 10, outward * setBack), weld(0, 10, 0));

  for (const x of [-halfSpan, halfSpan]) {
    /* Rooted below the crossbar's axis rather than starting on it, so the
       upright's own end cap is buried inside the bar and the weld. */
    const upright = new THREE.Mesh(new THREE.CylinderGeometry(TUBE, TUBE, 17, SIDES), material);
    upright.position.set(x, 10 - TUBE + 17 / 2, 0);
    goal.add(upright, weld(x, 10, 0));
    /* A cap on top. A pipe cut square against the sky is the other place this
       gave itself away — the ring of the end face catches the light along one
       edge and reads as a break in the post. */
    const cap = new THREE.Mesh(new THREE.SphereGeometry(TUBE, 16, 8), material);
    cap.position.set(x, 10 - TUBE + 17, 0);
    goal.add(cap);
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

/** The face sheets, drawn once and shared by every stand in the ground. */
type CrowdFaces = import("three").Texture[];

/** One person's worth of seat, in scene units. A unit is about 0.54m here. */
const SEAT_PITCH = 0.95;

/** How far the touchline stands stand back, leaving the team areas their room. */
const SIDELINE_DEPTH = 13;

/**
 * A head, with its sides pointed at the right corner of the face sheet.
 *
 * BoxGeometry gives every side the whole texture, which would put a face on
 * the back of every skull in the ground. The UVs are rewritten so each side
 * reads its own quadrant of the atlas that createCrowdFaceTexture draws.
 *
 * Side order in BoxGeometry is +x, -x, +y, -y, +z, -z, four UV pairs each. In
 * a terrace's local space the rake climbs along +x away from the pitch, so the
 * field — and the thing every spectator in the ground is looking at — is at
 * -x. That side gets the face.
 */
function makeCrowdHeadGeometry(THREE: Three) {
  const geometry = new THREE.BoxGeometry(0.34, 0.38, 0.32);
  const uv = geometry.getAttribute("uv");
  // Which quadrant each side takes: [column, row] into the 2×2 sheet.
  const quadrants: Array<[number, number]> = [
    [0, 1], // +x  away from the pitch — a side
    [0, 0], // -x  towards the pitch — the face
    [1, 1], // +y  the top of the head
    [1, 1], // -y  under the chin; nobody sees it, and the top is closest
    [0, 1], // +z  a side
    [0, 1], // -z  a side
  ];
  for (let side = 0; side < 6; side += 1) {
    const [col, row] = quadrants[side];
    for (let corner = 0; corner < 4; corner += 1) {
      const i = side * 4 + corner;
      /* The existing UV is 0..1 across the side; squeeze it into the
         quadrant's half of the sheet, inset slightly so bilinear filtering
         cannot reach across into the neighbouring quadrant. */
      const u = uv.getX(i) * 0.48 + 0.01 + col * 0.5;
      const v = uv.getY(i) * 0.48 + 0.01 + (1 - row) * 0.5;
      uv.setXY(i, u, v);
    }
  }
  uv.needsUpdate = true;
  return geometry;
}

/**
 * Fill a terrace with people.
 *
 * Seeded rather than random: the same stand comes out the same way on every
 * load, so a screenshot taken to compare two builds is comparing the builds
 * and not two different crowds.
 */
function buildCrowd(
  THREE: Three,
  options: { rows: number; length: number; base: number; seed: number; faces: CrowdFaces },
) {
  const { rows, length, base, seed, faces } = options;
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

  /* The gangways, cut where the hoardings already tile, so the aisles line up
     with the architecture instead of landing wherever they fall. */
  const aisles = Math.max(1, Math.round(length / TERRACE_TILE));
  const aislePitch = length / aisles;

  /* WHO SITS WHERE IS WORKED OUT BEFORE ANYTHING IS ALLOCATED.

     Heads carry a face now, and a face is a texture, and an InstancedMesh has
     exactly one material — so a crowd with three faces in it is three meshes,
     and each needs to know its own count before it can be built. Deciding the
     whole stand into a list first costs one array and removes the alternative,
     which is allocating every head mesh at the full capacity of the stand and
     leaving two thirds of three matrix buffers empty. */
  type Seat = { x: number; y: number; z: number; turn: number; lean: number;
                height: number; girth: number; shirt: number; face: number };
  const seats: Seat[] = [];
  const empties: Array<{ x: number; y: number; z: number; row: number }> = [];

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
         where a ground actually thins out.

         An empty seat is not an empty space. Left as a gap it shows bare
         concrete, and a stand pocked with holes reads worse than a full one —
         which is why the emptiness has to come with the seat that nobody is
         in. Only the empty ones get one: a seat behind an occupied one is
         entirely hidden by its occupant, so drawing twenty-two thousand of
         them to see five thousand would be paying four times over. */
      const backness = row / Math.max(1, rows - 1);
      if (rand() < 0.11 + backness * 0.1) {
        empties.push({ x: row * TERRACE_TREAD + TERRACE_TREAD * 0.52,
                       y: base + row * TERRACE_RISER, z, row });
        continue;
      }

      const height = 0.9 + rand() * 0.22;
      seats.push({
        x: row * TERRACE_TREAD + TERRACE_TREAD * 0.46,
        y: base + row * TERRACE_RISER,
        z,
        /* Turned to face the pitch, give or take. Wider than the torso's old
           half-radian, because a head that is never quite square to the field
           is what stops a stand of cubes reading as a shelf of boxes — but not
           so wide that a third of the ground is looking at the car park. */
        turn: (rand() - 0.5) * 0.62,
        lean: (rand() - 0.5) * 0.08,
        height,
        girth: 0.92 + rand() * 0.16,
        shirt: CROWD_SHIRTS[(rand() * CROWD_SHIRTS.length) | 0],
        face: faces.length > 0 ? (rand() * faces.length) | 0 : 0,
      });
    }
  }

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const euler = new THREE.Euler();
  const colour = new THREE.Color();

  const torso = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.55, 1.1, 0.83),
    new THREE.MeshStandardMaterial({ roughness: 0.86, metalness: 0 }),
    seats.length,
  );

  /* One head mesh per face, each holding only the people who wear it.

     If no sheet was drawn at all — a canvas the browser would not give us —
     the crowd keeps its heads and loses only the faces, rather than throwing
     on the first person placed. A stand of plain heads is what this looked
     like last week; a stand that crashes the drive is not a trade worth
     making for a texture. */
  const headGeometry = makeCrowdHeadGeometry(THREE);
  const sheets = faces.length > 0 ? faces : [null];
  const heads = sheets.map((map, index) => {
    const mesh = new THREE.InstancedMesh(
      headGeometry,
      new THREE.MeshStandardMaterial({ map, roughness: 0.8, metalness: 0 }),
      /* At least one slot: an InstancedMesh built with room for nobody has no
         buffer to hand back if a seat is later assigned to it. */
      Math.max(1, seats.filter((s) => s.face === index).length),
    );
    mesh.count = 0;
    return mesh;
  });

  seats.forEach((seat, i) => {
    euler.set(0, seat.turn, seat.lean);
    quaternion.setFromEuler(euler);

    position.set(seat.x, seat.y + 0.62 * seat.height, seat.z);
    scale.set(1, seat.height, seat.girth);
    matrix.compose(position, quaternion, scale);
    torso.setMatrixAt(i, matrix);
    torso.setColorAt(i, colour.setHex(seat.shirt));

    position.y = seat.y + 1.32 * seat.height;
    scale.set(1, 1, 1);
    matrix.compose(position, quaternion, scale);
    const head = heads[seat.face];
    head.setMatrixAt(head.count, matrix);
    /* Skin is painted into the face sheet, so this is not a skin tone — it is
       how much light the head is standing in, varied a little so a row of the
       same face does not repeat as a stripe across the stand. */
    const shade = 0.86 + ((i * 2654435761) % 1000) / 1000 * 0.24;
    head.setColorAt(head.count, colour.setRGB(shade, shade, shade));
    head.count += 1;
  });

  /* The seats nobody is in, in the bands a real bowl is laid out in. Stands
     are not one colour: they are blocks, and the blocks are what you read as
     structure from the far side of a ground. */
  if (empties.length > 0) {
    const seatMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.1, 0.5, 0.66),
      new THREE.MeshStandardMaterial({ roughness: 0.74 }),
      empties.length,
    );
    seatMesh.count = 0;
    empties.forEach((seat) => {
      position.set(seat.x, seat.y + 0.3, seat.z);
      quaternion.identity();
      scale.set(1, 1, 1);
      matrix.compose(position, quaternion, scale);
      seatMesh.setMatrixAt(seatMesh.count, matrix);
      /* Banded by row, club colours through the middle of the rake where a
         ground puts them. */
      const band = seat.row % 7;
      seatMesh.setColorAt(seatMesh.count,
        colour.setHex(band === 3 ? 0x9e210f : band === 4 ? 0x9e210f : 0x21254b));
      seatMesh.count += 1;
    });
    seatMesh.instanceMatrix.needsUpdate = true;
    if (seatMesh.instanceColor) seatMesh.instanceColor.needsUpdate = true;
    seatMesh.receiveShadow = true;
    seatMesh.computeBoundingSphere();
    group.add(seatMesh);
  }

  /* A handrail up every gangway. Two thin runs climbing the rake, which is a
     trivial amount of geometry and one of the strongest signals that a stand
     is a built structure rather than a ramp with people on it — the diagonals
     cut across the horizontal banding of the rows and give the rake its
     pitch. */
  const rakeAngle = Math.atan2(TERRACE_RISER, TERRACE_TREAD);
  const rakeRun = Math.hypot(rows * TERRACE_TREAD, rows * TERRACE_RISER);
  const railGeometry = new THREE.BoxGeometry(rakeRun, 0.1, 0.1);
  const railMaterial = new THREE.MeshStandardMaterial({
    color: 0x8f98a6, roughness: 0.42, metalness: 0.55,
  });
  const postGeometry = new THREE.BoxGeometry(0.1, 1.0, 0.1);
  for (let a = 0; a < aisles; a += 1) {
    const centre = -half + aislePitch * (a + 0.5);
    for (const offset of [-0.82, 0.82]) {
      const rail = new THREE.Mesh(railGeometry, railMaterial);
      rail.position.set(rows * TERRACE_TREAD / 2, base + rows * TERRACE_RISER / 2 + 1.0, centre + offset);
      rail.rotation.z = rakeAngle;
      rail.castShadow = true;
      group.add(rail);
      for (let r = 1; r < rows; r += 3) {
        const post = new THREE.Mesh(postGeometry, railMaterial);
        post.position.set(r * TERRACE_TREAD, base + r * TERRACE_RISER + 0.5, centre + offset);
        group.add(post);
      }
    }
  }

  /* VOMITORIES — the openings people actually arrive through.

     A stand with no way into it is a grandstand drawn from the outside. Every
     real one is punched through at intervals, and the openings do more for the
     read than their size suggests: they are the only true black in a stand, so
     they give the rake something to be in front of, and they break an unbroken
     field of heads into the bays the architecture actually has.

     This terrace is a rake that simply ends at the top — there is no rear wall
     standing above the last row to cut a hole in, which the first attempt at
     this assumed and which would have left a black box floating over the back
     step. So the opening is built rather than cut: two piers, a dark recess
     between them and a lintel across, standing at the head of the gangway. A
     portal reads as a portal because of its frame, not because of its hole.

     Every second gangway gets one. More than that and the stand becomes a
     colonnade. */
  const pierGeometry = new THREE.BoxGeometry(3.2, 3.1, 0.62);
  const concrete = new THREE.MeshStandardMaterial({ color: 0x78818f, roughness: 0.93 });
  const mouthGeometry = new THREE.BoxGeometry(3.0, 2.9, 2.5);
  const mouthMaterial = new THREE.MeshStandardMaterial({
    /* Nearly black, and fully rough. A tunnel mouth in daylight returns almost
       nothing; anything lighter reads as a painted rectangle. */
    color: 0x0a0d13,
    roughness: 1,
    metalness: 0,
  });
  const lintelGeometry = new THREE.BoxGeometry(3.4, 0.55, 3.9);
  for (let a = 0; a < aisles; a += 2) {
    const centre = -half + aislePitch * (a + 0.5);
    const backX = rows * TERRACE_TREAD + 0.9;
    const footY = base + rows * TERRACE_RISER;

    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(backX + 0.5, footY + 1.45, centre);
    group.add(mouth);

    for (const side of [-1, 1]) {
      const pier = new THREE.Mesh(pierGeometry, concrete);
      pier.position.set(backX, footY + 1.55, centre + side * 1.8);
      pier.castShadow = true;
      pier.receiveShadow = true;
      group.add(pier);
    }

    const lintel = new THREE.Mesh(lintelGeometry, concrete);
    lintel.position.set(backX, footY + 3.35, centre);
    lintel.castShadow = true;
    lintel.receiveShadow = true;
    group.add(lintel);
  }

  for (const mesh of [torso, ...heads]) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    /* Lit, and taking the roof's shadow — that is the point of the exercise.
       Not casting, though: a spectator contributes nothing to a shadow map
       spread across the whole ground, and eight thousand of them contribute
       it eight thousand times. */
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
    faces: CrowdFaces;
    /* Where the roof's back columns land. A terrace standing on the ground
       leaves this alone and they run to its own footing; an upper tier sits
       thirty units up, and without this its columns would stop in mid-air
       under the deck they are supposed to be holding. */
    footY?: number;
    /* Picks this stand's crowd. Different per stand so the two touchlines are
       not the same people twice, fixed per stand so a build can be compared
       against another build rather than against a reshuffle. */
    seed: number;
  },
) {
  const { length, rows, base, roof, boards, seed, faces, footY } = options;
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
  group.add(buildCrowd(THREE, { rows, length, base, seed, faces }));

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

    /* Fittings along the fascia, and they are lit now. They used to be dark on
       the reasoning that it is the middle of the day and nobody has switched
       them on — which stopped being true when the bowl closed. A roofed ground
       runs its lights through a daytime fixture because the roof puts half the
       pitch in shade, and these are the fittings the four washes above are
       nominally coming out of. Emissive rather than another light: a hundred
       and twenty real lamps would be unpayable, and at this distance a lamp is
       a bright speck whichever way it is produced. */
    const lamps = Math.max(4, Math.round(length / 12));
    // Instanced: sixty identical fittings round the ground is sixty draw calls
    // for four batches' worth of work.
    const fittings = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.9, 0.3, 2.4),
      new THREE.MeshStandardMaterial({
        color: 0x2c3340,
        roughness: 0.4,
        metalness: 0.3,
        emissive: new THREE.Color(0xfff0d0),
        emissiveIntensity: 1.6,
      }),
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
    const columnFoot = footY ?? base - 4.2;
    const columnGeometry = new THREE.CylinderGeometry(0.42, 0.52, roofY - columnFoot, 8);
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
      column.position.set(depth + 4.4, (roofY + columnFoot) / 2, z);
      group.add(column);
    }
  }

  return group;
}

/** A raked stand down one touchline. */
/* ============================================================
   THE SIDELINE.

   There was nothing here. Between the touchline and the front wall of the
   stand lay a flat green plane, and that emptiness is the single largest
   difference between this ground and a televised one. A broadcast frame of
   American football is carried along its bottom edge: a wall of players in
   jerseys, coaches behind them, benches, coolers, carts, a kicking net, the
   chain crew, a camera operator. It is the busiest strip of the picture and
   it was the only strip with nothing in it.

   None of it needs rigging or animation. It is furniture and standing people,
   and standing people at this distance are the same boxes the crowd is made
   of — so the sideline costs a handful of instanced draws and no new asset.

   Everything is laid out from the touchline outwards in the bands a real
   sideline uses, because the order is what makes it read:

     0.0 - 1.8   the white border, which nobody may stand on
     1.8 - 4.5   the players, loosely clustered, all facing the field
     4.5 - 7.0   coaches and staff, a step back from the players
     7.0 - 10.0  benches, coolers, carts, the kicking net
    10.0 - 13.0  clear, then the wall and the stand behind it
   ============================================================ */

/** Home jerseys at one end of the bench, and the visitors' at the other. */
const JERSEY_HOME = [0x21254b, 0x21254b, 0x2a2f5c, 0x9e210f];
const JERSEY_AWAY = [0xd8dce4, 0xc7ccd6, 0xe6e9ee, 0x8c929e];
/** Coaching staff: dark shells and polos, the way a touchline actually looks. */
const STAFF_KIT = [0x1a1f2b, 0x232936, 0x2f3646, 0x3c4454, 0x151922];

/* Stewards, and they are not dark. Every steward at every ground wears hi-vis,
   for the same reason it exists anywhere else — so that one glance finds them.
   Painted in the coaches' navy they were thin dark posts along the touchline
   that read as fence uprights; in yellow they read instantly as what they are,
   and they give the bottom of the frame the one colour nothing else in this
   ground has. */
const STEWARD_KIT = [0xd8d128, 0xe2d743, 0xc9c223];

function buildSideline(
  THREE: Three,
  options: {
    /** Distance from the middle of the field out to the touchline. */
    touchline: number;
    /** Which side of the field this is: +1 or -1 in x. */
    side: 1 | -1;
    /** The stretch of field this sideline runs along. */
    fromZ: number;
    toZ: number;
    faces: CrowdFaces;
    zone: import("three").Texture | null;
    seed: number;
  },
) {
  const { touchline, side, fromZ, toZ, faces, zone, seed } = options;
  const group = new THREE.Group();

  let state = seed >>> 0;
  const rand = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };

  const zMin = Math.min(fromZ, toZ);
  const zMax = Math.max(fromZ, toZ);
  const zSpan = zMax - zMin;
  /** Distance out from the touchline, signed into world x. */
  const out = (depth: number) => side * (touchline + depth);

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const euler = new THREE.Euler();
  const colour = new THREE.Color();
  /* A figure is built facing local -x, so its forward axis is x, and a tip
     about that axis swings a limb out sideways. */
  const LEAN_AXIS = new THREE.Vector3(1, 0, 0);
  const leanQuaternion = new THREE.Quaternion();

  /* Everyone on this side faces the field — and this was a quarter turn out.

     Rotating about Y maps local +x to (cos, 0, -sin). These figures are built
     facing local -x, the same way the crowd's heads are, so a person standing
     on the +x touchline is already looking at the pitch at a turn of zero, and
     one on the -x side needs a half turn. At the quarter turn this started on,
     the whole touchline was staring down the field past the play — every
     player, every coach, and both broadcast cameras aimed along the sideline
     instead of at it. */
  const facing = side > 0 ? 0 : Math.PI;

  // --- the people ------------------------------------------------------

  type Person = {
    z: number; depth: number; turn: number;
    height: number; stance: number; splay: number;
    kit: number; staff: boolean; steward: boolean; face: number;
  };
  const people: Person[] = [];

  /* A team area, not a picket line.

     Fifty players spread evenly along ninety metres is a fence. A real squad
     occupies the middle third of its own half of the touchline and stands
     shoulder to shoulder in it, two and three deep, because that is where the
     benches and the coaches are — and the density is the thing a televised
     frame actually shows. So the band is narrowed to the middle of the
     sideline and the count raised to fill it.

     Within that band they cluster rather than space out: around a coach
     talking, around the bench, thinner where the chain crew needs room. An
     evenly spaced line is the giveaway that says "placed by a loop". */
  const teamFrom = zMin + zSpan * 0.16;
  const teamSpan = zSpan * 0.68;
  const clusters = Math.max(4, Math.round(teamSpan / 11));
  for (let c = 0; c < clusters; c += 1) {
    const centre = teamFrom + teamSpan * ((c + 0.5) / clusters) + (rand() - 0.5) * 4;
    const size = 6 + Math.floor(rand() * 6);
    for (let i = 0; i < size; i += 1) {
      people.push({
        z: centre + (rand() - 0.5) * 6.5,
        depth: 2.0 + rand() * 3.0,
        /* Not quite square to the play. A touchline where every helmet points
           the same way reads as a fence. */
        turn: facing + (rand() - 0.5) * 0.7,
        height: 0.96 + rand() * 0.1,
        /* Nobody stands the way the person next to them does. Without this
           every figure has identical feet and identical arms, and a row of
           them reads as a rack rather than a squad — the same giveaway as an
           evenly spaced line, one level further in. */
        stance: 0.24 + rand() * 0.09,
        splay: 0.05 + rand() * 0.16,
        kit: 0,
        staff: false,
        steward: false,
        face: faces.length > 0 ? (rand() * faces.length) | 0 : 0,
      });
    }
  }

  /* THE REST OF THE TOUCHLINE, WHICH IS NOT EMPTY EITHER.

     Concentrating the squad into its own third is right, and on its own it
     made things worse: the camera travels the full length of this ground, so
     for most of the drive it was flying past bare grass where a moment before
     there had been people. A real perimeter is never bare. Stewards stand at
     intervals the whole way round facing the crowd — not the play, which is
     the detail that gives them away as stewards — with photographers and
     media down by the ends.

     Sparse, evenly spread, and turned the other way. They cost almost nothing
     and they stop the bottom of the frame emptying out between benches. */
  const perimeter = Math.max(6, Math.round(zSpan / 13));
  for (let i = 0; i < perimeter; i += 1) {
    people.push({
      z: zMin + zSpan * ((i + 0.5) / perimeter) + (rand() - 0.5) * 5,
      depth: 1.9 + rand() * 0.7,
      // Backs to the field, watching the stand. That is the job.
      turn: facing + Math.PI + (rand() - 0.5) * 0.5,
      height: 0.95 + rand() * 0.1,
      /* A steward stands to attention rather than at ease: feet closer, arms
         nearer the body. It is a small difference and it is the reason they
         read as staff rather than as more of the squad. */
      stance: 0.19 + rand() * 0.05,
      splay: 0.03 + rand() * 0.07,
      kit: 0,
      staff: true,
      steward: true,
      face: faces.length > 0 ? (rand() * faces.length) | 0 : 0,
    });
  }

  // Coaching staff, a step back from the players and far fewer of them.
  const staffCount = Math.max(5, Math.round(teamSpan / 9));
  for (let i = 0; i < staffCount; i += 1) {
    people.push({
      z: teamFrom + rand() * teamSpan,
      depth: 4.8 + rand() * 2.0,
      turn: facing + (rand() - 0.5) * 0.9,
      height: 0.94 + rand() * 0.1,
      stance: 0.21 + rand() * 0.08,
      splay: 0.04 + rand() * 0.13,
      kit: 0,
      staff: true,
      steward: false,
      face: faces.length > 0 ? (rand() * faces.length) | 0 : 0,
    });
  }

  const players = people.filter((p) => !p.staff);
  const staff = people.filter((p) => p.staff);

  /* A PERSON, NOT A STACK OF BOXES.

     The touchline holds about two hundred and fifty figures. The crowd holds
     eight thousand four hundred. That ratio is the whole argument: geometry
     that would be reckless in a stand is free out here, so the people the
     camera passes closest to are the ones that can afford to be shaped, and
     they were the ones built out of the fewest parts.

     Boxes were the complaint and the complaint was right. What fixes it is not
     more triangles everywhere but the right ones in the right places:

       Two legs with a gap between them. One block from hip to ankle reads as a
       plinth however tall it is; the gap is what says "standing".
       A waist. A torso that tapers has a direction and a front; a rectangle
       has neither.
       And the shoulder pads, which are the point. Wide, square shoulders over
       a narrow waist is the silhouette of this sport and nothing else — it is
       what separates a player from a coach at two hundred units, and it is
       exactly what a box cannot do.

     About a hundred and forty triangles a player. At two hundred and fifty
     people that is thirty-five thousand across the whole touchline, against
     the hundred thousand the crowd's heads alone cost. */
  /* LEG THICKNESS IS A GAP PROBLEM, NOT A LEG PROBLEM.

     These were already two legs — 0.4 apart, each 0.3 across, which leaves a
     tenth of a unit of daylight between them. A figure here stands about three
     units tall and reads at some thirty pixels, so a unit is roughly ten
     pixels and that gap is ONE. At one pixel the legs merge and every person
     on the touchline reads as a post, which is exactly what they looked like.

     Thinner legs set wider: 0.52 apart at 0.23 across leaves 0.29 of daylight,
     close to three pixels. The shape was never wrong; the spacing was. */
  const legGeometry = new THREE.CylinderGeometry(0.115, 0.082, 1.55, 6);
  const armGeometry = new THREE.CylinderGeometry(0.1, 0.078, 1.02, 5);

  /* Chest wider than waist, and squashed front-to-back so the section is an
     oval rather than a post. Ten sides rather than eight: the two extra are
     nearly free and they take the flat facet off the front, which is the face
     the camera sees most of. */
  const torsoGeometry = new THREE.CylinderGeometry(0.33, 0.25, 1.0, 10);
  torsoGeometry.scale(0.66, 1, 1);
  /* The pads, rounded off at the ends.

     These were a box, on the argument that real shoulder pads are square and
     that the width is the proportion worth protecting. The width is — the
     CORNERS are not. A hard right angle at each shoulder is the most
     synthetic thing on the touchline, because nothing on a person has one.
     An ellipsoid keeps every bit of the width and rounds the caps, which is
     also closer to what pads look like from the side. */
  const padGeometry = new THREE.SphereGeometry(0.5, 10, 6);
  padGeometry.scale(0.5, 0.42, 1.04);

  const headGeometry = makeCrowdHeadGeometry(THREE);
  /* A helmet, not a head: rounded, with no face on it, and a bar across the
     front where a facemask goes. */
  const helmetGeometry = new THREE.IcosahedronGeometry(0.24, 1);
  helmetGeometry.scale(0.96, 0.94, 1);
  const maskGeometry = new THREE.BoxGeometry(0.1, 0.16, 0.34);

  const instanced = (
    geometry: import("three").BufferGeometry,
    material: import("three").Material,
    count: number,
  ) => {
    const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, count));
    mesh.count = 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  /* Two instances per person for the paired limbs, which is why these are
     sized at twice the head count. Cheaper than merging a left and a right
     into one geometry, and it keeps each limb its own transform. */
  const playerLegs = instanced(legGeometry,
    new THREE.MeshStandardMaterial({ roughness: 0.8 }), players.length * 2);
  const playerArms = instanced(armGeometry,
    new THREE.MeshStandardMaterial({ roughness: 0.74 }), players.length * 2);
  const playerTorso = instanced(torsoGeometry,
    new THREE.MeshStandardMaterial({ roughness: 0.72 }), players.length);
  const playerPads = instanced(padGeometry,
    new THREE.MeshStandardMaterial({ roughness: 0.66 }), players.length);
  const helmets = instanced(helmetGeometry,
    new THREE.MeshStandardMaterial({ roughness: 0.28, metalness: 0.16 }), players.length);
  const masks = instanced(maskGeometry,
    new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 0.5, metalness: 0.3 }),
    players.length);
  const staffLegs = instanced(legGeometry,
    new THREE.MeshStandardMaterial({ roughness: 0.86 }), staff.length * 2);
  const staffArms = instanced(armGeometry,
    new THREE.MeshStandardMaterial({ roughness: 0.84 }), staff.length * 2);
  const staffTorso = instanced(torsoGeometry,
    new THREE.MeshStandardMaterial({ roughness: 0.84 }), staff.length);
  const staffHeads = (faces.length > 0 ? faces : [null]).map((map, index) =>
    instanced(headGeometry,
      new THREE.MeshStandardMaterial({ map, roughness: 0.8 }),
      staff.filter((p) => p.face === index).length));

  const place = (
    mesh: import("three").InstancedMesh,
    x: number, y: number, z: number,
    turn: number, sx: number, sy: number, sz: number,
    hex: number,
    /** Tip about the figure's own forward axis, for arms and stance. */
    lean = 0,
  ) => {
    position.set(x, y, z);
    /* Composed rather than handed to one Euler, because the lean belongs in
       the FIGURE's frame and the turn in the world's. An Euler would make the
       result depend on its axis order, and the order that reads right for
       someone on the far touchline reads wrong for the one facing the other
       way. Multiplying on the right applies the lean first, in local space. */
    euler.set(0, turn, 0);
    quaternion.setFromEuler(euler);
    if (lean !== 0) {
      leanQuaternion.setFromAxisAngle(LEAN_AXIS, lean);
      quaternion.multiply(leanQuaternion);
    }
    scale.set(sx, sy, sz);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(mesh.count, matrix);
    mesh.setColorAt(mesh.count, colour.setHex(hex));
    mesh.count += 1;
  };

  /* Home kit on the near half of the sideline and whites on the far half, so
     the two squads read as two squads rather than as one long mixed queue. */
  for (const p of players) {
    const x = out(p.depth);
    const h = p.height;
    const homeHalf = (p.z - zMin) / zSpan < 0.5;
    const palette = homeHalf ? JERSEY_HOME : JERSEY_AWAY;
    const jersey = palette[(Math.abs(Math.round(p.z * 7)) % palette.length)];
    // Pants: white at home, navy on the road, which is the way round it is.
    const pants = homeHalf ? 0xdfe3ea : 0x262c3d;
    /* The helmet is its own colour and has to be. Painted the same navy as
       the jersey it disappears into the shoulders, and a player without a
       helmet silhouette is just another box on a touchline full of boxes —
       which is exactly how the first pass of this read. Red at home against
       the navy, silver on the road against the whites. */
    const helmet = homeHalf ? 0x9e210f : 0xa8b0bd;

    /* Limbs sit either side of the centre line, and the offset is rotated with
       the person rather than applied in world space — otherwise everyone's
       legs swing round to the same compass bearing whichever way they face. */
    const sin = Math.sin(p.turn);
    const cos = Math.cos(p.turn);
    const sideways = (offset: number): [number, number] => [
      x + offset * -sin,
      p.z + offset * -cos,
    ];

    for (const sign of [-1, 1]) {
      const [lx, lz] = sideways(sign * p.stance);
      place(playerLegs, lx, 0.78 * h, lz, p.turn, 1, h, 1, pants);
    }
    /* THE ARM HANGS FROM THE SHOULDER, SO THE SHOULDER IS WHAT STAYS PUT.
       A limb tipped about its own middle swings its top inwards as its bottom
       swings out, which detaches it from the body it belongs to. Shifting the
       arm out by half its length times the sine of the tip puts the top back
       where it started, and only the hand moves. */
    const armHalf = 0.51 * h;
    for (const sign of [-1, 1]) {
      const [ax, az] = sideways(sign * (0.4 + armHalf * Math.sin(p.splay)));
      place(playerArms, ax, (1.55 + 0.72) * h, az, p.turn, 1, h, 1, jersey, sign * p.splay);
    }
    place(playerTorso, x, (1.55 + 0.5) * h, p.z, p.turn, 1, h, 1, jersey);
    place(playerPads, x, (1.55 + 1.02) * h, p.z, p.turn, 1, 1, 1, jersey);
    place(helmets, x, (1.55 + 1.32) * h, p.z, p.turn, 1, 1, 1, helmet);
    // The facemask, a little proud of the front of the helmet.
    const [mx, mz] = [x + 0.2 * cos, p.z - 0.2 * sin];
    place(masks, mx, (1.55 + 1.28) * h, mz, p.turn, 1, 1, 1, 0x20242c);
  }

  for (const p of staff) {
    const x = out(p.depth);
    const h = p.height;
    const palette = p.steward ? STEWARD_KIT : STAFF_KIT;
    const kit = palette[(Math.abs(Math.round(p.z * 11)) % palette.length)];
    const sin = Math.sin(p.turn);
    const cos = Math.cos(p.turn);
    const sideways = (offset: number): [number, number] => [
      x + offset * -sin,
      p.z + offset * -cos,
    ];
    for (const sign of [-1, 1]) {
      const [lx, lz] = sideways(sign * p.stance * 0.82);
      place(staffLegs, lx, 0.78 * h, lz, p.turn, 0.94, h, 0.94, 0x20242e);
    }
    const armHalf = 0.51 * h;
    for (const sign of [-1, 1]) {
      const [ax, az] = sideways(sign * (0.3 + armHalf * Math.sin(p.splay)));
      place(staffArms, ax, (1.55 + 0.72) * h, az, p.turn, 0.94, h, 0.94, kit, sign * p.splay);
    }
    /* No pads on the staff, and that is the tell. A coach is a narrow figure
       next to a squad of wide ones, which is how you read a touchline. */
    place(staffTorso, x, (1.55 + 0.5) * h, p.z, p.turn, 0.9, h, 0.9, kit);
    const head = staffHeads[p.face] ?? staffHeads[0];
    place(head, x, (1.55 + 1.16) * h, p.z, p.turn, 1, 1, 1, 0xffffff);
  }

  for (const mesh of [playerLegs, playerArms, playerTorso, playerPads, helmets, masks,
                      staffLegs, staffArms, staffTorso, ...staffHeads]) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }

  /* The painted team area. It lies on the grass rather than being part of the
     turf texture, because the turf ends at the touchline and this is outside
     it — and because a strip that can be positioned separately can follow the
     benches when they move. */
  if (zone) {
    const strip = zone.clone();
    strip.needsUpdate = true;
    strip.wrapS = THREE.RepeatWrapping;
    strip.wrapT = THREE.ClampToEdgeWrapping;
    /* Repeated along its length rather than stretched to it. A badge pulled
       out to ninety metres is a smear, and a smear is what gets noticed. */
    strip.repeat.set(Math.max(1, Math.round(teamSpan / 46)), 1);
    const mat = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, teamSpan),
      new THREE.MeshStandardMaterial({ map: strip, roughness: 0.92 }),
    );
    mat.rotation.x = -Math.PI / 2;
    mat.position.set(out(6.6), 0.02, teamFrom + teamSpan / 2);
    mat.receiveShadow = true;
    group.add(mat);
  }

  // --- the furniture ----------------------------------------------------

  /* EVERYTHING REPEATED IS INSTANCED, AND THAT IS NOT A DETAIL.

     The first pass of this built every bench section, cooler, crate, net post
     and tripod as its own Mesh with its own material: about sixty objects a
     touchline, a hundred and twenty across the ground, each one a draw call
     and a material of its own. The crowd behind them — eight thousand people —
     costs sixteen. Furniture is the most repetitive thing on a touchline and
     it was the only thing here not taking advantage of that. */
  const kit = (
    geometry: import("three").BufferGeometry,
    material: import("three").Material,
    count: number,
  ) => {
    const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, count));
    mesh.count = 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  /* One material for all of it. Every piece takes its colour from its
     instance, so a shared material is not a compromise here — it is the whole
     point of instancing them. */
  const painted = new THREE.MeshStandardMaterial({ roughness: 0.82 });

  const benchRuns = Math.max(2, Math.round(zSpan / 22));
  const coolerRuns = Math.max(3, Math.round(zSpan / 18));

  const benchSeats = kit(new THREE.BoxGeometry(1.1, 0.16, 7.4), painted, benchRuns);
  const benchBacks = kit(new THREE.BoxGeometry(0.16, 0.9, 7.4), painted, benchRuns);
  const benchLegs = kit(new THREE.BoxGeometry(0.9, 0.85, 0.2), painted, benchRuns * 2);
  const coolers = kit(new THREE.BoxGeometry(0.72, 0.95, 0.72), painted, coolerRuns);
  const crates = kit(new THREE.BoxGeometry(0.62, 0.34, 0.9), painted, coolerRuns);
  const netPosts = kit(new THREE.BoxGeometry(0.16, 5.2, 0.16), painted, 4);
  const tripods = kit(new THREE.BoxGeometry(0.5, 1.5, 0.5), painted, 2);
  const cameraBodies = kit(new THREE.BoxGeometry(1.5, 0.62, 0.62), painted, 2);
  const markerPoles = kit(new THREE.BoxGeometry(0.12, 2.6, 0.12), painted, 2);
  const markerBoards = kit(new THREE.BoxGeometry(0.1, 0.8, 0.8), painted, 2);

  /* Benches, in runs rather than one continuous slab — a touchline bench is
     sectional and the joins are visible from the far side of a ground. */
  for (let i = 0; i < benchRuns; i += 1) {
    const z = zMin + zSpan * ((i + 0.5) / benchRuns);
    place(benchSeats, out(8.1), 0.86, z, 0, 1, 1, 1, 0x2b3242);
    place(benchBacks, out(8.7), 1.3, z, 0, 1, 1, 1, 0x232936);
    place(benchLegs, out(8.1), 0.42, z - 3.1, 0, 1, 1, 1, 0x1b202b);
    place(benchLegs, out(8.1), 0.42, z + 3.1, 0, 1, 1, 1, 0x1b202b);
  }

  /* THE BENCHES, WITH PEOPLE ON THEM.

     An empty bench on a touchline full of standing players is stranger than no
     bench at all — it is the one piece of furniture whose whole purpose is
     visible, and leaving it bare says nobody has sat down all game. Seated
     figures are the same parts as standing ones with the legs cut to the
     height of the seat, which is all a seated person is from this distance:
     the same shoulders, lower down, with less leg under them.

     Not every section and not shoulder to shoulder. A bench with every place
     taken looks staged; a bench with three or four on it looks like a game. */
  const seatedLegs = kit(legGeometry,
    new THREE.MeshStandardMaterial({ roughness: 0.8 }), benchRuns * 10);
  const seatedTorso = kit(torsoGeometry,
    new THREE.MeshStandardMaterial({ roughness: 0.72 }), benchRuns * 5);
  const seatedPads = kit(padGeometry,
    new THREE.MeshStandardMaterial({ roughness: 0.66 }), benchRuns * 5);
  const seatedHelmets = kit(helmetGeometry,
    new THREE.MeshStandardMaterial({ roughness: 0.28, metalness: 0.16 }), benchRuns * 5);

  for (let i = 0; i < benchRuns; i += 1) {
    const benchZ = zMin + zSpan * ((i + 0.5) / benchRuns);
    // Only the benches inside the team area get anybody on them.
    if (benchZ < teamFrom || benchZ > teamFrom + teamSpan) continue;
    const sitting = 2 + Math.floor(rand() * 3);
    const homeHalf = (benchZ - zMin) / zSpan < 0.5;
    const palette = homeHalf ? JERSEY_HOME : JERSEY_AWAY;
    const helmetHex = homeHalf ? 0x9e210f : 0xa8b0bd;
    const pantsHex = homeHalf ? 0xdfe3ea : 0x262c3d;
    for (let n = 0; n < sitting; n += 1) {
      const z = benchZ - 2.8 + (n + rand() * 0.5) * (5.6 / Math.max(1, sitting));
      const jersey = palette[(Math.abs(Math.round(z * 5)) % palette.length)];
      const turn = facing + (rand() - 0.5) * 0.4;
      const sin = Math.sin(turn);
      const cos = Math.cos(turn);
      const seatX = out(8.1);
      /* Knees forward of the seat, which is what stops a seated figure looking
         like a standing one sunk into the bench. */
      const kneeX = seatX - 0.5 * cos;
      const kneeZ = z + 0.5 * sin;
      for (const offset of [-0.18, 0.18]) {
        place(seatedLegs, kneeX + offset * -sin, 0.5, kneeZ + offset * -cos,
          turn, 1, 0.64, 1, pantsHex);
      }
      place(seatedTorso, seatX, 1.52, z, turn, 1, 0.94, 1, jersey);
      place(seatedPads, seatX, 2.02, z, turn, 1, 1, 1, jersey);
      place(seatedHelmets, seatX, 2.32, z, turn, 1, 1, 1, helmetHex);
    }
  }

  /* Coolers and bottle crates, which is the orange the eye finds first on any
     touchline in the sport. */
  for (let i = 0; i < coolerRuns; i += 1) {
    const z = zMin + rand() * zSpan;
    place(coolers, out(9.6), 0.48, z, 0, 1, 1, 1, rand() < 0.6 ? 0xd4601c : 0xb8351f);
    place(crates, out(9.6), 0.17, z + 1.4, 0, 1, 1, 1, 0x39404f);
  }

  /* The kicking net behind the bench: a tall frame that is nearly all
     silhouette, and one of the few things on a touchline that breaks the
     horizontal line of the wall behind it. */
  const nets = new THREE.Group();
  for (const z of [zMin + zSpan * 0.22, zMin + zSpan * 0.78]) {
    place(netPosts, out(10.4), 2.6, z - 2.3, 0, 1, 1, 1, 0x2b3242);
    place(netPosts, out(10.4), 2.6, z + 2.3, 0, 1, 1, 1, 0x2b3242);
    const net = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 4.2, 4.6),
      new THREE.MeshStandardMaterial({
        color: 0x161b25, roughness: 0.95, transparent: true, opacity: 0.55,
      }),
    );
    net.position.set(out(10.4), 2.9, z);
    nets.add(net);
  }
  group.add(nets);

  /* A broadcast camera on its tripod, which is the object that says this is
     being televised more than anything else on the touchline. */
  for (const z of [zMin + zSpan * 0.4, zMin + zSpan * 0.62]) {
    place(tripods, out(11.4), 0.75, z, 0, 1, 1, 1, 0x1b202b);
    place(cameraBodies, out(11.4), 1.78, z, facing, 1, 1, 1, 0x2f3646);
  }

  /* The chain crew's markers, in the orange nothing else on a field is — and
     somebody holding each one. A marker standing on its own is a traffic cone;
     the whole reason those poles are recognisable is that there is a person
     attached to them, and at this distance the pole plus a figure beside it is
     the entire read. They wear the officials' stripes rather than a kit. */
  const crewLegs = kit(legGeometry,
    new THREE.MeshStandardMaterial({ roughness: 0.84 }), 4);
  const crewTorso = kit(torsoGeometry,
    new THREE.MeshStandardMaterial({ roughness: 0.8 }), 2);
  const crewHeads = (faces.length > 0 ? faces : [null]).map((map) =>
    kit(headGeometry, new THREE.MeshStandardMaterial({ map, roughness: 0.8 }), 2));

  for (const [i, z] of [zMin + zSpan * 0.46, zMin + zSpan * 0.56].entries()) {
    place(markerPoles, out(1.5), 1.3, z, 0, 1, 1, 1, 0xe2711d);
    place(markerBoards, out(1.5), 2.5, z, 0, 1, 1, 1, 0xe2711d);

    const turn = facing;
    const sin = Math.sin(turn);
    const cos = Math.cos(turn);
    const px = out(2.3);
    const pz = z + 0.9;
    for (const offset of [-0.16, 0.16]) {
      place(crewLegs, px + offset * -sin, 0.78, pz + offset * -cos,
        turn, 0.94, 1, 0.94, 0x2a2f38);
    }
    place(crewTorso, px, 2.05, pz, turn, 0.92, 1, 0.92, 0xdfe3ea);
    const head = crewHeads[i % crewHeads.length];
    place(head, px, 2.71, pz, turn, 1, 1, 1, 0xffffff);
  }

  for (const mesh of [benchSeats, benchBacks, benchLegs, coolers, crates,
                      netPosts, tripods, cameraBodies, markerPoles, markerBoards,
                      seatedLegs, seatedTorso, seatedPads, seatedHelmets,
                      crewLegs, crewTorso, ...crewHeads]) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}

/**
 * THE ROOF, AS ONE RING INSTEAD OF EIGHT SLABS.
 *
 * Every terrace used to build its own rectangular roof. Four of those meet
 * four more at the corners, at forty-five degrees, each one carrying on past
 * where its neighbour starts — so the corners came out as a pile of
 * overlapping plates with wedges of sky between them. No amount of nudging
 * eight rectangles fixes that: rectangles that meet at an angle either gap or
 * overlap, and usually both.
 *
 * A stadium roof is not eight plates. It is one surface with a hole in it, and
 * that is what this builds: an octagonal slab following the bowl's footprint,
 * with an octagonal opening over the pitch. One piece of geometry, so the
 * corners cannot gap — there is nothing there to gap between.
 *
 * The opening is what the eye actually reads. Its edge runs unbroken all the
 * way round, and because it is a single closed path the fascia beam under it
 * and the run of lamps along it follow the same line, mitred at the corners by
 * construction rather than by hand.
 */

/** A rounded-off rectangle in plan, as the bowl's footprint actually is. */
function octagonPoints(halfX: number, zMin: number, zMax: number, chamfer: number) {
  const x = halfX;
  const c = chamfer;
  /* Shape space is (sx, sy) and the slab is extruded along +z, then turned a
     quarter about X so the extrusion stands up. That turn sends (x, y, z) to
     (x, z, -y), so shape-y has to carry NEGATED world z or the whole roof
     comes out mirrored end for end. */
  const pts: Array<[number, number]> = [
    [-x + c, -zMax], [x - c, -zMax],
    [x, -zMax + c], [x, -zMin - c],
    [x - c, -zMin], [-x + c, -zMin],
    [-x, -zMin - c], [-x, -zMax + c],
  ];
  return pts;
}

function ringShape(
  THREE: Three,
  outer: Array<[number, number]>,
  inner: Array<[number, number]>,
) {
  const shape = new THREE.Shape();
  outer.forEach(([px, py], i) => (i === 0 ? shape.moveTo(px, py) : shape.lineTo(px, py)));
  shape.closePath();

  const hole = new THREE.Path();
  inner.forEach(([px, py], i) => (i === 0 ? hole.moveTo(px, py) : hole.lineTo(px, py)));
  hole.closePath();
  shape.holes.push(hole);
  return shape;
}

/** Walk a closed polygon, handing back evenly spaced points and headings. */
function walkPolygon(points: Array<[number, number]>, spacing: number) {
  const out: Array<{ x: number; z: number; angle: number }> = [];
  for (let i = 0; i < points.length; i += 1) {
    const [ax, ay] = points[i];
    const [bx, by] = points[(i + 1) % points.length];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.round(len / spacing));
    for (let s = 0; s < steps; s += 1) {
      const t = (s + 0.5) / steps;
      out.push({
        x: ax + dx * t,
        // Shape-y is negated world z; undo that coming back out.
        z: -(ay + dy * t),
        angle: Math.atan2(dx, -dy),
      });
    }
  }
  return out;
}

function buildRoofRing(
  THREE: Three,
  roofY: number,
  crestCloth: import("three").Texture | null,
  wordCloth: import("three").Texture | null,
) {
  const group = new THREE.Group();

  const steel = new THREE.MeshStandardMaterial({ color: 0x59657a, roughness: 0.52, metalness: 0.5 });
  const sheet = new THREE.MeshStandardMaterial({ color: 0x38414f, roughness: 0.88 });

  /* Worked out from the stands rather than written down, so that moving a
     stand moves its roof with it — which is exactly the drift that has caught
     the flags twice already. */
  const sideFront = FIELD_WIDE / 2 + SIDELINE_DEPTH;
  const innerX = sideFront + UPPER_SETBACK - 3.4;
  const outerX = sideFront + UPPER_SETBACK + UPPER_ROWS_SIDE * TERRACE_TREAD + 6;
  const innerZMax = OWN_END_Z + 14 + UPPER_SETBACK - 3.4;
  const innerZMin = OPP_END_Z - 14 - UPPER_SETBACK + 3.4;
  const outerZMax = OWN_END_Z + 14 + UPPER_SETBACK + UPPER_ROWS_END * TERRACE_TREAD + 6;
  const outerZMin = OPP_END_Z - 14 - UPPER_SETBACK - UPPER_ROWS_END * TERRACE_TREAD - 6;

  const inner = octagonPoints(innerX, innerZMin, innerZMax, 30);
  /* The masts stand on this same line, handed out rather than recomputed.
     buildFlags used to work the lip out for itself, and drifted off the roof
     twice doing it — once when the stands moved back for the team areas, once
     when they went two-tier. One polygon, one answer. */
  const outer = octagonPoints(outerX, outerZMin, outerZMax, 46);

  // --- the deck --------------------------------------------------------
  const deck = new THREE.Mesh(
    new THREE.ExtrudeGeometry(ringShape(THREE, outer, inner), {
      depth: 0.8,
      bevelEnabled: false,
    }),
    sheet,
  );
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = roofY;
  deck.castShadow = true;
  deck.receiveShadow = true;
  group.add(deck);

  /* The fascia under the leading edge. A roof that ends on a cut line is a
     plane; a roof with a beam under it is a building, and the beam is the only
     thing in the picture that traces the opening all the way round. */
  const fasciaOuter = octagonPoints(innerX + 1.7, innerZMin - 1.7, innerZMax + 1.7, 30);
  const fascia = new THREE.Mesh(
    new THREE.ExtrudeGeometry(ringShape(THREE, fasciaOuter, inner), {
      depth: 2.1,
      bevelEnabled: false,
    }),
    steel,
  );
  fascia.rotation.x = -Math.PI / 2;
  fascia.position.y = roofY;
  fascia.castShadow = true;
  group.add(fascia);

  // --- the lamps along the opening --------------------------------------
  const lampSpots = walkPolygon(inner, 11);
  const lamps = new THREE.InstancedMesh(
    new THREE.BoxGeometry(2.4, 0.3, 0.9),
    new THREE.MeshStandardMaterial({
      color: 0x2c3340,
      roughness: 0.4,
      metalness: 0.3,
      emissive: new THREE.Color(0xfff0d0),
      emissiveIntensity: 1.6,
    }),
    lampSpots.length,
  );
  const put = new THREE.Object3D();
  lampSpots.forEach((spot, i) => {
    put.position.set(spot.x, roofY - 2.4, spot.z);
    put.rotation.set(0, spot.angle, 0);
    put.updateMatrix();
    lamps.setMatrixAt(i, put.matrix);
  });
  lamps.instanceMatrix.needsUpdate = true;
  lamps.computeBoundingSphere();
  group.add(lamps);

  /* BANNERS ROUND THE OPENING, WHERE THE TRUSSES WERE.

     The roof used to carry a fan of trusses across its underside. They were
     structurally honest and visually wrong: seen from the field they read as a
     web of dark sticks over the crowd, and they were the busiest thing in the
     upper half of every frame. A real roof has its structure above the deck,
     not slung under it where the camera lives.

     What hangs there instead is what actually hangs there: banners. They take
     the club's own artwork — the crest and the wordmark, the real files rather
     than something approximated in canvas — and they alternate, so the ring
     reads as a set rather than as one image repeated thirty times.

     Two instanced draws for all of them, split by which artwork they carry,
     because a mesh can only hold one texture. */
  /* RESTRAINT IS THE POINT, AND SPACING IS HOW IT IS SET.

     At one banner every seventeen units this ring carried forty-two of them —
     a continuous frieze round the entire roof, which is not what a stadium
     looks like. A ground hangs a handful, at intervals, and the gaps between
     them are what make the ones that are there read as deliberate. At sixty
     there are twelve, and the roof still looks like a roof. */
  const bannerSpots = walkPolygon(inner, 60);

  /* CLOTH, NOT A SIGN.

     These were flat planes with a picture on them, and that is exactly how
     they read: rectangles with a logo inside. A banner does not become a
     banner by being given a better picture — what says cloth is the shape,
     and a plane has none.

     So each one is a subdivided sheet with drape pushed through it in the
     vertex shader, hung off a rail, with the marks printed INTO the cloth
     rather than floated in front of it. Two layers folding independently
     would cross, and the badge would flicker through its own backing. */
  /* Twelve segments across carry the folds; the drop needs only a few, since
     the fold runs the full height and the ramp down it is smooth. */
  const bannerGeometry = new THREE.PlaneGeometry(BANNER_W, BANNER_H, 18, 8);

  const bannerCloth: Omit<ClothOptions, "hold"> & { hold: "hang" } = {
    hold: "hang", width: BANNER_W, height: BANNER_H,
    amplitude: 0.42, folds: 2.6, cross: 0.26, sag: 0.12, speed: 1.15,
    instanced: true,
  };
  const panels = [crestCloth, wordCloth].map((map) => {
    const material = new THREE.MeshStandardMaterial({ map, roughness: 0.84, side: THREE.DoubleSide });
    const time = makeCloth(THREE, material, bannerCloth);
    return { material, time };
  });

  /* Hung straight off the fascia rather than floating below it. */
  const railY = roofY - 2.1;
  const bannerY = railY - BANNER_H / 2 - 0.25;

  const meshes = panels.map(
    (p, k) =>
      new THREE.InstancedMesh(
        bannerGeometry,
        p.material,
        k === 0 ? Math.ceil(bannerSpots.length / 2) : Math.floor(bannerSpots.length / 2),
      ),
  );
  for (const mesh of meshes) mesh.count = 0;

  /* The rail each one hangs from. Without it a banner is a sheet stopping in
     mid-air below the roof; with it there is something holding it, and the
     eye stops asking. */
  const railGeometry = new THREE.CylinderGeometry(0.09, 0.09, BANNER_W + 0.5, 6);
  railGeometry.rotateZ(Math.PI / 2);
  const rails = new THREE.InstancedMesh(
    railGeometry,
    new THREE.MeshStandardMaterial({ color: 0x8d99a8, roughness: 0.5, metalness: 0.55 }),
    bannerSpots.length,
  );

  bannerSpots.forEach((spot, i) => {
    /* Turned to face the pitch. walkPolygon hands back the heading along the
       edge, so the face of a banner on it is that heading turned a quarter. */
    const facing = spot.angle + Math.PI / 2;
    /* A nudge IN FRONT of the fascia, and the sign matters: a plane's normal
       after a Y rotation is (sin, 0, cos), so the pitch-facing side is plus
       that, not minus. Subtracted, every banner sat inside the roof it hangs
       from and the ring came out bare. */
    const nx = Math.sin(facing) * 0.3;
    const nz = Math.cos(facing) * 0.3;

    put.position.set(spot.x + nx, railY, spot.z + nz);
    put.rotation.set(0, facing, 0);
    put.updateMatrix();
    rails.setMatrixAt(i, put.matrix);

    put.position.set(spot.x + nx, bannerY, spot.z + nz);
    put.updateMatrix();
    const mesh = meshes[i % 2];
    mesh.setMatrixAt(mesh.count, put.matrix);
    mesh.count += 1;
  });

  for (const mesh of [...meshes, rails]) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  group.userData.times = panels.map((p) => p.time);
  /* Spaced tighter than the banners: a mast is a thin thing against the sky
     and a handful of them scattered round a ring this size reads as an
     accident rather than a roofline. */
  group.userData.flagSpots = walkPolygon(inner, 38);

  // --- what holds it up ---------------------------------------------------
  /* Columns round the back. They are mostly hidden behind the upper tier, and
     they are what stops the roof reading as a lid resting on nothing when the
     camera catches the gap between two stands. */
  const columnSpots = walkPolygon(outer, 23);
  const columns = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.42, 0.55, roofY, 8),
    steel,
    columnSpots.length,
  );
  columnSpots.forEach((spot, i) => {
    put.position.set(spot.x, roofY / 2, spot.z);
    put.rotation.set(0, 0, 0);
    put.updateMatrix();
    columns.setMatrixAt(i, put.matrix);
  });
  columns.instanceMatrix.needsUpdate = true;
  columns.castShadow = true;
  columns.computeBoundingSphere();
  group.add(columns);

  return group;
}

/**
 * PITCH-SIDE ADVERTISING, CARRYING THE CLUB'S OWN MARKS.
 *
 * The hoardings round the ground are a painted canvas strip — right for a run
 * of repeating boards, and unable to carry the badge, because the badge is a
 * file with transparency and the strip is a pattern generated at runtime.
 *
 * So the marks go in front of it: panels standing a little proud of the
 * hoarding line, alternating the crest and the wordmark, at intervals round
 * the whole bowl. Two instanced draws for all of them, split by which artwork
 * they carry, since a mesh holds one texture.
 *
 * They follow the same octagon the stands do, so they stay on the hoarding
 * line whatever the stands do next — which is the third time this session a
 * derived boundary has replaced a written-down one, and for the same reason.
 */
function buildPitchsideAds(
  THREE: Three,
  crest: import("three").Texture | null,
  wordmark: import("three").Texture | null,
) {
  const group = new THREE.Group();
  if (!crest && !wordmark) return group;

  const front = FIELD_WIDE / 2 + SIDELINE_DEPTH - 1.15;
  const zMax = OWN_END_Z + 14 - 1.15;
  const zMin = OPP_END_Z - 14 + 1.15;
  /* Eight round the whole ground, not twenty-four. The hoarding behind these
     already carries the club's name in text the whole way round; the badge is
     punctuation on top of it, and punctuation every twenty-six units is just
     more text. */
  const spots = walkPolygon(octagonPoints(front, zMin, zMax, 26), 78);

  const crestPanels = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(3.4, 3.4 / CREST_ASPECT),
    new THREE.MeshStandardMaterial({
      map: crest, transparent: true, roughness: 0.82, side: THREE.DoubleSide,
    }),
    Math.ceil(spots.length / 2),
  );
  const wordPanels = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(5.2, 5.2 / WORDMARK_ASPECT),
    new THREE.MeshStandardMaterial({
      map: wordmark, transparent: true, roughness: 0.82, side: THREE.DoubleSide,
    }),
    Math.floor(spots.length / 2) + 1,
  );
  crestPanels.count = 0;
  wordPanels.count = 0;

  const put = new THREE.Object3D();
  spots.forEach((spot, i) => {
    // walkPolygon gives the heading along the edge; the face is a quarter off.
    put.rotation.set(0, spot.angle + Math.PI / 2, 0);
    /* Crest on three out of four, the wordmark on the fourth. Down here the
       badge is the thing worth showing — the name is already printed along the
       whole hoarding behind it. */
    if (i % 4 !== 3) {
      put.position.set(spot.x, 2.1, spot.z);
      put.updateMatrix();
      crestPanels.setMatrixAt(crestPanels.count, put.matrix);
      crestPanels.count += 1;
    } else {
      put.position.set(spot.x, 1.9, spot.z);
      put.updateMatrix();
      wordPanels.setMatrixAt(wordPanels.count, put.matrix);
      wordPanels.count += 1;
    }
  });

  for (const mesh of [crestPanels, wordPanels]) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}

/* A TWO-TIER STAND, AND THE SAME ONE ALL THE WAY ROUND.
 *
 * A single rake of fifteen rows is a grandstand. What makes a ground read as
 * big is the stack: a lower bowl, a band of boxes across the middle, and an
 * upper tier set back and cantilevered over the back of the lower one. The
 * band does most of that work — one horizontal line dividing the crowd into
 * two masses is what the eye reads as scale, far more than adding rows to a
 * single rake would.
 *
 * And that line has to run unbroken round the whole ground, which is what
 * decides the row counts below. The lower tier is fourteen rows EVERYWHERE —
 * touchlines, ends and corners alike — because the moment one side's band sits
 * at a different height the bowl stops being one structure and goes back to
 * being four grandstands that happen to touch. Only the upper tier varies, and
 * it steps down from the touchlines through the ends into the corners, which
 * is what real bowls do.
 *
 * The heights are worked out, not chosen. The lower tier's back row tops out
 * at 19.5 units and a spectator standing there reaches about 21.4. At an upper
 * base of 26 the soffit lands at 21.8 — twenty centimetres of headroom over
 * the last row, a ceiling people would hit. Thirty-one leaves nearly three
 * metres.
 */
const LOWER_ROWS = 14;
const LOWER_BASE = 4.4;
const UPPER_BASE = 31;
/** How far back an upper tier's front edge sits, overhanging the lower one. */
const UPPER_SETBACK = 15;
/** Upper-tier depth, stepping down away from the halfway line. */
const UPPER_ROWS_SIDE = 18;
const UPPER_ROWS_END = 15;
const UPPER_ROWS_CORNER = 12;
/** The roof rides on the upper tier now, not the lower. */
const STAND_ROOF_Y = UPPER_BASE + UPPER_ROWS_SIDE * TERRACE_RISER + 5.6;

/**
 * Where the board over the far end hangs.
 *
 * Derived, every number of it. The leading edge of the end roof is the front
 * of the end stand set back by the upper tier and pulled in by the roof's
 * own overhang — the same expression buildRoofRing uses for its inner ring —
 * and the board hangs off that edge, far enough below the roof to be under it
 * and high enough above the top row to be over the crowd rather than in it.
 *
 * Written down instead, it drifts: this board spent two rebuilds sealed inside
 * the back of the stand because its old placement was a constant chosen when
 * the stands were half this size.
 */
const END_ROOF_EDGE_Z = OPP_END_Z - 14 - UPPER_SETBACK + 3.4;
const BOARD_PLACE = {
  z: END_ROOF_EDGE_Z + 2.2,
  /* Seventeen below the roof, not ten. A fixed board climbs the frame as the
     camera closes on it, so what is framed well from the own twenty runs into
     the HUD bar by the halfway line — and the taller board below reaches it
     sooner. Nineteen keeps the header clear of the bar's fade the whole way
     down; at seventeen the club's name was still being eaten at the halfway
     line, which is the one place a board is looked at longest. */
  y: STAND_ROOF_Y - 19,
  /* Fifty-two, not forty. Type is only legible at a size, and the board is
     where the size comes from: at forty units the header arrived six pixels
     tall, and no amount of redrawing the texture fixes a line that small.
     Thirty per cent more board is thirty per cent more of every letter on it,
     and fifty-two across a hundred-and-forty-unit end is what a modern ground
     hangs anyway. */
  width: 52,
};

function buildTieredStand(
  THREE: Three,
  options: {
    length: number;
    upperRows: number;
    boards: import("three").Texture | null;
    faces: CrowdFaces;
    seed: number;
  },
) {
  const { length, upperRows, boards, faces, seed } = options;
  const group = new THREE.Group();

  // The lower bowl. No roof of its own — the upper tier is its roof.
  group.add(buildTerrace(THREE, {
    length,
    rows: LOWER_ROWS,
    base: LOWER_BASE,
    roof: false,
    boards,
    faces,
    seed,
  }));

  /* The band between the tiers: a run of boxes behind glass, which is what
     sits there in every two-tier ground and what gives the stand its dividing
     line. Built here rather than inside buildTerrace because it belongs to the
     gap between two of them and to neither one. */
  const lowerTop = LOWER_BASE + LOWER_ROWS * TERRACE_RISER;
  const bandHeight = UPPER_BASE - 4.2 - lowerTop;
  const bandX = UPPER_SETBACK + 1.2;
  const concrete = new THREE.MeshStandardMaterial({ color: 0x6f7784, roughness: 0.92 });

  const band = new THREE.Mesh(new THREE.BoxGeometry(2.4, bandHeight, length), concrete);
  band.position.set(bandX, lowerTop + bandHeight / 2, 0);
  band.castShadow = true;
  band.receiveShadow = true;
  group.add(band);

  /* The glass. Dark and slightly reflective: from the pitch a box front is a
     black band with the sky in it, and that near-black is the strongest
     horizontal in the whole stand. */
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, bandHeight * 0.62, length - 2),
    new THREE.MeshStandardMaterial({ color: 0x141a26, roughness: 0.18, metalness: 0.55 }),
  );
  glass.position.set(bandX - 1.25, lowerTop + bandHeight * 0.55, 0);
  group.add(glass);

  // Mullions, so the glazing reads as a row of boxes rather than one long pane.
  const mullions = Math.max(6, Math.round(length / 7));
  const mullion = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.42, bandHeight * 0.66, 0.34), concrete, mullions,
  );
  const put = new THREE.Object3D();
  for (let i = 0; i < mullions; i += 1) {
    put.position.set(bandX - 1.3, lowerTop + bandHeight * 0.55, -length / 2 + (length * (i + 0.5)) / mullions);
    put.updateMatrix();
    mullion.setMatrixAt(i, put.matrix);
  }
  mullion.instanceMatrix.needsUpdate = true;
  mullion.castShadow = true;
  group.add(mullion);

  /* The upper tier, set back. It no longer carries a roof of its own: the
     ring does, in one piece, for the whole ground — see buildRoofRing. Eight
     separate plates could not meet at the corners without gapping. */
  const upper = buildTerrace(THREE, {
    length,
    rows: upperRows,
    base: UPPER_BASE,
    roof: false,
    boards,
    faces,
    seed: seed + 0x10,
    // Its columns have to reach the ground, not its own thirty-unit footing.
    footY: 0,
  });
  upper.position.x = UPPER_SETBACK;
  group.add(upper);

  return group;
}

function buildStand(
  THREE: Three,
  boards: import("three").Texture | null,
  faces: CrowdFaces,
  side: 1 | -1,
) {
  const group = buildTieredStand(THREE, {
    length: FIELD_LONG + 40,
    upperRows: UPPER_ROWS_SIDE,
    boards,
    faces,
    seed: side > 0 ? 0x5eed01 : 0x5eed02,
  });

  /* Set back far enough that a sideline fits in front of it. At the eight
     units this used to sit at there were four metres between the touchline
     and the wall — a corridor, not a team area, and everything a televised
     touchline carries would have been standing on the paint. */
  group.position.set(side * (FIELD_WIDE / 2 + SIDELINE_DEPTH), 0, (OWN_END_Z + OPP_END_Z) / 2);
  group.rotation.y = side > 0 ? 0 : Math.PI;
  return group;
}

/**
 * THE PLAYERS' TUNNEL.
 *
 * The one opening in a ground that everybody can point to. A stadium has many
 * ways in and only one that matters, and its absence is felt rather than
 * noticed: a bowl with no tunnel is a bowl whose teams have no way of having
 * arrived.
 *
 * It is built at field level in the end the drive travels towards, so it is in
 * shot for most of the journey rather than behind the camera. The mouth is the
 * deepest black in the scene on purpose — a tunnel in daylight returns almost
 * nothing, and it is that contrast against a sunlit wall that reads as depth
 * rather than as a painted rectangle.
 */

function buildPlayerTunnel(THREE: Three, z: number) {
  const group = new THREE.Group();

  const concrete = new THREE.MeshStandardMaterial({ color: 0x6e7684, roughness: 0.94 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x21254b, roughness: 0.7 });

  /* The opening. Deep rather than flat, so that from an angle you see into it
     and the near edge casts across the far wall — a plane painted black stays
     black from every direction and gives the trick away immediately. */
  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(7.4, 4.6, 9),
    new THREE.MeshStandardMaterial({ color: 0x05070b, roughness: 1 }),
  );
  mouth.position.set(0, 2.3, z - 4);
  group.add(mouth);

  // The jambs and the head, which is what makes an opening rather than a hole.
  for (const side of [-1, 1]) {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(1.8, 5.6, 1.6), concrete);
    jamb.position.set(side * 4.6, 2.8, z);
    jamb.castShadow = true;
    jamb.receiveShadow = true;
    group.add(jamb);
  }

  const head = new THREE.Mesh(new THREE.BoxGeometry(11, 1.5, 1.6), concrete);
  head.position.set(0, 5.35, z);
  head.castShadow = true;
  head.receiveShadow = true;
  group.add(head);

  /* The club's band across the head of it, which every ground that has a
     tunnel puts there. */
  const band = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.9, 0.3), trim);
  band.position.set(0, 5.35, z + 0.85);
  group.add(band);

  return group;
}

function buildCornerStand(
  THREE: Three,
  boards: import("three").Texture | null,
  faces: CrowdFaces,
  x: number,
  z: number,
  seed: number,
) {
  const group = buildTieredStand(THREE, {
    length: 82,
    /* The shallowest upper tier in the ground. A corner that matches the main
       stand for height reads as a mistake in the geometry rather than as
       architecture — real bowls step down into their corners. The LOWER tier
       still matches, because the band it carries has to stay level the whole
       way round or the bowl comes apart into separate stands again. */
    upperRows: UPPER_ROWS_CORNER,
    boards,
    faces,
    seed,
  });
  group.position.set(x, 0, z);
  const outX = Math.sign(x);
  const outZ = Math.sign(z || 1);
  group.rotation.y =
    outX > 0
      ? (outZ > 0 ? -Math.PI / 4 : Math.PI / 4)
      : (outZ > 0 ? (-3 * Math.PI) / 4 : (3 * Math.PI) / 4);
  return group;
}

function buildEndStand(
  THREE: Three,
  boards: import("three").Texture | null,
  faces: CrowdFaces,
  z: number,
  outward: 1 | -1,
) {
  const group = buildTieredStand(THREE, {
    length: FIELD_WIDE + 46,
    upperRows: UPPER_ROWS_END,
    boards,
    faces,
    seed: outward > 0 ? 0x5eed03 : 0x5eed04,
  });
  group.position.set(0, 0, z);
  // Turned a quarter so the rake climbs away from the end line.
  group.rotation.y = outward > 0 ? -Math.PI / 2 : Math.PI / 2;
  return group;
}

/**
 * Turns a standard material into cloth.
 *
 * A flag was a PlaneGeometry with a picture on it, swinging a few degrees
 * about its middle. That is a sign on a hinge, and it read as one: a rigid
 * rectangle with a logo inside. No amount of texture work fixes it, because
 * the thing that says "cloth" is not the pattern — it is the shape, and a
 * plane has none.
 *
 * So the plane is subdivided and a travelling wave is pushed through it in the
 * vertex shader. Two things make it convince:
 *
 *  - The amplitude RAMPS FROM THE ANCHOR. A flag is nailed to its pole and
 *    free at the fly end, so the wave has to be zero at one edge and largest
 *    at the other. Waving the whole sheet evenly looks like a bedsheet on a
 *    line, not a flag on a mast.
 *
 *  - The NORMAL IS RECOMPUTED, analytically, from the same expression. This
 *    is the half that actually matters. Displacing vertices while leaving the
 *    normals pointing flat out gives you a wavy silhouette painted in flat
 *    light — the folds are visible at the edge and invisible across the face.
 *    Differentiating the wave costs two cosines and buys the self-shading that
 *    makes a fold read as a fold.
 *
 * The plane's local frame makes the derivative exact rather than approximate:
 * the surface is z = f(x, y) with tangents along x and y, so the normal is
 * just (-df/dx, -df/dy, 1). No tangent basis, no finite differences.
 *
 * The phase comes out of the object's own position in the world, which means
 * one material can serve every flag in the ground: no per-mesh uniform, no
 * clone per instance, one number updated per frame. Instanced meshes read it
 * from the instance matrix instead, so a whole ring of banners animates out of
 * step with itself for free.
 */
type ClothOptions = {
  /** "hoist" is held along its -x edge (a flag on a pole); "hang" along its
   *  +y edge (a banner off a rail). */
  hold: "hoist" | "hang";
  /** Cloth width, and for a flag the distance from hoist to fly. */
  width: number;
  /** Cloth height, and for a banner the drop from the rail. */
  height: number;
  /** How far the free edge travels, in scene units. */
  amplitude: number;
  /** Folds across the width. */
  folds: number;
  /** Strength of the slower ripple down the height, against the folds. */
  cross: number;
  /** How far the free edge falls away under its own weight. */
  sag: number;
  /** Beats per second. */
  speed: number;
  /** True when the mesh is instanced, so the phase must come from the
   *  instance matrix rather than the model matrix. */
  instanced?: boolean;
};

function makeCloth(
  THREE: Three,
  material: import("three").MeshStandardMaterial,
  o: ClothOptions,
) {
  const time = { value: 0 };
  const origin = o.instanced ? "instanceMatrix[3].xyz" : "modelMatrix[3].xyz";

  /* THE FOLD RUNS ACROSS THE WIDTH IN BOTH CASES; WHAT DIFFERS IS WHERE IT
     GROWS FROM.

     A flag is held at the hoist, so the fold is zero at the mast and largest
     at the fly: the ramp runs along the same axis as the fold. A banner is
     held along a rail at the top and hangs, so the fold is zero at the rail
     and largest at the hem: the ramp runs down the drop, ACROSS the fold.
     That is drape, and it is what separates a hanging banner from a flag —
     getting it wrong gives a banner horizontal corrugations, which is a
     roller blind. */
  const ramp =
    o.hold === "hoist"
      ? `clamp((position.x + ${(o.width / 2).toFixed(4)}) * ${(1 / o.width).toFixed(6)}, 0.0, 1.0)`
      : `clamp((${(o.height / 2).toFixed(4)} - position.y) * ${(1 / o.height).toFixed(6)}, 0.0, 1.0)`;
  /* d(ramp)/dx and d(ramp)/dy: one of the two is zero, and dropping the other
     flattens the light exactly where the cloth moves most. */
  const dRampX = o.hold === "hoist" ? (1 / o.width).toFixed(6) : "0.0";
  const dRampY = o.hold === "hoist" ? "0.0" : (-1 / o.height).toFixed(6);
  const foldK = ((o.folds * Math.PI * 2) / o.width).toFixed(6);
  const crossK = (Math.PI * 2 / Math.max(o.height, 0.001)).toFixed(6);
  /* A flag's wave travels out to the fly; a banner's folds mostly stay put and
     breathe. */
  const travel = o.hold === "hoist" ? o.speed : o.speed * 0.35;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uClothTime = time;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uClothTime;")
      /* beginnormal_vertex runs before begin_vertex and both are inlined into
         the same main(), so the surface is solved once here and each result is
         used where it belongs. */
      .replace(
        "#include <beginnormal_vertex>",
        `vec3 clothRoot = ${origin};
float clothPhase = clothRoot.z * 0.31 + clothRoot.x * 0.047;
float clothU = ${ramp};
float clothAmp = ${o.amplitude.toFixed(4)} * clothU * clothU;
float clothA = position.x * ${foldK} - uClothTime * ${travel.toFixed(3)} + clothPhase;
float clothB = position.y * ${crossK} + uClothTime * ${(o.speed * 0.29).toFixed(3)} + clothPhase * 1.7;
float clothW = sin(clothA) + ${o.cross.toFixed(3)} * sin(clothB);
float clothZ = clothAmp * clothW;
/* Differentiated from the expression above rather than sampled around it, so
   the folds light correctly instead of being a wavy silhouette in flat light.
   The plane's local frame makes this exact: the surface is z = f(x, y) with
   tangents along x and y, so the normal is just (-df/dx, -df/dy, 1). */
float clothDA = ${o.amplitude.toFixed(4)} * 2.0 * clothU;
float clothDX = clothDA * ${dRampX} * clothW + clothAmp * ${foldK} * cos(clothA);
float clothDY = clothDA * ${dRampY} * clothW
  + clothAmp * ${o.cross.toFixed(3)} * ${crossK} * cos(clothB);
vec3 objectNormal = normalize(vec3(-clothDX, -clothDY, 1.0));
#ifdef USE_TANGENT
  vec3 objectTangent = vec3( tangent.xyz );
#endif`,
      )
      .replace(
        "#include <begin_vertex>",
        `vec3 transformed = vec3( position );
transformed.z += clothZ;
/* Cloth has a fixed length, so a sheet that folds has to pull its free edge
   back towards whatever holds it. Leave it out and the cloth stretches as it
   moves. */
${
          o.hold === "hoist"
            ? /* The fly end is dragged back towards the mast. */
              "transformed.x -= 0.5 * clothAmp * abs(clothW);"
            : /* The folds run ACROSS a hanging banner, so its width is what
                 the folds eat: both edges come in towards the middle, which is
                 what stops the sides being two ruled lines. The hem lifts as
                 well, because the drape shortens the drop. */
              `transformed.x -= sign(position.x) * 0.55 * clothAmp * abs(clothW);
transformed.y += 0.3 * clothAmp * abs(clothW);`
        }
/* And it has weight. */
transformed.y -= ${o.sag.toFixed(4)} * clothU * clothU;`,
      );
  };
  /* Three.js keys its program cache on the material's own settings, which know
     nothing about what onBeforeCompile just did. Without this every cloth in
     the scene would be handed whichever variant compiled first. */
  material.customProgramCacheKey = () =>
    `cloth:${o.hold}:${o.width}:${o.height}:${o.amplitude}:${o.folds}:${o.cross}:${o.sag}:${o.speed}:${o.instanced ? 1 : 0}`;
  return time;
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
function buildFlags(
  THREE: Three,
  flag: import("three").Texture,
  crestCloth: import("three").Texture | null,
  spots: { x: number; z: number; angle: number }[],
  roofY: number,
) {
  const group = new THREE.Group();
  const times: { value: number }[] = [];

  /* SUBDIVIDED, BECAUSE THE WAVE LIVES IN THE VERTICES.
     A flag is about twenty-five pixels across from the far end of the field,
     so twenty-four segments along the span is roughly one per pixel — enough
     that a fold is a curve rather than a crease, and well short of the point
     where more would show. */
  const SPAN = 5.6;
  const DROP = 3.6;
  const geometry = new THREE.PlaneGeometry(SPAN, DROP, 24, 10);
  /* The crest cloth takes its shape from the crest file rather than sharing
     the wordmark flag's proportions. */
  const crestDrop = SPAN / CREST_ASPECT;
  const crestGeometry = new THREE.PlaneGeometry(SPAN, crestDrop, 24, 10);

  /* Two cloths, alternating round the roof. A roofline of identical flags is
     bunting: it repeats, and once the eye finds the period it stops reading
     them as flags. */
  const material = new THREE.MeshStandardMaterial({
    map: flag, side: THREE.DoubleSide, roughness: 0.88,
  });
  const cloth: ClothOptions = {
    hold: "hoist", width: SPAN, height: DROP,
    amplitude: 0.72, folds: 1.35, cross: 0.42, sag: 0.4, speed: 3.4,
  };
  times.push(makeCloth(THREE, material, cloth));

  /* One sheet, not a transparent badge in front of a navy panel: two cloths
     folding separately would cross, and the crest would flicker through its
     own backing. The club's file is printed into the cloth instead. */
  const crestMaterial = crestCloth
    ? new THREE.MeshStandardMaterial({ map: crestCloth, side: THREE.DoubleSide, roughness: 0.88 })
    : null;
  if (crestMaterial) {
    times.push(makeCloth(THREE, crestMaterial, { ...cloth, height: crestDrop }));
  }

  const poleMaterial = new THREE.MeshStandardMaterial({
    color: 0x9aa7b8, roughness: 0.5, metalness: 0.5,
  });
  const POLE_H = 9.2;
  const poleGeometry = new THREE.CylinderGeometry(0.11, 0.11, POLE_H, 8);

  spots.forEach((spot, i) => {
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.set(spot.x, roofY + POLE_H / 2, spot.z);
    group.add(pole);

    const useCrest = i % 2 !== 0 && crestMaterial !== null;

    /* THE PIVOT GOES ON THE MAST, NOT THROUGH THE CLOTH.
       The flag used to swing about its own centre, which walked the hoist
       edge half a unit clear of the mast at the ends of the swing — the flag
       and the thing it is tied to visibly came apart. A mast-mounted swivel
       holds them together, and it is what a halyard actually does. */
    const swivel = new THREE.Group();
    swivel.position.set(spot.x, roofY + POLE_H - 1.6, spot.z);
    const sheet = new THREE.Mesh(
      useCrest ? crestGeometry : geometry,
      useCrest ? crestMaterial! : material,
    );
    /* Hung off the mast so the hoist edge meets it, with every flag in the
       ground running the same way. Real grounds fly them in one wind. */
    sheet.position.x = SPAN / 2;
    swivel.add(sheet);
    swivel.userData.phase = i * 0.7;
    group.add(swivel);
  });
  group.userData.times = times;
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
/**
 * The call, hanging over the end zone.
 *
 * Tilted on purpose, and on two axes. A plane square to the camera is a
 * caption — it sits on the picture rather than in it. Rolled a little and
 * turned a little, it has somewhere to be: the type runs back into the scene,
 * the crowd shows through the gaps between letters, and it reads as something
 * hanging in the air above the end zone rather than as an overlay drawn on
 * top of one.
 *
 * It writes no depth. The letters are a transparent PNG-shaped thing with
 * holes in it, and a transparent surface that writes depth punches its own
 * bounding box out of everything drawn after it — the crowd would vanish in a
 * rectangle around the word.
 */
function buildTouchdownCall(THREE: Three, texture: import("three").Texture) {
  const WIDTH = 26;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    opacity: 0,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(WIDTH, WIDTH * (384 / 2048)),
    material,
  );
  /* Over the end zone, above the crossbar, short of the end line so the end
     stand is behind it rather than through it.

     THE HEIGHT IS SOLVED AGAINST THE RENDERED FRAME, NOT GUESSED.
     At 17.4 it sat 28.5 degrees above the view axis against a half field of
     view of 29, so all that reached the picture was the underside of the
     letters. The camera's own downward tilt was the thing I had wrong — read
     off the crossbar's position in the frame it is 3.1 degrees, not the 5.1
     the shot definition implies. With that, 12.2 puts the word in the upper
     third with the goal below it. */
  mesh.position.set(0.6, 12.2, OPP_GOAL_Z - 9);
  mesh.rotation.set(0.05, -0.16, 0.085);
  mesh.renderOrder = 3;
  mesh.visible = false;
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * The board over the far end, carrying the real next fixture.
 *
 * IT USED TO STAND BEHIND THE GROUND, AND THE GROUND GREW PAST IT.
 *
 * Its place was written down as a fixed eighty-two units beyond the end line,
 * at a fixed height of forty — right when the stands were low and single-tier.
 * Then they went two-tier and gained a roof, and nobody moved the board. It
 * ended up twenty-three units behind the back of the upper tier with its top
 * edge a unit BELOW the roof: sealed inside the building, lit, textured,
 * repainted on every fetch, and visible to nobody. Exactly the drift that put
 * the flags in the wrong place twice.
 *
 * Standing it behind the ground cannot be made to work. For the bottom of the
 * board to clear the leading edge of the end roof from a camera at eye height
 * on the field, it would have to start at about y 67 — higher than the
 * stadium. So it comes inside, where a real ground hangs one: off the front
 * edge of the end roof, above the end seating, facing back down the field.
 *
 * Every number below is derived from the stands themselves, so a stand that
 * moves again takes the board with it.
 */
function buildScoreboard(
  THREE: Three,
  texture: import("three").Texture,
  place: { z: number; y: number; width: number },
) {
  const group = new THREE.Group();
  /* The face keeps the proportions the texture is drawn at; the frame is a
     touch larger all round, which is the frame. */
  const FACE_RATIO = 27 / 72;
  const faceWidth = place.width;
  const faceHeight = faceWidth * FACE_RATIO;
  const frameWidth = faceWidth * (76 / 72);
  const frameHeight = faceHeight * (30 / 27);

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(frameWidth, frameHeight, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x0b111b, roughness: 0.8 }),
  );
  group.add(frame);

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(faceWidth, faceHeight),
    // Fog off: a bright board cuts through haze instead of dissolving into
    // it, which is what makes it read as a light source.
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, fog: false }),
  );
  face.position.z = 1.3;
  group.add(face);

  /* HUNG, NOT STOOD. The legs it used to stand on made sense under a board
     planted on the ground behind the stadium; a board under a roof hangs from
     it, and the two hangers are what say so. */
  const steel = new THREE.MeshStandardMaterial({ color: 0x151d2a, roughness: 0.9 });
  const drop = STAND_ROOF_Y - place.y - frameHeight / 2;
  if (drop > 0) {
    for (const x of [-frameWidth * 0.31, frameWidth * 0.31]) {
      const hanger = new THREE.Mesh(new THREE.BoxGeometry(0.7, drop, 0.7), steel);
      hanger.position.set(x, frameHeight / 2 + drop / 2, 0);
      group.add(hanger);
    }
  }

  group.position.set(0, place.y, place.z);
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
/* STRAIGHT DOWN THE MIDDLE, AND LEVEL.
 *
 * You walk through the middle of the field. The camera sits on the centre
 * line, looks along it, and the only thing that changes as you scroll is how
 * far down the ground it has travelled.
 *
 * It was angled in from one side for a while, on the reasoning that television
 * never stands in the middle and that the touchlines — where the benches, the
 * team areas and most of the work are — sit at the edges of a centred frame.
 * That reasoning was about the stadium. This page is a squad presentation, the
 * cards fly straight at you down the centre of the screen, and a pitch running
 * diagonally behind them fights that rather than framing it. Centred is what
 * was asked for and centred is what the page is actually for.
 *
 * Nothing here is a function of the scroll, which is the part that matters and
 * the part that has to stay true whatever the framing. The cards are pinned to
 * the screen and cannot follow a camera that moves, so any lateral movement
 * slides the world under a squad that stays nailed in place — that
 * disagreement is what once read as being thrown backwards. One x, one height,
 * one lens, level. Only the distance down the field changes, which is exactly
 * what the cards are doing too.
 *
 * The cost is honest and worth stating: the touchlines are further from the
 * middle of the frame this way, so the team areas read as detail along the
 * edges rather than as the subject. They are still there, and the end stand
 * and both scoreboards still arrive head on.
 */
const STEADY: Shot = { at: 0, x: 0, y: 7.6, lx: 0, ly: 3.5, ahead: 46, fov: 58, roll: 0 };

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
      const [THREE, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { ShaderPass }, { GTAOPass }] = await Promise.all([
        import("three"),
        import("three/examples/jsm/postprocessing/EffectComposer.js"),
        import("three/examples/jsm/postprocessing/RenderPass.js"),
        import("three/examples/jsm/postprocessing/UnrealBloomPass.js"),
        import("three/examples/jsm/postprocessing/OutputPass.js"),
        import("three/examples/jsm/postprocessing/ShaderPass.js"),
        import("three/examples/jsm/postprocessing/GTAOPass.js"),
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

      /* Near at one unit, not a tenth of one. Nothing in this scene ever comes
         within half a metre of the lens — the nearest thing is the turf a few
         units ahead — and a near plane ten times closer than it needs to be
         throws away a decade of depth precision across the whole ground. That
         precision is what screen-space occlusion reconstructs position from,
         so at 0.1 the pass was computing occlusion from noise. */
      const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 1, 600);
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

      /* AMBIENT OCCLUSION, AND WHY IT IS THE LAST BIG ONE.

         Everything in this bowl sat on the grass without touching it. A
         directional sun casts shadows, and shadows are what tell you where a
         thing is; occlusion is what tells you how much of a thing there is.
         Without it a stand is a painted ramp, a bench floats a millimetre
         above the turf, a crowd is a pattern rather than eight thousand
         objects each shading its neighbour, and a helmet has no weight.

         It is not a filter over the picture. It darkens exactly the creases
         the geometry already has — under the bench, between the rows, in the
         gangways, where the wall meets the ground — so it only has something
         to work with because the geometry is there. Adding it before the
         sideline and the seating would have been the fake-progress version of
         this: a blur that darkens corners in a scene with no corners.

         The radius is in world units and has to be scaled to the ground, not
         to a room. The default is sized for furniture; at the 2.8 units this
         started on — about a metre and a half — the occlusion was real and
         invisible, because the camera watches this from fifty units away and
         a metre and a half of contact covers a pixel there. Measured, it moved
         the stands by 1.7%, which is a no-op dressed as a feature. Nine units
         is the gap between rows of a stand and the depth of a roof, which is
         the scale the shading actually has to work at here. */
      const ao = new GTAOPass(scene, camera, window.innerWidth, window.innerHeight);
      ao.output = GTAOPass.OUTPUT.Default;
      ao.updateGtaoMaterial({
        radius: 9,
        distanceExponent: 1.2,
        thickness: 3.5,
        scale: 1.35,
        samples: 12,
      });
      composer.addPass(ao);
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

            /* THE BROADCAST GRADE.

               This is a colour grade and nothing more — it moves no geometry
               and it is worth saying plainly, because a grade is exactly the
               kind of change that can be mistaken for progress. It earns its
               place only now that there is something built to grade.

               Televised football does not look like a raw render, and the
               differences are consistent enough to be written down. Shadows
               run cool and highlights run warm, because a camera balanced for
               daylight puts sky in the shade and sun in the light. Contrast
               sits higher than linear, so the paint separates from the grass.
               And the grass itself is pulled back: turf on a broadcast is a
               muted olive-green, never the saturated green a shader hands you,
               and leaving it bright is the single thing that most makes a
               rendered pitch look like plastic. */
            float luma0 = dot(col, vec3(0.2126, 0.7152, 0.0722));

            // Split tone: cool in the shadows, warm in the highlights.
            vec3 shadowTint = vec3(0.96, 0.99, 1.06);
            vec3 highTint   = vec3(1.045, 1.007, 0.965);
            col *= mix(shadowTint, highTint, smoothstep(0.18, 0.78, luma0));

            /* A gentle S-curve. Filmic contrast, not a crushed one — and
               gentler than it first was: at a third strength the grade took
               sixteen per cent off the pitch, which is a mood change rather
               than a grade. Ten is the difference between turf and neon. */
            col = clamp(col, 0.0, 1.0);
            col = col * col * (3.0 - 2.0 * col) * 0.24 + col * 0.76;

            /* Hold the green back. Only the green, and only where it actually
               dominates, so the red hoardings and the navy stands keep their
               colour while the pitch stops glowing. */
            float greenness = clamp((col.g - max(col.r, col.b)) * 2.4, 0.0, 1.0);
            float grey = dot(col, vec3(0.2126, 0.7152, 0.0722));
            col = mix(col, vec3(grey), greenness * 0.2);
            col = mix(col, col * vec3(0.985, 0.965, 0.945), greenness * 0.42);

            // Everything else a touch richer, which is what a broadcast does.
            float g2 = dot(col, vec3(0.2126, 0.7152, 0.0722));
            col = mix(vec3(g2), col, 1.08);
            col = clamp(col, 0.0, 1.0);

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
      /* THE CLUB'S OWN ARTWORK, LOADED RATHER THAN REDRAWN.

         Everything else in this scene is painted onto a canvas at runtime,
         which is right for turf and crowds and hoardings — they are patterns,
         and a pattern is cheaper to generate than to ship. A badge is not a
         pattern. It has a specific shape that is either correct or wrong, and
         an approximation of a club's own mark drawn from memory is wrong in a
         way nobody has to squint to see. These files are already in the
         project and already served.

         The small transparent variants, not the 4K ones: at the size a banner
         occupies these are more resolution than the screen can take, and the
         4K crest alone is 1.9MB. */
      const textures = new THREE.TextureLoader();
      /* Anything that needs the crest AFTER it has decoded registers here.
         A Texture is an EventDispatcher but it does not announce its own
         arrival — it only sets needsUpdate — so there is nothing to listen
         for, and the loader's callback is the one moment the image is known
         to exist. */
      const onCrestReady: (() => void)[] = [];
      const artworkArrived = () => {
        for (const fn of onCrestReady) fn();
      };
      const clubCrest = textures.load("/rascals-logo-transparent.png", artworkArrived);
      clubCrest.colorSpace = THREE.SRGBColorSpace;
      clubCrest.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const clubWordmark = textures.load("/rascals-endzone-wordmark-v3.png", artworkArrived);
      clubWordmark.colorSpace = THREE.SRGBColorSpace;
      clubWordmark.anisotropy = renderer.capabilities.getMaxAnisotropy();

      /* THE CLOTH THE CLUB'S MARKS ARE PRINTED ON.

         Three sheets: two for the banners round the roof and one for the
         crest flags on the masts. Each starts as plain cloth and the marks
         are stamped in when the files decode, so nothing in the scene waits
         on the network and nothing flies blank for longer than a fetch.

         Printing INTO the cloth is what lets each of these be a single
         opaque mesh. The alternative — a transparent badge floated in front
         of a coloured panel — cannot survive the cloth folding, because the
         two sheets fold independently and cross. */
      const CREST_BOX = { cy: 0.40, w: 0.74, h: 0.44 };
      const WORD_BOX = { cy: 0.78, w: 0.82, h: 0.16 };
      const bannerCrest = createClothTexture({
        aspect: BANNER_W / BANNER_H, ground: "#21254b",
        band: { edge: "head", color: "#9e210f", size: 0.055 },
      });
      const bannerWord = createClothTexture({
        aspect: BANNER_W / BANNER_H, ground: "#9e210f",
        band: { edge: "head", color: "#21254b", size: 0.055 },
      });
      const flagCrest = createClothTexture({
        aspect: CREST_ASPECT, ground: "#21254b",
        band: { edge: "hoist", color: "#9e210f", size: 0.055 },
      });

      const asTexture = (print: { canvas: HTMLCanvasElement } | null) => {
        if (!print) return null;
        const t = new THREE.CanvasTexture(print.canvas);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return t;
      };
      const bannerCrestTexture = asTexture(bannerCrest);
      const bannerWordTexture = asTexture(bannerWord);
      const flagCrestTexture = asTexture(flagCrest);

      const stampWhenReady = (
        source: import("three").Texture,
        aspect: number,
        jobs: [typeof bannerCrest, import("three").CanvasTexture | null, typeof CREST_BOX][],
      ) => {
        const run = () => {
          const image = source.image as CanvasImageSource | undefined;
          if (!image) return;
          for (const [print, texture, box] of jobs) {
            if (!print || !texture) continue;
            print.stamp(image, aspect, box);
            texture.needsUpdate = true;
          }
        };
        if (source.image) run();
        else onCrestReady.push(run);
      };
      stampWhenReady(clubCrest, CREST_ASPECT, [
        [bannerCrest, bannerCrestTexture, CREST_BOX],
        [flagCrest, flagCrestTexture, { cy: 0.5, w: 0.78, h: 0.74 }],
      ]);
      stampWhenReady(clubWordmark, WORDMARK_ASPECT, [
        [bannerCrest, bannerCrestTexture, WORD_BOX],
        [bannerWord, bannerWordTexture, { cy: 0.5, w: 0.86, h: 0.30 }],
      ]);

      /* Three faces for eight thousand people. That is enough: at the size a
         spectator occupies you are reading hair mass and skin, not features,
         and the variation the eye actually picks up comes from the shirt
         colours, the heights and the empty seats. A fourth sheet would cost a
         draw call per stand to be noticed by nobody. */
      const crowdFaces: import("three").Texture[] = [];
      for (let i = 0; i < 3; i += 1) {
        const canvas = createCrowdFaceTexture(i);
        if (!canvas) continue;
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        crowdFaces.push(texture);
      }

      const boardCanvasAds = createAdBoardTexture();
      const adTexture = boardCanvasAds ? new THREE.CanvasTexture(boardCanvasAds) : null;
      if (adTexture) {
        adTexture.colorSpace = THREE.SRGBColorSpace;
        adTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }

      const zoneCanvas = createTeamZoneTexture();
      const zoneTexture = zoneCanvas ? new THREE.CanvasTexture(zoneCanvas) : null;
      if (zoneTexture) {
        zoneTexture.colorSpace = THREE.SRGBColorSpace;
        zoneTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }

      /* The team areas, which is where a televised frame of this sport spends
         most of its bottom third. */
      scene.add(
        buildSideline(THREE, {
          touchline: FIELD_WIDE / 2, side: 1, fromZ: OPP_END_Z + 22, toZ: OWN_END_Z - 22,
          faces: crowdFaces, zone: zoneTexture, seed: 0x51de01,
        }),
        buildSideline(THREE, {
          touchline: FIELD_WIDE / 2, side: -1, fromZ: OPP_END_Z + 22, toZ: OWN_END_Z - 22,
          faces: crowdFaces, zone: zoneTexture, seed: 0x51de02,
        }),
      );

      scene.add(
        buildStand(THREE, adTexture, crowdFaces, 1),
        buildStand(THREE, adTexture, crowdFaces, -1),
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
      scene.add(buildEndStand(THREE, adTexture, crowdFaces, OWN_END_Z + 14, 1));
      scene.add(buildEndStand(THREE, adTexture, crowdFaces, OPP_END_Z - 14, -1));

      /* The way out onto the field, set in the end the drive travels towards
         so it is in shot for the journey rather than behind the camera. */
      scene.add(buildPlayerTunnel(THREE, OPP_END_Z - 13));

      /* One roof over the whole bowl, put in after the stands so it reads as
         sitting on them. */
      const roofRing = buildRoofRing(THREE, STAND_ROOF_Y, bannerCrestTexture, bannerWordTexture);
      scene.add(roofRing);
      scene.add(buildPitchsideAds(THREE, clubCrest, clubWordmark));

      /* Close the bowl. The four corner chamfers meet the touchline fronts at
         x = ±(half the field + the sideline) and the end fronts at the z the
         end stands sit on, so the ring is continuous from the pitch. */
      const cornerX = FIELD_WIDE / 2 + SIDELINE_DEPTH;
      scene.add(
        buildCornerStand(THREE, adTexture, crowdFaces, cornerX, OWN_END_Z + 14, 0xc02e01),
        buildCornerStand(THREE, adTexture, crowdFaces, -cornerX, OWN_END_Z + 14, 0xc02e02),
        buildCornerStand(THREE, adTexture, crowdFaces, cornerX, OPP_END_Z - 14, 0xc02e03),
        buildCornerStand(THREE, adTexture, crowdFaces, -cornerX, OPP_END_Z - 14, 0xc02e04),
      );

      // The board carries whatever the schedule says is next. It is drawn
      // once with a placeholder and repainted when the fetch lands, so a slow
      // network never holds the scene up.
      let boardTexture: import("three").CanvasTexture | null = null;
      const boardCanvas = createScoreboardTexture({ competition: "HELLENSTEIN RASCALS" });
      if (boardCanvas) {
        boardTexture = new THREE.CanvasTexture(boardCanvas);
        boardTexture.colorSpace = THREE.SRGBColorSpace;
        boardTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        /* ONE BOARD, AT THE END THE DRIVE IS DRIVING TOWARDS.

           There were two, on the reasoning that a ground this size has one at
           each end. It does — but this camera starts at the own twenty and
           travels away from it, looking down the field for the whole page. The
           near board stood at z +99 with the camera never closer than -34 and
           never turning round, so it was rendered, lit and repainted on every
           fetch for a view that does not exist. The one that is left is the one
           the drive actually arrives at. */
        scene.add(buildScoreboard(THREE, boardTexture, BOARD_PLACE));
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
      const callCanvas = createTouchdownTexture();
      let touchdownCall: import("three").Mesh | null = null;
      let callTexture: import("three").CanvasTexture | null = null;
      if (callCanvas) {
        callTexture = new THREE.CanvasTexture(callCanvas);
        callTexture.colorSpace = THREE.SRGBColorSpace;
        callTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        touchdownCall = buildTouchdownCall(THREE, callTexture);
        scene.add(touchdownCall);
      }

      let flags: import("three").Group | null = null;
      if (flagTexture) {
        flagTexture.colorSpace = THREE.SRGBColorSpace;
        flags = buildFlags(
          THREE,
          flagTexture,
          flagCrestTexture,
          roofRing.userData.flagSpots as { x: number; z: number; angle: number }[],
          STAND_ROOF_Y,
        );
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

      /* Turned down from 2.6 now that the roof ring carries the pitch. It
         still lights what it can still see — the roofs, the upper tiers, the
         sky — and overdriving it would only blow out those while leaving the
         shaded strip below exactly as dark. */
      const sun = new THREE.DirectionalLight(0xfff4e2, 1.75);
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

      /* THE ROOF RING, AND WHY THE SUN CANNOT DO THIS ALONE ANY MORE.

         Closing the bowl put the pitch at the bottom of a well. Worked out
         from the geometry: the roof's leading edge stands 56 units up and 70
         out, so from the middle of the field it cuts the sky at 38.7 degrees —
         which the sun at 59 still clears — but from the touchline it cuts at
         66.3, which the sun does not. Every team area, every bench, every
         steward, the whole strip this ground spends its bottom third on, would
         sit in permanent roof shadow lit by nothing but the sky term.

         So the ring lights it, the way a real enclosed ground does: four
         washes angled steeply in from the roof line, one per side. They cross
         over the middle and overlap at the edges, which is what gives a
         floodlit pitch its soft multi-directional shadows instead of one hard
         sun shadow — and it is why the sun below is turned down rather than
         off. It still lights the roofs, the upper tiers and the sky; it just
         no longer has to light the parts it can no longer reach.

         None of the four casts a shadow map. One sun already covers the ground
         at 2048, and four more would be four extra depth passes a frame for
         shadows that, being washes from opposite sides, would largely cancel
         each other out anyway. */
      const ringHeight = STAND_ROOF_Y;
      const ringOut = FIELD_WIDE / 2 + SIDELINE_DEPTH + UPPER_SETBACK;
      const pitchCentre = new THREE.Vector3(0, 0, (OWN_END_Z + OPP_END_Z) / 2);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const flood = new THREE.DirectionalLight(0xf4f8ff, 0.62);
        flood.position.set(
          dx * ringOut,
          ringHeight,
          pitchCentre.z + dz * (FIELD_LONG / 2 + 30),
        );
        flood.target.position.copy(pitchCentre);
        scene.add(flood, flood.target);
      }

      /* The floodlight pylons are gone, and they had to go: they stood at
         thirty units beyond the touchline, which was clear ground when the
         stands were a single rake set back eight units — and is now solidly
         inside a two-tier stand that reaches a hundred units out. A mast
         embedded in the seating is worse than no mast at all.

         An enclosed bowl does not use masts anyway. It lights the pitch from a
         ring along the roof, which is why every roofed ground looks the way it
         does, and the fittings for it are already modelled along each roof's
         leading edge. */


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
        ao.setSize(window.innerWidth, window.innerHeight);
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
        /* The cloth itself flutters in the vertex shader, which costs one
           number per material per frame however many flags are flying. What
           is left here is the slow swing of the halyard about the mast — a
           different motion on a different timescale, and the thing that stops
           thirteen flags moving as one object. */
        /* THE ARRIVAL.

           It comes in over the last eighth of the drive, which is the stretch
           the HUD already calls a touchdown — one number deciding both, so the
           word in the corner and the word in the air cannot disagree.

           The scale overshoots and settles rather than easing straight in. A
           call that grows smoothly to its final size reads as a fade; one that
           arrives slightly too big and pulls back has been thrown. */
        if (touchdownCall) {
          const arrival = Math.min(1, Math.max(0, (progress - 0.87) / 0.09));
          touchdownCall.visible = arrival > 0.001;
          if (touchdownCall.visible) {
            const material = touchdownCall.material as import("three").MeshBasicMaterial;
            material.opacity = Math.min(1, arrival * 1.5);
            const overshoot = 1 + Math.sin(Math.min(1, arrival) * Math.PI) * 0.09;
            const grow = 0.72 + 0.28 * arrival;
            touchdownCall.scale.setScalar(grow * overshoot);
            /* Hanging, not pinned: a slow drift on both axes once it has
               settled, small enough to be felt rather than watched. */
            touchdownCall.position.y = 12.2 + Math.sin(time * 0.5) * 0.34 * arrival;
            touchdownCall.rotation.z = 0.085 + Math.sin(time * 0.37) * 0.016 * arrival;
          }
        }

        for (const source of [flags, roofRing]) {
          const times = source?.userData.times as { value: number }[] | undefined;
          if (times) for (const t of times) t.value = time;
        }
        if (flags) {
          for (const child of flags.children) {
            const phase = child.userData.phase as number | undefined;
            if (phase === undefined) continue;
            child.rotation.y = Math.sin(time * 0.62 + phase) * 0.17;
            child.rotation.z = Math.sin(time * 0.9 + phase) * 0.045;
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
        callTexture?.dispose();
        bannerCrestTexture?.dispose();
        bannerWordTexture?.dispose();
        flagCrestTexture?.dispose();
        clubCrest.dispose();
        clubWordmark.dispose();
        boardTexture?.dispose();
        crowdFaces.forEach((texture) => texture.dispose());
        zoneTexture?.dispose();
        ao.dispose();
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
