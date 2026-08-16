"use client";

import { useEffect, useMemo, useState } from "react";
import { alternateMediaUrl, normalizeMediaUrl } from "../lib/media-url";

export function ScheduleLogo({ src, name, className = "" }: { src: string; name: string; className?: string }) {
  const primary = normalizeMediaUrl(src);
  const alternate = alternateMediaUrl(primary);
  const sources = useMemo(() => Array.from(new Set([primary, alternate].filter(Boolean))), [primary, alternate]);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setIndex(0);
    setFailed(false);
  }, [primary]);

  const current = sources[index];
  if (!current || failed) {
    return <span className={`full-schedule-logo-placeholder ${className}`.trim()} aria-label={`${name} Logo nicht verfügbar`}>{initials(name)}</span>;
  }

  return <img
    className={`full-schedule-logo ${className}`.trim()}
    src={current}
    alt={`${name} Logo`}
    loading="eager"
    decoding="async"
    referrerPolicy="no-referrer"
    style={{ transform: `scale(${logoVisualScale(name)})`, transformOrigin: "center" }}
    onError={() => {
      if (index + 1 < sources.length) setIndex((value) => value + 1);
      else setFailed(true);
    }}
  />;
}

function logoVisualScale(name: string) {
  const key = name.toLocaleLowerCase("de-DE");
  // The Salt Miners source file has more transparent padding than the other marks.
  // Scale only the visible artwork while preserving the same layout slot.
  if (key.includes("heilbronn") && key.includes("miner")) return 1.42;
  return 1;
}

function initials(name: string) {
  const parts = name.replace(/[^A-ZÄÖÜ0-9 ]/gi, " ").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}
