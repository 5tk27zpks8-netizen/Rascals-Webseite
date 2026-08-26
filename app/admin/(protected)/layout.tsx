import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminRuntimeBridge } from "../AdminRuntimeBridge";
import { AdminAccessProvider } from "../_components/AdminAccess";
import { getAdminSessionIdentity } from "../../lib/admin-auth";
import { getCmsActor, permissionsFor } from "../../lib/permissions";

/**
 * Everything in this route group requires a signed-in session. New protected
 * pages inherit the gate by being placed here, so forgetting a per-page check
 * cannot silently expose them.
 */
export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const identity = await getAdminSessionIdentity(await headers());
  if (!identity) redirect("/login?return_to=%2Fadmin");

  // Deactivating an account already drops its sessions, so this is a safety
  // net: any session that outlives its CMS user would otherwise render an
  // admin with no permissions at all rather than saying what happened.
  const actor = await getCmsActor();
  if (!actor) redirect("/login?error=pending");

  const access = {
    email: actor.email,
    name: actor.name,
    role: actor.role,
    permissions: permissionsFor(actor.role),
  };

  return (
    <AdminAccessProvider value={access}>
      <AdminRuntimeBridge />
      {children}
    </AdminAccessProvider>
  );
}
