import { requireChatGPTUser } from "../../../chatgpt-auth";
import { LinebackerAnalyticsManager } from "./LinebackerAnalyticsManager";

export const metadata = {
  title: "LB Position Room · Rascals OS",
  robots: { index: false, follow: false },
};

export default async function LinebackerAnalyticsPage() {
  await requireChatGPTUser("/admin/development/linebackers/analytics");
  return <LinebackerAnalyticsManager />;
}
