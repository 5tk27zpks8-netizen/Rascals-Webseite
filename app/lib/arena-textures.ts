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

/** Yard numbers, counted up to midfield and back down. */
const NUMBERS = ["10", "20", "30", "40", "50", "40", "30", "20", "10"];

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
  canvas.width = 1024;
  canvas.height = 2304;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const W = canvas.width;
  const H = canvas.height;
  const yard = H / FIELD_YARDS_LONG;
  const endZone = 10 * yard;
  const goalNear = endZone;
  const goalFar = H - endZone;

  // Turf, with the light and dark bands a mower leaves behind.
  context.fillStyle = "#17512a";
  context.fillRect(0, 0, W, H);
  context.fillStyle = "#134622";
  for (let i = 0; i < 24; i += 2) context.fillRect(0, (i * H) / 24, W, H / 24);
  noise(context, W, H, 26);

  // End zones, painted darker with the club in them.
  context.fillStyle = "#5e1019";
  context.fillRect(0, 0, W, endZone);
  context.fillStyle = "#0d2440";
  context.fillRect(0, goalFar, W, endZone);

  context.save();
  context.translate(W / 2, endZone / 2);
  context.rotate(-Math.PI / 2);
  context.fillStyle = "rgba(255,255,255,0.9)";
  context.font = "900 108px Impact, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.letterSpacing = "18px";
  context.fillText("RASCALS", 0, 0);
  context.restore();

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

/** A packed stand at night: warm specks under a dark roof. */
export function createCrowdTexture(): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#0a1018");
  gradient.addColorStop(0.55, "#1a2432");
  gradient.addColorStop(1, "#2a3546");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // People. Mostly dark clothing, with club colours scattered through.
  const colours = ["#39445a", "#4a556b", "#5d6880", "#a3202f", "#c2ccdb", "#e4ebf5", "#e7192d", "#2b5691"];
  for (let i = 0; i < 14000; i += 1) {
    const x = Math.random() * canvas.width;
    const y = 40 + Math.pow(Math.random(), 0.8) * (canvas.height - 50);
    context.fillStyle = colours[Math.floor(Math.random() * colours.length)];
    context.globalAlpha = 0.55 + Math.random() * 0.45;
    context.fillRect(x, y, 2.4, 3.4);
  }
  context.globalAlpha = 1;

  // The dark lip of the roof along the top.
  context.fillStyle = "#05090f";
  context.fillRect(0, 0, canvas.width, 34);
  return canvas;
}

/** A club flag: brand red with the wordmark. */
export function createFlagTexture(): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.fillStyle = "#0a1626";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#e7192d";
  context.fillRect(0, 0, canvas.width, canvas.height * 0.62);

  context.fillStyle = "#ffffff";
  context.font = "900 74px Impact, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.letterSpacing = "8px";
  context.fillText("RASCALS", canvas.width / 2, canvas.height * 0.31);

  context.fillStyle = "rgba(255,255,255,0.85)";
  context.font = "900 30px Impact, sans-serif";
  context.letterSpacing = "10px";
  context.fillText("HELLENSTEIN", canvas.width / 2, canvas.height * 0.79);
  return canvas;
}
