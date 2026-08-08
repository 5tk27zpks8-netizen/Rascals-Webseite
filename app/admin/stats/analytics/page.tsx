import { requireChatGPTUser } from "../../../chatgpt-auth";
import { StatsAnalyticsManager } from "./StatsAnalyticsManager";

export const metadata = {
  title: "Stats Analytics · Rascals OS",
  robots: { index: false, follow: false },
};

export default async function StatsAnalyticsPage() {
  await requireChatGPTUser("/admin/stats/analytics");
  return <StatsAnalyticsManager />;
}
