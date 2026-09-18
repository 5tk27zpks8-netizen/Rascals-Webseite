"use client";

import { useEffect, useRef } from "react";
import {
  FIELD_YARDS_LONG,
  FIELD_YARDS_WIDE,
  createAdBoardTexture,
  createCrowdRowTexture,
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
function buildSky(THREE: Three) {
  const group = new THREE.Group();

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(520, 40, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uHigh: { value: new THREE.Color(0x030711) },
        uLow: { value: new THREE.Color(0x0f2438) },
        uGlow: { value: new THREE.Color(0x24486a) },
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
        uniform vec3 uGlow;
        varying vec3 vPos;

        /* Cheap hash dither. A gradient this dark bands into visible steps on
           an 8-bit display; a sub-step of noise breaks the steps up. */
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        void main() {
          vec3 dir = normalize(vPos);
          float h = clamp(dir.y * 1.25 + 0.06, 0.0, 1.0);
          vec3 col = mix(uLow, uHigh, pow(h, 0.62));
          // Light thrown back off the air just above the rim of the bowl.
          float rim = pow(1.0 - clamp(abs(dir.y) * 2.6, 0.0, 1.0), 3.0);
          col += uGlow * rim * 0.4;
          col += (hash(gl_FragCoord.xy) - 0.5) * 0.012;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  group.add(dome);

  // Stars, thinned towards the horizon.
  const count = 1400;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const theta = Math.random() * Math.PI * 2;
    // Biased upwards: near the horizon haze would wash them out.
    const phi = Math.acos(Math.random() * 0.92 + 0.04);
    const r = 470;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 30;
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    sizes[i] = 0.6 + Math.random() * 1.7;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  starGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

  const stars = new THREE.Points(
    starGeometry,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute float aSize;
        varying float vTwinkle;
        uniform float uTime;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          // Each star breathes on its own clock, so the field never pulses.
          vTwinkle = 0.65 + 0.35 * sin(uTime * 0.7 + position.x * 0.09 + position.z * 0.05);
          gl_PointSize = aSize * (300.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vTwinkle;
        void main() {
          // Round, soft-edged points; the default square is a dead giveaway.
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.06, d) * vTwinkle;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vec3(0.82, 0.88, 1.0), a);
        }
      `,
    }),
  );
  group.add(stars);
  group.renderOrder = -1;
  return { group, stars };
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
type CrowdStrips = import("three").Texture[];

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
function buildTerrace(
  THREE: Three,
  crowd: CrowdStrips,
  options: {
    length: number;
    rows: number;
    base: number;
    roof: boolean;
    boards: import("three").Texture | null;
  },
) {
  const { length, rows, base, roof, boards } = options;
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
  const low = new THREE.Color(0x11151e);
  const high = new THREE.Color(0x5e6b83);
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
      /* A floor under the ramp, so the deepest steps are grey concrete in
         shadow rather than a hole cut in the night. */
      emissive: 0x0c121c,
    }),
  );
  concrete.receiveShadow = true;
  concrete.castShadow = true;
  group.add(concrete);

  // --- the crowd ------------------------------------------------------
  if (crowd.length > 0) {
    const rowGeometry = new THREE.PlaneGeometry(length, 2.05);
    /* Cloned per terrace, because the repeat count belongs to the stand and
       not to the strip: a touchline and an end are different lengths, and the
       four strips are shared between them. Rounded, so a whole number of
       gangways fits and the aisles land in the same place on every row. */
    const tiles = Math.max(1, Math.round(length / TERRACE_TILE));
    const strips = crowd.map((source) => {
      const texture = source.clone();
      texture.needsUpdate = true;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.repeat.set(tiles, 1);
      return texture;
    });
    for (let i = 0; i < rows; i += 1) {
      const texture = strips[i % strips.length];
      /* Lifts with the concrete behind it. A row at the foot of the stand is
         in the same shadow the steps are, and the ramp has to agree or the
         people float off the structure. */
      const lift = 0.44 + 0.56 * Math.pow(i / Math.max(1, rows - 1), 0.75);
      const row = new THREE.Mesh(
        rowGeometry,
        new THREE.MeshBasicMaterial({
          map: texture,
          color: new THREE.Color(lift * 0.92, lift * 0.94, lift),
          transparent: true,
          /* Cut out rather than blended: sixty transparent strips would have
             to be sorted every frame and would still show through each other
             at a grazing angle. A cutout writes depth, so the front rows
             simply stand in front of the ones behind. */
          alphaTest: 0.45,
          side: THREE.DoubleSide,
          toneMapped: false,
        }),
      );
      row.rotation.y = Math.PI / 2;
      row.position.set(i * TERRACE_TREAD + TERRACE_TREAD * 0.42, base + i * TERRACE_RISER + 0.92, 0);
      group.add(row);
    }
  }

  // --- the front wall and the hoardings --------------------------------
  const frontWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 4.2, length),
    new THREE.MeshStandardMaterial({ color: 0x141b27, roughness: 0.9 }),
  );
  frontWall.position.set(-0.35, base - 2.1, 0);
  frontWall.receiveShadow = true;
  group.add(frontWall);

  /* The band of hoardings that runs round every ground at this level. Unlit
     and tone-mapping off: a lit board at a night match throws light back at
     the pitch rather than taking it, and it is the one bright line between
     the grass and the dark foot of the stand. */
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
      new THREE.MeshBasicMaterial({ map: band, toneMapped: false }),
    );
    hoarding.rotation.y = -Math.PI / 2;
    hoarding.position.set(-0.78, base - 2.5, 0);
    group.add(hoarding);
  }

  // --- the roof --------------------------------------------------------
  if (roof) {
    const steel = new THREE.MeshStandardMaterial({ color: 0x323d4e, roughness: 0.55, metalness: 0.55 });
    const roofY = top + 5.6;
    const overhang = 3.4;

    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(depth + 6 + overhang, 0.6, length),
      /* Not black. A roof that reads as a hole cut in the sky takes the
         trusses under it with it, and the trusses are the only thing giving
         the stand any depth above the crowd. */
      new THREE.MeshStandardMaterial({ color: 0x161e2a, roughness: 0.88, emissive: 0x080d15 }),
    );
    deck.position.set((depth + 6) / 2 - overhang / 2, roofY, 0);
    group.add(deck);

    /* The leading edge. A roof that ends on a cut line is a plane; a roof with
       a fascia beam under a strip of light is a stand, and the strip is what
       the crowd ramp below is lit by. */
    const fascia = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.9, length), steel);
    fascia.position.set(-overhang, roofY - 1.0, 0);
    group.add(fascia);

    /* Lamps along the fascia, not a strip. One continuous bright box seen
       end-on from the pitch is a line ruled across the sky — the brightest
       thing in frame and the least like a stadium. A run of separate lamps
       with dark between them reads as fittings, and the gaps give the roof
       its length as the camera travels. */
    const lamps = Math.max(4, Math.round(length / 12));
    // Instanced: sixty identical fittings round the ground is sixty draw calls
    // for four batches' worth of work.
    const fittings = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.9, 0.3, 2.4),
      new THREE.MeshBasicMaterial({ color: 0x6f839f, toneMapped: false }),
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
  crowd: CrowdStrips,
  boards: import("three").Texture | null,
  side: 1 | -1,
) {
  const group = buildTerrace(THREE, crowd, {
    length: FIELD_LONG + 40,
    rows: 15,
    base: 4.4,
    roof: true,
    boards,
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
  crowd: CrowdStrips,
  boards: import("three").Texture | null,
  z: number,
  outward: 1 | -1,
) {
  const group = buildTerrace(THREE, crowd, {
    length: FIELD_WIDE + 46,
    rows: 12,
    base: 4.4,
    roof: true,
    boards,
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
      renderer.toneMappingExposure = 0.92;

      /* Shadows are what stop everything reading as pasted onto the grass: the
         posts, the pylons and the stands all sat on the pitch without touching
         it. Only two lamps cast — a shadow map per floodlight would cost ten
         extra passes a frame for detail nobody can separate once they overlap. */
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x060d18, 0.0062);

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
          uAmount: { value: 0.022 },
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

            // Vignette, falling off smoothly rather than as a drawn ring.
            float vig = smoothstep(0.92, 0.22, r2 * 1.65);
            col *= mix(0.72, 1.0, vig);

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
        new THREE.MeshStandardMaterial({ color: 0x11301d, roughness: 1 }),
      );
      surround.rotation.x = -Math.PI / 2;
      surround.position.set(0, -0.06, centreZ);
      scene.add(surround);

      // --- stands and flags -------------------------------------------
      /* Four strips, dealt round the rows of every terrace. One would stack
         the same heads into columns all the way up the rake; four is enough
         that the eye stops finding the repeat, and it is four textures rather
         than sixty. */
      const crowdStrips: import("three").Texture[] = [];
      for (let i = 0; i < 4; i += 1) {
        const canvas = createCrowdRowTexture(i);
        if (!canvas) continue;
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        crowdStrips.push(texture);
      }
      const boardCanvasAds = createAdBoardTexture();
      const adTexture = boardCanvasAds ? new THREE.CanvasTexture(boardCanvasAds) : null;
      if (adTexture) {
        adTexture.colorSpace = THREE.SRGBColorSpace;
        adTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }

      scene.add(
        buildStand(THREE, crowdStrips, adTexture, 1),
        buildStand(THREE, crowdStrips, adTexture, -1),
      );

      const sky = buildSky(THREE);
      scene.add(sky.group);

      scene.add(buildGoal(THREE, OWN_END_Z, 1));
      scene.add(buildGoal(THREE, OPP_END_Z, -1));
      scene.add(buildEndStand(THREE, crowdStrips, adTexture, OWN_END_Z + 26, 1));
      scene.add(buildEndStand(THREE, crowdStrips, adTexture, OPP_END_Z - 26, -1));

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
      /* Ambient light is the enemy of a night match: a flat fill lit every
         corner equally and left the floodlights nothing to do, which is most
         of why the pitch read as one even sheet of green. Cut back hard so the
         lamps carve their own pools and the ground falls away between them. */
      scene.add(new THREE.HemisphereLight(0x1b3450, 0x070f08, 0.34));
      scene.add(new THREE.AmbientLight(0x101c2e, 0.22));

      /* A cone drawn at a flat opacity is a paper triangle, however faint. A
         beam of light is dense where you look through the most of it and
         nothing where the surface faces you, and it dies out before it reaches
         the grass — so the alpha is built from the viewing angle and the
         height rather than being a constant. */
      const shaftMaterial = new THREE.ShaderMaterial({
        uniforms: { uStrength: { value: 0.125 }, uColor: { value: new THREE.Color(0xc6dcff) } },
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
            float body = pow(clamp(rim, 0.0, 1.0), 2.6);
            /* Dies out at both ends: nothing at the lamp housing, nothing by
               the time it reaches the grass. A beam that stops dead at a rim
               is a cone of paper, which is what this looked like. */
            float fall = smoothstep(0.02, 0.58, vUp) * (1.0 - smoothstep(0.82, 1.0, vUp));
            float a = body * fall * uStrength;
            if (a < 0.003) discard;
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
          /* Wider penumbra and a softer falloff: a hard-edged pool is a
             torch, not a floodlight ninety feet up. */
          const lamp = new THREE.SpotLight(0xdfe9fb, 7600, 330, 0.74, 0.82, 1.8);
          lamp.position.set(x, 46, z);
          lamp.target.position.set(x * 0.15, 0, z - 12);

          /* Only the pair over midfield casts. Ten shadow maps would be ten
             extra passes a frame to separate overlapping shadows nobody can
             read apart anyway; one pair from opposite sides gives the posts
             and the stands something to stand in. */
          if (i === 2) {
            lamp.castShadow = true;
            lamp.shadow.mapSize.set(1024, 1024);
            lamp.shadow.camera.near = 12;
            lamp.shadow.camera.far = 240;
            lamp.shadow.bias = -0.0022;
            lamp.shadow.normalBias = 0.9;
            lamp.shadow.radius = 3;
          }
          scene.add(lamp, lamp.target);

          const shaft = new THREE.Mesh(
            new THREE.ConeGeometry(23, 54, 44, 6, true),
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
        /* Inside the new rake: front row to back row, foot of the steps to
           the top. A flash going off in front of the stand or above its roof
           is the tell that the two were never the same object. */
        flashPositions[i * 3] = side * (FIELD_WIDE / 2 + 10 + Math.random() * 21);
        flashPositions[i * 3 + 1] = 6 + Math.random() * 15;
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
        (sky.stars.material as import("three").ShaderMaterial).uniforms.uTime.value = time;
        filmPass.uniforms.uTime.value = time;

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

        // The dome rides with the camera: a sky you can drive out from under
        // is a ceiling, and at this travel distance it would show.
        sky.group.position.set(camera.position.x, 0, camera.position.z);

        flashMaterial.uniforms.uTime.value = time;
        dust.rotation.y = time * 0.008;
        for (const [index, shaft] of shafts.entries()) {
          const material = shaft.material as import("three").ShaderMaterial;
          /* Softer than it was. A beam you can see the edges of is a pane of
             glass leaning on the stand; at this strength it is the air the
             lamp is shining through, which is all it should ever have been. */
          material.uniforms.uStrength.value = 0.125 + Math.sin(time * 1.2 + index) * 0.028;
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
        crowdStrips.forEach((texture) => texture.dispose());
        adTexture?.dispose();
        dotTexture?.dispose();
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
