/**
 * ONE SCROLL, ONE NUMBER, ONE FRAME.
 *
 * Everything on the drive — the stadium the camera flies through and the
 * squad pinned in front of it — reads its position from here and from
 * nowhere else.
 *
 * That is the whole point of the module. The page used to run two of these:
 * the 3D scene smoothed `window.scrollY` against the document height, the
 * card deck smoothed its own bounding box against its own runway, and each
 * kept a separate integrator at a separate phase. Two smoothed values that
 * are meant to describe the same motion but are computed apart cannot be
 * held in step, and when they drift the ground slides under a foreground
 * that is standing still. That reads as being shoved.
 *
 * So: one integrator, in pixels, published once per frame to every
 * subscriber in turn. Both layers see the identical number on the identical
 * frame. They cannot disagree, because there is nothing left to disagree
 * about.
 *
 * ---------------------------------------------------------------------
 * WHY IT CANNOT THROW YOU BACKWARDS
 *
 * The smoothed position is advanced by
 *
 *     next = current + (target - current) * k,   k = 1 - e^(-RATE*dt)
 *
 * For any dt > 0 the factor k lies strictly inside (0, 1), so `next` lies
 * strictly between `current` and `target`. Three consequences, and they are
 * properties of the arithmetic rather than of any tuning:
 *
 *   1. It never overshoots. There is no spring, no velocity carried across
 *      frames, no momentum to overrun and swing back.
 *   2. It only ever moves toward the target. Scroll down and it goes down;
 *      scroll up and it goes up. It cannot travel against the direction you
 *      asked for, on any frame, at any frame rate.
 *   3. It is expressed per second, so a 120Hz screen and a 60Hz screen
 *      settle at the same rate rather than one feeling twice as eager.
 *
 * Point 2 is the guarantee the page needs, and `assertForward` below checks
 * it on every frame in development so a future change cannot quietly break
 * it.
 *
 * ---------------------------------------------------------------------
 * WHY PIXELS AND NOT A FRACTION
 *
 * Pixels are the physical quantity; every consumer's own coordinate is an
 * increasing affine function of them. Smooth the pixels and monotonicity is
 * inherited by everything downstream for free. Smooth a fraction and every
 * consumer that rescales it has to be trusted not to break the property on
 * its own.
 *
 * It also survives the page changing height — switching squad tabs swaps a
 * deck for a longer or shorter one — because the reading stays valid while
 * only the total moves.
 */

/** What every subscriber is handed, identical for all of them, once a frame. */
export type DriveFrame = {
  /** Smoothed scroll offset in CSS pixels. The number everything derives from. */
  scroll: number;
  /** Smoothed offset as a fraction of the scrollable height, clamped to 0..1. */
  progress: number;
  /** Unsmoothed scroll offset, for anything that must not lag. */
  rawScroll: number;
  /** Scrollable height in pixels: document height minus one screen. */
  total: number;
  /** Seconds since the previous frame, capped so a backgrounded tab cannot jump. */
  dt: number;
  /** Seconds since the engine started, for anything on a clock rather than on scroll. */
  time: number;
};

type Listener = (frame: DriveFrame) => void;

/**
 * How fast the drawn position closes on the scrolled one, per second.
 *
 * This is the only feel knob in the module. Lower glides more and lags more;
 * higher tracks the wheel more tightly and glides less. At 5.5 the gap closes
 * to within a pixel in about a second — enough that a wheel notch arrives as
 * a movement rather than a jump, and not so much that the page feels like it
 * is catching up with you.
 */
const RATE = 5.5;

/** Below this the chase is over; snapping avoids chasing a fraction of a pixel forever. */
const SETTLED = 0.05;

const listeners = new Set<Listener>();

let frameHandle = 0;
let started = 0;
let lastFrameAt = 0;
let smoothed = 0;
let primed = false;
let frozenAt: number | null = null;

const scrollableHeight = () =>
  Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

const currentScroll = () =>
  window.scrollY || document.documentElement.scrollTop || 0;

/**
 * The guarantee, checked rather than assumed.
 *
 * Development only: a step that moves against the target, or past it, is a
 * bug in the integrator and it is exactly the bug this module exists to make
 * impossible. Failing loudly here is cheaper than the symptom, which shows up
 * as a jolt somewhere in the middle of a long page.
 */
function assertForward(from: number, to: number, target: number) {
  if (process.env.NODE_ENV === "production") return;
  const asked = target - from;
  const moved = to - from;
  if (asked === 0 || moved === 0) return;
  if (Math.sign(moved) !== Math.sign(asked) || Math.abs(moved) > Math.abs(asked)) {
    // eslint-disable-next-line no-console
    console.error(
      `[drive-scroll] non-monotonic step: ${from} -> ${to} toward ${target}. ` +
        `The drive must only ever move toward the scroll position.`,
    );
  }
}

function tick(now: number) {
  frameHandle = requestAnimationFrame(tick);

  /* How much time the step is allowed to account for.

     This cap used to be 50ms, and that was wrong in a way that only showed up
     on slow hardware. The ease closes by 1 - e^(-RATE·dt), so charging a frame
     that really took 200ms for only 50 means it converges four times slower in
     wall-clock time than intended. On a machine rendering this scene at five
     frames a second the drive fell visibly behind the wheel and then crawled
     after it — the same lag the cap was supposed to prevent, arrived at from
     the other side.

     So the cap is loose enough to cover any frame a struggling machine will
     actually produce, and the case it was really guarding against — a tab
     backgrounded for a minute, coming back with an elapsed time in the
     seconds — is handled below by snapping instead of integrating. */
  const elapsed = lastFrameAt ? (now - lastFrameAt) / 1000 : 1 / 60;
  const dt = Math.min(0.25, elapsed);
  lastFrameAt = now;

  const total = scrollableHeight();
  /* Frozen, and it has to be frozen here rather than by whoever opened the
     overlay.

     Locking the page for a modal means pinning the body, and a pinned body
     reports a scroll position of zero. The drive reads that every frame, so
     without this the moment a player card opened its panel the camera would
     set off for the start of the field and glide the whole way back. Holding
     the reading instead leaves the picture exactly where the viewer left it,
     which is the one thing an overlay over a scene must not disturb. */
  const target =
    frozenAt !== null ? frozenAt : Math.min(Math.max(currentScroll(), 0), total);

  if (!primed || elapsed > 0.5) {
    /* Level with the page rather than gliding into it.

       On the first frame, because every reload would otherwise begin with an
       animation nobody asked for, and a page restored mid-scroll would play
       the whole drive on arrival.

       And on the first frame back from a backgrounded tab, where the elapsed
       time is measured in seconds. Integrating that would fly the length of
       the field while the viewer watched; arriving already in position is what
       they expect, since as far as they are concerned nothing moved. */
    smoothed = target;
    primed = true;
  } else if (Math.abs(target - smoothed) <= SETTLED) {
    smoothed = target;
  } else {
    const next = smoothed + (target - smoothed) * (1 - Math.exp(-RATE * dt));
    assertForward(smoothed, next, target);
    smoothed = next;
  }

  const frame: DriveFrame = {
    scroll: smoothed,
    progress: total > 0 ? Math.min(1, Math.max(0, smoothed / total)) : 0,
    rawScroll: target,
    total,
    dt,
    time: (now - started) / 1000,
  };

  /* Insertion order, and the same object for everyone. Handing each
     subscriber its own recomputed reading is how the two layers came apart
     in the first place. */
  for (const listener of listeners) listener(frame);
}

/**
 * Hold the drive still, and let it go again.
 *
 * For overlays that pin the page — a player's detail panel, anything modal.
 * The drive keeps drawing and keeps breathing; it simply stops taking new
 * positions from a scrollbar that is no longer telling the truth.
 *
 * `releaseDrive` takes the position to resume from, because the page will have
 * been restored to it a moment earlier and reading the scrollbar on this frame
 * may still return the pinned zero. Passing it explicitly means the handover
 * cannot land a frame early and lurch.
 */
export function holdDrive() {
  frozenAt = smoothed;
}

export function releaseDrive(resumeAt?: number) {
  if (typeof resumeAt === "number") smoothed = resumeAt;
  frozenAt = null;
}

/**
 * Follow the drive.
 *
 * The loop runs for as long as anything is listening and stops when the last
 * subscriber leaves. It deliberately does not stop when the scroll settles:
 * a loop that parks itself has to be restarted, restarting costs a frame of
 * unknown length, and the layer that restarted late is a layer out of step
 * with the one that never stopped.
 *
 * Returns the unsubscribe.
 */
export function subscribeDrive(listener: Listener): () => void {
  listeners.add(listener);

  if (!frameHandle) {
    started = performance.now();
    lastFrameAt = 0;
    primed = false;
    frameHandle = requestAnimationFrame(tick);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && frameHandle) {
      cancelAnimationFrame(frameHandle);
      frameHandle = 0;
    }
  };
}
