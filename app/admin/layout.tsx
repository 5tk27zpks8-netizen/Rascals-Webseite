import type { ReactNode } from "react";
import "./phase2.css";
import { AdminRuntimeBridge } from "./AdminRuntimeBridge";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AdminRuntimeBridge />
      {children}
    </>
  );
}
