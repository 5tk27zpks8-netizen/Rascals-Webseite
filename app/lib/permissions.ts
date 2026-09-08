import { headers } from "next/headers";
import { getAdminSessionIdentity } from "./admin-auth";
import { bindings } from "./cms";

export type CmsRole = "admin" | "editor" | "photographer" | "coach" | "gameday" | "viewer";
export type CmsPermission = "hero" | "website_edit" | "website_publish" | "design_manage" | "news" | "media" | "sponsors" | "settings" | "users" | "players" | "roster" | "coaches" | "performance" | "stats" | "achievements" | "games" | "games_view" | "gameday" | "gameday_view" | "trash";

export type CmsActor = {
  email: string;
  name: string;
  role: CmsRole;
};

/**
 * The "_view" permissions are read-only counterparts: they allow reading a
 * section without any of the writes. "viewer" is what self-registration hands
 * out — the standard player view of Spielplan and Live-Ticker — so an admin
 * can widen someone to editor or coach later without anyone having write
 * access simply by signing up.
 */
const rolePermissions: Record<CmsRole, CmsPermission[]> = {
  admin: ["hero", "website_edit", "website_publish", "design_manage", "news", "media", "sponsors", "settings", "users", "players", "roster", "coaches", "performance", "stats", "achievements", "games", "games_view", "gameday", "gameday_view", "trash"],
  editor: ["hero", "website_edit", "design_manage", "news", "media", "sponsors", "games_view", "gameday_view"],
  photographer: ["media", "games_view", "gameday_view"],
  coach: ["players", "roster", "coaches", "performance", "stats", "achievements", "games", "games_view", "gameday", "gameday_view", "media"],
  gameday: ["games", "games_view", "gameday", "gameday_view"],
  viewer: ["games_view", "gameday_view"],
};

export async function ensureCmsUsersSchema() {
  const { DB } = bindings();
  await DB.prepare(`CREATE TABLE IF NOT EXISTS cms_users (
    email TEXT PRIMARY KEY,
    display_name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'viewer',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

/**
 * Resolves the acting CMS user from the signed-in session only. Identity is
 * never taken from request headers: those are attacker-controlled unless an
 * upstream proxy is provably stripping them, which we cannot assume here.
 */
export async function getCmsActor(): Promise<CmsActor | null> {
  const identity = await getAdminSessionIdentity(await headers());
  if (!identity) return null;

  await ensureCmsUsersSchema();
  const { DB } = bindings();
  const row = await DB.prepare("SELECT email, display_name, role, active FROM cms_users WHERE lower(email) = lower(?)")
    .bind(identity.email)
    .first<Record<string, unknown>>();

  if (!row || Number(row.active ?? 0) !== 1) return null;
  const rawRole = String(row.role ?? "viewer");
  const role: CmsRole = ["admin", "editor", "photographer", "coach", "gameday"].includes(rawRole) ? rawRole as CmsRole : "viewer";
  return {
    email: String(row.email ?? identity.email),
    name: String(row.display_name || identity.displayName),
    role,
  };
}

export function can(actor: CmsActor, permission: CmsPermission) {
  return rolePermissions[actor.role].includes(permission);
}

export function permissionsFor(role: CmsRole): CmsPermission[] {
  return rolePermissions[role];
}

/** True for accounts that only hold the standard view (Spielplan, Live-Ticker). */
export function isStandardViewOnly(role: CmsRole): boolean {
  return rolePermissions[role].every((permission) => permission === "games_view" || permission === "gameday_view");
}

export async function requireCmsPermission(permission: CmsPermission): Promise<CmsActor | Response> {
  const actor = await getCmsActor();
  if (!actor) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(actor, permission)) return Response.json({ error: "Forbidden" }, { status: 403 });
  return actor;
}
