import { bindings } from "./cms";

export const ADMIN_SESSION_COOKIE = "rascals_admin_session";
const PASSWORD_ITERATIONS = 210_000;
const SESSION_HOURS = 8;
const MAX_FAILED_ATTEMPTS = 8;
const LOCK_MINUTES = 15;

export type AdminSessionIdentity = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

export async function ensureAdminAuthSchema() {
  const { DB } = bindings();
  await DB.prepare(`CREATE TABLE IF NOT EXISTS cms_users (
    email TEXT PRIMARY KEY,
    display_name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'viewer',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await DB.prepare(`CREATE TABLE IF NOT EXISTS cms_auth_credentials (
    email TEXT PRIMARY KEY,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    password_iterations INTEGER NOT NULL DEFAULT 210000,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await DB.prepare(`CREATE TABLE IF NOT EXISTS cms_auth_sessions (
    token_hash TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL
  )`).run();
  await DB.prepare("CREATE INDEX IF NOT EXISTS idx_cms_auth_sessions_email ON cms_auth_sessions(email)").run();
}

export function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export async function getAdminSessionIdentity(requestHeaders: Headers): Promise<AdminSessionIdentity | null> {
  const token = parseCookie(requestHeaders.get("cookie"), ADMIN_SESSION_COOKIE);
  if (!token) return null;
  await ensureAdminAuthSchema();
  const { DB } = bindings();
  const tokenHash = await sha256Hex(token);
  const row = await DB.prepare(`SELECT s.email, s.expires_at, u.display_name, u.active, u.role
    FROM cms_auth_sessions s
    JOIN cms_users u ON lower(u.email)=lower(s.email)
    WHERE s.token_hash=?`).bind(tokenHash).first<Record<string, unknown>>();
  if (!row) return null;
  const expiresAt = Date.parse(String(row.expires_at ?? ""));
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() || Number(row.active ?? 0) !== 1) {
    await DB.prepare("DELETE FROM cms_auth_sessions WHERE token_hash=?").bind(tokenHash).run();
    return null;
  }
  const email = String(row.email ?? "").trim().toLowerCase();
  if (!email) return null;
  const displayName = String(row.display_name || email.split("@")[0] || email);
  return { userId: email, email, displayName, fullName: displayName };
}

export async function canSetupPasswordForEmail(email: string): Promise<boolean> {
  await ensureAdminAuthSchema();
  const { DB } = bindings();
  const row = await DB.prepare("SELECT role, active FROM cms_users WHERE lower(email)=lower(?)").bind(email).first<Record<string, unknown>>();
  return Boolean(row) && Number(row?.active ?? 0) === 1;
}

/**
 * Self-service registration. The very first account becomes admin so the site
 * is manageable without seeding; everyone after that starts as "viewer" (the
 * default player view) and is upgraded by an admin under /admin/users.
 */
export async function registerAdminUser(email: string, password: string, displayName: string): Promise<void> {
  if (password.length < 12) throw new Error("PASSWORD_TOO_SHORT");
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) throw new Error("INVALID_EMAIL");
  await ensureAdminAuthSchema();
  const { DB } = bindings();

  const existingCredential = await DB.prepare("SELECT email FROM cms_auth_credentials WHERE lower(email)=lower(?)").bind(normalized).first();
  if (existingCredential) throw new Error("ALREADY_REGISTERED");

  const total = await DB.prepare("SELECT COUNT(*) AS total FROM cms_users").first<{ total: number }>();
  const role = Number(total?.total ?? 0) === 0 ? "admin" : "viewer";
  const name = displayName.trim() || normalized.split("@")[0];

  await DB.prepare(`INSERT INTO cms_users (email, display_name, role, active)
      VALUES (?,?,?,1)
      ON CONFLICT(email) DO UPDATE SET display_name=excluded.display_name, updated_at=CURRENT_TIMESTAMP`)
    .bind(normalized, name, role).run();

  await writePasswordCredential(normalized, password);
}

export async function hasAdminCredential(email: string): Promise<boolean> {
  await ensureAdminAuthSchema();
  const { DB } = bindings();
  const row = await DB.prepare("SELECT email FROM cms_auth_credentials WHERE lower(email)=lower(?)").bind(email).first();
  return Boolean(row);
}

export async function setAdminPassword(email: string, password: string): Promise<void> {
  if (password.length < 12) throw new Error("PASSWORD_TOO_SHORT");
  await ensureAdminAuthSchema();
  const normalized = email.trim().toLowerCase();
  if (!(await canSetupPasswordForEmail(normalized))) throw new Error("NOT_ALLOWED");
  await writePasswordCredential(normalized, password);
}

async function writePasswordCredential(normalizedEmail: string, password: string): Promise<void> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = bytesToBase64(saltBytes);
  const hash = await derivePasswordHash(password, saltBytes, PASSWORD_ITERATIONS);
  const { DB } = bindings();
  await DB.prepare(`INSERT INTO cms_auth_credentials
      (email,password_salt,password_hash,password_iterations,failed_attempts,locked_until,updated_at)
      VALUES (?,?,?,?,0,NULL,CURRENT_TIMESTAMP)
      ON CONFLICT(email) DO UPDATE SET
        password_salt=excluded.password_salt,
        password_hash=excluded.password_hash,
        password_iterations=excluded.password_iterations,
        failed_attempts=0,
        locked_until=NULL,
        updated_at=CURRENT_TIMESTAMP`)
    .bind(normalizedEmail, salt, bytesToBase64(hash), PASSWORD_ITERATIONS)
    .run();
  await DB.prepare("DELETE FROM cms_auth_sessions WHERE lower(email)=lower(?)").bind(normalizedEmail).run();
}

export async function verifyAdminPassword(email: string, password: string): Promise<{ ok: boolean; locked?: boolean; email?: string }> {
  await ensureAdminAuthSchema();
  const normalized = email.trim().toLowerCase();
  const { DB } = bindings();
  const user = await DB.prepare("SELECT email, active, role FROM cms_users WHERE lower(email)=lower(?)").bind(normalized).first<Record<string, unknown>>();
  if (!user || Number(user.active ?? 0) !== 1) return { ok: false };
  const row = await DB.prepare("SELECT email,password_salt,password_hash,password_iterations,failed_attempts,locked_until FROM cms_auth_credentials WHERE lower(email)=lower(?)")
    .bind(normalized).first<Record<string, unknown>>();
  if (!row) return { ok: false };
  const lockedUntil = row.locked_until ? Date.parse(String(row.locked_until)) : 0;
  if (lockedUntil && lockedUntil > Date.now()) return { ok: false, locked: true };

  const salt = base64ToBytes(String(row.password_salt ?? ""));
  const expected = base64ToBytes(String(row.password_hash ?? ""));
  const iterations = Math.max(100_000, Number(row.password_iterations ?? PASSWORD_ITERATIONS));
  const actual = await derivePasswordHash(password, salt, iterations);
  const ok = timingSafeEqual(actual, expected);
  if (!ok) {
    const failed = Number(row.failed_attempts ?? 0) + 1;
    const lock = failed >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null;
    await DB.prepare("UPDATE cms_auth_credentials SET failed_attempts=?, locked_until=?, updated_at=CURRENT_TIMESTAMP WHERE lower(email)=lower(?)")
      .bind(failed, lock, normalized).run();
    return { ok: false, locked: Boolean(lock) };
  }
  await DB.prepare("UPDATE cms_auth_credentials SET failed_attempts=0, locked_until=NULL, updated_at=CURRENT_TIMESTAMP WHERE lower(email)=lower(?)").bind(normalized).run();
  return { ok: true, email: String(row.email ?? normalized).toLowerCase() };
}

export async function createAdminSession(email: string): Promise<{ token: string; expiresAt: string }> {
  await ensureAdminAuthSchema();
  const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60_000).toISOString();
  const { DB } = bindings();
  await DB.prepare("DELETE FROM cms_auth_sessions WHERE expires_at <= ?").bind(new Date().toISOString()).run();
  await DB.prepare("INSERT INTO cms_auth_sessions (token_hash,email,expires_at) VALUES (?,?,?)")
    .bind(tokenHash, email.trim().toLowerCase(), expiresAt).run();
  return { token, expiresAt };
}

export async function destroyAdminSession(token: string | null): Promise<void> {
  if (!token) return;
  await ensureAdminAuthSchema();
  const { DB } = bindings();
  await DB.prepare("DELETE FROM cms_auth_sessions WHERE token_hash=?").bind(await sha256Hex(token)).run();
}

export function sessionCookie(token: string): string {
  return `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie(): string {
  return `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

/**
 * Sanitises a post-login redirect target. Sign-in is no longer admin-only, so
 * any same-origin path is allowed, but anything that could send a visitor to
 * another site, or straight back into the auth flow, falls back.
 */
export function safeAdminReturnTo(value: unknown, fallback = "/admin"): string {
  const raw = typeof value === "string" ? value : fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  try {
    const url = new URL(raw, "https://app.local");
    if (url.origin !== "https://app.local") return fallback;
    const path = url.pathname;
    if (path.startsWith("/api/auth") || path === "/login" || path === "/logout") return fallback;
    return `${path}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

async function derivePasswordHash(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
