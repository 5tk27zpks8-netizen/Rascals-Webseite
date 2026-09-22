/**
 * Canvas textures for the Arena drive.
 *
 * Drawn rather than loaded: a painted field, a packed stand and a flag are all
 * cheaper to generate than to ship as images, and they stay sharp at any
 * distance the camera travels. Everything here runs once, in the browser, at
 * scene build time.
 */

/** Real proportions, so the field is not a guess: 120 × 53⅓ yards. */
export const FIELD_YARDS_LONG = 120;
export const FIELD_YARDS_WIDE = 160 / 3;

/** How much larger the turf canvas is than the layout it is drawn in. */
export const TURF_SCALE = 1.75;

/** Yard numbers, counted up to midfield and back down. */
const NUMBERS = ["10", "20", "30", "40", "50", "40", "30", "20", "10"];

/**
 * Paint a word across the field, fitted to a width.
 *
 * `facing` flips the word for the far end of the ground, so both ends read
 * the right way up from the same side of the stadium.
 */
function paintAcross(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  facing: 1 | -1,
  fill = "rgba(255,255,255,0.9)",
  size = 132,
) {
  context.save();
  context.translate(x, y);
  if (facing < 0) context.rotate(Math.PI);
  context.fillStyle = fill;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.letterSpacing = `${Math.round(size * 0.14)}px`;
  context.font = `900 ${size}px Impact, "Arial Narrow", sans-serif`;
  const measured = context.measureText(text).width;
  if (measured > maxWidth) {
    const squash = maxWidth / measured;
    if (squash < 0.62) {
      context.font = `900 ${Math.round(size * squash * 1.6)}px Impact, "Arial Narrow", sans-serif`;
      const remeasured = context.measureText(text).width;
      if (remeasured > maxWidth) context.scale(maxWidth / remeasured, 1);
    } else {
      context.scale(squash, 1);
    }
  }
  context.fillText(text, 0, 0);
  context.restore();
}

function noise(context: CanvasRenderingContext2D, width: number, height: number, amount: number) {
  const image = context.getImageData(0, 0, width, height);
  const { data } = image;
  for (let i = 0; i < data.length; i += 4) {
    const shift = (Math.random() - 0.5) * amount;
    data[i] = Math.max(0, Math.min(255, data[i] + shift));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + shift));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + shift));
  }
  context.putImageData(image, 0, 0);
}

/**
 * The painted field, end zone to end zone.
 *
 * The canvas runs along the field: y = 0 is the back of our own end zone,
 * y = height is the back of the opponent's.
 */
export function createTurfTexture(): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  /* Every measurement below is in the layout the field was drawn at. The
     canvas is larger than that — the pitch is the surface the camera spends
     the whole drive on, so it carries the most resolution the texture limit
     safely allows — and the context is scaled once instead of every line
     width, radius and type size being rewritten. */
  const W = 1024;
  const H = 2304;
  const SCALE = TURF_SCALE;
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.scale(SCALE, SCALE);
  const yard = H / FIELD_YARDS_LONG;
  const endZone = 10 * yard;
  const goalNear = endZone;
  const goalFar = H - endZone;

  // Turf, with the light and dark bands a mower leaves behind.
  context.fillStyle = "#17512a";
  context.fillRect(0, 0, W, H);
  context.fillStyle = "#134622";
  for (let i = 0; i < 24; i += 2) context.fillRect(0, (i * H) / 24, W, H / 24);
  noise(context, canvas.width, canvas.height, 26);

  // End zones, painted darker with the club in them.
  context.fillStyle = "#5e1019";
  context.fillRect(0, 0, W, endZone);
  context.fillStyle = "#0d2440";
  context.fillRect(0, goalFar, W, endZone);

  // End-zone lettering runs sideline to sideline and is read from the side of
  // the ground, the way a real end zone is painted — not along the field.
  paintAcross(context, "RASCALS", W / 2, endZone / 2, W * 0.86, 1);
  paintAcross(context, "HELLENSTEIN", W / 2, H - endZone / 2, W * 0.7, -1);

  /* Midfield emblem. Nothing is painted here at all: the club mark goes
     straight onto the grass via paintMidfieldMark once the image has loaded.
     There is no disc and no ring behind it — a mark mown into the turf is what
     a real ground looks like, and any fill underneath would show through the
     artwork's transparent areas. */

  // Sidelines and end lines: a broad white border around the whole thing.
  context.strokeStyle = "rgba(255,255,255,0.92)";
  context.lineWidth = 14;
  context.strokeRect(7, 7, W - 14, H - 14);

  // Yard lines every five yards, the tens heavier.
  for (let i = 0; i <= 100; i += 5) {
    const y = goalNear + (i / 100) * (goalFar - goalNear);
    const tens = i % 10 === 0;
    context.strokeStyle = tens ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.66)";
    context.lineWidth = tens ? 9 : 5;
    context.beginPath();
    context.moveTo(14, y);
    context.lineTo(W - 14, y);
    context.stroke();
  }

  // Hash marks: one per yard, in the two rows a real field carries.
  context.strokeStyle = "rgba(255,255,255,0.8)";
  context.lineWidth = 5;
  for (let i = 1; i < 100; i += 1) {
    if (i % 5 === 0) continue;
    const y = goalNear + (i / 100) * (goalFar - goalNear);
    for (const x of [W * 0.36, W * 0.64]) {
      context.beginPath();
      context.moveTo(x - 13, y);
      context.lineTo(x + 13, y);
      context.stroke();
    }
    // Short ticks on the sidelines too.
    for (const x of [22, W - 22]) {
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + (x < W / 2 ? 20 : -20), y);
      context.stroke();
    }
  }

  // Painted yard numbers, upright to each sideline as on a real field.
  context.fillStyle = "rgba(255,255,255,0.86)";
  context.font = "900 96px Impact, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.letterSpacing = "6px";
  NUMBERS.forEach((label, index) => {
    const y = goalNear + (((index + 1) * 10) / 100) * (goalFar - goalNear);
    for (const [x, flip] of [[W * 0.14, 1], [W * 0.86, -1]] as const) {
      context.save();
      context.translate(x, y);
      context.rotate((flip * Math.PI) / 2);
      context.fillText(label, 0, 0);
      context.restore();
    }
  });

  return canvas;
}

/**
 * Where the midfield emblem sits, in the same layout coordinates createTurfTexture
 * draws in — NOT canvas pixels. The turf context is scaled by TURF_SCALE, so any
 * code addressing the raw canvas has to multiply by it.
 */
export const MIDFIELD_MARK = { x: 1024 / 2, y: 2304 / 2, radius: 186 } as const;

/**
 * Paints the club mark onto the halfway line of an existing turf canvas.
 *
 * Separate from createTurfTexture because an image has to load and that
 * function is synchronous: the caller paints the field first, then awaits this
 * and refreshes the texture. Resolves false if the mark cannot be loaded, in
 * which case the field simply carries no emblem.
 *
 * The artwork is trimmed to its inked pixels before being sized, so the
 * transparent margin in the source file does not shrink it, and it goes on at
 * slightly reduced opacity so it reads as mown into the grass rather than
 * printed on top of it.
 */
export async function paintMidfieldMark(
  canvas: HTMLCanvasElement,
  src: string,
): Promise<boolean> {
  const context = canvas.getContext("2d");
  if (!context) return false;

  const image = await new Promise<HTMLImageElement | null>((resolve) => {
    const element = new Image();
    /* The finished canvas is uploaded as a WebGL texture, and a canvas tainted
       by a cross-origin image cannot be. The mark is served from our own origin,
       so this costs nothing and keeps the turf usable if it ever moves to a CDN. */
    element.crossOrigin = "anonymous";
    element.onload = () => resolve(element);
    element.onerror = () => resolve(null);
    element.src = src;
  });
  if (!image?.naturalWidth) return false;

  // Trim to the inked area. Same-origin, so reading the pixels is allowed; if
  // anything throws we fall back to the full frame rather than giving up.
  let sx = 0;
  let sy = 0;
  let sw = image.naturalWidth;
  let sh = image.naturalHeight;
  try {
    const probe = document.createElement("canvas");
    probe.width = image.naturalWidth;
    probe.height = image.naturalHeight;
    const probeContext = probe.getContext("2d", { willReadFrequently: true });
    if (probeContext) {
      probeContext.drawImage(image, 0, 0);
      const { data } = probeContext.getImageData(0, 0, probe.width, probe.height);
      let minX = probe.width;
      let minY = probe.height;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < probe.height; y += 1) {
        for (let x = 0; x < probe.width; x += 1) {
          if (data[(y * probe.width + x) * 4 + 3] > 12) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX >= minX && maxY >= minY) {
        sx = minX;
        sy = minY;
        sw = maxX - minX + 1;
        sh = maxY - minY + 1;
      }
    }
  } catch {
    /* keep the untrimmed frame */
  }

  // Sized off the old circle radius, which is still the right footprint for a
  // mark at the 50 — wide enough to read from the camera, short of the hashes.
  const { x, y, radius } = MIDFIELD_MARK;
  const room = radius * 2.1;
  const scale = Math.min(room / sw, room / sh);
  const width = sw * scale;
  const height = sh * scale;

  context.save();
  // Held just under full strength so the mark reads as worn into the grass
  // rather than printed on top of it. Nothing to clip against now that the
  // disc is gone, so the artwork keeps its own silhouette.
  context.globalAlpha = 0.9;
  context.drawImage(image, sx, sy, sw, sh, x - width / 2, y - height / 2, width, height);
  context.restore();
  return true;
}


/**
 * A normal map for the turf, so the grass catches light instead of lying flat.
 *
 * The mower bands on a real pitch are not paint: they are the same grass bent
 * in opposite directions, which catches the floodlights differently depending
 * on which way you look along it. Encoding that as surface direction — rather
 * than as two shades of green, which is all the colour map can say — is what
 * makes the bands shift as the camera travels, and what stops the field
 * reading as a printed sheet.
 *
 * Built at a fraction of the colour map's size and tiled: fibre detail has no
 * absolute position to be faithful to, and a full-size one would cost several
 * megabytes of texture memory for noise.
 */
export function createTurfNormalTexture(): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const image = context.createImageData(size, size);
  const { data } = image;
  const bandHeight = size / 8;

  for (let y = 0; y < size; y += 1) {
    // Alternate the lie of the grass every band, the way a mower leaves it.
    const lean = Math.floor(y / bandHeight) % 2 === 0 ? 1 : -1;
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;

      /* Fibres: high-frequency noise along the lie of the blade, lower across
         it, so the surface has a grain rather than being evenly bumpy. */
      const along = Math.sin(x * 2.7 + y * 0.31) * 0.5 + Math.random() - 0.5;
      const across = Math.sin(y * 1.3) * 0.2 + (Math.random() - 0.5) * 0.7;

      // Tangent-space normal: +Z is straight up, so the blue channel stays high.
      const nx = across * 0.34;
      const ny = (lean * 0.28) + along * 0.22;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);

      data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

/**
 * A roughness map for the turf.
 *
 * Grass is not uniformly matte: worn lines, the painted markings and the
 * flattened bands all scatter light differently. A single roughness value
 * gives the whole pitch one sheen, which is most of why it reads as a
 * surface rather than as a field.
 */
export function createTurfRoughnessTexture(): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const image = context.createImageData(size, size);
  const { data } = image;
  const bandHeight = size / 8;

  for (let y = 0; y < size; y += 1) {
    // Grass bent towards you is flatter, so it is glossier than grass bent away.
    const band = Math.floor(y / bandHeight) % 2 === 0 ? 0.84 : 0.94;
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const wear = (Math.random() - 0.5) * 0.09;
      const v = Math.max(0, Math.min(1, band + wear)) * 255;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
}


/**
 * A single cumulus, drawn to be used as a billboard.
 *
 * Built from overlapping soft discs rather than noise: a cloud is lumps, and
 * stacking blurred circles with the light side towards the top gives the
 * bulges and the shaded underside that make one read as a volume. Noise alone
 * gives smoke.
 */
export function createCloudTexture(): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  const W = 512;
  const H = 256;
  canvas.width = W;
  canvas.height = H;
  const context = canvas.getContext("2d");
  if (!context) return null;

  let seed = 20260918;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const puff = (x: number, y: number, r: number, top: string, bottom: string) => {
    const gradient = context.createRadialGradient(x, y - r * 0.32, r * 0.1, x, y, r);
    gradient.addColorStop(0, top);
    gradient.addColorStop(0.55, bottom);
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
  };

  // The shaded base first, then the lit bulges on top of it.
  for (let i = 0; i < 16; i += 1) {
    const x = 80 + rnd() * (W - 160);
    const y = H * 0.66 + (rnd() - 0.5) * 26;
    puff(x, y, 42 + rnd() * 34, "rgba(206,216,230,0.92)", "rgba(186,198,215,0.5)");
  }
  for (let i = 0; i < 22; i += 1) {
    const t = rnd();
    const x = 90 + t * (W - 180);
    // Highest in the middle, so the cloud has a crown rather than a flat top.
    const lift = Math.sin(t * Math.PI) * 54;
    const y = H * 0.62 - lift + (rnd() - 0.5) * 22;
    puff(x, y, 34 + rnd() * 40, "rgba(255,255,255,0.99)", "rgba(240,245,251,0.62)");
  }

  return canvas;
}

/** The hide of a football: leather, a white stripe each side, and the laces. */
export function createBallTexture(): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  const W = 512;
  const H = 256;
  canvas.width = W;
  canvas.height = H;
  const context = canvas.getContext("2d");
  if (!context) return null;

  /* Wrapped round a stretched sphere, so u runs the long way round the ball
     and v from one point to the other. */
  const grain = context.createLinearGradient(0, 0, 0, H);
  grain.addColorStop(0, "#5a2a16");
  grain.addColorStop(0.5, "#8b4423");
  grain.addColorStop(1, "#5a2a16");
  context.fillStyle = grain;
  context.fillRect(0, 0, W, H);

  // Pebbling, so the leather is not a flat brown field.
  let seed = 4242;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  context.fillStyle = "rgba(0,0,0,0.16)";
  for (let i = 0; i < 2600; i += 1) {
    context.beginPath();
    context.arc(rnd() * W, rnd() * H, 0.9 + rnd() * 0.9, 0, Math.PI * 2);
    context.fill();
  }

  // The two white rings near the ends.
  context.fillStyle = "#f2efe8";
  context.fillRect(0, 26, W, 13);
  context.fillRect(0, H - 39, W, 13);

  // Laces, along one seam.
  context.fillStyle = "#f6f4ef";
  context.fillRect(W * 0.5 - 3, H * 0.34, 6, H * 0.32);
  for (let i = 0; i < 8; i += 1) {
    context.fillRect(W * 0.5 - 15, H * 0.36 + i * (H * 0.28) / 7, 30, 5);
  }

  return canvas;
}

/**
 * A soft round dot, for anything drawn as a point sprite.
 *
 * A PointsMaterial with no map draws hard squares. At the size the night air
 * needs them that is invisible in the distance and a row of white tiles up
 * close, which is what the motes over the pitch were doing.
 */
export function createSoftDotTexture(): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.55)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return canvas;
}

/**
 * The advertising band at the foot of a stand.
 *
 * Tiles along the touchline. Drawn bright and unlit, because a hoarding at a
 * night match is a lit board — it is one of the few things down there throwing
 * light back rather than taking it.
 */
export function createAdBoardTexture(): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  const W = 1024;
  const H = 96;
  const SCALE = 2;
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.scale(SCALE, SCALE);

  context.fillStyle = "#0b1422";
  context.fillRect(0, 0, W, H);

  /* Four boards to a tile, alternating a name with a run of chevrons. A band
     that is nothing but names is unreadable at any distance the camera ever
     stands at; the chevrons give the eye somewhere to rest between them. */
  const boards: ({ kind: "name"; text: string } | { kind: "chevrons" })[] = [
    { kind: "name", text: "HELLENSTEIN RASCALS" },
    { kind: "chevrons" },
    { kind: "name", text: "RASCALS.FOOTBALL" },
    { kind: "chevrons" },
  ];
  const panelW = W / boards.length;

  boards.forEach((board, i) => {
    const x = i * panelW;
    const name = board.kind === "name";
    context.fillStyle = name ? "#c4152a" : "#101b2c";
    context.fillRect(x + 3, 4, panelW - 6, H - 8);

    if (!name) {
      context.fillStyle = "rgba(231,25,45,0.5)";
      for (let c = 0; c < 9; c += 1) {
        context.beginPath();
        context.moveTo(x + 16 + c * 27, 8);
        context.lineTo(x + 32 + c * 27, 8);
        context.lineTo(x + 22 + c * 27, H - 8);
        context.lineTo(x + 6 + c * 27, H - 8);
        context.closePath();
        context.fill();
      }
      return;
    }

    /* Fitted rather than trusted. Set at a fixed size, the longer name runs
       straight over the edge of its board and collides with the next one,
       which is exactly what a hoarding never does. */
    const inner = panelW - 34;
    let size = 46;
    context.textAlign = "center";
    context.textBaseline = "middle";
    do {
      context.font = `900 ${size}px Impact, Haettenschweiler, sans-serif`;
      size -= 2;
    } while (size > 14 && context.measureText(board.text).width > inner);

    context.fillStyle = "#ffffff";
    context.fillText(board.text, x + panelW / 2, H / 2 + 2);
  });

  // The lens glare off a lit board, strongest across the middle.
  const glare = context.createLinearGradient(0, 0, 0, H);
  glare.addColorStop(0, "rgba(255,255,255,0.16)");
  glare.addColorStop(0.5, "rgba(255,255,255,0.03)");
  glare.addColorStop(1, "rgba(0,0,0,0.3)");
  context.fillStyle = glare;
  context.fillRect(0, 0, W, H);

  return canvas;
}

/** A club flag: brand red with the wordmark. */
export function createFlagTexture(): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  const W = 512;
  const H = 320;
  const SCALE = 2;
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.scale(SCALE, SCALE);

  context.fillStyle = "#0a1626";
  context.fillRect(0, 0, W, H);
  context.fillStyle = "#e7192d";
  context.fillRect(0, 0, W, H * 0.62);

  context.fillStyle = "#ffffff";
  context.font = "900 74px Impact, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.letterSpacing = "8px";
  context.fillText("RASCALS", W / 2, H * 0.31);

  context.fillStyle = "rgba(255,255,255,0.85)";
  context.font = "900 30px Impact, sans-serif";
  context.letterSpacing = "10px";
  context.fillText("HELLENSTEIN", W / 2, H * 0.79);
  return canvas;
}

/** What the scoreboard shows: the last game that was actually played. It
 *  falls back to a blank board rather than inventing a result. */
/**
 * A spectator's head, as four sides on one small sheet.
 *
 * The crowd's heads were plain tinted solids, which is fine at two hundred
 * units and poor at twenty — the closest rows of the end stand are the ones
 * the camera actually reaches, and there they read as coloured pebbles.
 *
 * A face fixes that for almost nothing, because it replaces the head's
 * geometry rather than adding to it. A cube takes a texture; a sphere at a
 * useful resolution does not come cheap. Twelve triangles with a face beats
 * twenty without one, so the crowd gets faces AND gets lighter.
 *
 * The sheet is a 2×2 atlas and the cube's UVs pick a quadrant per side:
 *
 *     ┌──────────┬──────────┐
 *     │   face   │   back   │
 *     ├──────────┼──────────┤
 *     │   side   │   top    │
 *     └──────────┴──────────┘
 *
 * Nothing here is drawn finely. At the size a spectator occupies, a face is
 * two dark marks under a mass of hair, and anything more detailed is sampled
 * away before it reaches the screen — worse, detail that survives at the front
 * row turns into noise across the rest of the stand. Hair mass, brow shadow
 * and eye sockets are what carry at distance, so those are what this draws.
 */
export function createCrowdFaceTexture(variant: number): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  const Q = 64; // one quadrant
  canvas.width = Q * 2;
  canvas.height = Q * 2;
  const context = canvas.getContext("2d");
  if (!context) return null;

  /* Skin and hair travel together, because a variant is a person and not a
     swatch: pale skin under black hair and dark skin under grey hair both
     occur, but they have to be chosen, not multiplied out at random. */
  const people = [
    { skin: "#d9a880", hair: "#2b2018", brow: "#8a6244" },
    { skin: "#a97a52", hair: "#171213", brow: "#6d4a2f" },
    { skin: "#7a5436", hair: "#221a16", brow: "#4e341f" },
    { skin: "#e6c4a0", hair: "#6e604f", brow: "#a3805c" },
  ];
  const person = people[Math.abs(variant) % people.length];

  const quad = (col: number, row: number, draw: () => void) => {
    context.save();
    context.translate(col * Q, row * Q);
    context.beginPath();
    context.rect(0, 0, Q, Q);
    context.clip();
    draw();
    context.restore();
  };

  // --- the face -------------------------------------------------------
  quad(0, 0, () => {
    context.fillStyle = person.skin;
    context.fillRect(0, 0, Q, Q);

    // Hair across the top, with a slightly uneven line so it is not a band.
    context.fillStyle = person.hair;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(Q, 0);
    context.lineTo(Q, Q * 0.3);
    context.quadraticCurveTo(Q * 0.5, Q * (0.2 + (variant % 3) * 0.05), 0, Q * 0.32);
    context.closePath();
    context.fill();

    /* Eye sockets rather than eyes. Two dark patches under the brow is what
       a face reduces to at this size; drawing pupils only adds something for
       the sampler to throw away. */
    context.fillStyle = "rgba(0,0,0,0.42)";
    context.fillRect(Q * 0.19, Q * 0.40, Q * 0.20, Q * 0.10);
    context.fillRect(Q * 0.61, Q * 0.40, Q * 0.20, Q * 0.10);

    // The brow's shadow, which is what actually reads as a face.
    context.fillStyle = person.brow;
    context.globalAlpha = 0.5;
    context.fillRect(0, Q * 0.34, Q, Q * 0.06);
    context.globalAlpha = 1;

    // A mouth, barely.
    context.fillStyle = "rgba(0,0,0,0.26)";
    context.fillRect(Q * 0.36, Q * 0.68, Q * 0.28, Q * 0.05);
  });

  // --- the back of the head --------------------------------------------
  quad(1, 0, () => {
    context.fillStyle = person.hair;
    context.fillRect(0, 0, Q, Q);
    // A neck below the hairline, or the back of a head is a solid block.
    context.fillStyle = person.skin;
    context.fillRect(Q * 0.3, Q * 0.82, Q * 0.4, Q * 0.18);
  });

  // --- the sides --------------------------------------------------------
  quad(0, 1, () => {
    context.fillStyle = person.skin;
    context.fillRect(0, 0, Q, Q);
    context.fillStyle = person.hair;
    context.fillRect(0, 0, Q, Q * 0.36);
    // Sideburn down towards the jaw, which is what gives a profile its shape.
    context.fillRect(Q * 0.06, Q * 0.36, Q * 0.16, Q * 0.22);
    // An ear, as a shadow rather than a shape.
    context.fillStyle = "rgba(0,0,0,0.20)";
    context.fillRect(Q * 0.42, Q * 0.44, Q * 0.14, Q * 0.18);
  });

  // --- the top ----------------------------------------------------------
  quad(1, 1, () => {
    context.fillStyle = person.hair;
    context.fillRect(0, 0, Q, Q);
    context.fillStyle = "rgba(255,255,255,0.07)";
    context.fillRect(Q * 0.3, Q * 0.2, Q * 0.4, Q * 0.3);
  });

  return canvas;
}

/**
 * The team area, painted on the grass.
 *
 * A televised touchline is not bare turf between the paint and the benches:
 * the team area is marked out, and on a home ground it carries the club. It
 * is also the one place a club badge sits flat enough to read from the far
 * side of a stadium, which is why every ground that can afford it puts one
 * there.
 *
 * Drawn long and thin because that is the shape of the strip it lies on, and
 * repeated along it rather than stretched — a badge stretched to ninety metres
 * is a smear, and a smear is what the eye notices.
 */
export function createTeamZoneTexture(): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  const W = 1024;
  const H = 128;
  canvas.width = W;
  canvas.height = H;
  const context = canvas.getContext("2d");
  if (!context) return null;

  /* Lighter than the club navy, and that is on purpose. This strip is only
     ever seen at a grazing angle with ambient occlusion and a broadcast grade
     on top of it, and at the true navy it came out as a dark stain on the
     grass rather than as a marked-out area. Lifting it is what keeps it
     reading as paint. */
  context.fillStyle = "#33386b";
  context.fillRect(0, 0, W, H);

  // Keylines, top and bottom. Thick, because thin lines vanish at that angle.
  context.fillStyle = "#c22a15";
  context.fillRect(0, 0, W, 13);
  context.fillRect(0, H - 13, W, 13);

  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = '900 58px Impact, "Arial Narrow", sans-serif';
  context.letterSpacing = "16px";
  context.fillText("HELLENSTEIN RASCALS", W * 0.5, H * 0.53);

  /* The badge, twice, at the quarters. Simple enough to survive being read at
     a glancing angle from a hundred units away: the helmet shape and the
     sweep, not the full mark. */
  const badge = (cx: number) => {
    context.save();
    context.translate(cx, H * 0.5);
    context.fillStyle = "#9e210f";
    context.beginPath();
    context.moveTo(-34, 10);
    context.quadraticCurveTo(-6, -22, 34, -14);
    context.quadraticCurveTo(6, 4, -30, 18);
    context.closePath();
    context.fill();
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(6, 2, 16, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#21254b";
    context.beginPath();
    context.arc(6, 2, 11, 0, Math.PI * 2);
    context.fill();
    context.restore();
  };
  badge(W * 0.14);
  badge(W * 0.86);

  return canvas;
}

export type ScoreboardData = {
  opponent?: string;
  /** The line under the score — the date the result was earned. */
  kickoff?: string;
  competition?: string;
  home?: number;
  away?: number;
};

/**
 * The stadium scoreboard behind the far end zone.
 *
 * It is the one place in the scene that carries real information, so the
 * ground is not just scenery. It shows what a stadium board shows after the
 * whistle: the last game actually played, both sides named, with the score it
 * finished on.
 */
export function createScoreboardTexture(data: ScoreboardData): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  const W = 1024;
  const H = 384;
  const SCALE = 2;
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.scale(SCALE, SCALE);

  context.fillStyle = "#05080e";
  context.fillRect(0, 0, W, H);

  // The bezel, so the board reads as a built object rather than a decal.
  context.strokeStyle = "#1b2536";
  context.lineWidth = 14;
  context.strokeRect(7, 7, W - 14, H - 14);

  // Header strip.
  context.fillStyle = "#b3121f";
  context.fillRect(14, 14, W - 28, 62);
  context.fillStyle = "#ffffff";
  context.font = '900 34px Impact, "Arial Narrow", sans-serif';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.letterSpacing = "12px";
  context.fillText((data.competition ?? "HELLENSTEIN RASCALS").toUpperCase(), W / 2, 46);

  // The two sides, with a dot-matrix wash so it reads as lamps not print.
  const label = (text: string, x: number) => {
    context.save();
    context.fillStyle = "#f4a72a";
    context.letterSpacing = "6px";
    let size = 46;
    context.font = `900 ${size}px Impact, "Arial Narrow", sans-serif`;
    const room = W * 0.44;
    while (context.measureText(text).width > room && size > 20) {
      size -= 2;
      context.font = `900 ${size}px Impact, "Arial Narrow", sans-serif`;
    }
    context.fillText(text, x, 148);
    context.restore();
  };
  label("RASCALS", W * 0.24);
  label((data.opponent ?? "GAST").toUpperCase(), W * 0.76);

  /* The score, which this used to refuse to show.
     
     The two numbers were written here as the literal string "0", so the board
     read 0:0 under every result the schedule could hand it. The caller had
     been passing the real figures the whole time and they were dropped on the
     floor at the last step — the one line of this file that the whole board
     exists for. */
  const score = (value: number | undefined) => String(Math.max(0, Math.round(value ?? 0)));
  context.fillStyle = "#f2f8ff";
  context.letterSpacing = "4px";
  /* Three digits still have to fit the same box a single digit sits in, so a
     56-point win does not run into the colon. */
  const digits = Math.max(score(data.home).length, score(data.away).length);
  context.font = `900 ${digits > 2 ? 84 : 108}px Impact, "Arial Narrow", sans-serif`;
  context.fillText(score(data.home), W * 0.24, 246);
  context.fillText(score(data.away), W * 0.76, 246);

  context.fillStyle = "#f4a72a";
  context.font = '900 64px Impact, "Arial Narrow", sans-serif';
  context.fillText(":", W / 2, 238);

  context.fillStyle = "#7f8ea3";
  context.font = '900 26px Impact, "Arial Narrow", sans-serif';
  context.letterSpacing = "9px";
  context.fillText((data.kickoff ?? "LETZTES ERGEBNIS").toUpperCase().slice(0, 46), W / 2, 330);

  // Lamp grid: a fine dark lattice over everything, like a real LED board.
  context.fillStyle = "rgba(0,0,0,0.26)";
  for (let y = 0; y < H; y += 3) context.fillRect(0, y, W, 1);
  return canvas;
}

/**
 * Cloth with the club's marks printed into it.
 *
 * These used to be two surfaces: the club's transparent PNG, and a coloured
 * panel a hair behind it so you could not see the far stand through the badge.
 * That works for a flat plane and falls apart the moment the plane becomes
 * cloth — two sheets folding independently will cross, and the badge starts
 * flickering through its own backing.
 *
 * One opaque sheet fixes it: the marks are stamped into the cloth here, so
 * there is nothing to intersect and one mesh does the work of two.
 *
 * The files arrive asynchronously, so this hands back the canvas immediately —
 * already a usable plain cloth — plus the means to stamp it when they land.
 */
export type ClothPrint = {
  canvas: HTMLCanvasElement;
  /** Draw a mark into the box given in fractions of the cloth, keeping the
   *  proportions it was drawn in. */
  stamp: (
    image: CanvasImageSource,
    imageAspect: number,
    box: { cy: number; w: number; h: number },
  ) => void;
};

export function createClothTexture(opts: {
  /** Width over height of the finished cloth. */
  aspect: number;
  /** Cloth colour. */
  ground: string;
  /** A contrasting band, along the hoist for a flag or the head for a banner. */
  band?: { edge: "hoist" | "head"; color: string; size: number };
}): ClothPrint | null {
  const canvas = document.createElement("canvas");
  const W = 640;
  const H = Math.max(2, Math.round(W / opts.aspect));
  canvas.width = W;
  canvas.height = H;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.fillStyle = opts.ground;
  context.fillRect(0, 0, W, H);
  if (opts.band) {
    context.fillStyle = opts.band.color;
    if (opts.band.edge === "hoist") context.fillRect(0, 0, W * opts.band.size, H);
    else context.fillRect(0, 0, W, H * opts.band.size);
  }
  /* Weave. Barely visible up close, and the reason the cloth does not read as
     painted sheet metal at distance. */
  context.globalAlpha = 0.05;
  context.fillStyle = "#ffffff";
  for (let y = 0; y < H; y += 3) context.fillRect(0, y, W, 1);
  context.globalAlpha = 1;

  return {
    canvas,
    stamp(image, imageAspect, box) {
      /* Fitted inside the box rather than stretched to it: the mark keeps the
         proportions it was drawn in, whatever shape the cloth is. This is the
         same discipline that stopped the roof crests being squeezed to half
         width, applied one level further in. */
      const boxW = W * box.w;
      const boxH = H * box.h;
      const w = boxW / imageAspect > boxH ? boxH * imageAspect : boxW;
      const h = w / imageAspect;
      context.drawImage(image, (W - w) / 2, H * box.cy - h / 2, w, h);
    },
  };
}

/**
 * The call at the end of the drive.
 *
 * The whole page travels seventeen thousand pixels towards this moment and
 * then, until now, nothing happened: the camera came to rest in front of the
 * end stand and that was the end of it. A drive that arrives at nothing is a
 * corridor.
 *
 * Drawn rather than modelled. Extruded 3D type needs a font file, a loader and
 * a decision about bevels, and at the size this is read — a few hundred pixels
 * across, seen once — none of that survives. What survives is weight, colour
 * and the fact that it is hanging at an angle in the air.
 */
export function createTouchdownTexture(): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  const W = 2048;
  const H = 384;
  canvas.width = W;
  canvas.height = H;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const word = "TOUCHDOOOOOWN";
  /* Italic and condensed, the same voice the player cards are set in. A
     stadium call in an upright face reads as a label. */
  context.font = `italic 900 ${H * 0.82}px Impact, "Arial Narrow", "Haettenschweiler", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  /* Squeezed to fit the sheet rather than the sheet grown to fit the word:
     thirteen characters at a readable weight is wider than any sane texture,
     and the horizontal compression is itself right for the face. */
  const natural = context.measureText(word).width;
  const x = W / 2;
  const y = H * 0.54;
  context.save();
  context.translate(x, y);
  context.scale(Math.min(1, (W * 0.94) / natural), 1);
  context.translate(-x, -y);

  /* A navy shadow under it, so the white has something to sit on when it
     passes in front of a pale crowd rather than the sky. */
  context.fillStyle = "rgba(15, 18, 38, 0.55)";
  context.fillText(word, x + H * 0.045, y + H * 0.05);
  /* Red edge, then white face. Drawn as two passes rather than one stroked
     pass: a stroke centred on the outline eats into the letterform at this
     weight, and the counters close up. */
  context.lineJoin = "round";
  context.strokeStyle = "#9e210f";
  context.lineWidth = H * 0.1;
  context.strokeText(word, x, y);
  context.fillStyle = "#ffffff";
  context.fillText(word, x, y);
  context.restore();
  return canvas;
}
