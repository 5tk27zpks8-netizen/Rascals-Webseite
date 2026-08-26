import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminRuntimeBridge } from "../AdminRuntimeBridge";
import { getAdminSessionIdentity } from "../../lib/admin-auth";

/**
 * Everything in this route group requires a signed-in session. New protected
 * pages inherit the gate by being placed here, so forgetting a per-page check
 * cannot silently expose them.
 */
export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const identity = await getAdminSessionIdentity(await headers());
  if (!identity) redirect("/login?return_to=%2Fadmin");

  return (
    <>
      <AdminRuntimeBridge />
      {children}
    </>
  );
}
