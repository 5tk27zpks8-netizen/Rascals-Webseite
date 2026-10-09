import { redirect } from "next/navigation";
import { safeAdminReturnTo } from "../../lib/admin-auth";

/**
 * Sign-in moved to the public /login route so it is not behind whatever
 * gates /admin (Cloudflare Access, for one) and does not read as
 * admin-only to players. This keeps existing links and bookmarks working.
 */
export default async function LegacyAdminLoginRedirect({ searchParams }: { searchParams: Promise<{ return_to?: string; mode?: string }> }) {
  const query = await searchParams;
  const returnTo = safeAdminReturnTo(query.return_to, "/admin");
  const mode = query.mode === "register" ? "&mode=register" : "";
  redirect(`/login?return_to=${encodeURIComponent(returnTo)}${mode}`);
}
