"use client";

import { useEffect, useRef } from "react";

/**
 * THE DRIVE — the scroll engine behind the Arena design.
 *
 * Scrolling this page is not scrolling a document: it walks the camera from
 * the Rascals' own end zone to the opponent's, one yard at a time. Content
 * arrives at the yard markers it belongs to, and the broadcast overlay counts
 * down with it. That is the whole structural idea — the page is a drive, not
 * a stack of sections.
 *
 * One scroll handler and one animation frame drive everything: camera, panels
 * and overlay all read the same progress value, so they can never disagree.
 *
 * The drive only engages where it makes sense. On a phone, on a coarse
 * pointer, or under prefers-reduced-motion, the class is never added and CSS
 * leaves every panel in normal document flow — an ordinary, readable page.
 * Scroll-jacking a touchscreen is how you make a site unusable.
 */

/** How far down the field the camera travels, in scene units. The drive
 *  starts on our own 20 — on the grass, not inside the end zone, which the
 *  camera would otherwise fill the foreground with. */
const START_Z = 4;
const END_Z = -186;

function createFieldTexture(THREE: typeof import("three")) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 2048;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.fillStyle = "#081c12";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#0a2416";
  for (let i = 0; i < 20; i += 2) context.fillRect(0, (i * canvas.height) / 20, canvas.width, canvas.height / 20);

  // A yard line every five yards, the tens heavier, as on a real field.
  for (let i = 0; i <= 100; i += 5) {
    const y = (i / 100) * canvas.height;
    context.strokeStyle = i % 10 === 0 ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.4)";
    context.lineWidth = i % 10 === 0 ? 6 : 3;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }

  context.strokeStyle = "rgba(255,255,255,0.36)";
  context.lineWidth = 3;
  for (let i = 0; i <= 100; i += 1) {
    const y = (i / 100) * canvas.height;
    for (const x of [canvas.width * 0.34, canvas.width * 0.66]) {
      context.beginPath();
      context.moveTo(x - 7, y);
      context.lineTo(x + 7, y);
      context.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
}

function buildEndZone(THREE: typeof import("three"), z: number, color: number) {
  const zone = new THREE.Mesh(
    new THREE.PlaneGeometry(56, 20),
    new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 }),
  );
  zone.rotation.x = -Math.PI / 2;
  zone.position.set(0, 0.01, z);
  return zone;
}

function buildGoal(THREE: typeof import("three"), z: number) {
  const material = new THREE.MeshStandardMaterial({ color: 0xf7cf4a, roughness: 0.35, metalness: 0.7 });
  const goal = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 7, 12), material);
  stem.position.y = 3.5;
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 12, 12), material);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = 7;
  goal.add(stem, bar);
  for (const x of [-6, 6]) {
    const upright = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 11, 12), material);
    upright.position.set(x, 12.5, 0);
    goal.add(upright);
  }
  goal.position.z = z;
  return goal;
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
    const yardOut = page.querySelector<HTMLElement>("[data-hud-yard]");
    const downOut = page.querySelector<HTMLElement>("[data-hud-down]");
    const barOut = page.querySelector<HTMLElement>("[data-hud-bar]");

    let disposed = false;
    let frame = 0;
    let progress = 0;
    let eased = 0;
    let cleanup: (() => void) | undefined;

    const readProgress = () => {
      const total = document.body.scrollHeight - window.innerHeight;
      progress = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
    };

    /** Down and distance, so the overlay reads like a broadcast rather than a scrollbar. */
    const downFor = (value: number) => {
      if (value > 0.9) return "TOUCHDOWN";
      if (value > 0.68) return "4TH & GOAL";
      if (value > 0.46) return "3RD & 2";
      if (value > 0.26) return "2ND & 6";
      if (value > 0.08) return "1ST & 10";
      return "KICKOFF";
    };

    const paintOverlay = () => {
      // Counts up from our own 20 towards the opposing goal line, switching
      // sides at midfield the way a scoreboard does.
      const absolute = 20 + progress * 80;
      if (yardOut) {
        yardOut.textContent = absolute >= 99 ? "TD"
          : `${absolute > 50 ? "OPP" : "OWN"} ${String(Math.round(absolute > 50 ? 100 - absolute : absolute)).padStart(2, "0")}`;
      }
      if (downOut) downOut.textContent = downFor(progress);
      if (barOut) barOut.style.setProperty("--drive", `${(progress * 100).toFixed(1)}%`);
      page.style.setProperty("--drive-progress", progress.toFixed(4));

      for (const panel of panels) {
        const from = Number(panel.dataset.from ?? 0);
        const to = Number(panel.dataset.to ?? 1);
        panel.classList.toggle("is-on", progress >= from && progress <= to);
      }
    };

    void (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x030910, 0.014);

      const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 400);

      const fieldTexture = createFieldTexture(THREE);
      const field = new THREE.Mesh(
        new THREE.PlaneGeometry(56, 220),
        new THREE.MeshStandardMaterial({ map: fieldTexture ?? undefined, color: 0xffffff, roughness: 0.94 }),
      );
      field.rotation.x = -Math.PI / 2;
      field.position.z = -80;
      scene.add(field);

      scene.add(buildEndZone(THREE, 14, 0x7d1520));
      scene.add(buildEndZone(THREE, -178, 0x123055));
      scene.add(buildGoal(THREE, 24));
      scene.add(buildGoal(THREE, -188));

      scene.add(new THREE.HemisphereLight(0x2f4a70, 0x08150e, 0.5));

      // Floodlight towers the length of the pitch, so the drive passes them.
      const towers: import("three").Object3D[] = [];
      for (let i = 0; i < 6; i += 1) {
        const z = 10 - i * 40;
        for (const x of [-34, 34]) {
          const lamp = new THREE.SpotLight(0xe6f0ff, 2200, 150, 0.7, 0.8, 1.4);
          lamp.position.set(x, 30, z);
          lamp.target.position.set(x * 0.2, 0, z - 10);
          scene.add(lamp, lamp.target);

          const shaft = new THREE.Mesh(
            new THREE.ConeGeometry(14, 34, 18, 1, true),
            new THREE.MeshBasicMaterial({
              color: 0x9dc4ff, transparent: true, opacity: 0.05,
              blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
            }),
          );
          shaft.position.set(x * 0.7, 16, z - 4);
          shaft.rotation.z = x > 0 ? 0.3 : -0.3;
          scene.add(shaft);
          towers.push(shaft);
        }
      }

      const dustCount = 1200;
      const dustPositions = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount; i += 1) {
        dustPositions[i * 3] = (Math.random() - 0.5) * 70;
        dustPositions[i * 3 + 1] = Math.random() * 24;
        dustPositions[i * 3 + 2] = 20 - Math.random() * 220;
      }
      const dustGeometry = new THREE.BufferGeometry();
      dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
      const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({
        color: 0xd6e6ff, size: 0.13, transparent: true, opacity: 0.45, depthWrite: false,
      }));
      scene.add(dust);

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

        // Ease towards the real scroll position: the camera arrives a moment
        // after the wheel stops, which is what makes it feel like travel.
        eased += (progress - eased) * 0.075;

        camera.position.set(
          pointer.x * 3.4,
          6.2 - pointer.y * 1.2,
          START_Z + (END_Z - START_Z) * eased,
        );
        camera.lookAt(pointer.x * 1.5, 1.6, camera.position.z - 34);

        dust.rotation.y = time * 0.01;
        for (const [index, shaft] of towers.entries()) {
          const material = (shaft as import("three").Mesh).material as import("three").MeshBasicMaterial;
          material.opacity = 0.042 + Math.sin(time * 1.3 + index) * 0.012;
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
        fieldTexture?.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        page.classList.remove("is-driving");
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return <div className="drive-canvas" ref={canvasHost} aria-hidden="true" />;
}
