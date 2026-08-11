import type { ReactNode } from "react";
import "./phase2.css";
import { AdminRuntimeBridge } from "./AdminRuntimeBridge";
import { requireChatGPTUser } from "../chatgpt-auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireChatGPTUser("/admin");

  return (
    <>
      <AdminRuntimeBridge />
      {children}
    </>
  );
}
