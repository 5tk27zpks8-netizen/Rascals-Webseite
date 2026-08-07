import { requireChatGPTUser } from "../../chatgpt-auth";
import { PerformanceManager } from "./PerformanceManager";

export const metadata = { title: "Player Performance · Rascals CMS", robots: { index: false, follow: false } };

export default async function PerformancePage() {
  await requireChatGPTUser("/admin/performance");
  return <PerformanceManager />;
}
