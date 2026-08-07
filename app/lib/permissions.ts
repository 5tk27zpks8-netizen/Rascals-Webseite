import { getChatGPTUser } from "../chatgpt-auth";
import { bindings } from "./cms";

export type CmsRole = "admin" | "editor" | "photographer" | "coach" | "gameday" | "viewer";
export type CmsPermission = "hero" | "news" | "media" | "sponsors" | "settings" | "users" | "players" | "achievements" | "games" | "gameday";

export type CmsActor = {
  email: string;
  name: string;
  role: CmsRole;
};

const rolePermissions: Record<CmsRole, CmsPermission[]> = {
  admin: ["hero", "news", "media", "sponsors", "settings", "users", "players", "achievements", "games", "gameday"],
  editor: ["hero", "news", "media", "sponsors"],
  photographer: ["media"],
  coach: ["players", "achievements", "games", "gameday", "media"],
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

export async function getCmsActor(): Promise<CmsActor | null> {
  const identity = await getChatGPTUser();
  if (!identity) return null;

  await ensureCmsUsersSchema();
  const { DB } = bindings();
  let row = await DB.prepare("SELECT email, display_name, role, active FROM cms_users WHERE lower(email) = lower(?)")
    .bind(identity.email)
    .first<Record<string, unknown>>();

  if (!row) {
    const count = await DB.prepare("SELECT COUNT(*) AS total FROM cms_users").first<{ total: number }>();
    const role: CmsRole = Number(count?.total ?? 0) === 0 ? "admin" : "viewer";
    await DB.prepare("INSERT INTO cms_users (email, display_name, role, active) VALUES (?, ?, ?, 1)")
      .bind(identity.email, identity.displayName, role)
      .run();
    row = { email: identity.email, display_name: identity.displayName, role, active: 1 };
  }

  if (Number(row.active ?? 1) !== 1) return null;
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
