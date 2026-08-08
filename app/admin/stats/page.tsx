import { requireChatGPTUser } from "../../chatgpt-auth";
import { StatsManager } from "./StatsManager";

export const metadata = {
  title: "Stats Review · Rascals OS",
  robots: { index: false, follow: false },
};

export default async function StatsPage() {
  await requireChatGPTUser("/admin/stats");
  return <StatsManager />;
}
