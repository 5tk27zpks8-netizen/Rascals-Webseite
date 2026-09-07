"use client";

import { useEffect, useRef } from "react";
import { FIELD_YARDS_LONG, FIELD_YARDS_WIDE, createCrowdTexture, createFlagTexture, createTurfTexture } from "./lib/arena-textures";

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

function buildGoal(THREE: Three, z: number, facing: 1 | -1) {
  const material = new THREE.MeshStandardMaterial({ color: 0xf7cf4a, roughness: 0.34, metalness: 0.72 });
  const goal = new THREE.Group();

  // Gooseneck: the base, the arm reaching over the end line, then the crossbar.
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 10, 14), material);
  base.position.y = 5;
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 6, 12), material);
  arm.rotation.x = Math.PI / 2;
  arm.position.set(0, 10, facing * 3);
  const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 6.2 * YARD, 14), material);
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.set(0, 10, facing * 6);
  goal.add(base, arm, crossbar);

  for (const x of [-3.1 * YARD, 3.1 * YARD]) {
    const upright = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 17, 12), material);
    upright.position.set(x, 18.5, facing * 6);
    goal.add(upright);
  }

  goal.position.z = z;
  return goal;
}

/** A raked stand down one touchline, with a crowd in it. */
function buildStand(THREE: Three, crowd: import("three").Texture, side: 1 | -1) {
  const group = new THREE.Group();
  const length = FIELD_LONG + 40;
  const centreZ = (OWN_END_Z + OPP_END_Z) / 2;

  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(length, 4),
    new THREE.MeshStandardMaterial({ color: 0x101a28, roughness: 0.9 }),
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
    new THREE.MeshStandardMaterial({ color: 0x05090f, roughness: 1, side: THREE.DoubleSide }),
  );
  roof.rotation.x = -Math.PI / 2;
  roof.position.set(side * (FIELD_WIDE / 2 + 21), 25, centreZ);
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

    const paintOverlay = () => {
      const absolute = 20 + progress * 80;
      if (yardOut) {
        yardOut.textContent = absolute >= 99 ? "TD"
          : `${absolute > 50 ? "OPP" : "OWN"} ${String(Math.round(absolute > 50 ? 100 - absolute : absolute)).padStart(2, "0")}`;
      }
      if (downOut) downOut.textContent = downFor(progress);
      if (barOut) barOut.style.setProperty("--drive", `${(progress * 100).toFixed(1)}%`);

      for (const panel of panels) {
        const from = Number(panel.dataset.from ?? 0);
        const to = Number(panel.dataset.to ?? 1);
        panel.classList.toggle("is-on", progress >= from && progress <= to);
      }
    };

    void (async () => {
      const THREE = await import("three");
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

      scene.add(buildGoal(THREE, OWN_END_Z, 1));
      scene.add(buildGoal(THREE, OPP_END_Z, -1));

      // --- stands and flags -------------------------------------------
      const crowdCanvas = createCrowdTexture();
      const crowdTexture = crowdCanvas ? new THREE.CanvasTexture(crowdCanvas) : null;
      if (crowdTexture) {
        crowdTexture.colorSpace = THREE.SRGBColorSpace;
        scene.add(buildStand(THREE, crowdTexture, 1), buildStand(THREE, crowdTexture, -1));
      }

      const flagCanvas = createFlagTexture();
      const flagTexture = flagCanvas ? new THREE.CanvasTexture(flagCanvas) : null;
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

      const shafts: import("three").Mesh[] = [];
      for (let i = 0; i < 5; i += 1) {
        const z = 12 - i * (FIELD_LONG / 4.4);
        for (const side of [-1, 1] as const) {
          const x = side * (FIELD_WIDE / 2 + 30);
          const lamp = new THREE.SpotLight(0xeef4ff, 11000, 320, 0.82, 0.5, 2);
          lamp.position.set(x, 46, z);
          lamp.target.position.set(x * 0.15, 0, z - 12);
          scene.add(lamp, lamp.target);

          const shaft = new THREE.Mesh(
            new THREE.ConeGeometry(22, 48, 20, 1, true),
            new THREE.MeshBasicMaterial({
              color: 0xa9caff, transparent: true, opacity: 0.045,
              blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
            }),
          );
          shaft.position.set(x * 0.66, 24, z - 6);
          shaft.rotation.z = side > 0 ? 0.34 : -0.34;
          scene.add(shaft);
          shafts.push(shaft);
        }
      }

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

        camera.position.set(
          pointer.x * 5,
          9.2 - pointer.y * 1.5,
          START_Z + (END_Z - START_Z) * eased,
        );
        camera.lookAt(pointer.x * 2.4, 2.6, camera.position.z - 52);

        dust.rotation.y = time * 0.008;
        for (const [index, shaft] of shafts.entries()) {
          const material = shaft.material as import("three").MeshBasicMaterial;
          material.opacity = 0.04 + Math.sin(time * 1.2 + index) * 0.01;
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
        renderer.render(scene, camera);
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
