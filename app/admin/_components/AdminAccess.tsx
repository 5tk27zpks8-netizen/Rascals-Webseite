"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CmsPermission, CmsRole } from "../../lib/permissions";

export type AdminAccess = {
  email: string;
  name: string;
  role: CmsRole;
  permissions: CmsPermission[];
};

const AdminAccessContext = createContext<AdminAccess | null>(null);

export function AdminAccessProvider({ value, children }: { value: AdminAccess; children: ReactNode }) {
  return <AdminAccessContext.Provider value={value}>{children}</AdminAccessContext.Provider>;
}

export function useAdminAccess(): AdminAccess | null {
  return useContext(AdminAccessContext);
}

/**
 * Whether the signed-in account may see a given area. Without a provider the
 * answer is "yes": the server still enforces every permission, so a missing
 * context must not silently blank the admin out.
 */
export function useCanAccess(permission: CmsPermission | null): boolean {
  const access = useAdminAccess();
  if (!permission) return true;
  if (!access) return true;
  return access.permissions.includes(permission);
}
