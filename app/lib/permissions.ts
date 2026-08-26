import { headers } from "next/headers";
import { getAdminSessionIdentity } from "./admin-auth";
import { bindings } from "./cms";

export type CmsRole = "admin" | "editor" | "photographer" | "coach" | "gameday" | "viewer";
export type CmsPermission = "hero" | "website_edit" | "website_publish" | "design_manage" | "news" | "media" | "sponsors" | "settings" | "users" | "players" | "roster" | "coaches" | "performance" | "stats" | "achievements" | "games" | "gameday" | "trash";

export type CmsActor = {
  email: string;
  name: string;
  role: CmsRole;
};

const rolePermissions: Record<CmsRole, CmsPermission[]> = {
  admin: ["hero", "website_edit", "website_publish", "design_manage", "news", "media", "sponsors", "settings", "users", "players", "roster", "coaches", "performance", "stats", "achievements", "games", "gameday", "trash"],
  editor: ["hero", "website_edit", "design_manage", "news", "media", "sponsors"],
  photographer: ["media"],
  coach: ["players", "roster", "coaches", "performance", "stats", "achievements", "games", "gameday", "media"],
  gameday: ["games", "gameday"],
  viewer: [],
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

export async function requireCmsPermission(permission: CmsPermission): Promise<CmsActor | Response> {
  const actor = await getCmsActor();
  if (!actor) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(actor, permission)) return Response.json({ error: "Forbidden" }, { status: 403 });
  return actor;
}
