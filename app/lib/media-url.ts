function splitSuffix(value: string) {
  const match = value.match(/^([^?#]*)(.*)$/s);
  return { path: match?.[1] ?? value, suffix: match?.[2] ?? "" };
}

function decodeKey(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function mediaUrlForKey(key: string) {
  const clean = decodeKey(key.trim().replace(/^\/+/, ""));
  return `/media/${clean.split("/").filter(Boolean).map(encodeURIComponent).join("/")}`;
}

export function normalizeMediaUrl(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  if (raw.startsWith("//")) return `https:${raw}`;

  const { path, suffix } = splitSuffix(raw);
  if (path.startsWith("/media/")) {
    return `${mediaUrlForKey(path.slice("/media/".length))}${suffix}`;
  }
  if (path.startsWith("media/")) {
    return `${mediaUrlForKey(path.slice("media/".length))}${suffix}`;
  }
  if (path.startsWith("/uploads/")) {
    return `${mediaUrlForKey(path.slice(1))}${suffix}`;
  }
  if (path.startsWith("uploads/")) {
    return `${mediaUrlForKey(path)}${suffix}`;
  }
  return raw;
}

export function alternateMediaUrl(value: string) {
  const normalized = normalizeMediaUrl(value);
  const { path, suffix } = splitSuffix(normalized);
  if (!path.startsWith("/media/")) return "";
  const key = decodeKey(path.slice("/media/".length));
  return `/media/${encodeURIComponent(key)}${suffix}`;
}
