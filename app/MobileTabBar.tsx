"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import "./mobile-tab-bar.css";

/**
 * THE BAR AT THE BOTTOM.
 *
 * The one thing that makes a phone screen read as its own thing rather than a
 * narrow website. A hamburger in the top right corner is a web convention —
 * it hides everything behind a button, and that button is at the far end of
 * the screen from the hand holding it. A bar along the bottom is where a
 * thumb already is, it shows the main places rather than hiding them, and it
 * says where you are without being asked.
 *
 * Dressed as the thing this club already is: a scoreboard. A red rule across
 * the top, uppercase lettering with wide tracking, and the place you are
 * standing lit rather than merely bolder.
 *
 * ---------------------------------------------------------------------
 * WHAT GOES IN IT
 *
 * Four, plus a way to the rest. Five cells across 320 pixels leaves 64 each,
 * which is enough for a mark and a word; six would not be. The four are what
 * somebody opens a club's site on a phone to find — what is on, who plays,
 * what happened — and everything the old menu held is one tap away behind
 * "Mehr", so nothing was taken away, only reordered by how often it is
 * wanted.
 *
 * The sheet is a real dialog: it takes focus, keeps it, closes on Escape and
 * on a tap outside, and gives focus back where it came from.
 */

type Tab = { href: string; label: string; icon: React.ReactNode };

/* Drawn here rather than fetched. Five files would be five requests for a
   handful of paths, and inline they inherit `currentColor`, which is how the
   active cell tints its mark without a second copy of every icon. */
const strokes = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const IconStart = (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...strokes}>
    <path d="M3.4 10.6 12 4l8.6 6.6" />
    <path d="M5.6 9.6V19a1 1 0 0 0 1 1h3.2v-5h4.4v5h3.2a1 1 0 0 0 1-1V9.6" />
  </svg>
);

const IconSchedule = (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...strokes}>
    <rect x="3.2" y="5.2" width="17.6" height="15.2" rx="2.2" />
    <path d="M3.2 10h17.6M8.2 3.4v3.6M15.8 3.4v3.6" />
    <path d="M7.6 14h2.2M13 14h3.4M7.6 17.2h4.6" />
  </svg>
);

const IconTeam = (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...strokes}>
    <circle cx="9" cy="8.4" r="3.2" />
    <path d="M3.4 20c0-3.1 2.5-5.4 5.6-5.4s5.6 2.3 5.6 5.4" />
    <path d="M16.2 6.2a3 3 0 0 1 0 5.8M17.4 14.9c1.9.6 3.2 2.3 3.2 4.4" />
  </svg>
);

const IconNews = (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...strokes}>
    <path d="M18.4 20H5.6A2.2 2.2 0 0 1 3.4 17.8V5.4a1 1 0 0 1 1-1h11.2a1 1 0 0 1 1 1v12.4A2.2 2.2 0 0 0 18.4 20Z" />
    <path d="M16.6 9.2h2a2 2 0 0 1 2 2v6.6a2.2 2.2 0 0 1-2.2 2.2" />
    <path d="M6.6 8h7M6.6 11.4h7M6.6 14.8h4.4" />
  </svg>
);

const IconMore = (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...strokes}>
    <circle cx="5.6" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="18.4" cy="12" r="1.5" />
  </svg>
);

const TABS: Tab[] = [
  { href: "/", label: "Start", icon: IconStart },
  { href: "/spielplan", label: "Spielplan", icon: IconSchedule },
  { href: "/team", label: "Team", icon: IconTeam },
  { href: "/news", label: "News", icon: IconNews },
];

/* Everything the old menu held, with a line each saying what it is — a list of
   bare words is a quiz, and this sheet has room. */
const MORE: { href: string; label: string; note: string }[] = [
  { href: "/arena", label: "Arena", note: "Das Stadion, Abschnitt für Abschnitt" },
  { href: "/ueber-uns", label: "Über uns", note: "Der Verein und seine Geschichte" },
  { href: "/galerie", label: "Galerie", note: "Bilder vom Spieltag" },
  { href: "/sponsoring", label: "Sponsoring", note: "Partner der Rascals werden" },
  { href: "/shop", label: "Shop", note: "Trikots und Fanartikel" },
];

/** Exact for the front page, prefix for the rest, so /news/xyz still lights News. */
function isHere(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileTabBar() {
  const pathname = usePathname() ?? "/";
  const [openSheet, setOpenSheet] = useState(false);
  const sheet = useRef<HTMLDivElement | null>(null);
  const moreButton = useRef<HTMLButtonElement | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setOpenSheet(false), []);

  /* A route change closes the sheet. Without this, tapping a destination in it
     leaves the sheet standing over the page it just opened. */
  useEffect(() => {
    setOpenSheet(false);
  }, [pathname]);

  useEffect(() => {
    if (!openSheet) return;
    opener.current = document.activeElement as HTMLElement | null;

    const node = sheet.current;
    node?.querySelector<HTMLElement>("a, button")?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const focusable = node.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    /* The page behind a sheet must not scroll, or letting go of the sheet
       leaves the reader somewhere they did not choose. */
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      (opener.current ?? moreButton.current)?.focus?.();
    };
  }, [openSheet, close]);

  // The admin area has its own furniture and is not part of the public site.
  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <nav className="mtb" aria-label="Hauptbereiche">
        {TABS.map((tab) => {
          const here = isHere(pathname, tab.href);
          return (
            <a
              key={tab.href}
              className={here ? "mtb-tab is-here" : "mtb-tab"}
              href={tab.href}
              aria-current={here ? "page" : undefined}
            >
              <span className="mtb-mark">{tab.icon}</span>
              <span className="mtb-label">{tab.label}</span>
            </a>
          );
        })}
        <button
          type="button"
          className={openSheet ? "mtb-tab is-open" : "mtb-tab"}
          onClick={() => setOpenSheet((value) => !value)}
          aria-expanded={openSheet}
          aria-haspopup="dialog"
          ref={moreButton}
        >
          <span className="mtb-mark">{IconMore}</span>
          <span className="mtb-label">Mehr</span>
        </button>
      </nav>

      {openSheet ? (
        <div className="mtb-overlay" role="presentation">
          <div className="mtb-scrim" onClick={close} aria-hidden="true" />
          <div
            className="mtb-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Weitere Bereiche"
            ref={sheet}
          >
            <div className="mtb-grip" aria-hidden="true" />
            <p className="mtb-sheet-head">HELLENSTEIN RASCALS</p>
            <ul className="mtb-sheet-list">
              {MORE.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className={isHere(pathname, item.href) ? "is-here" : ""}>
                    <b>{item.label}</b>
                    <span>{item.note}</span>
                  </a>
                </li>
              ))}
            </ul>
            <a className="mtb-sheet-cta" href="mailto:football@hsb1846.de">
              Mitmachen
            </a>
            <button type="button" className="mtb-sheet-close" onClick={close}>
              Schließen
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
