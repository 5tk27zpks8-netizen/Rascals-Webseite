import { requireChatGPTUser } from "../../chatgpt-auth";
import { DepthChartManager } from "./DepthChartManager";

export const metadata = {
  title: "Depth Chart · Rascals CMS",
  robots: { index: false, follow: false },
};

export default async function AdminDepthChartPage() {
  await requireChatGPTUser("/admin/depth-chart");
  return <DepthChartManager />;
}
