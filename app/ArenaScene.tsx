"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The floodlit field behind the Arena design's opener.
 *
 * The scene is the environment, not the content: field, lights, dust and goal
 * posts in real perspective, with the wordmark and copy sitting on top as HTML
 * so type stays sharp, selectable and readable by a screen reader.
 *
 * It earns its cost or it does not run at all:
 *  - three.js is imported only when the scene is actually going to render, so
 *    it never lands in the bundle for visitors who will not see it
 *  - narrow screens and prefers-reduced-motion get the CSS fallback instead;
 *    a WebGL loop on a phone is battery for nothing
 *  - rendering pauses whenever the canvas is off screen
 *  - everything is disposed on unmount, or a route change leaks GPU memory
 *
 * A real helmet model can be dropped in later without rebuilding any of this.
 */

/** Yard lines drawn once into a texture; cheaper and sharper than geometry. */
function createFieldTexture(THREE: typeof import("three")) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.fillStyle = "#0a1f14";
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Mown stripes, the way a groundsman leaves them.
  context.fillStyle = "#0c2618";
  for (let i = 0; i < 8; i += 2) context.fillRect(0, (i * canvas.height) / 8, canvas.width, canvas.height / 8);

  context.strokeStyle = "rgba(255,255,255,0.62)";
  context.lineWidth = 4;
  for (let i = 0; i <= 10; i += 1) {
    const y = (i * canvas.height) / 10;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }

  // Hash marks either side of the middle.
  context.lineWidth = 3;
  context.strokeStyle = "rgba(255,255,255,0.4)";
  for (let i = 0; i <= 50; i += 1) {
    const y = (i * canvas.height) / 50;
    for (const x of [canvas.width * 0.36, canvas.width * 0.64]) {
      context.beginPath();
      context.moveTo(x - 9, y);
      context.lineTo(x + 9, y);
      context.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 4);
  texture.anisotropy = 4;
  return texture;
}

export function ArenaScene() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrow = window.matchMedia("(max-width: 900px)").matches;
    if (reduced || narrow) return;

    let disposed = false;
    let frame = 0;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const width = host.clientWidth;
      const height = host.clientHeight;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x040a14, 0.0115);

      const camera = new THREE.PerspectiveCamera(56, width / height, 0.1, 320);
      camera.position.set(0, 7.5, 20);
      camera.lookAt(0, 0.5, -46);

      // --- the field ------------------------------------------------
      const fieldTexture = createFieldTexture(THREE);
      const field = new THREE.Mesh(
        new THREE.PlaneGeometry(90, 230),
        new THREE.MeshStandardMaterial({
          map: fieldTexture ?? undefined,
          color: fieldTexture ? 0xffffff : 0x0b2417,
          roughness: 0.92,
          metalness: 0,
        }),
      );
      field.rotation.x = -Math.PI / 2;
      field.position.z = -84;
      scene.add(field);

      // --- goal post, straight down the field -----------------------
      const postMaterial = new THREE.MeshStandardMaterial({ color: 0xf6c945, roughness: 0.4, metalness: 0.6 });
      const goal = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 6, 12), postMaterial);
      stem.position.y = 3;
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 11, 12), postMaterial);
      bar.rotation.z = Math.PI / 2;
      bar.position.y = 6;
      goal.add(stem, bar);
      for (const x of [-5.5, 5.5]) {
        const upright = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 9, 12), postMaterial);
        upright.position.set(x, 10.5, 0);
        goal.add(upright);
      }
      goal.position.set(0, 0, -140);
      scene.add(goal);

      // --- floodlights ----------------------------------------------
      scene.add(new THREE.HemisphereLight(0x2a4260, 0x08150e, 0.45));
      scene.add(new THREE.AmbientLight(0x1d2c42, 0.9));

      const lightRig: import("three").Object3D[] = [];
      for (const [x, z] of [[-30, -30], [30, -30], [-30, -100], [30, -100]] as const) {
        const lamp = new THREE.SpotLight(0xeaf2ff, 2400, 190, 0.62, 0.7, 1.4);
        lamp.position.set(x, 34, z);
        lamp.target.position.set(x * 0.25, 0, z - 12);
        scene.add(lamp, lamp.target);

        // A cone standing in for the shaft of light through the night air.
        const shaft = new THREE.Mesh(
          new THREE.ConeGeometry(15, 40, 22, 1, true),
          new THREE.MeshBasicMaterial({
            color: 0x9dc4ff,
            transparent: true,
            opacity: 0.055,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
          }),
        );
        shaft.position.set(x * 0.72, 18, z - 4);
        shaft.rotation.z = x > 0 ? 0.3 : -0.3;
        scene.add(shaft);
        lightRig.push(shaft);
      }

      // The stretch directly in front of the camera needs its own lamp, or the
      // pitch starts in darkness and only lights up in the distance.
      const nearLight = new THREE.SpotLight(0xeef4ff, 1500, 110, 0.8, 0.9, 1.5);
      nearLight.position.set(0, 26, 26);
      nearLight.target.position.set(0, 0, -26);
      scene.add(nearLight, nearLight.target);

      // A red key light, so the brand colour is in the air rather than only on type.
      const keyLight = new THREE.PointLight(0xe7192d, 4200, 150, 1.7);
      keyLight.position.set(0, 10, -118);
      scene.add(keyLight);

      // --- dust in the light ----------------------------------------
      const dustCount = 900;
      const dustPositions = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount; i += 1) {
        dustPositions[i * 3] = (Math.random() - 0.5) * 90;
        dustPositions[i * 3 + 1] = Math.random() * 26;
        dustPositions[i * 3 + 2] = -Math.random() * 170;
      }
      const dustGeometry = new THREE.BufferGeometry();
      dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
      const dust = new THREE.Points(
        dustGeometry,
        new THREE.PointsMaterial({ color: 0xcfe2ff, size: 0.12, transparent: true, opacity: 0.5, depthWrite: false }),
      );
      scene.add(dust);

      // --- input ------------------------------------------------------
      const pointer = { x: 0, y: 0 };
      const onPointerMove = (event: PointerEvent) => {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
      };
      window.addEventListener("pointermove", onPointerMove, { passive: true });

      const onResize = () => {
        const w = host.clientWidth;
        const h = host.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", onResize);

      // Only run while on screen — an invisible canvas has no business
      // holding a frame loop open.
      let visible = true;
      const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0 });
      observer.observe(host);

      setRunning(true);
      const start = performance.now();

      const tick = () => {
        frame = requestAnimationFrame(tick);
        if (!visible) return;
        const time = (performance.now() - start) / 1000;

        camera.position.x += (pointer.x * 3.2 - camera.position.x) * 0.04;
        camera.position.y += (7.5 - pointer.y * 1.6 - camera.position.y) * 0.04;
        camera.lookAt(0, 0.5, -46);

        dust.rotation.y = time * 0.012;
        dust.position.y = Math.sin(time * 0.35) * 0.6;
        for (const [index, shaft] of lightRig.entries()) {
          const material = (shaft as import("three").Mesh).material as import("three").MeshBasicMaterial;
          material.opacity = 0.045 + Math.sin(time * 1.4 + index) * 0.012;
        }
        keyLight.intensity = 4000 + Math.sin(time * 2.1) * 520;

        renderer.render(scene, camera);
      };
      tick();

      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        window.removeEventListener("pointermove", onPointerMove);
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
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <div className={running ? "arena-scene is-live" : "arena-scene"} ref={hostRef} aria-hidden="true">
      {/* Shown until — or instead of — the WebGL scene, so the opener is never empty. */}
      <div className="arena-scene-fallback" />
    </div>
  );
}
